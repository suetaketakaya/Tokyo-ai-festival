package handlers

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

type GitOperationRequest struct {
	Operation string            `json:"operation"` // "status", "diff", "commit", "log", "branch"
	Options   map[string]string `json:"options,omitempty"`
}

type GitResponse struct {
	Type      string    `json:"type"`
	Operation string    `json:"operation"`
	Data      string    `json:"data"`
	Status    string    `json:"status"` // "success", "error"
	Timestamp time.Time `json:"timestamp"`
}

func handleGitOperation(client *Client, msg *Message) {
	var req GitOperationRequest
	data, _ := json.Marshal(msg.Data)
	if err := json.Unmarshal(data, &req); err != nil {
		sendGitError(client, "Invalid git operation request", err)
		return
	}

	switch req.Operation {
	case "status":
		executeGitStatus(client)
	case "diff":
		executeGitDiff(client, req.Options)
	case "log":
		executeGitLog(client, req.Options)
	case "branch":
		executeGitBranch(client)
	case "commit":
		executeGitCommit(client, req.Options)
	default:
		sendGitError(client, fmt.Sprintf("Unsupported git operation: %s", req.Operation), nil)
	}
}

func executeGitStatus(client *Client) {
	cmd := exec.Command("git", "status", "--porcelain")
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		sendGitError(client, "Failed to execute git status", err)
		return
	}
	
	sendGitResponse(client, "status", string(output), "success")
}

func executeGitDiff(client *Client, options map[string]string) {
	args := []string{"diff"}
	
	// Add options
	if file, ok := options["file"]; ok {
		args = append(args, file)
	}
	if options["staged"] == "true" {
		args = append(args, "--staged")
	}
	
	cmd := exec.Command("git", args...)
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		sendGitError(client, "Failed to execute git diff", err)
		return
	}
	
	sendGitResponse(client, "diff", string(output), "success")
}

func executeGitLog(client *Client, options map[string]string) {
	args := []string{"log", "--oneline"}
	
	// Limit number of commits
	limit := "10"
	if l, ok := options["limit"]; ok {
		limit = l
	}
	args = append(args, "-n", limit)
	
	cmd := exec.Command("git", args...)
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		sendGitError(client, "Failed to execute git log", err)
		return
	}
	
	sendGitResponse(client, "log", string(output), "success")
}

func executeGitBranch(client *Client) {
	cmd := exec.Command("git", "branch", "-v")
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		sendGitError(client, "Failed to execute git branch", err)
		return
	}
	
	sendGitResponse(client, "branch", string(output), "success")
}

func executeGitCommit(client *Client, options map[string]string) {
	message, ok := options["message"]
	if !ok || message == "" {
		sendGitError(client, "Commit message is required", nil)
		return
	}
	
	// First add all changes if requested
	if options["add_all"] == "true" {
		addCmd := exec.Command("git", "add", ".")
		if err := addCmd.Run(); err != nil {
			sendGitError(client, "Failed to add files", err)
			return
		}
	}
	
	// Commit changes
	cmd := exec.Command("git", "commit", "-m", message)
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		// Check if it's because there are no changes
		if strings.Contains(string(output), "nothing to commit") {
			sendGitResponse(client, "commit", "No changes to commit", "success")
			return
		}
		sendGitError(client, "Failed to commit", err)
		return
	}
	
	sendGitResponse(client, "commit", string(output), "success")
}

func sendGitResponse(client *Client, operation, data, status string) {
	response := GitResponse{
		Type:      "git_response",
		Operation: operation,
		Data:      data,
		Status:    status,
		Timestamp: time.Now(),
	}
	
	sendMessage(client, Message{
		Type:      "git_response",
		Data:      response,
		Timestamp: time.Now(),
	})
}

func sendGitError(client *Client, message string, err error) {
	errorMsg := message
	if err != nil {
		errorMsg = fmt.Sprintf("%s: %v", message, err)
	}
	
	sendGitResponse(client, "error", errorMsg, "error")
}
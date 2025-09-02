package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os/exec"
	"strings"
	"time"
)

type ClaudeExecuteRequest struct {
	Command string `json:"command"`
	Options struct {
		Mode    string `json:"mode"`    // "interactive" or "batch"
		Timeout int    `json:"timeout"` // seconds
	} `json:"options"`
}

type ClaudeOutputMessage struct {
	Type      string    `json:"type"`
	Data      string    `json:"data"`
	Status    string    `json:"status"` // "running", "completed", "error"
	Timestamp time.Time `json:"timestamp"`
}

func handleClaudeExecute(client *Client, msg *Message) {
	var req ClaudeExecuteRequest
	data, _ := json.Marshal(msg.Data)
	if err := json.Unmarshal(data, &req); err != nil {
		sendErrorMessage(client, "Invalid claude execute request", err)
		return
	}

	// Validate command
	if !strings.HasPrefix(req.Command, "claude") {
		sendErrorMessage(client, "Invalid command: must start with 'claude'", nil)
		return
	}

	// Set default timeout
	timeout := 300 // 5 minutes default
	if req.Options.Timeout > 0 && req.Options.Timeout <= 1800 { // max 30 minutes
		timeout = req.Options.Timeout
	}

	go executeClaudeCommand(client, req.Command, timeout)
}

func executeClaudeCommand(client *Client, command string, timeoutSeconds int) {
	sendClaudeOutput(client, "", "running", "Starting Claude execution...")

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()

	// Parse command (split by spaces, handle quotes later if needed)
	parts := strings.Fields(command)
	if len(parts) == 0 {
		sendClaudeOutput(client, "", "error", "Empty command")
		return
	}

	// Execute command
	cmd := exec.CommandContext(ctx, parts[0], parts[1:]...)
	
	// Get stdout and stderr pipes
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		sendClaudeOutput(client, "", "error", fmt.Sprintf("Failed to create stdout pipe: %v", err))
		return
	}
	
	stderr, err := cmd.StderrPipe()
	if err != nil {
		sendClaudeOutput(client, "", "error", fmt.Sprintf("Failed to create stderr pipe: %v", err))
		return
	}

	// Start command
	if err := cmd.Start(); err != nil {
		sendClaudeOutput(client, "", "error", fmt.Sprintf("Failed to start command: %v", err))
		return
	}

	// Stream output in real-time
	go streamOutput(client, stdout, "stdout")
	go streamOutput(client, stderr, "stderr")

	// Wait for command to complete
	err = cmd.Wait()
	
	if ctx.Err() == context.DeadlineExceeded {
		sendClaudeOutput(client, "", "error", "Command timed out")
		return
	}
	
	if err != nil {
		sendClaudeOutput(client, "", "error", fmt.Sprintf("Command failed: %v", err))
		return
	}
	
	sendClaudeOutput(client, "", "completed", "Claude execution completed successfully")
}

func streamOutput(client *Client, reader io.Reader, source string) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()
		sendClaudeOutput(client, line, "running", "")
	}
	
	if err := scanner.Err(); err != nil {
		log.Printf("Error reading %s: %v", source, err)
	}
}

func sendClaudeOutput(client *Client, data, status, message string) {
	output := ClaudeOutputMessage{
		Type:      "claude_output",
		Data:      data,
		Status:    status,
		Timestamp: time.Now(),
	}
	
	if message != "" {
		output.Data = message
	}
	
	sendMessage(client, Message{
		Type:      "claude_output",
		Data:      output,
		Timestamp: time.Now(),
	})
}

func sendErrorMessage(client *Client, message string, err error) {
	errorMsg := message
	if err != nil {
		errorMsg = fmt.Sprintf("%s: %v", message, err)
	}
	
	sendClaudeOutput(client, "", "error", errorMsg)
}
package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// ClaudeAgent handles communication with local Claude Code CLI
type ClaudeAgent struct {
	cliPath string
	timeout time.Duration
}

// NewClaudeAgent creates a new Claude agent instance
func NewClaudeAgent(cliPath string) *ClaudeAgent {
	return &ClaudeAgent{
		cliPath: cliPath,
		timeout: 30 * time.Second, // 30 second timeout
	}
}

// Ask sends a prompt to Claude Code CLI and returns the response (with full permissions)
func (c *ClaudeAgent) Ask(prompt string) (string, error) {
	return c.AskWithFullPermissions(prompt)
}

// AskWithoutPermissions sends a prompt to Claude CLI without file operation permissions
func (c *ClaudeAgent) AskWithoutPermissions(prompt string) (string, error) {
	// Use claude --print without permission flags - Claude will ask for permission if needed
	cmd := exec.Command(c.cliPath, "--print", prompt)
	
	// Set up output buffers
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	
	// Set timeout
	if c.timeout > 0 {
		cmd.WaitDelay = c.timeout
	}
	
	// Run the command
	err := cmd.Run()
	if err != nil {
		// If Claude CLI fails, return a fallback response
		return fmt.Sprintf("I apologize, but I'm having trouble processing your request right now. Error: %s", err.Error()), nil
	}
	
	response := strings.TrimSpace(out.String())
	if response == "" {
		return "I'm sorry, but I couldn't generate a response to your request.", nil
	}
	
	return response, nil
}

// AskWithFullPermissions sends a prompt to Claude CLI with full permissions granted
func (c *ClaudeAgent) AskWithFullPermissions(prompt string) (string, error) {
	// Use claude --print with permission settings for Docker container safety
	cmd := exec.Command(c.cliPath, 
		"--print", 
		"--permission-mode", "acceptEdits",
		"--dangerously-skip-permissions", // Safe in Docker container
		prompt)
	
	// Set up output buffers
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	
	// Set timeout
	if c.timeout > 0 {
		cmd.WaitDelay = c.timeout
	}
	
	// Run the command
	err := cmd.Run()
	if err != nil {
		// If Claude CLI fails, return a fallback response
		return fmt.Sprintf("I apologize, but I'm having trouble processing your request right now. Error: %s", err.Error()), nil
	}
	
	response := strings.TrimSpace(out.String())
	if response == "" {
		return "I'm sorry, but I couldn't generate a response to your request.", nil
	}
	
	return response, nil
}

// AskWithWorkspace sends a prompt to Claude Code CLI with specific workspace access
func (c *ClaudeAgent) AskWithWorkspace(prompt string, workspaceDir string) (string, error) {
	// Use claude --print with workspace directory access
	cmd := exec.Command(c.cliPath,
		"--print",
		"--permission-mode", "acceptEdits", 
		"--add-dir", workspaceDir,
		"--dangerously-skip-permissions", // Safe in Docker container
		prompt)
	
	// Set working directory to the workspace
	cmd.Dir = workspaceDir
	
	// Set up output buffers
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	
	// Set timeout
	if c.timeout > 0 {
		cmd.WaitDelay = c.timeout
	}
	
	// Run the command
	err := cmd.Run()
	if err != nil {
		return fmt.Sprintf("I apologize, but I'm having trouble processing your request right now. Error: %s", err.Error()), nil
	}
	
	response := strings.TrimSpace(out.String())
	if response == "" {
		return "I'm sorry, but I couldn't generate a response to your request.", nil
	}
	
	return response, nil
}

// Global Claude agent instance and permission manager
var claudeAgent *ClaudeAgent
var permissionManager *PermissionManager

// Initialize Claude agent and permission manager on startup
func init() {
	claudeAgent = NewClaudeAgent("claude")
	permissionManager = NewPermissionManager()
}

// generateEnhancedClaudeResponse uses real Claude Code CLI with permission handling
func generateEnhancedClaudeResponse(input, context string) string {
	input = strings.TrimSpace(input)
	
	if input == "" {
		return "Hello! How can I help you today?"
	}
	
	// Call real Claude Code CLI (without permissions initially)
	response, err := claudeAgent.AskWithoutPermissions(input)
	if err != nil {
		// Fallback to simple response on error
		return fmt.Sprintf("I understand you're asking about \"%s\". Could you provide a bit more context so I can give you the most helpful response?", input)
	}
	
	return response
}

// generateClaudeResponseWithPermissions handles Claude responses that may need permissions
func generateClaudeResponseWithPermissions(input, context string, projectID string, s *Server) (string, error) {
	input = strings.TrimSpace(input)
	
	if input == "" {
		return "Hello! How can I help you today?", nil
	}
	
	// Call Claude CLI without permissions first to get the response
	response, err := claudeAgent.AskWithoutPermissions(input)
	if err != nil {
		return fmt.Sprintf("I understand you're asking about \"%s\". Could you provide a bit more context so I can give you the most helpful response?", input), nil
	}
	
	// Check if response requires permission
	permReq := permissionManager.DetectPermissionNeeded(response)
	if permReq != nil {
		// Add to pending requests
		permissionManager.AddPendingRequest(permReq)
		
		// Send permission request to client via WebSocket
		err := s.sendPermissionRequest(projectID, permReq)
		if err != nil {
			return response, nil // Return original response if can't send permission request
		}
		
		// Wait for user response
		userResp, received := permissionManager.WaitForResponse(permReq.RequestID)
		if !received {
			return response + "\n\n⏰ Permission request timed out. The operation was not performed.", nil
		}
		
		if !userResp.Approved {
			return response + "\n\n❌ Permission denied. The operation was not performed.", nil
		}
		
		// Permission granted - execute with full permissions
		authorizedResponse, err := claudeAgent.AskWithFullPermissions(input)
		if err != nil {
			return response + "\n\n✅ Permission granted, but execution failed: " + err.Error(), nil
		}
		
		return "✅ Permission granted!\n\n" + authorizedResponse, nil
	}
	
	return response, nil
}
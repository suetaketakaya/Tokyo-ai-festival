package main

// This file contains the patch to integrate staged execution into the main server

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
)

// handleDockerClaudeExecuteStaged handles staged execution requests
func (s *Server) handleDockerClaudeExecuteStaged(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🚀 Handling Docker Claude STAGED execution request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid Docker staged execute message format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID for staged execution")
		return
	}

	command, ok := data["command"].(string)
	if !ok || command == "" {
		s.sendError(conn, "Missing command for staged execution")
		return
	}

	log.Printf("🎯 Starting staged execution for container %s: %s", projectID, command)

	// Create staged executor
	executor := NewStagedExecutor(projectID, conn)

	// Execute in separate goroutine to avoid blocking WebSocket
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("❌ Staged execution panic: %v", r)
				s.sendStagedError(conn, "error", "Internal error occurred")
			}
		}()

		// Execute staged process
		result, err := executor.ExecuteStaged(command)
		if err != nil {
			log.Printf("❌ Staged execution failed: %v", err)
			s.sendError(conn, "Staged execution failed: "+err.Error())
			return
		}

		log.Printf("🎉 Staged execution completed successfully for project %s", projectID)
		log.Printf("📊 Execution result: %+v", result)
	}()
}

// Enhanced handleDockerClaudeExecute with staging option
func (s *Server) handleDockerClaudeExecuteEnhanced(conn *websocket.Conn, msg map[string]interface{}) {
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid Docker execute message format")
		return
	}

	// Check if staging is requested
	useStaging, _ := data["use_staging"].(bool)

	if useStaging {
		log.Printf("🔄 Routing to staged execution...")
		s.handleDockerClaudeExecuteStaged(conn, msg)
		return
	}

	// Otherwise, use the original handler
	log.Printf("📝 Using original execution flow...")
	s.handleDockerClaudeExecute(conn, msg)
}

// Integration function to add staged execution support
func (s *Server) enableStagedExecution() {
	log.Printf("🔧 Enabling staged execution support...")

	// The main message handler will need to be updated to route
	// "claude_execute_staged" messages to handleDockerClaudeExecuteStaged

	// We could also modify the existing "claude_execute" handler to
	// use staging by default or based on a flag
}

// Utility function to send enhanced progress updates
func (s *Server) sendProgressUpdate(conn *websocket.Conn, stage string, progress int, message string) {
	progressMsg := map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":     stage,
			"progress":  progress,
			"message":   message,
			"timestamp": time.Now().Unix(),
		},
	}

	if err := conn.WriteJSON(progressMsg); err != nil {
		log.Printf("❌ Failed to send progress update: %v", err)
	}
}

// Enhanced error handling for staged execution
func (s *Server) sendStagedError(conn *websocket.Conn, stage string, errorMsg string) {
	errorResponse := map[string]interface{}{
		"type": "execution_error",
		"data": map[string]interface{}{
			"stage":     stage,
			"error":     errorMsg,
			"timestamp": time.Now().Unix(),
			"recoverable": true, // Indicate if the error is recoverable
		},
	}

	if err := conn.WriteJSON(errorResponse); err != nil {
		log.Printf("❌ Failed to send staged error: %v", err)
	}
}
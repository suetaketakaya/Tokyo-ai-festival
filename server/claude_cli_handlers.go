package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

// handleClaudeCodeCLIAnalyze processes Claude Code CLI output for automatic button generation
func (s *Server) handleClaudeCodeCLIAnalyze(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🔍🤖 Processing Claude Code CLI analysis request")

	projectID, ok := msg["project_id"].(string)
	if !ok {
		s.sendErrorResponse(conn, "Missing project_id")
		return
	}

	responseText, ok := msg["response_text"].(string)
	if !ok {
		s.sendErrorResponse(conn, "Missing response_text")
		return
	}

	// Analyze Claude Code CLI response using W&B local models
	generatedButtons, err := claudeCliAnalyzer.AnalyzeClaudeCodeResponse(responseText, projectID)
	if err != nil {
		log.Printf("❌ Failed to analyze Claude Code CLI response: %v", err)
		s.sendErrorResponse(conn, fmt.Sprintf("Analysis failed: %v", err))
		return
	}

	// Filter and prioritize buttons
	finalButtons := s.filterAndPrioritizeButtons(generatedButtons, projectID)

	// Store generated buttons for this project
	s.storeGeneratedButtons(projectID, finalButtons)

	// Send response with generated buttons
	response := map[string]interface{}{
		"type":             "claude_cli_analysis_result",
		"project_id":       projectID,
		"generated_buttons": finalButtons,
		"analysis_stats": map[string]interface{}{
			"total_buttons":    len(generatedButtons),
			"filtered_buttons": len(finalButtons),
			"categories":       s.getButtonCategories(finalButtons),
		},
		"timestamp": time.Now().Unix(),
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send Claude CLI analysis result: %v", err)
	} else {
		log.Printf("✅ Sent %d auto-generated buttons for project %s", len(finalButtons), projectID)
	}
}

// handleAutoButtonExecute executes an auto-generated button command
func (s *Server) handleAutoButtonExecute(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🚀🤖 Executing auto-generated button")

	projectID, ok := msg["project_id"].(string)
	if !ok {
		s.sendErrorResponse(conn, "Missing project_id")
		return
	}

	buttonID, ok := msg["button_id"].(string)
	if !ok {
		s.sendErrorResponse(conn, "Missing button_id")
		return
	}

	// Retrieve button from stored generated buttons
	button := s.getStoredButton(projectID, buttonID)
	if button == nil {
		s.sendErrorResponse(conn, "Button not found or expired")
		return
	}

	// Execute the button command using existing container infrastructure
	result := s.executeAutoButton(button, projectID)

	// Send execution result
	response := map[string]interface{}{
		"type":       "auto_button_execution_result",
		"project_id": projectID,
		"button_id":  buttonID,
		"result":     result,
		"timestamp":  time.Now().Unix(),
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send auto button execution result: %v", err)
	} else {
		log.Printf("✅ Auto button executed: %s", button.Title)
	}

	// Update W&B metrics for executed button
	s.updateButtonMetrics(button, result)
}

// filterAndPrioritizeButtons applies filtering and prioritization logic
func (s *Server) filterAndPrioritizeButtons(buttons []*GeneratedButton, projectID string) []*GeneratedButton {
	// Remove duplicates
	uniqueButtons := s.removeDuplicateButtons(buttons)

	// Sort by priority and confidence
	prioritizedButtons := s.sortButtonsByPriority(uniqueButtons)

	// Limit to top 8 buttons to avoid UI clutter
	maxButtons := 8
	if len(prioritizedButtons) > maxButtons {
		prioritizedButtons = prioritizedButtons[:maxButtons]
	}

	return prioritizedButtons
}

// removeDuplicateButtons removes buttons with similar commands or descriptions
func (s *Server) removeDuplicateButtons(buttons []*GeneratedButton) []*GeneratedButton {
	seen := make(map[string]bool)
	var unique []*GeneratedButton

	for _, button := range buttons {
		// Create hash from command and category
		key := fmt.Sprintf("%s|%s", button.Command, button.Category)
		if !seen[key] {
			seen[key] = true
			unique = append(unique, button)
		}
	}

	return unique
}

// sortButtonsByPriority sorts buttons by priority and confidence score
func (s *Server) sortButtonsByPriority(buttons []*GeneratedButton) []*GeneratedButton {
	// Simple bubble sort for small arrays
	for i := 0; i < len(buttons)-1; i++ {
		for j := 0; j < len(buttons)-i-1; j++ {
			score1 := s.calculateButtonScore(buttons[j])
			score2 := s.calculateButtonScore(buttons[j+1])

			if score1 < score2 {
				buttons[j], buttons[j+1] = buttons[j+1], buttons[j]
			}
		}
	}

	return buttons
}

// calculateButtonScore calculates priority score for sorting
func (s *Server) calculateButtonScore(button *GeneratedButton) float64 {
	score := 0.0

	// Priority from button config (higher priority = lower number = higher score)
	if priority, ok := button.ButtonConfig["priority"].(int); ok {
		score += float64(10 - priority) // Invert priority for scoring
	}

	// W&B confidence score
	if button.WandBMetadata != nil {
		if confidence, ok := button.WandBMetadata.Metrics["confidence_score"]; ok {
			score += confidence * 10
		}
	}

	// Bonus for specific categories
	switch button.Category {
	case "web_app":
		score += 5.0
	case "data_visualization":
		score += 4.0
	case "machine_learning":
		score += 3.0
	}

	return score
}

// storeGeneratedButtons stores buttons for later retrieval
func (s *Server) storeGeneratedButtons(projectID string, buttons []*GeneratedButton) {
	// In a production system, this would be stored in a database
	// For now, we'll use an in-memory storage with project session
	s.sessionsMutex.Lock()
	defer s.sessionsMutex.Unlock()

	session, exists := s.sessions[projectID]
	if !exists {
		session = &ConversationSession{
			ProjectID:      projectID,
			MessageHistory: make([]ConversationMessage, 0),
			CreatedAt:      time.Now(),
			LastActivity:   time.Now(),
			Context:        make(map[string]string),
		}
		s.sessions[projectID] = session
	}

	// Store buttons in session context
	buttonData, _ := json.Marshal(buttons)
	session.Context["generated_buttons"] = string(buttonData)
	session.LastActivity = time.Now()

	log.Printf("💾 Stored %d generated buttons for project %s", len(buttons), projectID)
}

// getStoredButton retrieves a specific button by ID
func (s *Server) getStoredButton(projectID, buttonID string) *GeneratedButton {
	s.sessionsMutex.RLock()
	defer s.sessionsMutex.RUnlock()

	session, exists := s.sessions[projectID]
	if !exists {
		return nil
	}

	buttonData, exists := session.Context["generated_buttons"]
	if !exists {
		return nil
	}

	var buttons []*GeneratedButton
	if err := json.Unmarshal([]byte(buttonData), &buttons); err != nil {
		log.Printf("❌ Failed to unmarshal stored buttons: %v", err)
		return nil
	}

	for _, button := range buttons {
		if button.ID == buttonID {
			return button
		}
	}

	return nil
}

// executeAutoButton executes the command from an auto-generated button
func (s *Server) executeAutoButton(button *GeneratedButton, projectID string) map[string]interface{} {
	log.Printf("🚀 Executing auto button: %s", button.Title)

	// Use existing Docker execution infrastructure
	output, err := s.dockerManager.ExecuteCommand(projectID, button.Command)

	result := map[string]interface{}{
		"button_id":   button.ID,
		"button_name": button.Title,
		"command":     button.Command,
		"category":    button.Category,
		"success":     err == nil,
	}

	if err != nil {
		result["error"] = err.Error()
		log.Printf("❌ Auto button execution failed: %v", err)
	} else {
		result["output"] = output
		log.Printf("✅ Auto button executed successfully")

		// Check for matplotlib output if it's a visualization button
		if button.Category == "data_visualization" || button.ExecutionType == "matplotlib" {
			if plotData := s.detectMatplotlibOutput(projectID, output); plotData != nil {
				result["matplotlib_data"] = plotData
			}
		}
	}

	return result
}

// detectMatplotlibOutput checks for matplotlib plots in command output
func (s *Server) detectMatplotlibOutput(projectID, output string) map[string]interface{} {
	// Use existing matplotlib detection logic
	if strings.Contains(output, ".png") || strings.Contains(output, "savefig") {
		// Try to detect enhanced matplotlib outputs
		if wandbOutputs, err := enhancedMatplotlibDetector.DetectEnhancedMatplotlibOutputs(projectID); err == nil && len(wandbOutputs) > 0 {
			latest := wandbOutputs[len(wandbOutputs)-1]
			return map[string]interface{}{
				"type":         "matplotlib",
				"filename":     latest.Filename,
				"base64_image": latest.Base64Image,
				"wandb_metadata": latest.WandBMetadata,
			}
		}
	}

	return nil
}

// updateButtonMetrics updates W&B metrics for executed button
func (s *Server) updateButtonMetrics(button *GeneratedButton, result map[string]interface{}) {
	if button.WandBMetadata == nil {
		return
	}

	// Update execution metrics
	if success, ok := result["success"].(bool); ok {
		if success {
			button.WandBMetadata.Metrics["execution_success"] = 1.0
		} else {
			button.WandBMetadata.Metrics["execution_success"] = 0.0
		}
	}

	// Update execution count
	if count, exists := button.WandBMetadata.Metrics["execution_count"]; exists {
		button.WandBMetadata.Metrics["execution_count"] = count + 1
	} else {
		button.WandBMetadata.Metrics["execution_count"] = 1.0
	}

	log.Printf("📊 Updated W&B metrics for button: %s", button.Title)
}

// getButtonCategories returns unique categories from buttons
func (s *Server) getButtonCategories(buttons []*GeneratedButton) []string {
	categories := make(map[string]bool)
	for _, button := range buttons {
		categories[button.Category] = true
	}

	var result []string
	for category := range categories {
		result = append(result, category)
	}

	return result
}

// Helper function to send error responses
func (s *Server) sendErrorResponse(conn *websocket.Conn, message string) {
	errorResponse := map[string]interface{}{
		"type":    "error",
		"message": message,
	}
	conn.WriteJSON(errorResponse)
}
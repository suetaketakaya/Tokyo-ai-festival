package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// ButtonDatabase manages persistent storage of generated buttons
type ButtonDatabase struct {
	buttons     map[string]*GeneratedButton
	filePath    string
	mutex       sync.RWMutex
	autoSave    bool
	saveTicker  *time.Ticker
}

// ButtonSession manages buttons for a specific user session
type ButtonSession struct {
	SessionID     string                      `json:"session_id"`
	ProjectID     string                      `json:"project_id"`
	UserID        string                      `json:"user_id"`
	Buttons       map[string]*GeneratedButton `json:"buttons"`
	CreatedAt     time.Time                   `json:"created_at"`
	LastActivity  time.Time                   `json:"last_activity"`
	IsActive      bool                        `json:"is_active"`
}

// ButtonDatabaseManager handles multiple sessions and persistence
type ButtonDatabaseManager struct {
	sessions     map[string]*ButtonSession
	dataDir      string
	mutex        sync.RWMutex
	autoSaveEnable bool
	saveTicker   *time.Ticker
}

// Initialize global button database manager
var GlobalButtonDB *ButtonDatabaseManager

// InitializeButtonDatabase sets up the button database system
func InitializeButtonDatabase(dataDir string) error {
	if GlobalButtonDB != nil {
		return nil // Already initialized
	}

	// Create data directory if it doesn't exist
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return fmt.Errorf("failed to create button database directory: %v", err)
	}

	GlobalButtonDB = &ButtonDatabaseManager{
		sessions:       make(map[string]*ButtonSession),
		dataDir:        dataDir,
		autoSaveEnable: true,
	}

	// Load existing sessions from disk
	if err := GlobalButtonDB.loadFromDisk(); err != nil {
		log.Printf("Warning: Failed to load existing button sessions: %v", err)
	}

	// Start auto-save routine
	GlobalButtonDB.startAutoSave()

	log.Printf("🗄️ Button Database initialized at: %s", dataDir)
	return nil
}

// CreateButtonSession creates a new button session for a user
func (bdm *ButtonDatabaseManager) CreateButtonSession(sessionID, projectID, userID string) *ButtonSession {
	bdm.mutex.Lock()
	defer bdm.mutex.Unlock()

	session := &ButtonSession{
		SessionID:    sessionID,
		ProjectID:    projectID,
		UserID:       userID,
		Buttons:      make(map[string]*GeneratedButton),
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
		IsActive:     true,
	}

	bdm.sessions[sessionID] = session
	log.Printf("🔥 Created button session: %s for project: %s", sessionID, projectID)
	return session
}

// AddButtonToSession adds a generated button to a specific session
func (bdm *ButtonDatabaseManager) AddButtonToSession(sessionID string, button *GeneratedButton) error {
	bdm.mutex.Lock()
	defer bdm.mutex.Unlock()

	session, exists := bdm.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	// Update button timestamp and source
	button.CreatedAt = time.Now()
	if button.Source == "" {
		button.Source = "dynamic_generator"
	}

	// Add to session
	session.Buttons[button.ID] = button
	session.LastActivity = time.Now()

	log.Printf("➕ Added button '%s' to session %s (Total: %d buttons)",
		button.Title, sessionID, len(session.Buttons))
	return nil
}

// GetSessionButtons retrieves all buttons for a session
func (bdm *ButtonDatabaseManager) GetSessionButtons(sessionID string) ([]*GeneratedButton, error) {
	bdm.mutex.RLock()
	defer bdm.mutex.RUnlock()

	session, exists := bdm.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	buttons := make([]*GeneratedButton, 0, len(session.Buttons))
	for _, button := range session.Buttons {
		buttons = append(buttons, button)
	}

	log.Printf("📋 Retrieved %d buttons for session %s", len(buttons), sessionID)
	return buttons, nil
}

// GetSessionButtonsByCategory retrieves buttons filtered by category
func (bdm *ButtonDatabaseManager) GetSessionButtonsByCategory(sessionID, category string) ([]*GeneratedButton, error) {
	allButtons, err := bdm.GetSessionButtons(sessionID)
	if err != nil {
		return nil, err
	}

	filtered := make([]*GeneratedButton, 0)
	for _, button := range allButtons {
		if button.Category == category {
			filtered = append(filtered, button)
		}
	}

	return filtered, nil
}

// UpdateButtonUsage updates usage statistics for a button
func (bdm *ButtonDatabaseManager) UpdateButtonUsage(sessionID, buttonID string) error {
	bdm.mutex.Lock()
	defer bdm.mutex.Unlock()

	session, exists := bdm.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	button, exists := session.Buttons[buttonID]
	if !exists {
		return fmt.Errorf("button not found: %s", buttonID)
	}

	// Update usage statistics (extend GeneratedButton to include usage stats)
	// This would require updating the GeneratedButton struct
	session.LastActivity = time.Now()

	log.Printf("📊 Updated usage for button '%s' in session %s", button.Title, sessionID)
	return nil
}

// DeleteButton removes a button from a session
func (bdm *ButtonDatabaseManager) DeleteButton(sessionID, buttonID string) error {
	bdm.mutex.Lock()
	defer bdm.mutex.Unlock()

	session, exists := bdm.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	if _, exists := session.Buttons[buttonID]; !exists {
		return fmt.Errorf("button not found: %s", buttonID)
	}

	delete(session.Buttons, buttonID)
	session.LastActivity = time.Now()

	log.Printf("🗑️ Deleted button %s from session %s", buttonID, sessionID)
	return nil
}

// GetSessionInfo retrieves session metadata
func (bdm *ButtonDatabaseManager) GetSessionInfo(sessionID string) (*ButtonSession, error) {
	bdm.mutex.RLock()
	defer bdm.mutex.RUnlock()

	session, exists := bdm.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	// Return a copy to prevent external modification
	return &ButtonSession{
		SessionID:    session.SessionID,
		ProjectID:    session.ProjectID,
		UserID:       session.UserID,
		CreatedAt:    session.CreatedAt,
		LastActivity: session.LastActivity,
		IsActive:     session.IsActive,
		Buttons:      nil, // Don't include buttons in info response
	}, nil
}

// CleanupOldSessions removes inactive sessions older than specified duration
func (bdm *ButtonDatabaseManager) CleanupOldSessions(maxAge time.Duration) int {
	bdm.mutex.Lock()
	defer bdm.mutex.Unlock()

	cutoff := time.Now().Add(-maxAge)
	deletedCount := 0

	for sessionID, session := range bdm.sessions {
		if session.LastActivity.Before(cutoff) && !session.IsActive {
			delete(bdm.sessions, sessionID)
			deletedCount++
			log.Printf("🧹 Cleaned up old session: %s", sessionID)
		}
	}

	if deletedCount > 0 {
		log.Printf("🧹 Cleanup completed: removed %d old sessions", deletedCount)
	}

	return deletedCount
}

// saveToDisk persists all sessions to disk
func (bdm *ButtonDatabaseManager) saveToDisk() error {
	bdm.mutex.RLock()
	defer bdm.mutex.RUnlock()

	filePath := filepath.Join(bdm.dataDir, "button_sessions.json")
	data, err := json.MarshalIndent(bdm.sessions, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal button sessions: %v", err)
	}

	if err := ioutil.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write button sessions file: %v", err)
	}

	log.Printf("💾 Button sessions saved to disk (%d sessions)", len(bdm.sessions))
	return nil
}

// loadFromDisk loads sessions from disk
func (bdm *ButtonDatabaseManager) loadFromDisk() error {
	filePath := filepath.Join(bdm.dataDir, "button_sessions.json")

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		log.Printf("📁 No existing button sessions file found")
		return nil // File doesn't exist, which is fine for first run
	}

	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read button sessions file: %v", err)
	}

	if err := json.Unmarshal(data, &bdm.sessions); err != nil {
		return fmt.Errorf("failed to unmarshal button sessions: %v", err)
	}

	log.Printf("📁 Loaded %d button sessions from disk", len(bdm.sessions))
	return nil
}

// startAutoSave starts the auto-save routine
func (bdm *ButtonDatabaseManager) startAutoSave() {
	if !bdm.autoSaveEnable {
		return
	}

	// Save every 5 minutes
	bdm.saveTicker = time.NewTicker(5 * time.Minute)

	go func() {
		for range bdm.saveTicker.C {
			if err := bdm.saveToDisk(); err != nil {
				log.Printf("❌ Auto-save failed: %v", err)
			}
		}
	}()

	log.Printf("⏰ Button database auto-save started (5 minute intervals)")
}

// StopAutoSave stops the auto-save routine
func (bdm *ButtonDatabaseManager) StopAutoSave() {
	if bdm.saveTicker != nil {
		bdm.saveTicker.Stop()
		bdm.saveTicker = nil
		log.Printf("⏰ Button database auto-save stopped")
	}
}

// GetStats returns database statistics
func (bdm *ButtonDatabaseManager) GetStats() map[string]interface{} {
	bdm.mutex.RLock()
	defer bdm.mutex.RUnlock()

	totalButtons := 0
	activeSessions := 0

	for _, session := range bdm.sessions {
		totalButtons += len(session.Buttons)
		if session.IsActive {
			activeSessions++
		}
	}

	return map[string]interface{}{
		"total_sessions":    len(bdm.sessions),
		"active_sessions":   activeSessions,
		"total_buttons":     totalButtons,
		"data_directory":    bdm.dataDir,
		"auto_save_enabled": bdm.autoSaveEnable,
	}
}

// Shutdown gracefully shuts down the button database
func (bdm *ButtonDatabaseManager) Shutdown() error {
	log.Printf("🔄 Shutting down button database...")

	bdm.StopAutoSave()

	if err := bdm.saveToDisk(); err != nil {
		return fmt.Errorf("failed to save button database during shutdown: %v", err)
	}

	log.Printf("✅ Button database shutdown complete")
	return nil
}
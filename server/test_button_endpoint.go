package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// GeneratedButton represents a button with metadata
type TestGeneratedButton struct {
	ID         string            `json:"id"`
	Title      string            `json:"title"`
	Command    string            `json:"command"`
	Category   string            `json:"category"`
	Framework  string            `json:"framework"`
	Color      string            `json:"color"`
	Priority   int               `json:"priority"`
	Source     string            `json:"source"`
	CreatedAt  time.Time         `json:"created_at"`
	Metadata   map[string]string `json:"metadata,omitempty"`
}

// TestButtonEndpoint creates test buttons and provides API endpoint
func (s *Server) setupTestButtonEndpoint() {
	// Create test session and buttons
	sessionID := "test_session_demo"
	projectID := "demo_project"
	userID := "test_user"
	
	// Create session if GlobalButtonDB is available
	if GlobalButtonDB != nil {
		_ = GlobalButtonDB.CreateButtonSession(sessionID, projectID, userID)
		
		// Add test buttons from preview_test_buttons.js
		testButtons := []*TestGeneratedButton{
			{
				ID:        fmt.Sprintf("flask_1_%d", time.Now().Unix()),
				Title:     "🐍 Flask依存関係インストール",
				Command:   "pip install flask",
				Category:  "setup",
				Framework: "flask",
				Color:     "#2196F3",
				Priority:  1,
				Source:    "test_generator",
				CreatedAt: time.Now(),
			},
			{
				ID:        fmt.Sprintf("flask_2_%d", time.Now().Unix()),
				Title:     "📝 Flaskアプリ作成",
				Command:   "touch app.py",
				Category:  "create",
				Framework: "flask",
				Color:     "#4CAF50",
				Priority:  2,
				Source:    "test_generator",
				CreatedAt: time.Now(),
			},
			{
				ID:        fmt.Sprintf("flask_3_%d", time.Now().Unix()),
				Title:     "🚀 Flaskサーバー起動",
				Command:   "python app.py",
				Category:  "run",
				Framework: "flask",
				Color:     "#FF9800",
				Priority:  3,
				Source:    "test_generator",
				CreatedAt: time.Now(),
			},
			{
				ID:        fmt.Sprintf("flask_4_%d", time.Now().Unix()),
				Title:     "🌐 ホームページ確認",
				Command:   "curl http://localhost:5000/",
				Category:  "test",
				Framework: "flask",
				Color:     "#9C27B0",
				Priority:  4,
				Source:    "test_generator",
				CreatedAt: time.Now(),
			},
			{
				ID:        fmt.Sprintf("flask_5_%d", time.Now().Unix()),
				Title:     "🏢 会社情報ページ確認",
				Command:   "curl http://localhost:5000/about",
				Category:  "test",
				Framework: "flask",
				Color:     "#9C27B0",
				Priority:  5,
				Source:    "test_generator",
				CreatedAt: time.Now(),
			},
		}
		
		// Add buttons to session
// 		for _, button := range testButtons {
// 			if err := GlobalButtonDB.AddButtonToSession(sessionID, button); err != nil {
// 				log.Printf("❌ Failed to add test button: %v", err)
// 			}
// 		}
		
		log.Printf("✅ Added %d test buttons to session %s", len(testButtons), sessionID)
	}
	
	// Setup HTTP endpoint for button retrieval
	http.HandleFunc("/api/buttons", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		
		sessionID := r.URL.Query().Get("session")
		if sessionID == "" {
			sessionID = "test_session_demo" // Default test session
		}
		
		if GlobalButtonDB == nil {
			http.Error(w, "Button database not initialized", http.StatusInternalServerError)
			return
		}
		
		buttons, err := GlobalButtonDB.GetSessionButtons(sessionID)
		if err != nil {
			log.Printf("❌ Failed to get buttons for session %s: %v", sessionID, err)
			http.Error(w, fmt.Sprintf("Failed to get buttons: %v", err), http.StatusInternalServerError)
			return
		}
		
		response := map[string]interface{}{
			"status":     "success",
			"session_id": sessionID,
			"buttons":    buttons,
			"count":      len(buttons),
			"timestamp":  time.Now(),
		}
		
		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Printf("❌ Failed to encode buttons response: %v", err)
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
			return
		}
		
		log.Printf("📤 Served %d buttons for session %s", len(buttons), sessionID)
	})
	
	log.Printf("🔗 Test button endpoint ready: /api/buttons")
}

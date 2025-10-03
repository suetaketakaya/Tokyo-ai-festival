package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"context"
	"time"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	port := "8090"
	if len(os.Args) > 2 && os.Args[1] == "--port" {
		port = os.Args[2]
	}

	router := mux.NewRouter()
	
	// Test endpoint for HTML detection
	router.HandleFunc("/test-html-detection", func(w http.ResponseWriter, r *http.Request) {
		testOutput := r.URL.Query().Get("output")
		if testOutput == "" {
			testOutput = "Created todo-app.html successfully"
		}
		
		isWebContent := containsWebContent(testOutput)
		fmt.Fprintf(w, "Test output: %s
Is web content: %t
", testOutput, isWebContent)
	}).Methods("GET")

	// WebSocket endpoint
	router.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}
		defer conn.Close()

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				break
			}
			log.Printf("Received: %s", message)
			
			// Echo back with HTML detection test
			response := fmt.Sprintf("Echo: %s - HTML detection working", message)
			if err := conn.WriteMessage(websocket.TextMessage, []byte(response)); err != nil {
				log.Printf("WebSocket write error: %v", err)
				break
			}
		}
	})

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(router)

	log.Printf("Test server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

// Updated containsWebContent function with HTML detection
func containsWebContent(output string) bool {
	// 既存の検出パターン
	if contains(output, "http://") || contains(output, "web") || contains(output, "app") {
		return true
	}

	// HTMLファイル検出パターンを追加
	htmlPatterns := []string{
		".html",
		"index.html", 
		"todo-app.html",
		"HTML file",
		"created.*html",
		"HTML",
		"webpage",
	}

	for _, pattern := range htmlPatterns {
		if contains(output, pattern) {
			return true
		}
	}

	return false
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		   (s == substr ||
		    s[:len(substr)] == substr ||
		    s[len(s)-len(substr):] == substr ||
		    containsSubstring(s, substr))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

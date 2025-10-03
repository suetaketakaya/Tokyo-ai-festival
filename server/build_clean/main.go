package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	qrcode "github.com/skip2/go-qrcode"
)

const (
	DefaultPort  = "8090"
	QRWidth      = 256
	QRHeight     = 256
)

type Server struct {
	Port string
	Host string
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	port := os.Getenv("REMOTECLAUDE_PORT")
	if port == "" {
		port = DefaultPort
	}

	for i, arg := range os.Args {
		if arg == "--port" && i+1 < len(os.Args) {
			port = os.Args[i+1]
		}
	}

	server := &Server{
		Port: port,
		Host: "192.168.0.135",
	}

	log.Printf("🚀 Starting ClaudeOps Remote Server on port %s", port)

	// Generate QR code
	sessionKey := generateSessionKey()
	url := fmt.Sprintf("ws://%s:%s/ws?key=%s", server.Host, port, sessionKey)

	qr, _ := qrcode.New(url, qrcode.Medium)
	qr.WriteFile(QRWidth, "qr-code.png")

	log.Printf("🔗 Connection URL: %s", url)
	log.Printf("🔑 Session Key: %s", sessionKey)

	// Setup WebSocket handler
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, sessionKey, server)
	})

	http.HandleFunc("/status", handleStatus)

	bindAddr := "0.0.0.0:" + port
	log.Printf("🎯 Ready for connections on %s...", bindAddr)

	if err := http.ListenAndServe(bindAddr, nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func generateSessionKey() string {
	return fmt.Sprintf("%d", time.Now().UnixNano()%1000000000000)
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request, validKey string, server *Server) {
	_ = r.URL.Query().Get("key") // Session key validation can be added here

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("✅ Mobile app connected from: %s", r.RemoteAddr)

	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}

		log.Printf("📱 Received from app: %v", msg)

		msgType, _ := msg["type"].(string)

		switch msgType {
		case "ping":
			conn.WriteJSON(map[string]interface{}{
				"type": "pong",
				"data": msg["data"],
			})

		case "project_list_request":
			conn.WriteJSON(map[string]interface{}{
				"type": "project_list_response",
				"data": map[string]interface{}{
					"projects": []map[string]interface{}{
						{
							"id":           "demo-1759406078",
							"name":         "demo",
							"status":       "running",
							"container_id": "8f0bf28051d0",
							"type":         "general",
						},
					},
					"total": 1,
				},
			})

		case "claude_execute":
			handleClaudeExecute(conn, msg, server)
		}
	}
}

func handleClaudeExecute(conn *websocket.Conn, msg map[string]interface{}, server *Server) {
	data, _ := msg["data"].(map[string]interface{})
	command, _ := data["command"].(string)

	log.Printf("🎯 Executing command: %s", command)

	// Determine if this is a Linux command or needs code generation
	if isDirectLinuxCommand(command) {
		executeDirectCommand(conn, command, data)
	} else {
		executeWithCodeGeneration(conn, command, data)
	}
}

func isDirectLinuxCommand(command string) bool {
	// Check if this is a simple Linux command
	cmd := strings.TrimSpace(command)
	if len(strings.Fields(cmd)) == 0 {
		return false
	}

	directCommands := []string{
		"ls", "pwd", "cd", "cat", "echo", "mkdir", "rm", "cp", "mv",
		"grep", "find", "ps", "top", "df", "du", "free", "uname",
	}

	firstWord := strings.Fields(cmd)[0]
	for _, dc := range directCommands {
		if firstWord == dc {
			return true
		}
	}
	return false
}

func executeDirectCommand(conn *websocket.Conn, command string, data map[string]interface{}) {
	// Send progress
	log.Printf("📤 Sending execution_progress message")
	err := conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "executing",
			"progress": 50,
			"message":  "コマンド実行中...",
		},
	})
	if err != nil {
		log.Printf("❌ Failed to send progress: %v", err)
	}

	// Execute command (placeholder - real implementation would use docker exec)
	output := fmt.Sprintf("Command executed: %s\n(Direct execution - implementation pending)", command)

	// Send result
	log.Printf("📤 Sending claude_output message: %s", output)
	err = conn.WriteJSON(map[string]interface{}{
		"type": "claude_output",
		"data": map[string]interface{}{
			"output":  output,
			"command": command,
			"status":  "completed",
		},
	})
	if err != nil {
		log.Printf("❌ Failed to send output: %v", err)
	} else {
		log.Printf("✅ Successfully sent claude_output")
	}
}

func executeWithCodeGeneration(conn *websocket.Conn, command string, data map[string]interface{}) {
	// Stage 1: Analysis
	log.Printf("📤 Stage 1: Sending analyzing progress")
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "analyzing",
			"progress": 10,
			"message":  "コマンド分析中...",
		},
	})

	time.Sleep(500 * time.Millisecond)

	// Analyze command
	cmdType := determineCommandType(command)
	framework := detectFramework(command)

	log.Printf("📊 Command analysis: type=%s, framework=%s", cmdType, framework)

	// Stage 2: Code generation
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "generating",
			"progress": 30,
			"message":  "コード生成中...",
		},
	})

	time.Sleep(500 * time.Millisecond)

	code := generateCodeContent(command, cmdType, framework)

	// Send generated code
	log.Printf("📤 Sending code_generated message (%d bytes)", len(code))
	conn.WriteJSON(map[string]interface{}{
		"type": "code_generated",
		"data": map[string]interface{}{
			"code": code,
		},
	})

	// Stage 3: Execution
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "executing",
			"progress": 70,
			"message":  "コード実行中...",
		},
	})

	time.Sleep(500 * time.Millisecond)

	// Check if preview should be shown
	if cmdType == "web_app" || framework == "react" {
		conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"file_name":    "todo-app.html",
				"preview_type": "web",
				"port":         8000,
			},
		})
	}

	// Stage 4: Completion
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "completed",
			"progress": 100,
			"message":  "実行完了",
		},
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok","mode":"local"}`))
}

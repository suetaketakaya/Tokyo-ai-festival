package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/gorilla/websocket"
	"github.com/skip2/go-qrcode"
)

const (
	DefaultPort = "8090"
	QRWidth     = 50
	QRHeight    = 50
)

// Enhanced Server with Smart Terminal Integration
type EnhancedServer struct {
	Host          string
	Port          string
	SecretKey     string
	upgrader      websocket.Upgrader
	dockerManager *DockerManager
	configManager *ConfigManager
	terminalProcessor *SmartTerminalProcessor
	wandbIntegration  *WandBIntegration

	// Session management
	sessions      map[string]*ConversationSession
	sessionsMutex sync.RWMutex

	// Web-Mobile synchronization
	webClients    map[string]chan map[string]interface{}
	webMutex      sync.RWMutex

	// Preview management
	previewSessions map[string]*PreviewSession
	previewMutex    sync.RWMutex
}

// Enhanced message structure for smart terminal
type SmartMessage struct {
	Type        string      `json:"type"`
	Command     string      `json:"command"`
	ProjectID   string      `json:"project_id"`
	Content     string      `json:"content"`
	Metadata    interface{} `json:"metadata,omitempty"`
	Timestamp   time.Time   `json:"timestamp"`
	RequiresPreview bool    `json:"requires_preview,omitempty"`
	PreviewURL      string  `json:"preview_url,omitempty"`
	CommandType     string  `json:"command_type,omitempty"`
}

// Enhanced response structure
type SmartResponse struct {
	Type        string      `json:"type"`
	Content     string      `json:"content"`
	Output      string      `json:"output,omitempty"`
	Error       string      `json:"error,omitempty"`
	ExitCode    int         `json:"exit_code,omitempty"`
	Duration    string      `json:"duration,omitempty"`
	PreviewURL  string      `json:"preview_url,omitempty"`
	RequiresPreview bool    `json:"requires_preview,omitempty"`
	ProcessID   string      `json:"process_id,omitempty"`
	CurrentDir  string      `json:"current_dir,omitempty"`
	Suggestions []string    `json:"suggestions,omitempty"`
	Timestamp   time.Time   `json:"timestamp"`
}

// PreviewSession manages preview instances
type PreviewSession struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	Port      int       `json:"port"`
	ProcessID string    `json:"process_id"`
	CreatedAt time.Time `json:"created_at"`
	Type      string    `json:"type"` // "matplotlib", "web", "gui"
}

// WandBIntegration for model training optimization
type WandBIntegration struct {
	APIKey     string
	Entity     string
	Project    string
	Enabled    bool
	RunID      string
	mutex      sync.RWMutex
}

// NewEnhancedServer creates a new enhanced server
func NewEnhancedServer(port string) *EnhancedServer {
	// Generate random secret key for this session
	key := make([]byte, 16)
	rand.Read(key)
	secretKey := hex.EncodeToString(key)

	// Initialize Docker manager
	dockerManager := NewDockerManager("./projects")

	// Initialize Configuration manager
	configManager := NewConfigManager()

	// Initialize Smart Terminal Processor
	terminalProcessor := NewSmartTerminalProcessor()

	// Initialize W&B Integration
	wandbIntegration := &WandBIntegration{
		APIKey:  "3c424d79b35640897bb8d970bbcdc872bdf9561a", // From user request
		Entity:  "ai-development-team",
		Project: "claude-code-optimization",
		Enabled: true,
	}

	// Initialize Container Context Manager
	InitializeContainerContextManager(dockerManager)

	// Initialize Matplotlib Detector
	InitializeMatplotlibDetector(dockerManager)

	// Initialize Project Management Handler
	InitializeProjectManagementHandler(dockerManager)

	return &EnhancedServer{
		Port:             port,
		SecretKey:        secretKey,
		dockerManager:    dockerManager,
		configManager:    configManager,
		terminalProcessor: terminalProcessor,
		wandbIntegration: wandbIntegration,
		sessions:         make(map[string]*ConversationSession),
		webClients:       make(map[string]chan map[string]interface{}),
		previewSessions:  make(map[string]*PreviewSession),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for mobile app connection
			},
			EnableCompression: true,
			HandshakeTimeout:  30 * time.Second,
			ReadBufferSize:    10 * 1024 * 1024, // 10MB read buffer
			WriteBufferSize:   10 * 1024 * 1024, // 10MB write buffer
		},
	}
}

// Enhanced WebSocket handler with smart terminal processing
func (s *EnhancedServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Validate secret key
	key := r.URL.Query().Get("key")
	if key != s.SecretKey {
		http.Error(w, "Invalid key", http.StatusUnauthorized)
		return
	}

	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	clientIP := r.Header.Get("X-Forwarded-For")
	if clientIP == "" {
		clientIP = r.RemoteAddr
	}

	log.Printf("📱 New client connected from %s", clientIP)

	// Initialize W&B run for this session
	s.initializeWandBRun()

	for {
		var msg SmartMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("❌ Read error: %v", err)
			break
		}

		msg.Timestamp = time.Now()

		// Log to W&B
		s.logToWandB("command_received", map[string]interface{}{
			"command": msg.Command,
			"type": msg.Type,
			"client_ip": clientIP,
		})

		// Process the command with smart terminal
		response := s.processSmartCommand(&msg)

		// Log response to W&B
		s.logToWandB("command_processed", map[string]interface{}{
			"command": msg.Command,
			"success": response.Error == "",
			"duration": response.Duration,
			"requires_preview": response.RequiresPreview,
		})

		// Send response
		if err := conn.WriteJSON(response); err != nil {
			log.Printf("❌ Write error: %v", err)
			break
		}
	}

	log.Printf("📱 Client disconnected from %s", clientIP)
}

// processSmartCommand processes commands using the smart terminal processor
func (s *EnhancedServer) processSmartCommand(msg *SmartMessage) *SmartResponse {
	start := time.Now()

	// Handle special commands first
	switch msg.Type {
	case "tab_completion":
		return s.handleTabCompletion(msg)
	case "get_history":
		return s.handleGetHistory(msg)
	case "stop_process":
		return s.handleStopProcess(msg)
	case "get_preview_sessions":
		return s.handleGetPreviewSessions(msg)
	}

	// Analyze and execute the command
	ctx := s.terminalProcessor.AnalyzeCommand(msg.Command)
	result, err := s.terminalProcessor.ExecuteCommand(ctx)

	response := &SmartResponse{
		Type:       "command_result",
		Content:    msg.Command,
		Timestamp:  time.Now(),
		CurrentDir: s.terminalProcessor.GetCurrentDirectory(),
	}

	if err != nil {
		response.Error = err.Error()
		return response
	}

	// Populate response from execution result
	response.Output = result.Output
	response.Error = result.Error
	response.ExitCode = result.ExitCode
	response.Duration = result.Duration.String()
	response.RequiresPreview = result.RequiresPreview
	response.ProcessID = result.ProcessID

	// Handle preview sessions
	if result.RequiresPreview && result.PreviewURL != "" {
		previewSession := &PreviewSession{
			ID:        fmt.Sprintf("preview_%d", time.Now().Unix()),
			URL:       result.PreviewURL,
			Port:      extractPortFromURL(result.PreviewURL),
			ProcessID: result.ProcessID,
			CreatedAt: time.Now(),
			Type:      detectPreviewType(msg.Command),
		}

		s.previewMutex.Lock()
		s.previewSessions[previewSession.ID] = previewSession
		s.previewMutex.Unlock()

		response.PreviewURL = result.PreviewURL

		// Log preview creation to W&B
		s.logToWandB("preview_created", map[string]interface{}{
			"preview_id": previewSession.ID,
			"url": result.PreviewURL,
			"type": previewSession.Type,
		})
	}

	// Determine command type for response
	switch ctx.Type {
	case SystemCommand:
		response.CommandType = "system"
	case PythonCode:
		response.CommandType = "python"
	case FileExecution:
		response.CommandType = "file_execution"
	case ClaudeCodeTask:
		response.CommandType = "claude_code_task"
		// For Claude Code tasks, enhance the response
		response.Content = s.enhanceClaudeCodeResponse(msg.Command, result.Output)
	}

	return response
}

// handleTabCompletion provides tab completion suggestions
func (s *EnhancedServer) handleTabCompletion(msg *SmartMessage) *SmartResponse {
	suggestions := s.terminalProcessor.GetTabCompletion(msg.Command)

	return &SmartResponse{
		Type:        "tab_completion",
		Suggestions: suggestions,
		CurrentDir:  s.terminalProcessor.GetCurrentDirectory(),
		Timestamp:   time.Now(),
	}
}

// handleGetHistory returns command history
func (s *EnhancedServer) handleGetHistory(msg *SmartMessage) *SmartResponse {
	history := s.terminalProcessor.GetHistory()

	return &SmartResponse{
		Type:        "history",
		Suggestions: history,
		CurrentDir:  s.terminalProcessor.GetCurrentDirectory(),
		Timestamp:   time.Now(),
	}
}

// handleStopProcess stops a running process
func (s *EnhancedServer) handleStopProcess(msg *SmartMessage) *SmartResponse {
	err := s.terminalProcessor.StopProcess(msg.Command)

	response := &SmartResponse{
		Type:       "process_stopped",
		Content:    msg.Command,
		CurrentDir: s.terminalProcessor.GetCurrentDirectory(),
		Timestamp:  time.Now(),
	}

	if err != nil {
		response.Error = err.Error()
	} else {
		response.Output = fmt.Sprintf("Process %s stopped successfully", msg.Command)
	}

	return response
}

// handleGetPreviewSessions returns active preview sessions
func (s *EnhancedServer) handleGetPreviewSessions(msg *SmartMessage) *SmartResponse {
	s.previewMutex.RLock()
	sessions := make([]*PreviewSession, 0, len(s.previewSessions))
	for _, session := range s.previewSessions {
		sessions = append(sessions, session)
	}
	s.previewMutex.RUnlock()

	return &SmartResponse{
		Type:      "preview_sessions",
		Metadata:  sessions,
		Timestamp: time.Now(),
	}
}

// enhanceClaudeCodeResponse enhances responses for Claude Code tasks
func (s *EnhancedServer) enhanceClaudeCodeResponse(command, output string) string {
	// Use W&B to optimize response quality
	s.logToWandB("claude_code_task", map[string]interface{}{
		"command": command,
		"output_length": len(output),
	})

	// Enhanced response formatting
	enhanced := fmt.Sprintf(`
🤖 AI Development Assistant
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Task: %s

💡 Analysis:
This appears to be a complex development task that requires AI assistance.
The system will now engage Claude Code CLI for detailed implementation.

🔧 Recommended Actions:
1. Break down the task into smaller components
2. Identify required technologies and dependencies
3. Create implementation plan
4. Execute step-by-step development
5. Test and validate results

⚡ Status: Forwarding to Claude Code AI Assistant...

%s`, command, output)

	return enhanced
}

// W&B Integration methods
func (s *EnhancedServer) initializeWandBRun() {
	if !s.wandbIntegration.Enabled {
		return
	}

	s.wandbIntegration.mutex.Lock()
	defer s.wandbIntegration.mutex.Unlock()

	// Create a new W&B run
	runID := fmt.Sprintf("claude_session_%d", time.Now().Unix())
	s.wandbIntegration.RunID = runID

	// Initialize W&B (this would typically use the wandb library)
	log.Printf("🔬 W&B Run initialized: %s", runID)
}

func (s *EnhancedServer) logToWandB(event string, data map[string]interface{}) {
	if !s.wandbIntegration.Enabled {
		return
	}

	// Add timestamp and run ID
	data["timestamp"] = time.Now().Unix()
	data["run_id"] = s.wandbIntegration.RunID

	// Log event (this would typically use the wandb library)
	log.Printf("📊 W&B Log [%s]: %v", event, data)
}

// Helper functions
func extractPortFromURL(url string) int {
	// Extract port from URL like "http://localhost:8080"
	parts := strings.Split(url, ":")
	if len(parts) >= 3 {
		port := strings.TrimRight(parts[2], "/")
		if portNum := 0; fmt.Sscanf(port, "%d", &portNum) == 1 {
			return portNum
		}
	}
	return 8080 // default
}

func detectPreviewType(command string) string {
	if strings.Contains(command, "matplotlib") || strings.Contains(command, "plt.") {
		return "matplotlib"
	}
	if strings.Contains(command, "streamlit") || strings.Contains(command, "flask") || strings.Contains(command, "fastapi") {
		return "web"
	}
	if strings.Contains(command, "tkinter") || strings.Contains(command, "PyQt") {
		return "gui"
	}
	return "unknown"
}

// Enhanced web interface handler
func (s *EnhancedServer) handleWebInterface(w http.ResponseWriter, r *http.Request) {
	html := `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 ClaudeOps スマートターミナル</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #fff;
            height: 100vh;
            overflow: hidden;
        }
        .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .header {
            background: rgba(0,0,0,0.2);
            padding: 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .terminal-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 1rem;
            overflow: hidden;
        }
        .terminal {
            flex: 1;
            background: rgba(0,0,0,0.8);
            border-radius: 8px;
            padding: 1rem;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.4;
        }
        .input-container {
            display: flex;
            margin-top: 1rem;
            background: rgba(0,0,0,0.8);
            border-radius: 8px;
            padding: 0.5rem;
        }
        .prompt {
            color: #4CAF50;
            margin-right: 0.5rem;
        }
        .input {
            flex: 1;
            background: transparent;
            border: none;
            color: #fff;
            font-family: inherit;
            font-size: 14px;
            outline: none;
        }
        .output {
            margin: 0.5rem 0;
            padding: 0.5rem;
            background: rgba(255,255,255,0.05);
            border-radius: 4px;
        }
        .error {
            color: #f44336;
        }
        .success {
            color: #4CAF50;
        }
        .preview {
            color: #2196F3;
        }
        .sidebar {
            position: fixed;
            right: 0;
            top: 0;
            width: 300px;
            height: 100vh;
            background: rgba(0,0,0,0.9);
            padding: 1rem;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }
        .sidebar.open {
            transform: translateX(0);
        }
        .toggle-sidebar {
            position: fixed;
            right: 1rem;
            top: 1rem;
            background: rgba(0,0,0,0.7);
            border: none;
            color: #fff;
            padding: 0.5rem;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 ClaudeOps スマートターミナル</h1>
            <p>AI駆動開発環境 - 技術弱者も安心して開発できるスマートシステム</p>
        </div>

        <div class="terminal-container">
            <div class="terminal" id="terminal">
                <div class="output success">
                    🎯 スマートターミナルが起動しました！
                    <br>• Linux基本コマンド（ls, cd, pwd等）は最優先で実行
                    <br>• Pythonコード・スクリプトは自動判別して実行
                    <br>• 複雑なタスクは自動的にClaude Code AIに転送
                    <br>• TABキーで補完、↑キーで履歴表示
                    <br>• プレビューが必要なプログラムは自動的にプレビューモードで表示
                </div>
            </div>

            <div class="input-container">
                <span class="prompt">claude@smart-terminal:~$</span>
                <input type="text" class="input" id="commandInput" placeholder="コマンドを入力してください..." autocomplete="off">
            </div>
        </div>
    </div>

    <button class="toggle-sidebar" onclick="toggleSidebar()">📊</button>

    <div class="sidebar" id="sidebar">
        <h3>📊 セッション情報</h3>
        <div id="sessionInfo"></div>

        <h3>🖥️ プレビューセッション</h3>
        <div id="previewSessions"></div>

        <h3>📈 W&B統計</h3>
        <div id="wandbStats"></div>
    </div>

    <script>
        class SmartTerminal {
            constructor() {
                this.ws = null;
                this.terminal = document.getElementById('terminal');
                this.input = document.getElementById('commandInput');
                this.history = [];
                this.historyIndex = -1;
                this.currentDir = '~';

                this.connect();
                this.setupEventListeners();
            }

            connect() {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = protocol + '//' + window.location.host.replace(':8080', ':8090') + '/ws?key=' + new URLSearchParams(window.location.search).get('key') || 'demo';

                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    this.addOutput('✅ WebSocket接続が確立されました', 'success');
                };

                this.ws.onmessage = (event) => {
                    const response = JSON.parse(event.data);
                    this.handleResponse(response);
                };

                this.ws.onerror = (error) => {
                    this.addOutput('❌ WebSocket接続エラー: ' + error, 'error');
                };

                this.ws.onclose = () => {
                    this.addOutput('🔌 WebSocket接続が切断されました', 'error');
                };
            }

            setupEventListeners() {
                this.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.executeCommand();
                    } else if (e.key === 'Tab') {
                        e.preventDefault();
                        this.requestTabCompletion();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.navigateHistory(-1);
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        this.navigateHistory(1);
                    }
                });
            }

            executeCommand() {
                const command = this.input.value.trim();
                if (!command) return;

                this.addOutput(this.currentDir + '$ ' + command, '');
                this.history.push(command);
                this.historyIndex = this.history.length;

                this.sendMessage({
                    type: 'command',
                    command: command,
                    project_id: 'default'
                });

                this.input.value = '';
            }

            requestTabCompletion() {
                const partial = this.input.value;
                this.sendMessage({
                    type: 'tab_completion',
                    command: partial
                });
            }

            navigateHistory(direction) {
                if (this.history.length === 0) return;

                this.historyIndex += direction;
                if (this.historyIndex < 0) this.historyIndex = 0;
                if (this.historyIndex >= this.history.length) this.historyIndex = this.history.length - 1;

                this.input.value = this.history[this.historyIndex] || '';
            }

            sendMessage(message) {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify(message));
                }
            }

            handleResponse(response) {
                if (response.current_dir) {
                    this.currentDir = response.current_dir;
                }

                switch (response.type) {
                    case 'command_result':
                        this.handleCommandResult(response);
                        break;
                    case 'tab_completion':
                        this.handleTabCompletion(response);
                        break;
                    case 'history':
                        this.handleHistory(response);
                        break;
                    default:
                        this.addOutput(JSON.stringify(response, null, 2), '');
                }
            }

            handleCommandResult(response) {
                if (response.output) {
                    this.addOutput(response.output, response.error ? 'error' : 'success');
                }

                if (response.error) {
                    this.addOutput('Error: ' + response.error, 'error');
                }

                if (response.requires_preview && response.preview_url) {
                    this.addOutput('🖥️ プレビューが利用可能: ' + response.preview_url, 'preview');
                    this.addPreviewLink(response.preview_url);
                }

                if (response.duration) {
                    this.addOutput('⏱️ 実行時間: ' + response.duration, '');
                }
            }

            handleTabCompletion(response) {
                if (response.suggestions && response.suggestions.length > 0) {
                    // Simple completion - use first suggestion
                    this.input.value = response.suggestions[0];

                    // Show all suggestions
                    this.addOutput('💡 補完候補: ' + response.suggestions.join(', '), '');
                }
            }

            handleHistory(response) {
                if (response.suggestions) {
                    this.history = response.suggestions;
                    this.addOutput('📚 履歴が更新されました (' + this.history.length + ' 件)', '');
                }
            }

            addOutput(text, className) {
                const output = document.createElement('div');
                output.className = 'output ' + className;
                output.textContent = text;
                this.terminal.appendChild(output);
                this.terminal.scrollTop = this.terminal.scrollHeight;
            }

            addPreviewLink(url) {
                const link = document.createElement('div');
                link.className = 'output preview';
                link.innerHTML = '<a href="' + url + '" target="_blank" style="color: #2196F3;">🔗 プレビューを開く</a>';
                this.terminal.appendChild(link);
                this.terminal.scrollTop = this.terminal.scrollHeight;
            }
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('open');
        }

        // Initialize terminal when page loads
        window.addEventListener('load', () => {
            new SmartTerminal();
        });
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

// Main function for enhanced server
func mainEnhanced() {
	port := flag.String("port", DefaultPort, "Port to run server on")
	flag.Parse()

	server := NewEnhancedServer(*port)

	// Setup routes
	http.HandleFunc("/ws", server.handleWebSocket)
	http.HandleFunc("/", server.handleWebInterface)
	http.HandleFunc("/preview/", server.handlePreviewProxy)

	// Generate and display connection information
	server.generateAndDisplayQR()

	// Start server
	address := fmt.Sprintf("0.0.0.0:%s", *port)
	log.Printf("🎯 Enhanced Smart Server ready on %s", address)

	if err := http.ListenAndServe(address, nil); err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}

// generateAndDisplayQR generates QR code for mobile connection
func (s *EnhancedServer) generateAndDisplayQR() {
	// Implementation similar to original server
	localIP := s.getLocalIP()
	connectionURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", localIP, s.Port, s.SecretKey)

	// Generate QR code
	qr, err := qrcode.New(connectionURL, qrcode.Medium)
	if err != nil {
		log.Printf("❌ Failed to generate QR code: %v", err)
		return
	}

	// Save QR code as image
	err = qr.WriteFile(256, "qr-code.png")
	if err != nil {
		log.Printf("❌ Failed to save QR code: %v", err)
	} else {
		log.Printf("✅ QR code saved as qr-code.png")
	}

	// Display connection info
	fmt.Printf("\n🚀 Enhanced ClaudeOps Smart Terminal Server Started!\n")
	fmt.Printf("Connection URL: %s\n", connectionURL)
	fmt.Printf("🔑 Session Key: %s\n", s.SecretKey)
	fmt.Printf("🌐 Web Interface: http://%s:8080\n", localIP)
	fmt.Printf("📱 Scan QR code with mobile app or enter URL manually\n\n")
}

// getLocalIP gets local IP address
func (s *EnhancedServer) getLocalIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "localhost"
	}
	defer conn.Close()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

// handlePreviewProxy handles preview proxying
func (s *EnhancedServer) handlePreviewProxy(w http.ResponseWriter, r *http.Request) {
	// Simple proxy for preview sessions
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "text/html")

	html := `
<!DOCTYPE html>
<html>
<head>
    <title>Preview</title>
    <style>
        body { margin: 0; padding: 20px; font-family: sans-serif; }
        iframe { width: 100%; height: 80vh; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>🖥️ プレビューセッション</h1>
    <iframe src="` + r.URL.Path[9:] + `"></iframe>
</body>
</html>`

	w.Write([]byte(html))
}
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/skip2/go-qrcode"
)

const (
	DefaultPort = "8090"
	QRWidth     = 50
	QRHeight    = 50
)

type Server struct {
	Host          string
	Port          string
	SecretKey     string
	upgrader      websocket.Upgrader
	dockerManager *DockerManager
}

func NewServer(port string) *Server {
	// Generate random secret key for this session
	key := make([]byte, 16)
	rand.Read(key)
	secretKey := hex.EncodeToString(key)

	// Initialize Docker manager
	dockerManager := NewDockerManager("./projects")

	return &Server{
		Port:          port,
		SecretKey:     secretKey,
		dockerManager: dockerManager,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for development
			},
		},
	}
}

func (s *Server) getLocalIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "localhost"
	}
	defer conn.Close()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

func (s *Server) generateQRCode() string {
	s.Host = s.getLocalIP()
	connectionURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", s.Host, s.Port, s.SecretKey)
	
	fmt.Printf("🚀 RemoteClaude Server Started!\n")
	fmt.Printf("Connection URL: %s\n", connectionURL)
	fmt.Printf("🔑 Session Key: %s\n", s.SecretKey)
	fmt.Printf("\n")
	
	// Generate actual scannable QR code
	s.printRealQRCode(connectionURL)
	
	// Also save QR code as image file
	s.saveQRCodeImage(connectionURL)
	
	return connectionURL
}

// Generate and print real scannable QR code in terminal
func (s *Server) printRealQRCode(url string) {
	// Generate QR code data
	qr, err := qrcode.New(url, qrcode.Medium)
	if err != nil {
		log.Printf("❌ Failed to generate QR code: %v", err)
		s.printFallbackQR(url)
		return
	}

	// Get QR code as string (terminal friendly)
	qrString := qr.ToSmallString(false)
	
	fmt.Printf("QR Code (scan with iPhone app):\n")
	fmt.Printf("┌────────────────────────────────────────────────────────────────┐\n")
	
	// Split QR string into lines and format
	lines := strings.Split(qrString, "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			// Center the QR code and add padding
			lineLen := len(line)
			if lineLen > 62 { // Max content width is 62 (64 - 2 for borders)
				line = line[:62]
				lineLen = 62
			}
			
			padding := (62 - lineLen) / 2
			if padding < 0 {
				padding = 0
			}
			
			rightPadding := 62 - lineLen - padding
			if rightPadding < 0 {
				rightPadding = 0
			}
			
			fmt.Printf("│%s%s%s│\n", 
				strings.Repeat(" ", padding),
				line,
				strings.Repeat(" ", rightPadding))
		}
	}
	
	fmt.Printf("│                                                                │\n")
	fmt.Printf("│  🔗 Connection URL:                                            │\n")
	fmt.Printf("│  %s  │\n", formatURLForDisplay(url))
	fmt.Printf("│                                                                │\n")
	fmt.Printf("│  📋 Manual entry: Tap 'Enter URL Manually' in app             │\n")
	fmt.Printf("│  📁 Image saved: ./qr-code.png                                │\n")
	fmt.Printf("└────────────────────────────────────────────────────────────────┘\n")
	fmt.Printf("\n")
}

// Fallback QR display if generation fails
func (s *Server) printFallbackQR(url string) {
	fmt.Printf("QR Code generation failed - Manual connection required:\n")
	fmt.Printf("┌────────────────────────────────────────────────────────────────┐\n")
	fmt.Printf("│                                                                │\n")
	fmt.Printf("│  ❌ QR Code generation failed                                  │\n")
	fmt.Printf("│                                                                │\n")
	fmt.Printf("│  🔗 Please use manual connection:                              │\n")
	fmt.Printf("│  %s  │\n", formatURLForDisplay(url))
	fmt.Printf("│                                                                │\n")
	fmt.Printf("│  In iPhone app: Tap 'Enter URL Manually'                   │\n")
	fmt.Printf("│                                                                │\n")
	fmt.Printf("└────────────────────────────────────────────────────────────────┘\n")
	fmt.Printf("\n")
}

// Format long URL for display
func formatURLForDisplay(url string) string {
	if len(url) <= 60 {
		return fmt.Sprintf("%-60s", url)
	}
	return url[:57] + "..."
}

// Save QR code as PNG image
func (s *Server) saveQRCodeImage(url string) {
	err := qrcode.WriteFile(url, qrcode.Medium, 256, "./qr-code.png")
	if err != nil {
		log.Printf("❌ Failed to save QR code image: %v", err)
		return
	}
	log.Printf("✅ QR code saved as qr-code.png")
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Validate secret key
	key := r.URL.Query().Get("key")
	if key != s.SecretKey {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("iPhone connected from: %s", conn.RemoteAddr())

	// Send welcome message
	welcome := map[string]interface{}{
		"type": "connection_established",
		"data": map[string]interface{}{
			"server_version": "2.0",
			"capabilities":   []string{"project_management", "claude_execution", "git_integration"},
		},
	}
	conn.WriteJSON(welcome)

	// Handle messages
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}

		log.Printf("Received: %+v", msg)
		s.handleMessage(conn, msg)
	}
}

func (s *Server) handleMessage(conn *websocket.Conn, msg map[string]interface{}) {
	msgType, ok := msg["type"].(string)
	if !ok {
		s.sendError(conn, "Invalid message format")
		return
	}

	switch msgType {
	case "ping":
		s.sendMessage(conn, "pong", map[string]interface{}{"timestamp": msg["data"]})

	case "project_list_request":
		s.handleDockerProjectList(conn)

	case "project_create_request":
		s.handleProjectCreate(conn, msg)

	case "project_start_request":
		s.handleProjectStart(conn, msg)

	case "project_stop_request":
		s.handleProjectStop(conn, msg)

	case "project_remove_request":
		s.handleProjectRemove(conn, msg)

	case "claude_execute":
		s.handleDockerClaudeExecute(conn, msg)

	case "claude_execute_stream":
		s.handleDockerClaudeExecuteStream(conn, msg)

	case "settings_update":
		s.handleSettingsUpdate(conn, msg)

	case "settings_get":
		s.handleSettingsGet(conn, msg)

	default:
		s.sendError(conn, fmt.Sprintf("Unknown message type: %s", msgType))
	}
}

// Docker-based project management handlers
func (s *Server) handleDockerProjectList(conn *websocket.Conn) {
	log.Printf("🐳 Handling Docker project list request")
	
	projects, err := s.dockerManager.ListProjects()
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to list Docker projects: %v", err))
		return
	}
	
	// Convert to response format
	projectsResponse := make([]map[string]interface{}, len(projects))
	for i, project := range projects {
		projectsResponse[i] = map[string]interface{}{
			"id":            project.ID,
			"name":          project.Name,
			"type":          project.Type,
			"status":        project.Status,
			"container_id":  project.ContainerID[:12], // Short ID for display
			"image":         project.Image,
			"created_at":    project.CreatedAt.Format("2006-01-02T15:04:05Z"),
			"last_access":   project.LastAccess.Format("2006-01-02T15:04:05Z"),
			"resources":     project.Resources,
		}
	}

	s.sendMessage(conn, "project_list_response", map[string]interface{}{
		"projects": projectsResponse,
		"total":    len(projects),
	})
	
	log.Printf("✅ Sent %d Docker projects to client", len(projects))
}

func (s *Server) handleProjectCreate(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🐳 Handling project creation request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project creation message format")
		return
	}
	
	// Parse project creation request
	projectName, ok := data["name"].(string)
	if !ok || projectName == "" {
		s.sendError(conn, "Missing or invalid project name")
		return
	}
	
	projectType, ok := data["type"].(string)
	if !ok || projectType == "" {
		projectType = "general" // Default project type
	}
	
	// Parse optional configuration
	config := make(map[string]string)
	if configData, exists := data["config"].(map[string]interface{}); exists {
		for key, value := range configData {
			if strValue, ok := value.(string); ok {
				config[key] = strValue
			}
		}
	}
	
	// Parse optional resource limits
	var resources *ResourceLimits
	if resourceData, exists := data["resources"].(map[string]interface{}); exists {
		resources = &ResourceLimits{}
		if memory, ok := resourceData["memory"].(string); ok {
			resources.Memory = memory
		}
		if cpus, ok := resourceData["cpus"].(string); ok {
			resources.CPUs = cpus
		}
	}
	
	// Create project request
	createReq := ProjectCreateRequest{
		Name:      projectName,
		Type:      projectType,
		Config:    config,
		Resources: resources,
	}
	
	// Send status update
	s.sendMessage(conn, "project_create_status", map[string]interface{}{
		"status": "creating",
		"message": fmt.Sprintf("Creating Docker project: %s", projectName),
	})
	
	// Create the project
	project, err := s.dockerManager.CreateProject(createReq)
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to create project: %v", err))
		return
	}
	
	// Send success response
	s.sendMessage(conn, "project_create_response", map[string]interface{}{
		"project": map[string]interface{}{
			"id":            project.ID,
			"name":          project.Name,
			"type":          project.Type,
			"status":        project.Status,
			"container_id":  project.ContainerID[:12],
			"image":         project.Image,
			"created_at":    project.CreatedAt.Format("2006-01-02T15:04:05Z"),
			"resources":     project.Resources,
		},
		"message": fmt.Sprintf("✅ Project '%s' created successfully!", projectName),
	})
	
	log.Printf("✅ Created Docker project: %s (ID: %s)", projectName, project.ID)
}

func (s *Server) handleProjectStart(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🐳 Handling project start request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project start message format")
		return
	}
	
	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID")
		return
	}
	
	// Start the project
	err := s.dockerManager.StartProject(projectID)
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to start project: %v", err))
		return
	}
	
	s.sendMessage(conn, "project_start_response", map[string]interface{}{
		"project_id": projectID,
		"status":     "running",
		"message":    fmt.Sprintf("✅ Project '%s' started successfully!", projectID),
	})
	
	log.Printf("✅ Started Docker project: %s", projectID)
}

func (s *Server) handleProjectStop(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🐳 Handling project stop request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project stop message format")
		return
	}
	
	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID")
		return
	}
	
	// Stop the project
	err := s.dockerManager.StopProject(projectID)
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to stop project: %v", err))
		return
	}
	
	s.sendMessage(conn, "project_stop_response", map[string]interface{}{
		"project_id": projectID,
		"status":     "stopped",
		"message":    fmt.Sprintf("✅ Project '%s' stopped successfully!", projectID),
	})
	
	log.Printf("✅ Stopped Docker project: %s", projectID)
}

func (s *Server) handleProjectRemove(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🐳 Handling project remove request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project remove message format")
		return
	}
	
	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID")
		return
	}
	
	// Remove the project
	err := s.dockerManager.RemoveProject(projectID)
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to remove project: %v", err))
		return
	}
	
	s.sendMessage(conn, "project_remove_response", map[string]interface{}{
		"project_id": projectID,
		"message":    fmt.Sprintf("✅ Project '%s' removed successfully!", projectID),
	})
	
	log.Printf("✅ Removed Docker project: %s", projectID)
}

func (s *Server) handleDockerClaudeExecute(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🐳 Handling Docker Claude execution request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid Docker execute message format")
		return
	}
	
	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID")
		return
	}
	
	command, ok := data["command"].(string)
	if !ok || command == "" {
		s.sendError(conn, "Missing command")
		return
	}
	
	log.Printf("🤖 Executing in Docker container %s: %s", projectID, command)
	
	// Execute command in Docker container
	output, err := s.dockerManager.ExecuteCommand(projectID, command)
	
	if err != nil {
		s.sendMessage(conn, "claude_error", map[string]interface{}{
			"project_id": projectID,
			"error":      err.Error(),
			"command":    command,
			"output":     output,
		})
		return
	}
	
	s.sendMessage(conn, "claude_output", map[string]interface{}{
		"project_id": projectID,
		"output":     output,
		"command":    command,
		"status":     "completed",
	})
	
	log.Printf("✅ Docker command executed in %s: %s", projectID, command)
}

func (s *Server) handleDockerClaudeExecuteStream(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🐳 Handling Docker Claude streaming execution request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid Docker stream execute message format")
		return
	}
	
	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID")
		return
	}
	
	command, ok := data["command"].(string)
	if !ok || command == "" {
		s.sendError(conn, "Missing command")
		return
	}
	
	log.Printf("🚀 Streaming execution in Docker container %s: %s", projectID, command)
	
	// Send stream start notification
	s.sendMessage(conn, "claude_stream_start", map[string]interface{}{
		"project_id": projectID,
		"command":    command,
	})
	
	// Start streaming command execution
	ctx := context.TODO() // In production, use proper context with timeout
	outputChan, errorChan := s.dockerManager.StreamCommand(ctx, projectID, command)
	
	// Stream output in separate goroutine
	go func() {
		defer func() {
			s.sendMessage(conn, "claude_stream_end", map[string]interface{}{
				"project_id": projectID,
				"command":    command,
			})
		}()
		
		for {
			select {
			case output, ok := <-outputChan:
				if !ok {
					return // Channel closed
				}
				
				// Send streamed output
				s.sendMessage(conn, "claude_stream_output", map[string]interface{}{
					"project_id": projectID,
					"output":     output,
					"command":    command,
				})
				
			case err, ok := <-errorChan:
				if !ok {
					return // Channel closed
				}
				
				if err != nil {
					s.sendMessage(conn, "claude_stream_error", map[string]interface{}{
						"project_id": projectID,
						"error":      err.Error(),
						"command":    command,
					})
					return
				}
			}
		}
	}()
	
	log.Printf("✅ Started streaming Docker command in %s: %s", projectID, command)
}

func (s *Server) handleClaudeExecute(conn *websocket.Conn, msg map[string]interface{}) {
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid execute message format")
		return
	}

	command, ok := data["command"].(string)
	if !ok {
		s.sendError(conn, "Missing command")
		return
	}

	log.Printf("🤖 Executing command: %s", command)

	// Determine if it's a Claude command or shell command
	var cmd *exec.Cmd
	var output []byte
	var err error

	if strings.HasPrefix(command, "claude ") || command == "claude" {
		// Execute Claude CLI command
		claudeArgs := strings.Fields(command)
		if len(claudeArgs) == 1 {
			// Just "claude" - show help
			cmd = exec.Command("claude", "--help")
		} else {
			// Claude with arguments
			cmd = exec.Command("claude", claudeArgs[1:]...)
		}
		log.Printf("🤖 Executing Claude CLI: %v", cmd.Args)
	} else if strings.HasPrefix(command, "/") || 
			  strings.HasPrefix(command, "ls") || 
			  strings.HasPrefix(command, "pwd") || 
			  strings.HasPrefix(command, "cat") || 
			  strings.HasPrefix(command, "echo") ||
			  strings.HasPrefix(command, "git") {
		// Execute shell command
		cmd = exec.Command("sh", "-c", command)
		log.Printf("🔧 Executing shell command: %s", command)
	} else {
		// Treat as Claude prompt
		cmd = exec.Command("claude", "-p", command)
		log.Printf("🤖 Executing Claude with prompt: %s", command)
	}

	// Set working directory to projects directory if it exists
	if projectPath := "./projects"; s.pathExists(projectPath) {
		cmd.Dir = projectPath
	}

	// Execute command
	output, err = cmd.CombinedOutput()

	if err != nil {
		s.sendMessage(conn, "claude_error", map[string]interface{}{
			"error":   err.Error(),
			"command": command,
			"output":  string(output),
		})
		return
	}

	s.sendMessage(conn, "claude_output", map[string]interface{}{
		"output":  string(output),
		"command": command,
		"status":  "completed",
	})
}

// Helper function to check if path exists
func (s *Server) pathExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

func (s *Server) sendMessage(conn *websocket.Conn, msgType string, data interface{}) {
	msg := map[string]interface{}{
		"type": msgType,
		"data": data,
	}
	conn.WriteJSON(msg)
}

func (s *Server) sendError(conn *websocket.Conn, errMsg string) {
	s.sendMessage(conn, "error", map[string]interface{}{
		"message": errMsg,
	})
}

func (s *Server) openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "darwin":
		cmd = "open"
		args = []string{url}
	case "linux":
		cmd = "xdg-open"
		args = []string{url}
	case "windows":
		cmd = "rundll32"
		args = []string{"url.dll,FileProtocolHandler", url}
	default:
		log.Printf("Cannot open browser on this OS: %s", runtime.GOOS)
		return
	}

	exec.Command(cmd, args...).Start()
}

func getPortFromArgs() string {
	// Command line flag
	portFlag := flag.String("port", "", "Port to run server on (default: 8090)")
	flag.Parse()
	
	// Priority: command line > environment variable > default
	if *portFlag != "" {
		return *portFlag
	}
	
	if envPort := os.Getenv("REMOTECLAUDE_PORT"); envPort != "" {
		return envPort
	}
	
	return DefaultPort
}

func main() {
	// Get port from command line or environment
	port := getPortFromArgs()
	
	log.Printf("🚀 Starting RemoteClaude Server on port %s", port)
	log.Printf("💡 Port options:")
	log.Printf("   Command line: --port=9000")
	log.Printf("   Environment:  REMOTECLAUDE_PORT=9000")
	log.Printf("   Default:      %s", DefaultPort)
	
	server := NewServer(port)

	// Generate and display QR code
	connectionURL := server.generateQRCode()

	// Set up HTTP routes
	http.HandleFunc("/ws", server.handleWebSocket)
	
	// Serve QR code image
	http.HandleFunc("/qr", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./qr-code.png")
	})
	
	// Static files for web interface (optional)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>RemoteClaude Server</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .qr-code { text-align: center; background: #f5f5f5; padding: 20px; margin: 20px 0; }
        .connection-info { background: #e8f4fd; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>RemoteClaude Server v2.0</h1>
    <div class="connection-info">
        <h2>Connection Information</h2>
        <p><strong>WebSocket URL:</strong> <code>%s</code></p>
        <p><strong>Session Key:</strong> <code>%s</code></p>
    </div>
    <div class="qr-code">
        <h3>Scan QR Code with iPhone App</h3>
        <img src="/qr" alt="QR Code" style="max-width: 300px; border: 1px solid #ddd; border-radius: 8px;">
        <p>Scan this QR code with your iPhone camera or the RemoteClaude app</p>
    </div>
    <div>
        <h3>Status</h3>
        <p>Server running on <strong>%s:%s</strong></p>
        <p>Ready for iPhone connections!</p>
    </div>
</body>
</html>`, connectionURL, server.SecretKey, server.Host, server.Port)
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(html))
	})

	// Start server
	log.Printf("🌐 Web interface: http://%s:%s", server.Host, server.Port)
	log.Printf("🎯 Ready for connections...")

	if err := http.ListenAndServe(":"+server.Port, nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
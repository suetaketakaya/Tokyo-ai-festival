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

// ConversationSession stores conversation context for each project
type ConversationSession struct {
	ProjectID     string            `json:"project_id"`
	MessageHistory []ConversationMessage `json:"message_history"`
	CreatedAt     time.Time         `json:"created_at"`
	LastActivity  time.Time         `json:"last_activity"`
	Context       map[string]string `json:"context"`
	Language      string            `json:"language"` // detected language preference
}

// ConversationMessage represents a single message in the conversation
type ConversationMessage struct {
	Role      string    `json:"role"`      // "user" or "assistant"
	Content   string    `json:"content"`   
	Timestamp time.Time `json:"timestamp"`
	Command   string    `json:"command,omitempty"`   // original command if different from content
	Output    string    `json:"output,omitempty"`    // command execution output
}

type Server struct {
	Host          string
	Port          string
	SecretKey     string
	upgrader      websocket.Upgrader
	dockerManager *DockerManager
	// Session management
	sessions      map[string]*ConversationSession
	sessionsMutex sync.RWMutex
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
		sessions:      make(map[string]*ConversationSession),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for mobile app connection
			},
			EnableCompression: true,
			HandshakeTimeout:  30 * time.Second,
		},
	}
}

func (s *Server) getLocalIP() string {
	// Method 1: Try to get IP via external connection (works for most cases including tethering)
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err == nil {
		defer conn.Close()
		localAddr := conn.LocalAddr().(*net.UDPAddr)
		ip := localAddr.IP.String()
		
		// Validate that we got a proper IP (not localhost)
		if ip != "127.0.0.1" && ip != "::1" && ip != "" {
			log.Printf("🌐 Detected IP via external connection: %s", ip)
			return ip
		}
	}
	
	// Method 2: Fallback - scan network interfaces for best IP
	log.Printf("⚠️ External connection method failed, scanning interfaces...")
	
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Printf("❌ Failed to get network interfaces: %v", err)
		return "localhost"
	}
	
	var candidateIPs []string
	
	for _, iface := range interfaces {
		// Skip loopback and down interfaces
		if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
			continue
		}
		
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil { // IPv4 only
					ip := ipnet.IP.String()
					
					// Prioritize different IP ranges
					if isPrivateIP(ip) {
						candidateIPs = append(candidateIPs, ip)
						log.Printf("🔍 Found interface IP: %s (%s)", ip, iface.Name)
					}
				}
			}
		}
	}
	
	// Select best IP based on priority
	bestIP := selectBestIP(candidateIPs)
	log.Printf("🎯 Selected best IP: %s", bestIP)
	return bestIP
}

// Check if IP is in private ranges
func isPrivateIP(ip string) bool {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}
	
	// Common private ranges
	privateRanges := []string{
		"10.0.0.0/8",     // Class A private
		"172.16.0.0/12",  // Class B private  
		"192.168.0.0/16", // Class C private
		"169.254.0.0/16", // Link-local
	}
	
	for _, cidr := range privateRanges {
		_, network, _ := net.ParseCIDR(cidr)
		if network != nil && network.Contains(parsedIP) {
			return true
		}
	}
	
	return false
}

// Select the best IP from candidates based on priority
func selectBestIP(candidates []string) string {
	if len(candidates) == 0 {
		return "localhost"
	}
	
	// Priority order for different network types
	priorities := []string{
		"192.168.", // Home/office WiFi (highest priority)
		"10.",      // Corporate/tethering networks
		"172.",     // Docker/corporate networks
		"169.254.", // Link-local (lowest priority)
	}
	
	// Check each priority level
	for _, prefix := range priorities {
		for _, ip := range candidates {
			if strings.HasPrefix(ip, prefix) {
				log.Printf("✅ Selected IP with prefix %s: %s", prefix, ip)
				return ip
			}
		}
	}
	
	// If no priority match, return first candidate
	log.Printf("✅ No priority match, using first candidate: %s", candidates[0])
	return candidates[0]
}

// Check if WireGuard VPN is active by looking for 10.0.0.1 interface
func (s *Server) isWireGuardActive() bool {
	// Method 1: Check using ifconfig for 10.0.0.1 address
	cmd := exec.Command("ifconfig")
	output, err := cmd.Output()
	if err == nil {
		outputStr := string(output)
		if strings.Contains(outputStr, "10.0.0.1") {
			return true
		}
	}
	
	// Method 2: Check using wg command (no sudo needed for status check)
	wgCmd := exec.Command("wg", "show")
	if err := wgCmd.Run(); err == nil {
		return true
	}
	
	return false
}

func (s *Server) generateQRCode() string {
	// Determine the appropriate host based on VPN status
	if s.isWireGuardActive() {
		s.Host = "10.0.0.1"
		fmt.Printf("🔒 VPN Mode: Server binding to VPN interface\n")
	} else {
		s.Host = s.getLocalIP()
		fmt.Printf("🏠 Local Mode: Server binding to local interface\n")
	}
	
	connectionURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", s.Host, s.Port, s.SecretKey)
	
	fmt.Printf("🚀 ClaudeOps Remote Server Started!\n")
	fmt.Printf("Connection URL: %s\n", connectionURL)
	fmt.Printf("🔑 Session Key: %s\n", s.SecretKey)
	
	// Always show both URLs for reference
	localURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", s.getLocalIP(), s.Port, s.SecretKey)
	vpnURL := fmt.Sprintf("ws://10.0.0.1:%s/ws?key=%s", s.Port, s.SecretKey)
	
	if s.isWireGuardActive() {
		fmt.Printf("✅ WireGuard VPN is active\n")
		fmt.Printf("🔒 Primary (VPN): %s\n", vpnURL)
		fmt.Printf("🏠 Fallback (Local): %s\n", localURL)
		fmt.Printf("📱 Use VPN URL for mobile connection through WireGuard\n")
	} else {
		fmt.Printf("⚠️  WireGuard VPN not active\n")
		fmt.Printf("🏠 Primary (Local): %s\n", localURL)
		fmt.Printf("🔒 VPN (when active): %s\n", vpnURL)
		fmt.Printf("📱 Start VPN with: sudo wg-quick up ~/.remoteclaude/wireguard/wg0.conf\n")
	}
	fmt.Printf("\n")
	
	// Generate QR code with the primary connection URL
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
	log.Printf("🔗 WebSocket connection attempt from: %s", r.RemoteAddr)
	
	// Validate secret key
	key := r.URL.Query().Get("key")
	if key == "" {
		log.Printf("❌ Missing secret key in WebSocket request")
		http.Error(w, "Missing authentication key", http.StatusUnauthorized)
		return
	}
	
	if key != s.SecretKey {
		log.Printf("❌ Invalid secret key provided: %s", key)
		http.Error(w, "Invalid authentication key", http.StatusUnauthorized)
		return
	}

	// Set headers for mobile app compatibility
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "*")

	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("✅ Mobile app connected from: %s", conn.RemoteAddr())

	// Send welcome message
	welcome := map[string]interface{}{
		"type": "connection_established",
		"data": map[string]interface{}{
			"server_version": "3.6.0",
			"api_version":    "3.5",  // Compatible with v3.5.0 apps
			"capabilities":   []string{"project_management", "claude_execution", "git_integration", "docker_support", "web_management"},
		},
	}
	conn.WriteJSON(welcome)

	// Handle messages
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("📱 Mobile app disconnected: %v", err)
			} else {
				log.Printf("❌ WebSocket read error: %v", err)
			}
			break
		}

		log.Printf("📱 Received from app: %+v", msg)
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

	case "conversation_history":
		s.handleConversationHistory(conn, msg)

	case "conversation_clear":
		s.handleConversationClear(conn, msg)

	case "conversation_continue":
		s.handleConversationContinue(conn, msg)

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
	
	// Get or create conversation session
	session := s.getOrCreateSession(projectID)
	
	// Detect and update language preference
	detectedLang := s.detectLanguage(command)
	if detectedLang != "auto" && session.Language == "auto" {
		session.Language = detectedLang
		log.Printf("🌐 Detected language for session %s: %s", projectID, detectedLang)
	}
	
	// Add user message to session
	s.addMessageToSession(projectID, "user", command, command, "")
	
	// Get conversation context
	sessionContext := s.getSessionContext(projectID)
	
	// Use the enhanced command router for unified command processing
	output, err := s.processEnhancedCommand(projectID, command, sessionContext)
	if err != nil {
		// Add error to session
		s.addMessageToSession(projectID, "assistant", "", command, fmt.Sprintf("Error: %s", err.Error()))
		
		s.sendMessage(conn, "claude_error", map[string]interface{}{
			"project_id": projectID,
			"error":      err.Error(),
			"command":    command,
			"output":     output,
		})
		return
	}
	
	// Add successful output to session
	s.addMessageToSession(projectID, "assistant", "", command, output)
	
	log.Printf("📤 Sending claude_output to iOS app. Output length: %d", len(output))
	previewLen := 200
	if len(output) < previewLen {
		previewLen = len(output)
	}
	log.Printf("📤 Output preview: %s", output[:previewLen])
	
	s.sendMessage(conn, "claude_output", map[string]interface{}{
		"project_id":      projectID,
		"session_id":      fmt.Sprintf("session_%s", projectID),
		"language":        session.Language,
		"message_count":   len(session.MessageHistory),
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
	
	// Get or create conversation session
	session := s.getOrCreateSession(projectID)
	
	// Detect and update language preference
	detectedLang := s.detectLanguage(command)
	if detectedLang != "auto" && session.Language == "auto" {
		session.Language = detectedLang
		log.Printf("🌐 Detected language for streaming session %s: %s", projectID, detectedLang)
	}
	
	// Add user message to session
	s.addMessageToSession(projectID, "user", command, command, "")
	
	// Get conversation context
	sessionContext := s.getSessionContext(projectID)
	
	// Build enhanced command with context for streaming
	var actualCommand string
	if isNaturalLanguageCommand(command) {
		var claudeCommand string
		if sessionContext != "" {
			claudeCommand = fmt.Sprintf("Context from previous conversation:\n%s\nCurrent request: %s", sessionContext, command)
		} else {
			claudeCommand = command
		}
		
		// For streaming, add --stream flag for better real-time experience
		if containsNonASCII(claudeCommand) {
			// Use safe file-based processing for streaming
			tempFile := fmt.Sprintf("/tmp/claude_stream_input_%d.txt", time.Now().UnixNano())
			actualCommand = fmt.Sprintf(`cat > %s << 'CLAUDE_EOF'
%s
CLAUDE_EOF
claude --stream "$(cat %s)" && rm %s`, tempFile, claudeCommand, tempFile, tempFile)
		} else {
			actualCommand = fmt.Sprintf("claude --stream \"%s\"", escapeQuotes(claudeCommand))
		}
		log.Printf("🌊 Converting to streaming Claude CLI command with context")
	} else {
		actualCommand = command
	}
	
	// Send stream start notification
	s.sendMessage(conn, "claude_stream_start", map[string]interface{}{
		"session_id":    fmt.Sprintf("session_%s", projectID),
		"language":      session.Language,
		"message_count": len(session.MessageHistory),
		"project_id": projectID,
		"command":    command,
	})
	
	// Start streaming command execution
	ctx := context.TODO() // In production, use proper context with timeout
	outputChan, errorChan := s.dockerManager.StreamCommand(ctx, projectID, actualCommand)
	
	// Stream output in separate goroutine
	go func() {
		var streamedOutput strings.Builder
		var streamError error
		
		defer func() {
			// Add streamed result to session
			if streamError != nil {
				s.addMessageToSession(projectID, "assistant", "", actualCommand, fmt.Sprintf("Error: %s", streamError.Error()))
			} else {
				s.addMessageToSession(projectID, "assistant", "", actualCommand, streamedOutput.String())
			}
			
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
				
				// Accumulate output for session
				streamedOutput.WriteString(output)
				
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
					streamError = err
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
		// Treat as Claude prompt - handle Japanese/Unicode text properly
		if containsNonASCII(command) {
			log.Printf("🗾 Detected non-ASCII characters, using safe encoding")
			// Use stdin to pass the command to avoid shell encoding issues
			cmd = exec.Command("claude")
			cmd.Stdin = strings.NewReader(command)
		} else {
			cmd = exec.Command("claude", "-p", command)
		}
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
	log.Printf("📤 Attempting to send message type: %s", msgType)
	
	// Log the actual JSON content for debugging
	jsonBytes, _ := json.Marshal(msg)
	previewLen := 300
	if len(jsonBytes) < previewLen {
		previewLen = len(jsonBytes)
	}
	log.Printf("📤 JSON content preview: %s", string(jsonBytes)[:previewLen])
	
	if err := conn.WriteJSON(msg); err != nil {
		log.Printf("❌ Failed to send WebSocket message: %v", err)
	} else {
		log.Printf("✅ Successfully sent WebSocket message type: %s", msgType)
	}
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

// Helper function to detect if a command is a natural language request for Claude
func isNaturalLanguageCommand(command string) bool {
	command = strings.TrimSpace(command)
	commandLower := strings.ToLower(command)
	
	// Empty command
	if command == "" {
		return false
	}
	
	// First check for Japanese characters - if found, it's definitely natural language
	if containsJapanese(command) {
		return true
	}
	
	// Check if it starts with clear Linux/shell commands (priority check)
	shellCommands := []string{
		// Basic Unix commands
		"ls", "cd", "pwd", "cat", "echo", "grep", "find", "awk", "sed", "sort", "uniq", "wc", "head", "tail",
		"mkdir", "rmdir", "rm", "cp", "mv", "chmod", "chown", "chgrp", "ln", "touch", "file", "which", "whereis",
		"ps", "top", "htop", "kill", "killall", "jobs", "bg", "fg", "nohup", "screen", "tmux",
		"tar", "gzip", "gunzip", "zip", "unzip", "curl", "wget", "ssh", "scp", "rsync",
		
		// Programming language executables  
		"python", "python3", "node", "npm", "npx", "yarn", "go", "cargo", "rustc", "gcc", "g++", "clang",
		"java", "javac", "ruby", "php", "perl", "bash", "zsh", "sh", "csh", "tcsh",
		
		// Development tools
		"git", "docker", "docker-compose", "kubectl", "helm", "terraform", "ansible",
		"make", "cmake", "ninja", "bazel", "gradle", "maven", "ant",
		
		// System commands
		"sudo", "su", "systemctl", "service", "crontab", "mount", "umount", "df", "du", "free", "uname",
		"env", "export", "alias", "history", "man", "info", "help",
		
		// Text editors and viewers
		"vim", "vi", "nano", "emacs", "less", "more", "pager",
	}
	
	// Check path-like commands
	pathPrefixes := []string{"./", "../", "/", "~/", "\\", ".\\"}
	for _, prefix := range pathPrefixes {
		if strings.HasPrefix(command, prefix) {
			return false
		}
	}
	
	// Check for shell command prefixes
	words := strings.Fields(commandLower)
	if len(words) == 0 {
		return false
	}
	firstWord := words[0]
	for _, cmd := range shellCommands {
		if firstWord == cmd {
			return false
		}
	}
	
	// Check for shell-specific syntax patterns
	shellPatterns := []string{
		"|", "&&", "||", ";", ">", ">>", "<", "<<", "`", "$(", "${", "$(",
		"2>", "&>", "2>&1", ">/dev/null",
	}
	for _, pattern := range shellPatterns {
		if strings.Contains(command, pattern) {
			return false
		}
	}
	
	// Check for variable assignments
	if strings.Contains(command, "=") && !strings.Contains(command, " == ") && !strings.Contains(command, " != ") {
		return false
	}
	
	// Check for common natural language patterns (English)
	englishPatterns := []string{
		"create", "write", "generate", "make a", "build a", "help me", "can you", "please",
		"add", "modify", "update", "fix", "explain", "show me", "tell me", "how to",
		"what is", "what are", "what does", "why", "when", "where", "who", "which",
		"implement", "develop", "design", "refactor", "optimize", "improve",
		"debug", "test", "review", "analyze", "check", "search", "list all",
		"delete", "remove", "install", "setup", "configure", "deploy", "start",
		"stop", "restart", "enable", "disable", "convert", "transform", "migrate",
		"backup", "restore", "clean", "organize", "sort", "filter", "format",
		"validate", "verify", "compare", "merge", "split", "combine", "extract",
		"compress", "decompress", "encrypt", "decrypt", "parse", "render",
		"i want", "i need", "i would like", "could you", "would you", "should i",
		"how do i", "how can i", "is it possible", "can i", "may i",
	}
	
	// Check for Japanese natural language patterns
	japanesePatterns := []string{
		"つくって", "作って", "書いて", "かいて", "生成して", "せいせいして",
		"作成して", "さくせいして", "実行して", "じっこうして", "実装して", "じっそうして",
		"修正して", "しゅうせいして", "説明して", "せつめいして", "教えて", "おしえて",
		"見せて", "みせて", "確認して", "かくにんして", "テストして", "てすとして",
		"削除して", "さくじょして", "追加して", "ついかして", "更新して", "こうしんして",
		"ファイルを", "ふぁいるを", "コードを", "こーどを", "プログラムを", "ぷろぐらむを",
		"アプリを", "あぷりを", "データを", "でーたを", "設定を", "せっていを",
		"について", "につい", "方法", "ほうほう", "やり方", "やりかた", "手順", "てじゅん",
		"エラー", "えらー", "問題", "もんだい", "バグ", "ばぐ", "修正", "しゅうせい",
		"どうやって", "どのように", "なぜ", "いつ", "どこで", "だれが", "どれが",
	}
	
	// Check English patterns
	for _, pattern := range englishPatterns {
		if strings.Contains(commandLower, pattern) {
			return true
		}
	}
	
	// Check Japanese patterns
	for _, pattern := range japanesePatterns {
		if strings.Contains(command, pattern) || strings.Contains(commandLower, pattern) {
			return true
		}
	}
	
	// Check for question patterns
	questionStarters := []string{"what", "how", "why", "when", "where", "who", "which", "can", "could", "would", "should", "is", "are", "do", "does", "did"}
	questionEnders := []string{"?"}
	
	for _, starter := range questionStarters {
		if strings.HasPrefix(commandLower, starter+" ") {
			return true
		}
	}
	
	for _, ender := range questionEnders {
		if strings.HasSuffix(command, ender) {
			return true
		}
	}
	
	// Default behavior: if it contains spaces and doesn't match shell patterns, treat as natural language
	if strings.Contains(command, " ") {
		// Additional shell command patterns to exclude
		words := strings.Fields(commandLower)
		if len(words) >= 2 {
			// Check for patterns like "npm install", "git clone", etc.
			combinedCommands := []string{
				"npm install", "npm run", "npm start", "npm test", "npm build",
				"git clone", "git add", "git commit", "git push", "git pull", "git checkout", "git branch",
				"docker run", "docker build", "docker exec", "docker ps", "docker images",
				"python -m", "node -e", "go run", "cargo run", "cargo build",
			}
			
			firstTwoWords := strings.Join(words[:2], " ")
			for _, cmd := range combinedCommands {
				if strings.HasPrefix(firstTwoWords, cmd) {
					return false
				}
			}
		}
		return true
	}
	
	// Single word commands - default to shell command unless it's clearly conversational
	conversationalWords := []string{"hello", "hi", "hey", "thanks", "thank", "yes", "no", "ok", "okay"}
	for _, word := range conversationalWords {
		if commandLower == word {
			return true
		}
	}
	
	return false
}

// Helper function to escape quotes in commands for shell execution
func escapeQuotes(command string) string {
	// Replace double quotes with escaped quotes
	command = strings.ReplaceAll(command, "\"", "\\\"")
	// Replace single quotes with escaped quotes  
	command = strings.ReplaceAll(command, "'", "\\'")
	return command
}

// Helper function to detect non-ASCII characters (Japanese, Unicode, etc.)
func containsNonASCII(s string) bool {
	for _, r := range s {
		if r > unicode.MaxASCII {
			return true
		}
	}
	return false
}

// Helper function to specifically detect Japanese characters
func containsJapanese(s string) bool {
	for _, r := range s {
		if (r >= 0x3040 && r <= 0x309F) || // Hiragana
		   (r >= 0x30A0 && r <= 0x30FF) || // Katakana
		   (r >= 0x4E00 && r <= 0x9FAF) {  // CJK Unified Ideographs (Kanji)
			return true
		}
	}
	return false
}

// Session management methods
func (s *Server) getOrCreateSession(projectID string) *ConversationSession {
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
			Language:       "auto", // will be detected from first message
		}
		s.sessions[projectID] = session
		log.Printf("💬 Created new conversation session for project: %s", projectID)
	} else {
		session.LastActivity = time.Now()
	}
	
	return session
}

func (s *Server) addMessageToSession(projectID, role, content, command, output string) {
	s.sessionsMutex.Lock()
	defer s.sessionsMutex.Unlock()
	
	session := s.sessions[projectID]
	if session == nil {
		return
	}
	
	message := ConversationMessage{
		Role:      role,
		Content:   content,
		Timestamp: time.Now(),
		Command:   command,
		Output:    output,
	}
	
	session.MessageHistory = append(session.MessageHistory, message)
	session.LastActivity = time.Now()
	
	// Keep only last 20 messages to avoid memory issues
	if len(session.MessageHistory) > 20 {
		session.MessageHistory = session.MessageHistory[len(session.MessageHistory)-20:]
	}
	
	log.Printf("💬 Added %s message to session %s (total: %d messages)", role, projectID, len(session.MessageHistory))
}

func (s *Server) getSessionContext(projectID string) string {
	s.sessionsMutex.RLock()
	defer s.sessionsMutex.RUnlock()
	
	session := s.sessions[projectID]
	if session == nil || len(session.MessageHistory) == 0 {
		return ""
	}
	
	// Build context from recent messages
	sessionContext := ""
	recentMessages := session.MessageHistory
	if len(recentMessages) > 5 {
		recentMessages = recentMessages[len(recentMessages)-5:]
	}
	
	for _, msg := range recentMessages {
		if msg.Role == "user" {
			sessionContext += fmt.Sprintf("Previous request: %s\n", msg.Content)
		}
		if msg.Role == "assistant" && msg.Output != "" {
			sessionContext += fmt.Sprintf("Previous result: %s\n", msg.Output)
		}
	}
	
	return sessionContext
}

func (s *Server) detectLanguage(text string) string {
	// Simple language detection based on character sets
	hasJapanese := false
	hasEnglish := false
	
	for _, r := range text {
		if (r >= 0x3040 && r <= 0x309F) || // Hiragana
		   (r >= 0x30A0 && r <= 0x30FF) || // Katakana
		   (r >= 0x4E00 && r <= 0x9FAF) {  // CJK Unified Ideographs
			hasJapanese = true
		}
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			hasEnglish = true
		}
	}
	
	if hasJapanese {
		return "ja"
	}
	if hasEnglish {
		return "en"
	}
	return "auto"
}

// Settings handler functions (placeholder implementations)
func (s *Server) handleSettingsUpdate(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🔧 Handling settings update request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid settings update message format")
		return
	}
	
	// For now, just acknowledge the settings update
	// In a full implementation, you would persist these settings
	log.Printf("📝 Settings data received: %+v", data)
	
	s.sendMessage(conn, "settings_update_response", map[string]interface{}{
		"status":  "success",
		"message": "Settings updated successfully",
	})
}

func (s *Server) handleSettingsGet(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🔧 Handling settings get request")
	
	// Return default settings
	// In a full implementation, you would load these from storage
	defaultSettings := map[string]interface{}{
		"claudeApiKey": "",
		"gitUsername":  "RemoteClaude User",
		"gitEmail":     "user@remoteclaude.dev",
		"projectType":  "general",
		"autoCommit":   true,
		"notifications": true,
	}
	
	s.sendMessage(conn, "settings_get_response", map[string]interface{}{
		"status":   "success",
		"settings": defaultSettings,
	})
}

// Conversation management handlers
func (s *Server) handleConversationHistory(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("💬 Handling conversation history request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid conversation history message format")
		return
	}
	
	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID")
		return
	}
	
	s.sessionsMutex.RLock()
	session := s.sessions[projectID]
	s.sessionsMutex.RUnlock()
	
	if session == nil {
		s.sendMessage(conn, "conversation_history_response", map[string]interface{}{
			"project_id": projectID,
			"messages":   []ConversationMessage{},
			"language":   "auto",
			"status":     "success",
		})
		return
	}
	
	s.sendMessage(conn, "conversation_history_response", map[string]interface{}{
		"project_id":     projectID,
		"session_id":     fmt.Sprintf("session_%s", projectID),
		"messages":       session.MessageHistory,
		"language":       session.Language,
		"created_at":     session.CreatedAt,
		"last_activity":  session.LastActivity,
		"message_count":  len(session.MessageHistory),
		"status":         "success",
	})
}

func (s *Server) handleConversationClear(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🧹 Handling conversation clear request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid conversation clear message format")
		return
	}
	
	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID")
		return
	}
	
	s.sessionsMutex.Lock()
	delete(s.sessions, projectID)
	s.sessionsMutex.Unlock()
	
	log.Printf("🧹 Cleared conversation session for project: %s", projectID)
	
	s.sendMessage(conn, "conversation_clear_response", map[string]interface{}{
		"project_id": projectID,
		"status":     "success",
		"message":    "Conversation history cleared",
	})
}

func (s *Server) handleConversationContinue(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🔄 Handling conversation continue request")
	
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid conversation continue message format")
		return
	}
	
	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing or invalid project ID")
		return
	}
	
	followUp, ok := data["follow_up"].(string)
	if !ok || followUp == "" {
		s.sendError(conn, "Missing follow-up message")
		return
	}
	
	// Use existing claude_execute flow but with enhanced context
	s.handleDockerClaudeExecute(conn, map[string]interface{}{
		"type": "claude_execute",
		"data": map[string]interface{}{
			"project_id": projectID,
			"command":    followUp,
		},
	})
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
	
	log.Printf("🚀 Starting ClaudeOps Remote Server on port %s", port)
	log.Printf("💡 Port options:")
	log.Printf("   Command line: --port=9000")
	log.Printf("   Environment:  REMOTECLAUDE_PORT=9000")
	log.Printf("   Default:      %s", DefaultPort)
	
	server := NewServer(port)

	// Generate and display QR code
	connectionURL := server.generateQRCode()

	// Initialize web interface v3.6.0
	webInterface := NewWebInterface(server)
	webInterface.StartWebServer()
	log.Printf("🌐 Web management interface: http://%s:8080", server.getLocalIP())

	// Set up HTTP routes with CORS support
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "*")
			w.WriteHeader(http.StatusOK)
			return
		}
		server.handleWebSocket(w, r)
	})
	
	// Serve QR code image
	http.HandleFunc("/qr", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./qr-code.png")
	})
	
	// Note: static files are now served by the web interface on port 8080
	
	// Legacy web interface (fallback)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>ClaudeOps Remote Server</title>
    <link rel="icon" href="/static/icon.png" type="image/png">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f8fafc; }
        .header { text-align: center; margin-bottom: 30px; }
        .app-icon { width: 80px; height: 80px; border-radius: 16px; margin-bottom: 10px; }
        .qr-code { text-align: center; background: #ffffff; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .connection-info { background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #007AFF; }
        h1 { color: #1a365d; margin: 0; }
        .subtitle { color: #64748b; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <img src="/static/icon.png" alt="ClaudeOps Remote" class="app-icon">
        <h1>ClaudeOps Remote Server v3.6.0</h1>
        <p class="subtitle">Mobile-Driven Claude Development Platform</p>
    </div>
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

	// Bind to all interfaces to avoid FE/BE host mismatches across mode switches
	bindAddr := "0.0.0.0:" + server.Port
	if server.Host == "10.0.0.1" {
		log.Printf("🔒 VPN Mode: Accepting on all interfaces; use ws://10.0.0.1:%s/ws from clients", server.Port)
		log.Printf("🏠 Local Fallback also available: ws://%s:%s/ws", server.getLocalIP(), server.Port)
	} else {
		log.Printf("🏠 Local Mode: Binding to all interfaces (0.0.0.0:%s)", server.Port)
		log.Printf("🌐 Local Access: ws://%s:%s/ws", server.getLocalIP(), server.Port)
	}
	
	// Start server
	log.Printf("🌐 Web interface: http://%s:8080", server.getLocalIP())
	log.Printf("🎯 Ready for connections on %s...", bindAddr)

	if err := http.ListenAndServe(bindAddr, nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
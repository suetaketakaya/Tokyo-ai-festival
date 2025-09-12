package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// WebInterface represents the web management interface
type WebInterface struct {
	server *Server
}

// StatusResponse represents the server status API response
type StatusResponse struct {
	Status        string          `json:"status"`
	Host          string          `json:"host"`
	Port          string          `json:"port"`
	SessionKey    string          `json:"sessionKey"`
	Mode          string          `json:"mode"`
	QRCodeURL     string          `json:"qrCodeUrl,omitempty"`
	ConnectionURL string          `json:"connection_url"`
	Clients       []ClientInfo    `json:"clients"`
}

// ClientInfo represents connected client information
type ClientInfo struct {
	Name   string `json:"name"`
	IP     string `json:"ip"`
	Status string `json:"status"`
}

// APIResponse represents a generic API response
type APIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// ModeSwitchRequest represents a mode switching request
type ModeSwitchRequest struct {
	Mode     string `json:"mode"`
	Password string `json:"password,omitempty"` // sudo password for VPN mode
}

// SudoAuthRequest represents a sudo authentication request
type SudoAuthRequest struct {
	Command  string `json:"command"`
	Password string `json:"password"`
}

// SudoAuthResponse represents a sudo authentication response
type SudoAuthResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Output  string `json:"output,omitempty"`
}

// NewWebInterface creates a new web interface instance
func NewWebInterface(server *Server) *WebInterface {
	return &WebInterface{server: server}
}


// handleDashboard serves the main dashboard HTML
func (wi *WebInterface) handleDashboard(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	
	http.ServeFile(w, r, "./web-ui/index.html")
}

// handleStatus returns the current server status
func (wi *WebInterface) handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Determine actual current mode based on server binding and WireGuard status
	actualHost := wi.server.getLocalIP() // Get current actual IP
	mode := "local"
	currentHost := actualHost
	
	// Check if VPN is both active AND server is actually bound to VPN IP
	if wi.isWireGuardActive() && wi.server.Host == "10.0.0.1" {
		// Double-check that we can actually bind to VPN IP
		if wi.verifyVPNConnection() {
			mode = "vpn"
			currentHost = "10.0.0.1"
		} else {
			// VPN is running but binding failed, correct the host
			wi.server.Host = actualHost
			log.Printf("🔄 VPN detected but binding failed, corrected Host to: %s", actualHost)
		}
	} else if wi.server.Host == "10.0.0.1" {
		// Server thinks it's in VPN mode but VPN is not active
		wi.server.Host = actualHost
		log.Printf("🔄 VPN not active, corrected Host from VPN to Local: %s", actualHost)
	}
	
	// Update server host to reflect actual current host
	wi.server.Host = currentHost
	
	// Generate appropriate QR code URL based on current mode and timestamp
	qrCodeURL := fmt.Sprintf("/qr-code.png?t=%d", time.Now().Unix())
	
	// Generate appropriate connection URL based on current mode
	connectionURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", currentHost, wi.server.Port, wi.server.SecretKey)
	
	// Get connected clients (placeholder for now)
	clients := []ClientInfo{
		// This would be populated from actual WebSocket connections
	}
	
	status := StatusResponse{
		Status:        "running",
		Host:          currentHost, // Always return the actual current host
		Port:          wi.server.Port,
		SessionKey:    wi.server.SecretKey,
		Mode:          mode,
		QRCodeURL:     qrCodeURL, // Include timestamp to prevent caching
		ConnectionURL: connectionURL, // WebSocket URL with current host
		Clients:       clients,
	}
	
	log.Printf("📊 Status API - Mode: %s, Host: %s, VPN Active: %t", mode, currentHost, wi.isWireGuardActive())
	json.NewEncoder(w).Encode(status)
}

// handleSwitchMode handles connection mode switching
func (wi *WebInterface) handleSwitchMode(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req ModeSwitchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		wi.sendErrorResponse(w, "Invalid request body")
		return
	}
	
	log.Printf("🔄 Mode switch request: %s", req.Mode)
	
	success := false
	var errorMsg string
	
	switch req.Mode {
	case "vpn":
		log.Println("🔐 Starting VPN mode activation...")
		if req.Password != "" {
			// Use password-based activation
			success, errorMsg = wi.enableVPNModeWithPassword(req.Password)
		} else {
			// Try legacy method first, which will fail with helpful message
			success, errorMsg = wi.enableVPNMode()
		}
		if success {
			log.Printf("✅ VPN mode activated successfully")
		} else {
			log.Printf("❌ VPN mode activation failed: %s", errorMsg)
		}
	case "local":
		log.Println("🏠 Starting Local mode activation...")
		if req.Password != "" {
			// Use password-based method
			success, errorMsg = wi.enableLocalModeWithPassword(req.Password)
		} else {
			// Try legacy method first, which will fail with helpful message
			success, errorMsg = wi.enableLocalMode()
		}
		if success {
			log.Printf("✅ Local mode activated successfully")
		} else {
			log.Printf("❌ Local mode activation failed: %s", errorMsg)
		}
	default:
		errorMsg = fmt.Sprintf("Invalid mode specified: %s. Valid modes: 'vpn', 'local'", req.Mode)
		log.Printf("❌ %s", errorMsg)
	}
	
	if success {
		successMsg := fmt.Sprintf("✅ Successfully switched to %s mode. New connection URL generated.", req.Mode)
		log.Printf("🎉 %s", successMsg)
		wi.sendSuccessResponse(w, successMsg)
	} else {
		log.Printf("💔 Mode switch to %s failed: %s", req.Mode, errorMsg)
		wi.sendErrorResponse(w, errorMsg)
	}
}

// handleRegenerateQR regenerates the QR code
func (wi *WebInterface) handleRegenerateQR(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// Regenerate QR code
	connectionURL := wi.server.generateQRCode()
	log.Printf("🔄 QR code regenerated: %s", connectionURL)
	
	wi.sendSuccessResponse(w, "QR code regenerated successfully")
}

// handleRestart handles server restart
func (wi *WebInterface) handleRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	log.Println("🔄 Server restart requested via web interface")
	
	// Send success response first
	wi.sendSuccessResponse(w, "Server restart initiated")
	
	// Restart in a goroutine to allow response to be sent
	go func() {
		time.Sleep(1 * time.Second)
		log.Println("🔄 Restarting server...")
		os.Exit(0) // This will cause the server to restart if running under supervision
	}()
}

// handleLogs returns server logs
func (wi *WebInterface) handleLogs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// For now, return placeholder logs
	// In a real implementation, you'd read from actual log files
	logs := `[2024-09-07 21:00:00] 🚀 RemoteClaude Server Started
[2024-09-07 21:00:01] 🔑 Session Key Generated: ` + wi.server.SecretKey + `
[2024-09-07 21:00:02] 🌐 WebSocket Server Listening on ` + wi.server.Host + `:` + wi.server.Port + `
[2024-09-07 21:00:03] 🌐 Web Interface Available at http://` + wi.server.Host + `:8080
[2024-09-07 21:00:04] ✅ Server Ready for Connections`
	
	response := APIResponse{
		Success: true,
		Data:    map[string]string{"logs": logs},
	}
	
	json.NewEncoder(w).Encode(response)
}

// handleWireGuardQR returns WireGuard configuration QR code
func (wi *WebInterface) handleWireGuardQR(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Check if WireGuard config exists
	configPath := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "wireguard", "client.conf")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		wi.sendErrorResponse(w, "WireGuard configuration not found. Please run setup first.")
		return
	}
	
	// Check if QR code already exists
	qrPath := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "wireguard", "wireguard-qr.png")
	
	// If QR code doesn't exist, generate it
	if _, err := os.Stat(qrPath); os.IsNotExist(err) {
		log.Printf("🔄 Generating WireGuard QR code...")
		cmd := exec.Command("qrencode", "-t", "png", "-o", qrPath, "-r", configPath)
		
		if err := cmd.Run(); err != nil {
			log.Printf("❌ Failed to generate WireGuard QR code: %v", err)
			wi.sendErrorResponse(w, fmt.Sprintf("Failed to generate WireGuard QR code: %v", err))
			return
		}
		log.Printf("✅ WireGuard QR code generated successfully")
	} else {
		log.Printf("✅ Using existing WireGuard QR code")
	}
	
	// Verify QR code file exists and is readable
	if _, err := os.Stat(qrPath); err != nil {
		log.Printf("❌ WireGuard QR code file not accessible: %v", err)
		wi.sendErrorResponse(w, "WireGuard QR code file not found")
		return
	}
	
	response := APIResponse{
		Success: true,
		Data:    map[string]string{"qrCodeUrl": "/wireguard-qr.png"},
		Message: "WireGuard QR code ready for scanning",
	}
	
	json.NewEncoder(w).Encode(response)
}

// handleVPNConnectionQR returns VPN connection URL QR code for mobile app
func (wi *WebInterface) handleVPNConnectionQR(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Check if WireGuard VPN is active
	if !wi.isWireGuardActive() {
		wi.sendErrorResponse(w, "WireGuard VPN is not active. Please start VPN first: sudo wg-quick up ~/.remoteclaude/wireguard/wg0.conf")
		return
	}
	
	// Generate VPN connection URL (10.0.0.1 WebSocket)
	vpnURL := fmt.Sprintf("ws://10.0.0.1:%s/ws?key=%s", wi.server.Port, wi.server.SecretKey)
	
	// Path for VPN connection QR code
	qrPath := filepath.Join(".", "vpn-connection-qr.png")
	
	// Generate QR code for VPN connection URL
	log.Printf("🔄 Generating VPN connection QR code for: %s", vpnURL)
	cmd := exec.Command("qrencode", "-t", "png", "-o", qrPath, vpnURL)
	
	if err := cmd.Run(); err != nil {
		log.Printf("❌ Failed to generate VPN connection QR code: %v", err)
		wi.sendErrorResponse(w, fmt.Sprintf("Failed to generate VPN connection QR code: %v", err))
		return
	}
	log.Printf("✅ VPN connection QR code generated successfully at: %s", qrPath)
	
	// Verify QR code file exists and is readable
	if _, err := os.Stat(qrPath); err != nil {
		log.Printf("❌ VPN connection QR code file not accessible: %v", err)
		wi.sendErrorResponse(w, "VPN connection QR code file not found")
		return
	}
	
	response := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"qrCodeUrl": "/vpn-connection-qr.png",
			"vpnUrl": vpnURL,
			"instructions": "1. Connect iPhone to WireGuard VPN first\n2. Scan this QR code with RemoteClaude app\n3. VPN must be active for connection to work",
		},
		Message: "VPN connection QR code ready for scanning",
	}
	
	json.NewEncoder(w).Encode(response)
}

// handleQRCodeImage serves the QR code image (dynamically generated)
func (wi *WebInterface) handleQRCodeImage(w http.ResponseWriter, r *http.Request) {
	// Always use actual local IP for current mode detection
	actualHost := wi.server.getLocalIP()
	currentHost := actualHost
	
	// Check if we're in VPN mode and it's actually working
	if wi.isWireGuardActive() && wi.server.Host == "10.0.0.1" && wi.verifyVPNConnection() {
		currentHost = "10.0.0.1"
	}
	
	// Create connection URL based on current actual state
	connectionURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", currentHost, wi.server.Port, wi.server.SecretKey)
	
	// Generate QR code temporarily
	tempQRPath := fmt.Sprintf("/tmp/qr-code-%d.png", time.Now().Unix())
	cmd := exec.Command("qrencode", "-t", "png", "-o", tempQRPath, connectionURL)
	
	if err := cmd.Run(); err != nil {
		log.Printf("❌ Failed to generate QR code: %v", err)
		
		// Try static QR code as fallback
		possiblePaths := []string{
			"./qr-code.png",
			"./server/qr-code.png", 
			"../qr-code.png",
		}
		
		var qrPath string
		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				qrPath = path
				break
			}
		}
		
		if qrPath == "" {
			w.Header().Set("Content-Type", "text/plain")
			w.WriteHeader(404)
			w.Write([]byte("QR code generation failed"))
			return
		}
		
		w.Header().Set("Content-Type", "image/png")
		http.ServeFile(w, r, qrPath)
		return
	}
	
	// Serve the dynamically generated QR code
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	
	http.ServeFile(w, r, tempQRPath)
	
	// Clean up temporary file after serving
	go func() {
		time.Sleep(5 * time.Second)
		os.Remove(tempQRPath)
	}()
}

// handleWireGuardQRImage serves the WireGuard QR code image
func (wi *WebInterface) handleWireGuardQRImage(w http.ResponseWriter, r *http.Request) {
	qrPath := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "wireguard", "wireguard-qr.png")
	
	log.Printf("🔍 Looking for WireGuard QR code at: %s", qrPath)
	
	if _, err := os.Stat(qrPath); os.IsNotExist(err) {
		log.Printf("❌ WireGuard QR code not found at: %s", qrPath)
		
		// Try to generate QR code if it doesn't exist
		configPath := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "wireguard", "client.conf")
		if _, err := os.Stat(configPath); err == nil {
			log.Printf("🔄 Attempting to generate missing WireGuard QR code...")
			cmd := exec.Command("qrencode", "-t", "png", "-o", qrPath, "-r", configPath)
			if err := cmd.Run(); err != nil {
				log.Printf("❌ Failed to generate WireGuard QR code: %v", err)
			} else {
				log.Printf("✅ WireGuard QR code generated successfully")
				// Try to serve the newly generated file
				if _, err := os.Stat(qrPath); err == nil {
					w.Header().Set("Content-Type", "image/png")
					http.ServeFile(w, r, qrPath)
					return
				}
			}
		}
		
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(404)
		w.Write([]byte("WireGuard QR code not found. Please run setup first."))
		return
	}
	
	log.Printf("✅ Serving WireGuard QR code from: %s", qrPath)
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	http.ServeFile(w, r, qrPath)
}

// handleVPNConnectionQRImage serves the VPN connection QR code image
func (wi *WebInterface) handleVPNConnectionQRImage(w http.ResponseWriter, r *http.Request) {
	qrPath := filepath.Join(".", "vpn-connection-qr.png")
	
	log.Printf("🔍 Looking for VPN connection QR code at: %s", qrPath)
	
	if _, err := os.Stat(qrPath); os.IsNotExist(err) {
		log.Printf("❌ VPN connection QR code not found at: %s", qrPath)
		http.NotFound(w, r)
		return
	}
	
	// Set proper headers for QR code image
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	
	log.Printf("✅ Serving VPN connection QR code from: %s", qrPath)
	http.ServeFile(w, r, qrPath)
}

// handleFavicon serves favicon
func (wi *WebInterface) handleFavicon(w http.ResponseWriter, r *http.Request) {
	// Try to find icon file
	possiblePaths := []string{
		"./static/icon.png",
		"./server/static/icon.png",
		"../static/icon.png",
	}
	
	var iconPath string
	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			iconPath = path
			break
		}
	}
	
	if iconPath == "" {
		// Return 204 No Content instead of 404 for favicon
		w.WriteHeader(http.StatusNoContent)
		return
	}
	
	w.Header().Set("Content-Type", "image/png")
	http.ServeFile(w, r, iconPath)
}

// executeSudoCommand executes a command with sudo using provided password
func (wi *WebInterface) executeSudoCommand(command []string, password string) (string, error) {
	if len(command) == 0 {
		return "", fmt.Errorf("empty command")
	}

	// Create the full sudo command
	sudoCmd := append([]string{"sudo", "-S"}, command...)
	
	cmd := exec.Command(sudoCmd[0], sudoCmd[1:]...)
	
	// Create a buffer for stdin to pass the password
	var stdin bytes.Buffer
	stdin.WriteString(password + "\n")
	cmd.Stdin = &stdin
	
	// Capture both stdout and stderr
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	
	err := cmd.Run()
	
	// Combine stdout and stderr for output
	output := stdout.String()
	if stderr.String() != "" {
		if output != "" {
			output += "\n"
		}
		output += stderr.String()
	}
	
	return output, err
}

// testSudoAccess tests if the provided password works for sudo
func (wi *WebInterface) testSudoAccess(password string) bool {
	output, err := wi.executeSudoCommand([]string{"echo", "test"}, password)
	if err != nil {
		log.Printf("🔐 Sudo test failed: %v, output: %s", err, output)
		return false
	}
	return true
}

// handleSudoAuth handles sudo authentication requests
func (wi *WebInterface) handleSudoAuth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method != "POST" {
		wi.sendErrorResponse(w, "Method not allowed")
		return
	}
	
	var req SudoAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		wi.sendErrorResponse(w, "Invalid request body")
		return
	}
	
	// Test sudo access
	if !wi.testSudoAccess(req.Password) {
		response := SudoAuthResponse{
			Success: false,
			Message: "Invalid sudo password",
		}
		json.NewEncoder(w).Encode(response)
		return
	}
	
	// Execute the requested command
	commandParts := strings.Fields(req.Command)
	output, err := wi.executeSudoCommand(commandParts, req.Password)
	
	response := SudoAuthResponse{
		Success: err == nil,
		Output:  output,
	}
	
	if err != nil {
		response.Message = err.Error()
	} else {
		response.Message = "Command executed successfully"
	}
	
	json.NewEncoder(w).Encode(response)
}

// enableVPNModeWithPassword enables WireGuard VPN mode using sudo password
func (wi *WebInterface) enableVPNModeWithPassword(password string) (bool, string) {
	log.Println("🔐 Enabling WireGuard VPN mode with sudo authentication...")
	
	// Check if WireGuard config exists
	configPath := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "wireguard", "wg0.conf")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return false, "WireGuard configuration file not found. Please run setup first."
	}
	
	// Test sudo access first
	if !wi.testSudoAccess(password) {
		return false, "Invalid sudo password. Please check your password and try again."
	}
	
	// First, ensure any existing WireGuard interface is down
	log.Println("🔄 Stopping any existing WireGuard interface...")
	wi.executeSudoCommand([]string{"wg-quick", "down", configPath}, password)
	
	// Wait a moment for interface to be fully down
	time.Sleep(2 * time.Second)
	
	// Try to start WireGuard
	log.Println("🚀 Starting WireGuard VPN interface...")
	output, err := wi.executeSudoCommand([]string{"wg-quick", "up", configPath}, password)
	
	if err != nil {
		log.Printf("❌ Failed to start WireGuard: %v, output: %s", err, output)
		
		// Check for common issues and provide helpful error messages
		if strings.Contains(output, "already exists") {
			return false, "WireGuard interface already exists. Try switching to Local mode first, then back to VPN."
		} else if strings.Contains(output, "permission denied") {
			return false, "Permission denied. Please ensure you have sudo access."
		} else if strings.Contains(output, "Address already in use") {
			return false, "VPN address conflict. Please check network configuration."
		}
		
		return false, fmt.Sprintf("Failed to start WireGuard VPN: %s", output)
	}
	
	// Wait for interface to be fully up
	time.Sleep(3 * time.Second)
	
	// Verify VPN is working
	if !wi.isWireGuardActive() {
		return false, "WireGuard started but VPN interface is not responding"
	}
	
	log.Println("✅ WireGuard VPN mode enabled successfully")
	return true, "VPN mode activated successfully"
}

// enableLocalModeWithPassword enables local network mode using sudo password to stop VPN
func (wi *WebInterface) enableLocalModeWithPassword(password string) (bool, string) {
	log.Println("🔐 Enabling local network mode with sudo authentication...")
	
	// Check if WireGuard is currently running
	if wi.isWireGuardActive() {
		log.Println("🔄 WireGuard is active, attempting to stop with password...")
		
		// Test sudo access first
		if !wi.testSudoAccess(password) {
			return false, "Invalid sudo password. Please check your password and try again."
		}
		
		// Stop WireGuard using sudo password
		configPath := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "wireguard", "wg0.conf")
		output, err := wi.executeSudoCommand([]string{"wg-quick", "down", configPath}, password)
		
		if err != nil {
			log.Printf("⚠️ WireGuard shutdown warning: %v, output: %s", err, output)
			
			// Check for common issues
			if strings.Contains(output, "does not exist") || strings.Contains(output, "is not a WireGuard interface") {
				log.Println("✅ No WireGuard interface to stop")
			} else {
				return false, fmt.Sprintf("Failed to stop WireGuard VPN: %s", output)
			}
		} else {
			log.Printf("✅ WireGuard VPN stopped successfully: %s", output)
		}
		
		// Wait a moment for interface to fully shut down
		time.Sleep(2 * time.Second)
	}
	
	// Get local IP for binding
	wi.server.Host = wi.server.getLocalIP()
	log.Printf("🏠 Switching to local IP: %s", wi.server.Host)
	
	// Generate new QR code and connection URL for local network
	connectionURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", wi.server.Host, wi.server.Port, wi.server.SecretKey)
	wi.server.saveQRCodeImage(connectionURL)
	log.Printf("🔄 QR code regenerated for local mode with URL: %s", connectionURL)
	
	return true, "Local network mode activated successfully"
}

// enableVPNMode enables WireGuard VPN mode (legacy version - now requests password)
func (wi *WebInterface) enableVPNMode() (bool, string) {
	log.Println("🔐 Enabling WireGuard VPN mode...")
	
	// Check if WireGuard config exists
	configPath := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "wireguard", "wg0.conf")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		log.Printf("❌ WireGuard config not found at: %s", configPath)
		return false, "WireGuard configuration not found. Please run: ./scripts/auto-setup.sh"
	}
	
	// Check if sudo is available without password for WireGuard
	testCmd := exec.Command("sudo", "-n", "wg", "show")
	if err := testCmd.Run(); err != nil {
		log.Printf("⚠️ sudo password required for WireGuard. Checking manual setup instructions...")
		
		// Provide alternative: manual command for user
		return false, fmt.Sprintf("Manual VPN setup required. Please run:\n" +
			"sudo wg-quick up %s\n" +
			"Then refresh this page and try VPN mode again.", configPath)
	}
	
	// First, ensure any existing WireGuard interface is down
	log.Println("🔄 Stopping any existing WireGuard interface...")
	downCmd := exec.Command("sudo", "wg-quick", "down", configPath)
	downOutput, downErr := downCmd.CombinedOutput()
	if downErr != nil {
		log.Printf("⚠️ WireGuard down warning: %v, output: %s", downErr, string(downOutput))
		// Continue anyway - might not have been running
	}
	
	// Wait a moment for interface to be fully down
	time.Sleep(2 * time.Second)
	
	// Try to start WireGuard
	log.Println("🚀 Starting WireGuard VPN interface...")
	cmd := exec.Command("sudo", "wg-quick", "up", configPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ Failed to start WireGuard: %v, output: %s", err, string(output))
		
		// Check for common issues and provide helpful error messages
		outputStr := string(output)
		if strings.Contains(outputStr, "already exists") {
			return false, "WireGuard interface already exists. Try switching to Local mode first, then back to VPN."
		} else if strings.Contains(outputStr, "permission denied") {
			return false, "Permission denied. Please ensure sudo access for WireGuard commands."
		} else if strings.Contains(outputStr, "Address already in use") {
			return false, "VPN address conflict. Please check network configuration."
		}
		
		return false, fmt.Sprintf("Failed to start WireGuard VPN: %s", outputStr)
	}
	
	log.Printf("✅ WireGuard started successfully, output: %s", string(output))
	
	// Wait for interface to be fully up
	time.Sleep(3 * time.Second)
	
	// Verify WireGuard is actually running
	if !wi.isWireGuardActive() {
		log.Println("❌ WireGuard failed to start properly")
		return false, "WireGuard interface failed to initialize properly"
	}
	
	// Verify VPN IP is accessible
	if !wi.verifyVPNConnection() {
		log.Println("⚠️ WireGuard started but VPN IP not accessible")
		// Don't fail completely, but warn
	}
	
	// Update server host to VPN IP only after verification
	wi.server.Host = "10.0.0.1"
	log.Printf("✅ WireGuard VPN mode enabled - Host: %s", wi.server.Host)
	
	// Generate QR code manually with VPN IP and verify it's correct
	connectionURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", wi.server.Host, wi.server.Port, wi.server.SecretKey)
	wi.server.saveQRCodeImage(connectionURL)
	log.Printf("🔄 QR code regenerated for VPN mode with URL: %s", connectionURL)
	
	// Double-check that VPN binding will work for new connections
	if !wi.verifyVPNConnection() {
		log.Printf("⚠️ Warning: VPN QR generated but connection verification failed")
	}
	
	return true, ""
}

// enableLocalMode enables local network mode
func (wi *WebInterface) enableLocalMode() (bool, string) {
	log.Println("🏠 Enabling local network mode...")
	
	// Check if WireGuard is currently running
	if wi.isWireGuardActive() {
		log.Println("🔄 WireGuard is active, attempting to stop...")
		
		// Check if sudo is available without password
		testCmd := exec.Command("sudo", "-n", "wg", "show")
		if err := testCmd.Run(); err != nil {
			log.Printf("⚠️ sudo password required for WireGuard shutdown")
			return false, fmt.Sprintf("Manual VPN shutdown required. Please run:\n" +
				"sudo wg-quick down %s/.remoteclaude/wireguard/wg0.conf\n" +
				"Then try Local mode again.", os.Getenv("HOME"))
		}
		
		// Try to stop WireGuard if running
		configPath := filepath.Join(os.Getenv("HOME"), ".remoteclaude", "wireguard", "wg0.conf")
		cmd := exec.Command("sudo", "wg-quick", "down", configPath)
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("⚠️ WireGuard shutdown warning: %v, output: %s", err, string(output))
			
			// Check for common issues
			outputStr := string(output)
			if strings.Contains(outputStr, "does not exist") || strings.Contains(outputStr, "is not a WireGuard interface") {
				log.Println("✅ No WireGuard interface to stop")
			} else {
				// Continue anyway but log warning
				log.Printf("⚠️ Continuing despite WireGuard shutdown warning")
			}
		} else {
			log.Printf("✅ WireGuard stopped successfully, output: %s", string(output))
		}
		
		// Wait for interface to be fully down
		time.Sleep(2 * time.Second)
	} else {
		log.Println("✅ WireGuard not active, switching to local mode")
	}
	
	// Update server host to local IP with fresh detection
	oldHost := wi.server.Host
	newLocalIP := wi.server.getLocalIP()
	wi.server.Host = newLocalIP
	log.Printf("✅ Local network mode enabled - Host: %s (was: %s)", wi.server.Host, oldHost)
	
	// Generate QR code manually with verified local IP
	connectionURL := fmt.Sprintf("ws://%s:%s/ws?key=%s", wi.server.Host, wi.server.Port, wi.server.SecretKey)
	wi.server.saveQRCodeImage(connectionURL)
	log.Printf("🔄 QR code regenerated for local mode with URL: %s", connectionURL)
	
	// Verify local IP is accessible (especially important for tethering)
	if newLocalIP == "localhost" || newLocalIP == "127.0.0.1" {
		log.Printf("⚠️ Warning: Local IP detection returned localhost - may cause connection issues")
	}
	
	return true, ""
}

// isWireGuardActive checks if WireGuard is currently active
func (wi *WebInterface) isWireGuardActive() bool {
	// Primary method: check for WireGuard network interface with 10.0.0.1 address
	// This is more reliable than wg command which may require sudo
	ifCmd := exec.Command("ifconfig")
	ifOutput, ifErr := ifCmd.Output()
	if ifErr == nil {
		ifStr := string(ifOutput)
		// Check for our specific VPN server address
		hasVPNInterface := strings.Contains(ifStr, "10.0.0.1")
		log.Printf("🔍 WireGuard status (ifconfig check for 10.0.0.1): active=%t", hasVPNInterface)
		
		// Additional debug: show which interface has the VPN address
		if hasVPNInterface {
			lines := strings.Split(ifStr, "\n")
			for i, line := range lines {
				if strings.Contains(line, "10.0.0.1") {
					// Look backwards for interface name
					for j := i; j >= 0; j-- {
						if strings.Contains(lines[j], ":") && !strings.HasPrefix(strings.TrimSpace(lines[j]), "inet") {
							interfaceName := strings.Split(lines[j], ":")[0]
							log.Printf("🔍 Found VPN interface: %s", interfaceName)
							break
						}
					}
					break
				}
			}
		}
		// Return ifconfig result as primary indicator
		return hasVPNInterface
	}
	
	log.Printf("🔍 ifconfig failed, trying wg command as backup: %v", ifErr)
	
	// Backup method 1: First try without sudo (may work on some systems)
	cmd := exec.Command("wg", "show")
	output, err := cmd.Output()
	
	if err == nil {
		result := strings.Contains(string(output), "wg0")
		log.Printf("🔍 WireGuard status (no sudo): active=%t", result)
		return result
	}
	
	// Backup method 2: Try with sudo -n (non-interactive)
	cmd = exec.Command("sudo", "-n", "wg", "show")
	output, err = cmd.Output()
	
	if err == nil {
		result := strings.Contains(string(output), "wg0")
		log.Printf("🔍 WireGuard status (sudo): active=%t", result)
		return result
	}
	
	log.Printf("🔍 All WireGuard checks failed, assuming inactive: %v", err)
	return false
}

// verifyVPNConnection verifies that VPN IP is accessible
func (wi *WebInterface) verifyVPNConnection() bool {
	// Check if wg0 interface exists and has the correct IP (Linux/WSL2)
	cmd := exec.Command("ifconfig", "wg0")  // WireGuard uses wg0 interface on Linux
	output, err := cmd.Output()
	
	if err != nil {
		// Try alternative interface names for different platforms
		interfaceNames := []string{"utun0", "utun1", "utun2", "utun3", "utun4", "utun5"} // macOS
		
		for _, iface := range interfaceNames {
			cmd = exec.Command("ifconfig", iface)
			output, err = cmd.Output()
			if err == nil && strings.Contains(string(output), "10.0.0") {
				log.Printf("✅ Found VPN interface %s with 10.0.0.x IP", iface)
				return true
			}
		}
		log.Printf("❌ Failed to find VPN interface with 10.0.0.x IP")
		return false
	}
	
	// Check if 10.0.0.1 is assigned to the wg0 interface
	if !strings.Contains(string(output), "10.0.0.1") {
		log.Printf("❌ VPN IP 10.0.0.1 not found on wg0 interface")
		return false
	}
	
	log.Println("✅ VPN IP verified on wg0 interface")
	return true
}

// sendSuccessResponse sends a success API response
func (wi *WebInterface) sendSuccessResponse(w http.ResponseWriter, message string) {
	response := APIResponse{
		Success: true,
		Message: message,
	}
	json.NewEncoder(w).Encode(response)
}

// sendErrorResponse sends an error API response
func (wi *WebInterface) sendErrorResponse(w http.ResponseWriter, errorMsg string) {
	response := APIResponse{
		Success: false,
		Error:   errorMsg,
	}
	json.NewEncoder(w).Encode(response)
}

// StartWebServer starts the web interface server
func (wi *WebInterface) StartWebServer() {
	webMux := http.NewServeMux()
	
	// Static files with cache control for development
	webMux.Handle("/static/", http.StripPrefix("/static/", 
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
			http.FileServer(http.Dir("./web-ui/")).ServeHTTP(w, r)
		})))
	
	// Main dashboard
	webMux.HandleFunc("/", wi.handleDashboard)
	
	// API endpoints
	webMux.HandleFunc("/api/status", wi.handleStatus)
	webMux.HandleFunc("/api/switch-mode", wi.handleSwitchMode)
	webMux.HandleFunc("/api/sudo-auth", wi.handleSudoAuth)
	webMux.HandleFunc("/api/regenerate-qr", wi.handleRegenerateQR)
	webMux.HandleFunc("/api/restart", wi.handleRestart)
	webMux.HandleFunc("/api/logs", wi.handleLogs)
	webMux.HandleFunc("/api/wireguard-qr", wi.handleWireGuardQR)
	webMux.HandleFunc("/api/vpn-connection-qr", wi.handleVPNConnectionQR)
	webMux.HandleFunc("/qr-code.png", wi.handleQRCodeImage)
	webMux.HandleFunc("/wireguard-qr.png", wi.handleWireGuardQRImage)
	webMux.HandleFunc("/vpn-connection-qr.png", wi.handleVPNConnectionQRImage)
	webMux.HandleFunc("/favicon.ico", wi.handleFavicon)
	
	webPort := "8080"
	log.Printf("🌐 Starting web interface on http://%s:%s", wi.server.getLocalIP(), webPort)
	
	go func() {
		if err := http.ListenAndServe(":"+webPort, webMux); err != nil {
			log.Printf("❌ Web server failed to start: %v", err)
		}
	}()
}
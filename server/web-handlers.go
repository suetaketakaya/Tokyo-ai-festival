package main

import (
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
	Status     string          `json:"status"`
	Host       string          `json:"host"`
	Port       string          `json:"port"`
	SessionKey string          `json:"sessionKey"`
	Mode       string          `json:"mode"`
	QRCodeURL  string          `json:"qrCodeUrl,omitempty"`
	Clients    []ClientInfo    `json:"clients"`
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
	Mode string `json:"mode"`
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
	
	// Determine current mode
	mode := "local"
	if wi.isWireGuardActive() {
		mode = "vpn"
	}
	
	// Get connected clients (placeholder for now)
	clients := []ClientInfo{
		// This would be populated from actual WebSocket connections
	}
	
	status := StatusResponse{
		Status:     "running",
		Host:       wi.server.Host,
		Port:       wi.server.Port,
		SessionKey: wi.server.SecretKey,
		Mode:       mode,
		QRCodeURL:  "/qr-code.png",
		Clients:    clients,
	}
	
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
	
	log.Printf("🔄 Switching to %s mode", req.Mode)
	
	success := false
	var errorMsg string
	
	switch req.Mode {
	case "vpn":
		success, errorMsg = wi.enableVPNMode()
	case "local":
		success, errorMsg = wi.enableLocalMode()
	default:
		errorMsg = "Invalid mode specified"
	}
	
	if success {
		wi.sendSuccessResponse(w, fmt.Sprintf("Successfully switched to %s mode", req.Mode))
	} else {
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
	configPath := filepath.Join(os.Getenv("HOME"), "wireguard-config", "client.conf")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		wi.sendErrorResponse(w, "WireGuard configuration not found. Please run setup first.")
		return
	}
	
	// Generate QR code for WireGuard config
	qrPath := filepath.Join(os.Getenv("HOME"), "wireguard-config", "wireguard-qr.png")
	cmd := exec.Command("qrencode", "-t", "png", "-o", qrPath, "-r", configPath)
	
	if err := cmd.Run(); err != nil {
		wi.sendErrorResponse(w, "Failed to generate WireGuard QR code")
		return
	}
	
	response := APIResponse{
		Success: true,
		Data:    map[string]string{"qrCodeUrl": "/wireguard-qr.png"},
	}
	
	json.NewEncoder(w).Encode(response)
}

// handleQRCodeImage serves the QR code image
func (wi *WebInterface) handleQRCodeImage(w http.ResponseWriter, r *http.Request) {
	qrPath := "./server/qr-code.png"
	
	if _, err := os.Stat(qrPath); os.IsNotExist(err) {
		http.NotFound(w, r)
		return
	}
	
	w.Header().Set("Content-Type", "image/png")
	http.ServeFile(w, r, qrPath)
}

// enableVPNMode enables WireGuard VPN mode
func (wi *WebInterface) enableVPNMode() (bool, string) {
	log.Println("🔐 Enabling WireGuard VPN mode...")
	
	// Check if WireGuard config exists
	configPath := filepath.Join(os.Getenv("HOME"), "wireguard-config", "wg0.conf")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return false, "WireGuard configuration not found. Please run initial setup."
	}
	
	// Try to start WireGuard
	cmd := exec.Command("sudo", "wg-quick", "up", configPath)
	if err := cmd.Run(); err != nil {
		log.Printf("❌ Failed to start WireGuard: %v", err)
		return false, "Failed to start WireGuard VPN. Please check configuration."
	}
	
	// Update server host to VPN IP
	wi.server.Host = "10.0.0.1"
	log.Println("✅ WireGuard VPN mode enabled")
	
	return true, ""
}

// enableLocalMode enables local network mode
func (wi *WebInterface) enableLocalMode() (bool, string) {
	log.Println("🏠 Enabling local network mode...")
	
	// Try to stop WireGuard if running
	configPath := filepath.Join(os.Getenv("HOME"), "wireguard-config", "wg0.conf")
	cmd := exec.Command("sudo", "wg-quick", "down", configPath)
	cmd.Run() // Ignore errors in case WireGuard wasn't running
	
	// Update server host to local IP
	wi.server.Host = wi.server.getLocalIP()
	log.Printf("✅ Local network mode enabled - Host: %s", wi.server.Host)
	
	return true, ""
}

// isWireGuardActive checks if WireGuard is currently active
func (wi *WebInterface) isWireGuardActive() bool {
	cmd := exec.Command("sudo", "wg", "show")
	output, err := cmd.Output()
	
	if err != nil {
		return false
	}
	
	return strings.Contains(string(output), "wg0")
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
	
	// Static files
	webMux.Handle("/static/", http.StripPrefix("/static/", 
		http.FileServer(http.Dir("./web-ui/"))))
	
	// Main dashboard
	webMux.HandleFunc("/", wi.handleDashboard)
	
	// API endpoints
	webMux.HandleFunc("/api/status", wi.handleStatus)
	webMux.HandleFunc("/api/switch-mode", wi.handleSwitchMode)
	webMux.HandleFunc("/api/regenerate-qr", wi.handleRegenerateQR)
	webMux.HandleFunc("/api/restart", wi.handleRestart)
	webMux.HandleFunc("/api/logs", wi.handleLogs)
	webMux.HandleFunc("/api/wireguard-qr", wi.handleWireGuardQR)
	webMux.HandleFunc("/qr-code.png", wi.handleQRCodeImage)
	
	webPort := "8080"
	log.Printf("🌐 Starting web interface on http://%s:%s", wi.server.getLocalIP(), webPort)
	
	go func() {
		if err := http.ListenAndServe(":"+webPort, webMux); err != nil {
			log.Printf("❌ Web server failed to start: %v", err)
		}
	}()
}
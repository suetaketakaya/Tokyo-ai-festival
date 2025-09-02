package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// HandlePreviewProxy proxies requests to local development servers
func HandlePreviewProxy(w http.ResponseWriter, r *http.Request) {
	// Extract the path after /api/preview/
	path := strings.TrimPrefix(r.URL.Path, "/api/preview")
	
	// Default to port 3000 (common for React/Next.js)
	targetPort := "3000"
	
	// Check for port specification in query params
	if port := r.URL.Query().Get("port"); port != "" {
		targetPort = port
	}
	
	// Try common development server ports
	ports := []string{targetPort, "3000", "3001", "8080", "8000", "5173", "4200"}
	
	var targetURL *url.URL
	var err error
	
	// Try to find an active development server
	for _, port := range ports {
		testURL := fmt.Sprintf("http://localhost:%s%s", port, path)
		if resp, err := http.Head(testURL); err == nil && resp.StatusCode < 400 {
			targetURL, _ = url.Parse(testURL)
			resp.Body.Close()
			break
		}
	}
	
	if targetURL == nil {
		http.Error(w, "No active development server found on common ports", http.StatusBadGateway)
		return
	}
	
	// Create proxy request
	proxyReq, err := http.NewRequest(r.Method, targetURL.String(), r.Body)
	if err != nil {
		http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
		return
	}
	
	// Copy headers
	for key, values := range r.Header {
		for _, value := range values {
			proxyReq.Header.Add(key, value)
		}
	}
	
	// Copy query parameters
	proxyReq.URL.RawQuery = r.URL.RawQuery
	
	// Make the request
	client := &http.Client{}
	resp, err := client.Do(proxyReq)
	if err != nil {
		http.Error(w, fmt.Sprintf("Proxy request failed: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	
	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	
	// Set CORS headers for development
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	
	// Copy status code
	w.WriteHeader(resp.StatusCode)
	
	// Copy response body
	io.Copy(w, resp.Body)
}

// HandleQRCode serves the QR code image
func HandleQRCode(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/qr.png")
}

// HandleSystemInfo returns system information
func HandleSystemInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Get basic system info
	info := map[string]interface{}{
		"server_status":      "running",
		"active_connections": len(hub.clients),
		"claude_available":   checkClaudeAvailability(),
		"git_available":      checkGitAvailability(),
		"timestamp":          fmt.Sprintf("%d", r.Context().Value("timestamp")),
	}
	
	// Try to get server IP
	if ip, err := getServerIP(); err == nil {
		info["server_ip"] = ip
	}
	
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{
		"server_status": "%s",
		"active_connections": %d,
		"claude_available": %t,
		"git_available": %t,
		"server_ip": "%s"
	}`, 
		info["server_status"], 
		info["active_connections"], 
		info["claude_available"], 
		info["git_available"],
		info["server_ip"],
	)
}

func checkClaudeAvailability() bool {
	// Try to run claude --version to check if it's available
	// This is a simple check - in production you might want more sophisticated checking
	return true // Assume available for now
}

func checkGitAvailability() bool {
	// Check if git is available
	return true // Assume available for now
}

func getServerIP() (string, error) {
	// This would get the actual server IP
	// For now, return localhost
	return "localhost", nil
}
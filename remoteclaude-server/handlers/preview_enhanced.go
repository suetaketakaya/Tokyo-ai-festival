package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"remoteclaude/utils"
)

// PreviewManager manages development server proxying
type PreviewManager struct {
	activeServers map[int]bool
	lastScan      time.Time
}

var previewManager = &PreviewManager{
	activeServers: make(map[int]bool),
	lastScan:      time.Time{},
}

// HandlePreviewProxyEnhanced is an enhanced version with auto-detection
func HandlePreviewProxyEnhanced(w http.ResponseWriter, r *http.Request) {
	// Update active servers periodically
	if time.Since(previewManager.lastScan) > 30*time.Second {
		previewManager.updateActiveServers()
	}
	
	// Extract path and port
	path := strings.TrimPrefix(r.URL.Path, "/api/preview")
	targetPort := getTargetPort(r)
	
	// If no specific port, try to find active server
	if targetPort == 0 {
		targetPort = previewManager.findBestServer()
	}
	
	if targetPort == 0 {
		sendPreviewError(w, "No active development server found", nil)
		return
	}
	
	// Build target URL
	targetURL := fmt.Sprintf("http://localhost:%d%s", targetPort, path)
	
	// Proxy the request
	if err := proxyRequest(w, r, targetURL); err != nil {
		sendPreviewError(w, "Proxy request failed", err)
		return
	}
}

// getTargetPort extracts target port from request
func getTargetPort(r *http.Request) int {
	if portStr := r.URL.Query().Get("port"); portStr != "" {
		if port, err := strconv.Atoi(portStr); err == nil {
			return port
		}
	}
	
	// Check for port in path (e.g., /api/preview/3000/...)
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/preview/"), "/")
	if len(pathParts) > 0 {
		if port, err := strconv.Atoi(pathParts[0]); err == nil && port > 1000 && port < 65536 {
			return port
		}
	}
	
	return 0
}

// updateActiveServers scans for active development servers
func (pm *PreviewManager) updateActiveServers() {
	activeServers := utils.DetectDevelopmentServers()
	pm.activeServers = make(map[int]bool)
	
	for _, port := range activeServers {
		pm.activeServers[port] = true
	}
	
	pm.lastScan = time.Now()
	
	// Broadcast active servers to connected clients
	BroadcastMessage(Message{
		Type: "preview_servers_updated",
		Data: map[string]interface{}{
			"active_ports": activeServers,
			"timestamp":    time.Now(),
		},
		Timestamp: time.Now(),
	})
}

// findBestServer returns the most likely development server port
func (pm *PreviewManager) findBestServer() int {
	// Priority order for common frameworks
	priorities := []int{3000, 5173, 4200, 8000, 3001, 8080}
	
	// Check priority ports first
	for _, port := range priorities {
		if pm.activeServers[port] {
			return port
		}
	}
	
	// Return any active server
	for port := range pm.activeServers {
		return port
	}
	
	return 0
}

// proxyRequest handles the actual proxying with mobile optimizations
func proxyRequest(w http.ResponseWriter, r *http.Request, targetURL string) error {
	// Parse target URL
	target, err := url.Parse(targetURL)
	if err != nil {
		return err
	}
	
	// Create proxy request
	proxyReq, err := http.NewRequest(r.Method, target.String(), r.Body)
	if err != nil {
		return err
	}
	
	// Copy headers with mobile optimizations
	copyHeaders(proxyReq, r)
	
	// Set mobile-friendly headers
	proxyReq.Header.Set("User-Agent", "RemoteClaude-Mobile/1.0")
	proxyReq.Header.Set("X-Forwarded-For", r.RemoteAddr)
	proxyReq.Header.Set("X-Forwarded-Proto", "http")
	
	// Make request
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	
	resp, err := client.Do(proxyReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	// Copy response headers with mobile optimizations
	copyResponseHeaders(w, resp)
	
	// Set mobile optimization headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	
	// Add mobile viewport if HTML content
	if strings.Contains(resp.Header.Get("Content-Type"), "text/html") {
		w.Header().Set("X-RemoteClaude-Mobile", "true")
	}
	
	// Copy status code
	w.WriteHeader(resp.StatusCode)
	
	// Stream response body
	_, err = io.Copy(w, resp.Body)
	return err
}

// copyHeaders copies request headers
func copyHeaders(dst *http.Request, src *http.Request) {
	for key, values := range src.Header {
		// Skip some headers that might cause issues
		if shouldSkipHeader(key) {
			continue
		}
		
		for _, value := range values {
			dst.Header.Add(key, value)
		}
	}
	
	// Copy query parameters
	dst.URL.RawQuery = src.URL.RawQuery
}

// copyResponseHeaders copies response headers
func copyResponseHeaders(dst http.ResponseWriter, src *http.Response) {
	for key, values := range src.Header {
		// Skip connection-related headers
		if shouldSkipResponseHeader(key) {
			continue
		}
		
		for _, value := range values {
			dst.Header().Add(key, value)
		}
	}
}

// shouldSkipHeader checks if a request header should be skipped
func shouldSkipHeader(key string) bool {
	skipHeaders := []string{
		"Connection",
		"Keep-Alive",
		"Proxy-Authenticate",
		"Proxy-Authorization",
		"Te",
		"Trailers",
		"Transfer-Encoding",
		"Upgrade",
	}
	
	keyLower := strings.ToLower(key)
	for _, skip := range skipHeaders {
		if strings.ToLower(skip) == keyLower {
			return true
		}
	}
	return false
}

// shouldSkipResponseHeader checks if a response header should be skipped
func shouldSkipResponseHeader(key string) bool {
	skipHeaders := []string{
		"Connection",
		"Keep-Alive",
		"Transfer-Encoding",
		"Upgrade",
	}
	
	keyLower := strings.ToLower(key)
	for _, skip := range skipHeaders {
		if strings.ToLower(skip) == keyLower {
			return true
		}
	}
	return false
}

// sendPreviewError sends a formatted error response
func sendPreviewError(w http.ResponseWriter, message string, err error) {
	errorMsg := message
	if err != nil {
		errorMsg = fmt.Sprintf("%s: %v", message, err)
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadGateway)
	
	fmt.Fprintf(w, `{
		"error": true,
		"message": "%s",
		"suggestion": "Make sure your development server is running on a common port (3000, 4200, 5173, etc.)",
		"active_servers": %v
	}`, errorMsg, utils.DetectDevelopmentServers())
}

// HandlePreviewStatus returns status of all development servers
func HandlePreviewStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	activeServers := utils.DetectDevelopmentServers()
	
	response := map[string]interface{}{
		"active_servers": activeServers,
		"timestamp":      time.Now(),
		"default_port":   0,
	}
	
	if len(activeServers) > 0 {
		response["default_port"] = activeServers[0]
	}
	
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{
		"active_servers": [%s],
		"timestamp": "%s",
		"default_port": %d
	}`,
		strings.Trim(strings.Join(strings.Fields(fmt.Sprint(activeServers)), ","), "[]"),
		time.Now().Format(time.RFC3339),
		response["default_port"],
	)
}
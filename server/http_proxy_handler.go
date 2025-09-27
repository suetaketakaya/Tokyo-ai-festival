package main

import (
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/gorilla/websocket"
)

// setupHTTPProxyHandlers adds HTTP proxy functionality to serve container content
func (s *Server) setupHTTPProxyHandlers() {
	// Proxy handler for container web applications
	http.HandleFunc("/container/", s.handleContainerProxy)

	// Direct file access handler for container content
	http.HandleFunc("/preview/", s.handlePreviewProxy)

	log.Printf("🌐 HTTP proxy handlers registered for container access")
}

// handleContainerProxy proxies requests to container HTTP servers
func (s *Server) handleContainerProxy(w http.ResponseWriter, r *http.Request) {
	// Extract container ID and path from URL
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/container/"), "/")
	if len(pathParts) < 2 {
		http.Error(w, "Invalid container proxy URL format", http.StatusBadRequest)
		return
	}

	containerID := pathParts[0]
	containerPath := "/" + strings.Join(pathParts[1:], "/")

	// For query parameters
	if r.URL.RawQuery != "" {
		containerPath += "?" + r.URL.RawQuery
	}

	log.Printf("🔄 Proxying request: %s -> container %s:%s", r.URL.Path, containerID, containerPath)

	// Execute curl command in container
	var cmd *exec.Cmd
	if r.Method == "GET" {
		cmd = exec.Command("docker", "exec", containerID, "curl", "-s", "http://localhost:3000"+containerPath)
	} else {
		http.Error(w, "Method not supported", http.StatusMethodNotAllowed)
		return
	}

	output, err := cmd.Output()
	if err != nil {
		log.Printf("❌ Container proxy error: %v", err)
		http.Error(w, "Container service unavailable", http.StatusServiceUnavailable)
		return
	}

	// Determine content type based on file extension
	contentType := "text/html; charset=utf-8"
	if strings.HasSuffix(containerPath, ".css") {
		contentType = "text/css"
	} else if strings.HasSuffix(containerPath, ".js") {
		contentType = "application/javascript"
	} else if strings.HasSuffix(containerPath, ".png") {
		contentType = "image/png"
	} else if strings.HasSuffix(containerPath, ".jpg") || strings.HasSuffix(containerPath, ".jpeg") {
		contentType = "image/jpeg"
	}

	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Content-Type", contentType)

	// Write response
	w.WriteHeader(http.StatusOK)
	w.Write(output)

	log.Printf("✅ Proxied %d bytes for %s", len(output), r.URL.Path)
}

// handlePreviewProxy serves files directly from container filesystem
func (s *Server) handlePreviewProxy(w http.ResponseWriter, r *http.Request) {
	// Extract container ID and file path from URL
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/preview/"), "/")
	if len(pathParts) < 2 {
		http.Error(w, "Invalid preview URL format", http.StatusBadRequest)
		return
	}

	containerID := pathParts[0]
	filePath := "/" + strings.Join(pathParts[1:], "/")

	log.Printf("📁 Serving file: %s from container %s", filePath, containerID)

	// Use docker cp to extract file content
	cmd := exec.Command("docker", "exec", containerID, "cat", "/workspace"+filePath)
	output, err := cmd.Output()
	if err != nil {
		log.Printf("❌ File access error: %v", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Determine content type based on file extension
	ext := filepath.Ext(filePath)
	contentType := "text/plain"
	switch ext {
	case ".html":
		contentType = "text/html; charset=utf-8"
	case ".css":
		contentType = "text/css"
	case ".js":
		contentType = "application/javascript"
	case ".png":
		contentType = "image/png"
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".svg":
		contentType = "image/svg+xml"
	case ".json":
		contentType = "application/json"
	}

	// Set headers
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Write file content
	w.WriteHeader(http.StatusOK)
	w.Write(output)

	log.Printf("✅ Served file %s (%d bytes)", filePath, len(output))
}

// Enhanced preview list handler that includes proxy URLs
func (s *Server) handlePreviewListWithProxy(conn *websocket.Conn, msg map[string]interface{}) {
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid preview list message format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	log.Printf("👁️ Handling enhanced preview list request for project: %s", projectID)

	// Get container ID
	containerID, err := s.dockerManager.getContainerID(projectID)
	if err != nil || containerID == "" {
		s.sendError(conn, "Project container not found")
		return
	}

	previews := []map[string]interface{}{}

	// Check for HTTP server on port 3000
	checkCmd := exec.Command("docker", "exec", containerID, "ss", "-tuln")
	output, err := checkCmd.Output()
	if err == nil && strings.Contains(string(output), ":3000") {
		previews = append(previews, map[string]interface{}{
			"id":          "web_app",
			"name":        "Web Application",
			"type":        "web",
			"port":        3000,
			"url":         fmt.Sprintf("http://192.168.0.135:8080/container/%s/", containerID),
			"description": "HTML/CSS/JavaScript web application",
			"status":      "running",
		})
	}

	// Check for Jupyter on port 8888
	if strings.Contains(string(output), ":8888") {
		previews = append(previews, map[string]interface{}{
			"id":          "jupyter_notebook",
			"name":        "Jupyter Notebook",
			"type":        "notebook",
			"port":        8888,
			"url":         fmt.Sprintf("http://192.168.0.135:8080/container/%s/", containerID),
			"description": "Jupyter notebook interface",
			"status":      "running",
		})
	}

	// Send response
	response := map[string]interface{}{
		"type": "preview_list_response",
		"data": map[string]interface{}{
			"project_id": projectID,
			"previews":   previews,
			"status":     "success",
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send enhanced preview list: %v", err)
		return
	}

	log.Printf("✅ Sent enhanced preview list for project %s (%d items)", projectID, len(previews))
}
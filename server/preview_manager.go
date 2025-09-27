package main

import (
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// PreviewService represents a running preview service
type PreviewService struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Port        int       `json:"port"`
	ProjectID   string    `json:"project_id"`
	Status      string    `json:"status"`
	ProcessPID  string    `json:"process_pid"`
	ProcessName string    `json:"process_name"`
	URL         string    `json:"url"`
	ProxyURL    string    `json:"proxy_url"`
	Description string    `json:"description"`
	StartedAt   time.Time `json:"started_at"`
	LastAccess  time.Time `json:"last_access"`
}

// PreviewManager manages preview services lifecycle
type PreviewManager struct {
	services map[string]*PreviewService
	mutex    sync.RWMutex
}

// NewPreviewManager creates a new preview manager
func NewPreviewManager() *PreviewManager {
	return &PreviewManager{
		services: make(map[string]*PreviewService),
	}
}

// Global preview manager instance
var globalPreviewManager = NewPreviewManager()

// GetPreviewManager returns the global preview manager
func GetPreviewManager() *PreviewManager {
	return globalPreviewManager
}

// RegisterService registers a new preview service
func (pm *PreviewManager) RegisterService(service *PreviewService) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	service.StartedAt = time.Now()
	service.LastAccess = time.Now()
	pm.services[service.ID] = service

	log.Printf("🔧 Registered preview service: %s (%s:%d)", service.Name, service.Type, service.Port)
}

// UnregisterService removes a preview service
func (pm *PreviewManager) UnregisterService(serviceID string) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	if service, exists := pm.services[serviceID]; exists {
		delete(pm.services, serviceID)
		log.Printf("🗑️ Unregistered preview service: %s", service.Name)
	}
}

// GetService gets a service by ID
func (pm *PreviewManager) GetService(serviceID string) (*PreviewService, bool) {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	service, exists := pm.services[serviceID]
	if exists {
		service.LastAccess = time.Now()
	}
	return service, exists
}

// GetServicesByProject gets all services for a project
func (pm *PreviewManager) GetServicesByProject(projectID string) []*PreviewService {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	var services []*PreviewService
	for _, service := range pm.services {
		if service.ProjectID == projectID {
			services = append(services, service)
		}
	}
	return services
}

// GetAllServices gets all registered services
func (pm *PreviewManager) GetAllServices() []*PreviewService {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	var services []*PreviewService
	for _, service := range pm.services {
		services = append(services, service)
	}
	return services
}

// StartService starts a preview service
func (pm *PreviewManager) StartService(projectID, serviceType string, port int) (*PreviewService, error) {
	containerID := getContainerID(projectID)
	if containerID == "" {
		return nil, fmt.Errorf("container not found for project %s", projectID)
	}

	serviceID := fmt.Sprintf("%s_%s_%d", projectID, serviceType, port)

	// Check if service already exists
	if service, exists := pm.GetService(serviceID); exists {
		if pm.isServiceRunning(service) {
			return service, nil
		}
		// Service exists but not running, remove it
		pm.UnregisterService(serviceID)
	}

	var cmd *exec.Cmd
	var serviceName, description string

	switch serviceType {
	case "jupyter":
		serviceName = "Jupyter Notebook"
		description = "Jupyter Notebook interface"
		cmd = exec.Command("docker", "exec", "-d", containerID, "bash", "-c",
			fmt.Sprintf("cd /workspace && JUPYTER_RUNTIME_DIR=/tmp/jupyter_runtime JUPYTER_DATA_DIR=/tmp/jupyter_data jupyter notebook --ip=0.0.0.0 --port=%d --no-browser --allow-root --NotebookApp.token='' --NotebookApp.password='' --NotebookApp.allow_origin='*'", port))

	case "webapp":
		serviceName = "Web Application"
		description = "HTML/CSS/JavaScript web application"
		cmd = exec.Command("docker", "exec", "-d", containerID, "bash", "-c",
			fmt.Sprintf("cd /workspace && python3 -m http.server %d", port))

	case "streamlit":
		serviceName = "Streamlit App"
		description = "Streamlit web application"
		cmd = exec.Command("docker", "exec", "-d", containerID, "bash", "-c",
			fmt.Sprintf("cd /workspace && streamlit run app.py --server.port %d --server.address 0.0.0.0", port))

	default:
		return nil, fmt.Errorf("unsupported service type: %s", serviceType)
	}

	// Start the service
	log.Printf("🚀 Starting %s service on port %d for project %s", serviceName, port, projectID)
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start %s: %v", serviceName, err)
	}

	// Wait a moment for service to initialize
	time.Sleep(2 * time.Second)

	// Verify service is running
	checkCmd := exec.Command("docker", "exec", containerID, "ss", "-tuln")
	output, err := checkCmd.Output()
	if err != nil || !strings.Contains(string(output), fmt.Sprintf(":%d", port)) {
		return nil, fmt.Errorf("service failed to start on port %d", port)
	}

	// Create service record
	service := &PreviewService{
		ID:          serviceID,
		Name:        serviceName,
		Type:        serviceType,
		Port:        port,
		ProjectID:   projectID,
		Status:      "running",
		ProcessPID:  "unknown",
		ProcessName: serviceType,
		URL:         fmt.Sprintf("http://localhost:%d", port),
		ProxyURL:    fmt.Sprintf("/proxy/%s/%d", projectID, port),
		Description: description,
	}

	pm.RegisterService(service)
	log.Printf("✅ Started %s service successfully", serviceName)

	return service, nil
}

// StopService stops a preview service
func (pm *PreviewManager) StopService(serviceID string) error {
	service, exists := pm.GetService(serviceID)
	if !exists {
		return fmt.Errorf("service %s not found", serviceID)
	}

	containerID := getContainerID(service.ProjectID)
	if containerID == "" {
		return fmt.Errorf("container not found for project %s", service.ProjectID)
	}

	log.Printf("🛑 Stopping service: %s (port %d)", service.Name, service.Port)

	// Kill processes on the port
	killCmd := exec.Command("docker", "exec", containerID, "bash", "-c",
		fmt.Sprintf("fuser -k %d/tcp || pkill -f 'port.*%d' || pkill -f ':%d' || true",
			service.Port, service.Port, service.Port))

	if err := killCmd.Run(); err != nil {
		log.Printf("⚠️ Warning: Failed to kill processes on port %d: %v", service.Port, err)
	}

	// Wait for cleanup
	time.Sleep(1 * time.Second)

	// Verify service is stopped
	checkCmd := exec.Command("docker", "exec", containerID, "ss", "-tuln")
	output, err := checkCmd.Output()
	if err == nil && strings.Contains(string(output), fmt.Sprintf(":%d", service.Port)) {
		log.Printf("⚠️ Warning: Service may still be running on port %d", service.Port)
	}

	// Update service status
	service.Status = "stopped"
	log.Printf("✅ Stopped service: %s", service.Name)

	return nil
}

// DeleteService removes a service completely
func (pm *PreviewManager) DeleteService(serviceID string) error {
	// First stop the service
	if err := pm.StopService(serviceID); err != nil {
		log.Printf("⚠️ Warning during stop: %v", err)
	}

	// Remove from registry
	pm.UnregisterService(serviceID)
	log.Printf("🗑️ Deleted service: %s", serviceID)

	return nil
}

// isServiceRunning checks if a service is actually running
func (pm *PreviewManager) isServiceRunning(service *PreviewService) bool {
	containerID := getContainerID(service.ProjectID)
	if containerID == "" {
		return false
	}

	checkCmd := exec.Command("docker", "exec", containerID, "ss", "-tuln")
	output, err := checkCmd.Output()
	if err != nil {
		return false
	}

	return strings.Contains(string(output), fmt.Sprintf(":%d", service.Port))
}

// UpdateServiceStatuses updates all service statuses
func (pm *PreviewManager) UpdateServiceStatuses() {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	for _, service := range pm.services {
		if pm.isServiceRunning(service) {
			service.Status = "running"
		} else {
			service.Status = "stopped"
		}
	}
}

// CleanupStaleServices removes services that haven't been accessed recently
func (pm *PreviewManager) CleanupStaleServices(maxIdleTime time.Duration) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	cutoff := time.Now().Add(-maxIdleTime)
	var toDelete []string

	for serviceID, service := range pm.services {
		if service.LastAccess.Before(cutoff) && service.Status == "stopped" {
			toDelete = append(toDelete, serviceID)
		}
	}

	for _, serviceID := range toDelete {
		delete(pm.services, serviceID)
		log.Printf("🧹 Cleaned up stale service: %s", serviceID)
	}
}

// Helper function to get container ID (implement based on your existing logic)
func getContainerID(projectID string) string {
	// This should match your existing getContainerID implementation
	// For now, using a placeholder - replace with actual implementation
	return "eabc0f3ec3ed" // Replace with dynamic container lookup
}

// Preview control message handlers
func (s *Server) handlePreviewControl(conn *websocket.Conn, msg map[string]interface{}) {
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid preview control message format")
		return
	}

	action, ok := data["action"].(string)
	if !ok {
		s.sendError(conn, "Missing action in preview control")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok {
		s.sendError(conn, "Missing project_id in preview control")
		return
	}

	pm := GetPreviewManager()

	switch action {
	case "start":
		s.handlePreviewStart(conn, pm, data, projectID)
	case "stop":
		s.handlePreviewStop(conn, pm, data, projectID)
	case "delete":
		s.handlePreviewDelete(conn, pm, data, projectID)
	case "list":
		s.handlePreviewListManaged(conn, pm, projectID)
	case "cleanup":
		s.handlePreviewCleanup(conn, pm, projectID)
	default:
		s.sendError(conn, fmt.Sprintf("Unknown action: %s", action))
	}
}

func (s *Server) handlePreviewStart(conn *websocket.Conn, pm *PreviewManager, data map[string]interface{}, projectID string) {
	serviceType, ok := data["service_type"].(string)
	if !ok {
		s.sendError(conn, "Missing service_type")
		return
	}

	port, ok := data["port"].(float64)
	if !ok {
		s.sendError(conn, "Missing or invalid port")
		return
	}

	service, err := pm.StartService(projectID, serviceType, int(port))
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to start service: %v", err))
		return
	}

	response := map[string]interface{}{
		"type": "preview_control_response",
		"data": map[string]interface{}{
			"action":     "start",
			"status":     "success",
			"service":    service,
			"project_id": projectID,
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send preview start response: %v", err)
	}
}

func (s *Server) handlePreviewStop(conn *websocket.Conn, pm *PreviewManager, data map[string]interface{}, projectID string) {
	serviceID, ok := data["service_id"].(string)
	if !ok {
		s.sendError(conn, "Missing service_id")
		return
	}

	if err := pm.StopService(serviceID); err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to stop service: %v", err))
		return
	}

	response := map[string]interface{}{
		"type": "preview_control_response",
		"data": map[string]interface{}{
			"action":     "stop",
			"status":     "success",
			"service_id": serviceID,
			"project_id": projectID,
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send preview stop response: %v", err)
	}
}

func (s *Server) handlePreviewDelete(conn *websocket.Conn, pm *PreviewManager, data map[string]interface{}, projectID string) {
	serviceID, ok := data["service_id"].(string)
	if !ok {
		s.sendError(conn, "Missing service_id")
		return
	}

	if err := pm.DeleteService(serviceID); err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to delete service: %v", err))
		return
	}

	response := map[string]interface{}{
		"type": "preview_control_response",
		"data": map[string]interface{}{
			"action":     "delete",
			"status":     "success",
			"service_id": serviceID,
			"project_id": projectID,
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send preview delete response: %v", err)
	}
}

func (s *Server) handlePreviewListManaged(conn *websocket.Conn, pm *PreviewManager, projectID string) {
	// Update service statuses before sending
	pm.UpdateServiceStatuses()

	services := pm.GetServicesByProject(projectID)

	response := map[string]interface{}{
		"type": "preview_control_response",
		"data": map[string]interface{}{
			"action":     "list",
			"status":     "success",
			"services":   services,
			"project_id": projectID,
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send preview list response: %v", err)
	}
}

func (s *Server) handlePreviewCleanup(conn *websocket.Conn, pm *PreviewManager, projectID string) {
	// Cleanup stale services (older than 1 hour)
	pm.CleanupStaleServices(1 * time.Hour)

	// Stop all stopped services for this project
	services := pm.GetServicesByProject(projectID)
	var cleanedCount int

	for _, service := range services {
		if service.Status == "stopped" {
			pm.DeleteService(service.ID)
			cleanedCount++
		}
	}

	response := map[string]interface{}{
		"type": "preview_control_response",
		"data": map[string]interface{}{
			"action":        "cleanup",
			"status":        "success",
			"cleaned_count": cleanedCount,
			"project_id":    projectID,
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send preview cleanup response: %v", err)
	}

	log.Printf("🧹 Cleaned up %d services for project %s", cleanedCount, projectID)
}
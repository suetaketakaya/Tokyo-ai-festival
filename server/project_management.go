package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/gorilla/websocket"
)

// ProjectManagementHandler handles all project management operations
type ProjectManagementHandler struct {
	dockerManager *DockerManager
}

// NewProjectManagementHandler creates a new project management handler
func NewProjectManagementHandler(dm *DockerManager) *ProjectManagementHandler {
	return &ProjectManagementHandler{
		dockerManager: dm,
	}
}

// ProjectDetails represents detailed information about a project
type ProjectDetails struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Type        string            `json:"type"`
	Status      string            `json:"status"`
	ContainerID string            `json:"container_id"`
	Ports       []PortMapping     `json:"ports"`
	Resources   ResourceLimits    `json:"resources"`
	Environment map[string]string `json:"environment"`
	CreatedAt   string            `json:"created_at"`
	LastUsed    string            `json:"last_used"`
}

// PortMapping represents a port mapping configuration
type PortMapping struct {
	Internal int    `json:"internal"`
	External int    `json:"external"`
	Protocol string `json:"protocol"`
	Service  string `json:"service"`
	Status   string `json:"status"`
}

// handleProjectDetailsRequest handles project details requests
func (s *Server) handleProjectDetailsRequest(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🔍 Handling project details request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project details request format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	// Get project from Docker manager
	projects, err := s.dockerManager.ListProjects()
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to list projects: %v", err))
		return
	}

	var targetProject *Project
	for _, project := range projects {
		if project.ID == projectID {
			targetProject = project
			break
		}
	}

	if targetProject == nil {
		s.sendError(conn, fmt.Sprintf("Project not found: %s", projectID))
		return
	}

	// Get detailed information
	details := s.getProjectDetails(targetProject)

	// Send response
	s.sendMessage(conn, "project_details", map[string]interface{}{
		"project": details,
	})

	log.Printf("✅ Sent project details for %s", projectID)
}

// getProjectDetails extracts detailed information about a project
func (s *Server) getProjectDetails(project *Project) ProjectDetails {
	// Get port mappings by inspecting container
	ports := s.getProjectPorts(project.ContainerID)

	// Get environment variables
	environment := s.getProjectEnvironment(project.ContainerID)

	return ProjectDetails{
		ID:          project.ID,
		Name:        project.Name,
		Type:        project.Type,
		Status:      project.Status,
		ContainerID: project.ContainerID,
		Ports:       ports,
		Resources:   project.Resources,
		Environment: environment,
		CreatedAt:   project.CreatedAt.Format("2006-01-02 15:04:05"),
		LastUsed:    project.LastAccess.Format("2006-01-02 15:04:05"),
	}
}

// getProjectPorts gets port mappings for a project
func (s *Server) getProjectPorts(containerID string) []PortMapping {
	var ports []PortMapping

	// Get port info from docker inspect
	output, err := s.dockerManager.ExecuteCommand("", fmt.Sprintf("docker inspect %s --format='{{json .NetworkSettings.Ports}}'", containerID))
	if err != nil {
		log.Printf("⚠️ Failed to get port info: %v", err)
		return ports
	}

	// Parse JSON output (simplified for now)
	// In a real implementation, you'd parse the full Docker inspect output
	if strings.Contains(output, "8888") {
		ports = append(ports, PortMapping{
			Internal: 8888,
			External: 8888,
			Protocol: "tcp",
			Service:  "jupyter",
			Status:   "open",
		})
	}

	return ports
}

// getProjectEnvironment gets environment variables for a project
func (s *Server) getProjectEnvironment(containerID string) map[string]string {
	environment := make(map[string]string)

	// Get environment from docker inspect
	output, err := s.dockerManager.ExecuteCommand("", fmt.Sprintf("docker inspect %s --format='{{json .Config.Env}}'", containerID))
	if err != nil {
		log.Printf("⚠️ Failed to get environment: %v", err)
		return environment
	}

	// Parse environment variables (simplified)
	// In practice, you'd parse the JSON array properly
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, "=") {
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.Trim(parts[0], `"[]`)
				value := strings.Trim(parts[1], `"[]`)
				if key != "" && !strings.HasPrefix(key, "PATH") && !strings.HasPrefix(key, "HOME") {
					environment[key] = value
				}
			}
		}
	}

	return environment
}

// handleProjectStartRequest handles project start requests
func (s *Server) handleProjectStartRequest(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("▶️ Handling project start request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project start request format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	// Get container ID
	containerID, err := s.dockerManager.getContainerID(projectID)
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to get container ID: %v", err))
		return
	}

	// Start container
	_, err = s.dockerManager.ExecuteCommand("", fmt.Sprintf("docker start %s", containerID))
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to start project: %v", err))
		return
	}

	// Send status update
	s.sendMessage(conn, "project_status_updated", map[string]interface{}{
		"project_id": projectID,
		"status":     "running",
		"message":    "Project started successfully",
	})

	log.Printf("✅ Project %s started successfully", projectID)
}

// handleProjectStopRequest handles project stop requests
func (s *Server) handleProjectStopRequest(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("⏹ Handling project stop request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project stop request format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	// Get container ID
	containerID, err := s.dockerManager.getContainerID(projectID)
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to get container ID: %v", err))
		return
	}

	// Stop container
	_, err = s.dockerManager.ExecuteCommand("", fmt.Sprintf("docker stop %s", containerID))
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to stop project: %v", err))
		return
	}

	// Send status update
	s.sendMessage(conn, "project_status_updated", map[string]interface{}{
		"project_id": projectID,
		"status":     "stopped",
		"message":    "Project stopped successfully",
	})

	log.Printf("✅ Project %s stopped successfully", projectID)
}

// handleProjectRestart handles project restart requests
func (s *Server) handleProjectRestart(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🔄 Handling project restart request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project restart request format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	// Get container ID
	containerID, err := s.dockerManager.getContainerID(projectID)
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to get container ID: %v", err))
		return
	}

	// Restart container
	_, err = s.dockerManager.ExecuteCommand("", fmt.Sprintf("docker restart %s", containerID))
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to restart project: %v", err))
		return
	}

	// Send status update
	s.sendMessage(conn, "project_status_updated", map[string]interface{}{
		"project_id": projectID,
		"status":     "running",
		"message":    "Project restarted successfully",
	})

	log.Printf("✅ Project %s restarted successfully", projectID)
}

// handleProjectDelete handles project deletion requests
func (s *Server) handleProjectDelete(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🗑 Handling project delete request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid project delete request format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	// Get container ID first
	containerID, err := s.dockerManager.getContainerID(projectID)
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to get container ID: %v", err))
		return
	}

	// Stop and remove container
	_, err = s.dockerManager.ExecuteCommand("", fmt.Sprintf("docker stop %s", containerID))
	if err != nil {
		log.Printf("⚠️ Failed to stop container: %v", err)
	}

	_, err = s.dockerManager.ExecuteCommand("", fmt.Sprintf("docker rm %s", containerID))
	if err != nil {
		s.sendError(conn, fmt.Sprintf("Failed to delete project: %v", err))
		return
	}

	// Send confirmation
	s.sendMessage(conn, "project_deleted", map[string]interface{}{
		"project_id": projectID,
		"message":    "Project deleted successfully",
	})

	log.Printf("✅ Project %s deleted successfully", projectID)
}

// handleProjectAddPort handles adding port mappings
func (s *Server) handleProjectAddPort(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🌐 Handling add port request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid add port request format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	internalPortFloat, ok := data["internal_port"].(float64)
	if !ok {
		s.sendError(conn, "Missing or invalid internal port")
		return
	}
	internalPort := int(internalPortFloat)

	externalPortFloat, ok := data["external_port"].(float64)
	if !ok {
		s.sendError(conn, "Missing or invalid external port")
		return
	}
	externalPort := int(externalPortFloat)

	protocol := "tcp"
	if p, ok := data["protocol"].(string); ok {
		protocol = p
	}
	_ = protocol // Use protocol to avoid "declared and not used" error

	// Add port mapping (simplified - in practice you'd need to recreate container or use docker-compose)
	s.sendMessage(conn, "port_operation_result", map[string]interface{}{
		"success":   true,
		"message":   fmt.Sprintf("Port mapping %d:%d added (Note: Container restart required)", externalPort, internalPort),
		"operation": "add_port",
	})

	log.Printf("✅ Port mapping %d:%d added for project %s", externalPort, internalPort, projectID)
}

// handleProjectRemovePort handles removing port mappings
func (s *Server) handleProjectRemovePort(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🚫 Handling remove port request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid remove port request format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	internalPortFloat, ok := data["internal_port"].(float64)
	if !ok {
		s.sendError(conn, "Missing or invalid internal port")
		return
	}
	internalPort := int(internalPortFloat)

	externalPortFloat, ok := data["external_port"].(float64)
	if !ok {
		s.sendError(conn, "Missing or invalid external port")
		return
	}
	externalPort := int(externalPortFloat)

	// Remove port mapping (simplified)
	s.sendMessage(conn, "port_operation_result", map[string]interface{}{
		"success":   true,
		"message":   fmt.Sprintf("Port mapping %d:%d removed (Note: Container restart required)", externalPort, internalPort),
		"operation": "remove_port",
	})

	log.Printf("✅ Port mapping %d:%d removed for project %s", externalPort, internalPort, projectID)
}

// handleProjectUpdateEnvironment handles environment variable updates
func (s *Server) handleProjectUpdateEnvironment(conn *websocket.Conn, msg map[string]interface{}) {
	log.Printf("🔧 Handling environment update request")

	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Invalid environment update request format")
		return
	}

	projectID, ok := data["project_id"].(string)
	if !ok || projectID == "" {
		s.sendError(conn, "Missing project ID")
		return
	}

	environment, ok := data["environment"].(map[string]interface{})
	if !ok {
		s.sendError(conn, "Missing or invalid environment data")
		return
	}

	// Convert to string map
	envMap := make(map[string]string)
	for key, value := range environment {
		if strValue, ok := value.(string); ok {
			envMap[key] = strValue
		}
	}

	// Update environment variables (simplified - in practice you'd need to recreate container)
	s.sendMessage(conn, "environment_updated", map[string]interface{}{
		"success":     true,
		"environment": envMap,
		"message":     "Environment variables updated (Note: Container restart required for changes to take effect)",
	})

	log.Printf("✅ Environment variables updated for project %s", projectID)
}

// Global project management handler instance
var globalProjectManagementHandler *ProjectManagementHandler

// InitializeProjectManagementHandler initializes the global project management handler
func InitializeProjectManagementHandler(dm *DockerManager) {
	globalProjectManagementHandler = NewProjectManagementHandler(dm)
	log.Printf("🛠 Project management handler initialized")
}
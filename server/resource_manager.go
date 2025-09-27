package main

import (
	"fmt"
	"log"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ResourceManager manages system resources and preview services
type ResourceManager struct {
	maxMemoryMB        int
	maxPreviewServices int
	cleanupInterval    time.Duration
	stopChan           chan bool
	running            bool
	mutex              sync.RWMutex
}

// NewResourceManager creates a new resource manager
func NewResourceManager() *ResourceManager {
	return &ResourceManager{
		maxMemoryMB:        2048, // 2GB limit
		maxPreviewServices: 5,    // Max 5 concurrent preview services per project
		cleanupInterval:    5 * time.Minute,
		stopChan:           make(chan bool),
		running:            false,
	}
}

// Global resource manager instance
var globalResourceManager = NewResourceManager()

// GetResourceManager returns the global resource manager
func GetResourceManager() *ResourceManager {
	return globalResourceManager
}

// Start begins the resource monitoring and cleanup process
func (rm *ResourceManager) Start() {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	if rm.running {
		return
	}

	rm.running = true
	go rm.monitorResources()
	log.Printf("🔧 Resource manager started (Memory limit: %dMB, Service limit: %d)",
		rm.maxMemoryMB, rm.maxPreviewServices)
}

// Stop stops the resource manager
func (rm *ResourceManager) Stop() {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	if !rm.running {
		return
	}

	rm.running = false
	close(rm.stopChan)
	log.Printf("🛑 Resource manager stopped")
}

// monitorResources runs the monitoring loop
func (rm *ResourceManager) monitorResources() {
	ticker := time.NewTicker(rm.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rm.performCleanup()
		case <-rm.stopChan:
			return
		}
	}
}

// performCleanup performs resource cleanup
func (rm *ResourceManager) performCleanup() {
	log.Printf("🧹 Performing resource cleanup...")

	// Check memory usage
	memUsage := rm.getMemoryUsage()
	if memUsage > rm.maxMemoryMB {
		log.Printf("⚠️ High memory usage detected: %dMB (limit: %dMB)", memUsage, rm.maxMemoryMB)
		rm.cleanupMemory()
	}

	// Clean up preview services
	rm.cleanupPreviewServices()

	// Clean up zombie processes
	rm.cleanupZombieProcesses()

	log.Printf("✅ Resource cleanup completed")
}

// getMemoryUsage returns current memory usage in MB
func (rm *ResourceManager) getMemoryUsage() int {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return int(m.Alloc / 1024 / 1024)
}

// cleanupMemory performs memory cleanup
func (rm *ResourceManager) cleanupMemory() {
	log.Printf("🧹 Performing memory cleanup...")

	// Force garbage collection
	runtime.GC()

	// Clean up stale preview services
	pm := GetPreviewManager()
	pm.CleanupStaleServices(30 * time.Minute)

	log.Printf("✅ Memory cleanup completed")
}

// cleanupPreviewServices manages preview service limits
func (rm *ResourceManager) cleanupPreviewServices() {
	pm := GetPreviewManager()

	// Update service statuses
	pm.UpdateServiceStatuses()

	// Group services by project
	projectServices := make(map[string][]*PreviewService)
	allServices := pm.GetAllServices()

	for _, service := range allServices {
		projectServices[service.ProjectID] = append(projectServices[service.ProjectID], service)
	}

	// Enforce limits per project
	for projectID, services := range projectServices {
		if len(services) > rm.maxPreviewServices {
			log.Printf("⚠️ Project %s has %d services (limit: %d), cleaning up oldest",
				projectID, len(services), rm.maxPreviewServices)

			// Sort by last access time and remove oldest stopped services
			var stoppedServices []*PreviewService
			for _, service := range services {
				if service.Status == "stopped" {
					stoppedServices = append(stoppedServices, service)
				}
			}

			// Remove excess stopped services
			excessCount := len(services) - rm.maxPreviewServices
			for i := 0; i < excessCount && i < len(stoppedServices); i++ {
				pm.DeleteService(stoppedServices[i].ID)
				log.Printf("🗑️ Removed excess service: %s", stoppedServices[i].Name)
			}
		}
	}
}

// cleanupZombieProcesses cleans up zombie processes in containers
func (rm *ResourceManager) cleanupZombieProcesses() {
	// Get list of running containers
	cmd := exec.Command("docker", "ps", "-q")
	output, err := cmd.Output()
	if err != nil {
		log.Printf("⚠️ Failed to get container list: %v", err)
		return
	}

	containerIDs := strings.Fields(string(output))
	for _, containerID := range containerIDs {
		rm.cleanupContainerProcesses(containerID)
	}
}

// cleanupContainerProcesses cleans up processes in a specific container
func (rm *ResourceManager) cleanupContainerProcesses(containerID string) {
	// Find zombie processes
	zombieCmd := exec.Command("docker", "exec", containerID, "ps", "aux")
	output, err := zombieCmd.Output()
	if err != nil {
		return
	}

	lines := strings.Split(string(output), "\n")
	var zombieCount int

	for _, line := range lines {
		if strings.Contains(line, "<defunct>") || strings.Contains(line, "Z") {
			zombieCount++
		}
	}

	if zombieCount > 5 {
		log.Printf("🧹 Found %d zombie processes in container %s, cleaning up...",
			zombieCount, containerID[:12])

		// Clean up zombie processes
		cleanupCmd := exec.Command("docker", "exec", containerID, "bash", "-c",
			"pkill -f 'jupyter|streamlit|http.server' || true")
		cleanupCmd.Run()
	}
}

// CheckResourceLimits checks if we can start a new service
func (rm *ResourceManager) CheckResourceLimits(projectID, serviceType string) error {
	// Check memory
	memUsage := rm.getMemoryUsage()
	if memUsage > int(float64(rm.maxMemoryMB)*0.8) { // 80% threshold
		return fmt.Errorf("memory usage too high: %dMB (limit: %dMB)", memUsage, rm.maxMemoryMB)
	}

	// Check service count for project
	pm := GetPreviewManager()
	services := pm.GetServicesByProject(projectID)
	runningCount := 0

	for _, service := range services {
		if service.Status == "running" {
			runningCount++
		}
	}

	if runningCount >= rm.maxPreviewServices {
		return fmt.Errorf("too many running services for project %s: %d (limit: %d)",
			projectID, runningCount, rm.maxPreviewServices)
	}

	return nil
}

// GetResourceStats returns current resource statistics
func (rm *ResourceManager) GetResourceStats() map[string]interface{} {
	pm := GetPreviewManager()
	allServices := pm.GetAllServices()

	runningCount := 0
	stoppedCount := 0
	projectCounts := make(map[string]int)

	for _, service := range allServices {
		projectCounts[service.ProjectID]++
		if service.Status == "running" {
			runningCount++
		} else {
			stoppedCount++
		}
	}

	return map[string]interface{}{
		"memory_usage_mb":     rm.getMemoryUsage(),
		"memory_limit_mb":     rm.maxMemoryMB,
		"total_services":      len(allServices),
		"running_services":    runningCount,
		"stopped_services":    stoppedCount,
		"services_per_project": projectCounts,
		"service_limit":       rm.maxPreviewServices,
		"cleanup_interval":    rm.cleanupInterval.String(),
	}
}

// SetLimits updates resource limits
func (rm *ResourceManager) SetLimits(maxMemoryMB, maxServices int) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	rm.maxMemoryMB = maxMemoryMB
	rm.maxPreviewServices = maxServices

	log.Printf("🔧 Updated resource limits: Memory=%dMB, Services=%d", maxMemoryMB, maxServices)
}

// Enhanced preview control with resource management
func (s *Server) handlePreviewControlWithResources(conn *websocket.Conn, msg map[string]interface{}) {
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

	rm := GetResourceManager()
	pm := GetPreviewManager()

	switch action {
	case "start":
		// Check resource limits before starting
		serviceType, _ := data["service_type"].(string)
		if err := rm.CheckResourceLimits(projectID, serviceType); err != nil {
			s.sendError(conn, fmt.Sprintf("Resource limit exceeded: %v", err))
			return
		}
		s.handlePreviewStart(conn, pm, data, projectID)

	case "stop":
		s.handlePreviewStop(conn, pm, data, projectID)

	case "delete":
		s.handlePreviewDelete(conn, pm, data, projectID)

	case "list":
		s.handlePreviewListManaged(conn, pm, projectID)

	case "cleanup":
		s.handlePreviewCleanup(conn, pm, projectID)

	case "stats":
		s.handleResourceStats(conn, rm, projectID)

	case "set_limits":
		s.handleSetResourceLimits(conn, rm, data)

	default:
		s.sendError(conn, fmt.Sprintf("Unknown action: %s", action))
	}
}

// handleResourceStats returns resource statistics
func (s *Server) handleResourceStats(conn *websocket.Conn, rm *ResourceManager, projectID string) {
	stats := rm.GetResourceStats()

	response := map[string]interface{}{
		"type": "preview_control_response",
		"data": map[string]interface{}{
			"action":     "stats",
			"status":     "success",
			"stats":      stats,
			"project_id": projectID,
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send resource stats: %v", err)
	}
}

// handleSetResourceLimits updates resource limits
func (s *Server) handleSetResourceLimits(conn *websocket.Conn, rm *ResourceManager, data map[string]interface{}) {
	maxMemory, ok1 := data["max_memory_mb"].(float64)
	maxServices, ok2 := data["max_services"].(float64)

	if !ok1 || !ok2 {
		s.sendError(conn, "Invalid limit values")
		return
	}

	rm.SetLimits(int(maxMemory), int(maxServices))

	response := map[string]interface{}{
		"type": "preview_control_response",
		"data": map[string]interface{}{
			"action":           "set_limits",
			"status":           "success",
			"new_memory_limit": int(maxMemory),
			"new_service_limit": int(maxServices),
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("❌ Failed to send set limits response: %v", err)
	}
}
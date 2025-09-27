package main

import (
	"fmt"
	"log"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

// ContainerContextManager handles real-time container context detection
type ContainerContextManager struct {
	dockerManager *DockerManager
}

// ContainerInfo represents comprehensive container information
type ContainerInfo struct {
	ProjectID              string            `json:"project_id"`
	PackageJSON            string            `json:"package_json,omitempty"`
	RequirementsTxt        string            `json:"requirements_txt,omitempty"`
	GoMod                  string            `json:"go_mod,omitempty"`
	FileExtensions         []string          `json:"file_extensions"`
	RecentFiles            []string          `json:"recent_files"`
	RunningProcesses       []string          `json:"running_processes"`
	OpenPorts              []int             `json:"open_ports"`
	HasWebSocketConnections bool             `json:"has_websocket_connections"`
	CommandHistory         []string          `json:"command_history"`
	GitInfo                map[string]string `json:"git_info,omitempty"`
	HasPythonFiles         bool              `json:"has_python_files"`
	HasRequirementsTxt     bool              `json:"has_requirements_txt"`
}

// ContainerInfoRequest represents a request for container information
type ContainerInfoRequest struct {
	ProjectID string   `json:"project_id"`
	InfoTypes []string `json:"info_types"`
}

// NewContainerContextManager creates a new container context manager
func NewContainerContextManager(dm *DockerManager) *ContainerContextManager {
	return &ContainerContextManager{
		dockerManager: dm,
	}
}

// GetContainerInfo retrieves comprehensive container information
func (ccm *ContainerContextManager) GetContainerInfo(projectID string, infoTypes []string) (*ContainerInfo, error) {
	log.Printf("🔍 Getting container info for project: %s", projectID)

	containerID, err := ccm.dockerManager.getContainerID(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get container ID: %v", err)
	}

	// Ensure container is running
	if err := ccm.dockerManager.ensureContainerRunning(containerID, projectID); err != nil {
		return nil, fmt.Errorf("failed to ensure container is running: %v", err)
	}

	info := &ContainerInfo{
		ProjectID: projectID,
	}

	// Process each requested info type
	for _, infoType := range infoTypes {
		switch infoType {
		case "package_json":
			ccm.getPackageJSON(containerID, info)
		case "requirements_txt":
			ccm.getRequirementsTxt(containerID, info)
		case "go_mod":
			ccm.getGoMod(containerID, info)
		case "file_extensions":
			ccm.getFileExtensions(containerID, info)
		case "recent_files":
			ccm.getRecentFiles(containerID, info)
		case "running_processes":
			ccm.getRunningProcesses(containerID, info)
		case "open_ports":
			ccm.getOpenPorts(containerID, info)
		case "websocket_connections":
			ccm.checkWebSocketConnections(containerID, info)
		case "command_history":
			ccm.getCommandHistory(containerID, info)
		case "git_info":
			ccm.getGitInfo(containerID, info)
		}
	}

	log.Printf("✅ Container info collected for %s", projectID)
	return info, nil
}

// getPackageJSON retrieves package.json content
func (ccm *ContainerContextManager) getPackageJSON(containerID string, info *ContainerInfo) {
	cmd := exec.Command("docker", "exec", containerID, "cat", "/workspace/package.json")
	output, err := cmd.Output()
	if err == nil && len(output) > 0 {
		info.PackageJSON = string(output)
		log.Printf("📦 Found package.json for container %s", containerID[:12])
	}
}

// getRequirementsTxt retrieves requirements.txt content
func (ccm *ContainerContextManager) getRequirementsTxt(containerID string, info *ContainerInfo) {
	cmd := exec.Command("docker", "exec", containerID, "cat", "/workspace/requirements.txt")
	output, err := cmd.Output()
	if err == nil && len(output) > 0 {
		info.RequirementsTxt = string(output)
		info.HasRequirementsTxt = true
		log.Printf("🐍 Found requirements.txt for container %s", containerID[:12])
	}
}

// getGoMod retrieves go.mod content
func (ccm *ContainerContextManager) getGoMod(containerID string, info *ContainerInfo) {
	cmd := exec.Command("docker", "exec", containerID, "cat", "/workspace/go.mod")
	output, err := cmd.Output()
	if err == nil && len(output) > 0 {
		info.GoMod = string(output)
		log.Printf("🔧 Found go.mod for container %s", containerID[:12])
	}
}

// getFileExtensions analyzes file extensions in the workspace
func (ccm *ContainerContextManager) getFileExtensions(containerID string, info *ContainerInfo) {
	cmd := exec.Command("docker", "exec", containerID, "find", "/workspace", "-type", "f", "-name", "*.*")
	output, err := cmd.Output()
	if err != nil {
		return
	}

	extensions := make(map[string]bool)
	files := strings.Split(string(output), "\n")

	for _, file := range files {
		if file != "" {
			ext := filepath.Ext(file)
			if ext != "" {
				extensions[ext] = true
				// Check for Python files
				if ext == ".py" {
					info.HasPythonFiles = true
				}
			}
		}
	}

	for ext := range extensions {
		info.FileExtensions = append(info.FileExtensions, ext)
	}

	log.Printf("📁 Found %d file types for container %s", len(info.FileExtensions), containerID[:12])
}

// getRecentFiles gets recently modified files
func (ccm *ContainerContextManager) getRecentFiles(containerID string, info *ContainerInfo) {
	// Get files modified in the last 7 days
	cmd := exec.Command("docker", "exec", containerID, "find", "/workspace", "-type", "f", "-mtime", "-7", "-not", "-path", "*/.*")
	output, err := cmd.Output()
	if err != nil {
		return
	}

	files := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(files) > 10 {
		files = files[:10] // Limit to 10 most recent files
	}

	// Clean up file paths
	for _, file := range files {
		if file != "" {
			// Remove /workspace prefix for cleaner display
			cleanPath := strings.TrimPrefix(file, "/workspace/")
			if cleanPath != "" {
				info.RecentFiles = append(info.RecentFiles, cleanPath)
			}
		}
	}

	log.Printf("⏰ Found %d recent files for container %s", len(info.RecentFiles), containerID[:12])
}

// getRunningProcesses gets list of running processes
func (ccm *ContainerContextManager) getRunningProcesses(containerID string, info *ContainerInfo) {
	cmd := exec.Command("docker", "exec", containerID, "ps", "aux")
	output, err := cmd.Output()
	if err != nil {
		return
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines[1:] { // Skip header
		if line != "" && !strings.Contains(line, "ps aux") {
			// Extract command part (last field)
			fields := strings.Fields(line)
			if len(fields) >= 11 {
				command := strings.Join(fields[10:], " ")
				// Filter out system processes
				if !isSystemProcess(command) {
					info.RunningProcesses = append(info.RunningProcesses, command)
				}
			}
		}
	}

	log.Printf("⚡ Found %d running processes for container %s", len(info.RunningProcesses), containerID[:12])
}

// getOpenPorts gets list of open ports
func (ccm *ContainerContextManager) getOpenPorts(containerID string, info *ContainerInfo) {
	cmd := exec.Command("docker", "exec", containerID, "ss", "-tuln")
	output, err := cmd.Output()
	if err != nil {
		return
	}

	portRegex := regexp.MustCompile(`:(\d+)\s`)
	matches := portRegex.FindAllStringSubmatch(string(output), -1)

	portSet := make(map[int]bool)
	for _, match := range matches {
		if len(match) > 1 {
			var port int
			if _, err := fmt.Sscanf(match[1], "%d", &port); err == nil {
				// Filter common system ports
				if port > 1024 && port < 65536 {
					portSet[port] = true
				}
			}
		}
	}

	for port := range portSet {
		info.OpenPorts = append(info.OpenPorts, port)
	}

	log.Printf("🌐 Found %d open ports for container %s", len(info.OpenPorts), containerID[:12])
}

// checkWebSocketConnections checks for active WebSocket connections
func (ccm *ContainerContextManager) checkWebSocketConnections(containerID string, info *ContainerInfo) {
	// Check for WebSocket connections by looking at network connections
	cmd := exec.Command("docker", "exec", containerID, "ss", "-tun")
	output, err := cmd.Output()
	if err != nil {
		return
	}

	// Look for connections that might be WebSocket (this is a heuristic)
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		// WebSocket connections often appear as ESTABLISHED TCP connections
		// on common WebSocket ports or with specific patterns
		if strings.Contains(line, "ESTAB") {
			info.HasWebSocketConnections = true
			break
		}
	}

	log.Printf("🔌 WebSocket status for container %s: %v", containerID[:12], info.HasWebSocketConnections)
}

// getCommandHistory gets command history from shell history
func (ccm *ContainerContextManager) getCommandHistory(containerID string, info *ContainerInfo) {
	// Try to get bash history
	cmd := exec.Command("docker", "exec", containerID, "cat", "/home/claude/.bash_history")
	output, err := cmd.Output()
	if err != nil {
		// Try alternative history location
		cmd = exec.Command("docker", "exec", containerID, "history")
		output, err = cmd.Output()
		if err != nil {
			return
		}
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	// Get last 20 commands
	start := 0
	if len(lines) > 20 {
		start = len(lines) - 20
	}

	for i := start; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line != "" && !strings.HasPrefix(line, "#") {
			// Clean up history entries (remove line numbers if present)
			cleanCmd := regexp.MustCompile(`^\s*\d+\s+`).ReplaceAllString(line, "")
			if cleanCmd != "" {
				info.CommandHistory = append(info.CommandHistory, cleanCmd)
			}
		}
	}

	log.Printf("📝 Found %d commands in history for container %s", len(info.CommandHistory), containerID[:12])
}

// getGitInfo gets Git repository information
func (ccm *ContainerContextManager) getGitInfo(containerID string, info *ContainerInfo) {
	gitInfo := make(map[string]string)

	// Get current branch
	cmd := exec.Command("docker", "exec", containerID, "git", "-C", "/workspace", "branch", "--show-current")
	if output, err := cmd.Output(); err == nil {
		gitInfo["branch"] = strings.TrimSpace(string(output))
	} else {
		gitInfo["branch"] = "unknown"
	}

	// Get last commit
	cmd = exec.Command("docker", "exec", containerID, "git", "-C", "/workspace", "log", "-1", "--pretty=format:%s")
	if output, err := cmd.Output(); err == nil {
		gitInfo["lastCommit"] = strings.TrimSpace(string(output))
	} else {
		gitInfo["lastCommit"] = "N/A"
	}

	// Get repository status
	cmd = exec.Command("docker", "exec", containerID, "git", "-C", "/workspace", "status", "--porcelain")
	if output, err := cmd.Output(); err == nil {
		status := strings.TrimSpace(string(output))
		if status == "" {
			gitInfo["status"] = "clean"
		} else {
			gitInfo["status"] = "modified"
		}
	} else {
		gitInfo["status"] = "unknown"
	}

	info.GitInfo = gitInfo
	log.Printf("📊 Git info collected for container %s: %s@%s", containerID[:12], gitInfo["branch"], gitInfo["status"])
}

// isSystemProcess filters out system processes from the process list
func isSystemProcess(command string) bool {
	systemProcesses := []string{
		"/sbin/", "/usr/sbin/", "kernel", "[", "]",
		"tail -f /dev/null", "/bin/bash", "/bin/sh",
		"ps aux", "ss", "find", "cat", "git",
	}

	for _, sysProc := range systemProcesses {
		if strings.Contains(command, sysProc) {
			return true
		}
	}

	return false
}

// HandleContainerInfoRequest handles WebSocket requests for container information
func (ccm *ContainerContextManager) HandleContainerInfoRequest(request ContainerInfoRequest) (*ContainerInfo, error) {
	return ccm.GetContainerInfo(request.ProjectID, request.InfoTypes)
}

// Global container context manager instance
var globalContainerContextManager *ContainerContextManager

// InitializeContainerContextManager initializes the global container context manager
func InitializeContainerContextManager(dm *DockerManager) {
	globalContainerContextManager = NewContainerContextManager(dm)
}
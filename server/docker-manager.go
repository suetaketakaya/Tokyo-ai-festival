package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os/exec"
	"strings"
	"time"
)

// DockerManager handles Docker container operations
type DockerManager struct {
	projectsPath string
}

// Project represents a Docker-based development project
type Project struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Type        string            `json:"type"`
	Status      string            `json:"status"`
	ContainerID string            `json:"container_id"`
	Image       string            `json:"image"`
	CreatedAt   time.Time         `json:"created_at"`
	LastAccess  time.Time         `json:"last_access"`
	Config      map[string]string `json:"config"`
	Resources   ResourceLimits    `json:"resources"`
}

// ResourceLimits defines container resource constraints
type ResourceLimits struct {
	Memory string `json:"memory"`
	CPUs   string `json:"cpus"`
}

// ProjectCreateRequest represents a request to create a new project
type ProjectCreateRequest struct {
	Name      string            `json:"name"`
	Type      string            `json:"type"`
	Config    map[string]string `json:"config"`
	Resources *ResourceLimits   `json:"resources,omitempty"`
}

// NewDockerManager creates a new Docker manager instance
func NewDockerManager(projectsPath string) *DockerManager {
	return &DockerManager{
		projectsPath: projectsPath,
	}
}

// CreateProject creates a new isolated development environment
func (dm *DockerManager) CreateProject(req ProjectCreateRequest) (*Project, error) {
	log.Printf("🐳 Creating new Docker project: %s (%s)", req.Name, req.Type)

	// Generate unique project ID
	projectID := generateProjectID(req.Name)

	// Set default resources if not provided
	resources := ResourceLimits{
		Memory: "2g",
		CPUs:   "1.0",
	}
	if req.Resources != nil {
		resources = *req.Resources
	}

	// Create project configuration
	project := &Project{
		ID:         projectID,
		Name:       req.Name,
		Type:       req.Type,
		Status:     "creating",
		Image:      "remoteclaude-ubuntu-claude:latest",
		CreatedAt:  time.Now(),
		LastAccess: time.Now(),
		Config:     req.Config,
		Resources:  resources,
	}

	// Create Docker container
	containerID, err := dm.createContainer(project)
	if err != nil {
		return nil, fmt.Errorf("failed to create container: %v", err)
	}

	project.ContainerID = containerID
	project.Status = "ready"

	// Initialize project workspace
	err = dm.initializeProject(project)
	if err != nil {
		// Clean up container on failure
		dm.removeContainer(containerID)
		return nil, fmt.Errorf("failed to initialize project: %v", err)
	}

	log.Printf("✅ Project created successfully: %s (Container: %s)", projectID, containerID[:12])
	return project, nil
}

// createContainer creates and starts a Docker container for the project
func (dm *DockerManager) createContainer(project *Project) (string, error) {
	args := []string{
		"run", "-d",
		"--name", fmt.Sprintf("remoteclaude-%s", project.ID),
		"--memory", project.Resources.Memory,
		"--cpus", project.Resources.CPUs,
		"--security-opt", "no-new-privileges:true",
		"--user", "1000:1000",
		"--network", "remoteclaude-network",
		"--env", fmt.Sprintf("PROJECT_ID=%s", project.ID),
		"--env", fmt.Sprintf("PROJECT_NAME=%s", project.Name),
		"--env", fmt.Sprintf("PROJECT_TYPE=%s", project.Type),
		"--volume", fmt.Sprintf("remoteclaude-project-%s:/workspace", project.ID),
		"--workdir", "/workspace",
	}

	// Add project-specific environment variables
	for key, value := range project.Config {
		args = append(args, "--env", fmt.Sprintf("%s=%s", key, value))
	}

	// Add image name and command
	args = append(args, project.Image, "/bin/bash", "-c", "project-init && tail -f /dev/null")

	cmd := exec.Command("docker", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("docker run failed: %v, output: %s", err, string(output))
	}

	containerID := strings.TrimSpace(string(output))
	log.Printf("🐳 Container created: %s", containerID[:12])

	return containerID, nil
}

// initializeProject runs project initialization inside the container
func (dm *DockerManager) initializeProject(project *Project) error {
	log.Printf("🔧 Initializing project workspace for %s", project.ID)

	// Wait for container to be fully ready
	time.Sleep(2 * time.Second)

	// Execute project initialization script
	cmd := exec.Command("docker", "exec", project.ContainerID, "/usr/local/bin/project-init")
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ Project initialization failed: %v, output: %s", err, string(output))
		return err
	}

	log.Printf("✅ Project workspace initialized: %s", project.ID)
	return nil
}

// ExecuteCommand runs a command inside the project container
func (dm *DockerManager) ExecuteCommand(projectID, command string) (string, error) {
	log.Printf("🔧 Executing in %s: %s", projectID, command)

	// Find container for project
	containerID, err := dm.getContainerID(projectID)
	if err != nil {
		return "", err
	}

	// Execute command in container
	args := []string{"exec", "-i", containerID, "/bin/bash", "-c", command}
	cmd := exec.Command("docker", args...)

	output, err := cmd.CombinedOutput()
	result := string(output)

	if err != nil {
		log.Printf("❌ Command execution failed: %v", err)
		return result, err
	}

	log.Printf("✅ Command executed successfully in %s", projectID)
	return result, nil
}

// ListProjects returns a list of all Docker-based projects
func (dm *DockerManager) ListProjects() ([]*Project, error) {
	log.Printf("📋 Listing Docker projects...")

	// Get all RemoteClaude containers
	cmd := exec.Command("docker", "ps", "-a", "--filter", "name=remoteclaude-", "--format", "{{.Names}}\t{{.ID}}\t{{.Status}}\t{{.CreatedAt}}")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %v", err)
	}

	var projects []*Project
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Split(line, "\t")
		if len(parts) < 4 {
			continue
		}

		name := parts[0]
		containerID := parts[1]
		status := parts[2]
		createdAt := parts[3]

		// Extract project ID from container name
		projectID := strings.TrimPrefix(name, "remoteclaude-")

		// Parse creation time
		createdTime, _ := time.Parse("2006-01-02 15:04:05 -0700 MST", createdAt)

		// Get project details from container labels/environment
		project := &Project{
			ID:          projectID,
			Name:        projectID, // Will be enhanced with actual project name
			Status:      parseContainerStatus(status),
			ContainerID: containerID,
			Image:       "remoteclaude-ubuntu-claude:latest",
			CreatedAt:   createdTime,
			LastAccess:  time.Now(),
		}

		// Get additional project details
		dm.enrichProjectDetails(project)

		projects = append(projects, project)
	}

	log.Printf("✅ Found %d Docker projects", len(projects))
	return projects, nil
}

// enrichProjectDetails adds additional information to a project
func (dm *DockerManager) enrichProjectDetails(project *Project) {
	// Get environment variables from container
	cmd := exec.Command("docker", "inspect", project.ContainerID, "--format", "{{json .Config.Env}}")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return
	}

	var env []string
	if err := json.Unmarshal(output, &env); err != nil {
		return
	}

	// Parse environment variables
	for _, envVar := range env {
		parts := strings.SplitN(envVar, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key, value := parts[0], parts[1]
		switch key {
		case "PROJECT_NAME":
			project.Name = value
		case "PROJECT_TYPE":
			project.Type = value
		}
	}
}

// StartProject starts a stopped project container
func (dm *DockerManager) StartProject(projectID string) error {
	containerID, err := dm.getContainerID(projectID)
	if err != nil {
		return err
	}

	cmd := exec.Command("docker", "start", containerID)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start container: %v", err)
	}

	log.Printf("✅ Project started: %s", projectID)
	return nil
}

// StopProject stops a running project container
func (dm *DockerManager) StopProject(projectID string) error {
	containerID, err := dm.getContainerID(projectID)
	if err != nil {
		return err
	}

	cmd := exec.Command("docker", "stop", containerID)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to stop container: %v", err)
	}

	log.Printf("✅ Project stopped: %s", projectID)
	return nil
}

// RemoveProject removes a project and its container
func (dm *DockerManager) RemoveProject(projectID string) error {
	containerID, err := dm.getContainerID(projectID)
	if err != nil {
		return err
	}

	// Stop container first
	dm.StopProject(projectID)

	// Remove container
	if err := dm.removeContainer(containerID); err != nil {
		return err
	}

	// Remove associated volume
	volumeName := fmt.Sprintf("remoteclaude-project-%s", projectID)
	cmd := exec.Command("docker", "volume", "rm", volumeName)
	cmd.Run() // Don't fail if volume doesn't exist

	log.Printf("✅ Project removed: %s", projectID)
	return nil
}

// getContainerID finds the container ID for a project
func (dm *DockerManager) getContainerID(projectID string) (string, error) {
	containerName := fmt.Sprintf("remoteclaude-%s", projectID)
	cmd := exec.Command("docker", "ps", "-aq", "--filter", fmt.Sprintf("name=%s", containerName))
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to find container: %v", err)
	}

	containerID := strings.TrimSpace(string(output))
	if containerID == "" {
		return "", fmt.Errorf("project not found: %s", projectID)
	}

	return containerID, nil
}

// removeContainer removes a Docker container
func (dm *DockerManager) removeContainer(containerID string) error {
	cmd := exec.Command("docker", "rm", "-f", containerID)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to remove container: %v", err)
	}
	return nil
}

// parseContainerStatus converts Docker status to our status format
func parseContainerStatus(dockerStatus string) string {
	status := strings.ToLower(dockerStatus)
	switch {
	case strings.Contains(status, "up"):
		return "running"
	case strings.Contains(status, "exited"):
		return "stopped"
	case strings.Contains(status, "created"):
		return "ready"
	case strings.Contains(status, "restarting"):
		return "restarting"
	default:
		return "unknown"
	}
}

// generateProjectID creates a unique project identifier
func generateProjectID(name string) string {
	// Clean name and add timestamp
	cleanName := strings.ToLower(strings.ReplaceAll(name, " ", "-"))
	timestamp := time.Now().Unix()
	return fmt.Sprintf("%s-%d", cleanName, timestamp)
}

// GetContainerLogs retrieves logs from a project container
func (dm *DockerManager) GetContainerLogs(projectID string, lines int) (string, error) {
	containerID, err := dm.getContainerID(projectID)
	if err != nil {
		return "", err
	}

	cmd := exec.Command("docker", "logs", "--tail", fmt.Sprintf("%d", lines), containerID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get logs: %v", err)
	}

	return string(output), nil
}

// StreamCommand executes a command and streams the output
func (dm *DockerManager) StreamCommand(ctx context.Context, projectID, command string) (<-chan string, <-chan error) {
	outputChan := make(chan string, 100)
	errorChan := make(chan error, 1)

	go func() {
		defer close(outputChan)
		defer close(errorChan)

		containerID, err := dm.getContainerID(projectID)
		if err != nil {
			errorChan <- err
			return
		}

		cmd := exec.CommandContext(ctx, "docker", "exec", "-i", containerID, "/bin/bash", "-c", command)
		
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			errorChan <- err
			return
		}

		stderr, err := cmd.StderrPipe()
		if err != nil {
			errorChan <- err
			return
		}

		if err := cmd.Start(); err != nil {
			errorChan <- err
			return
		}

		// Stream stdout
		go func() {
			scanner := io.Reader(stdout)
			buf := make([]byte, 1024)
			for {
				n, err := scanner.Read(buf)
				if n > 0 {
					outputChan <- string(buf[:n])
				}
				if err != nil {
					break
				}
			}
		}()

		// Stream stderr
		go func() {
			scanner := io.Reader(stderr)
			buf := make([]byte, 1024)
			for {
				n, err := scanner.Read(buf)
				if n > 0 {
					outputChan <- string(buf[:n])
				}
				if err != nil {
					break
				}
			}
		}()

		if err := cmd.Wait(); err != nil {
			errorChan <- err
		}
	}()

	return outputChan, errorChan
}
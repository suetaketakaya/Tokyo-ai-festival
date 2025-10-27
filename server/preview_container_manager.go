package main

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

// 	"github.com/docker/docker/api/types"
	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

// PreviewContainer represents a temporary container for preview purposes
type PreviewContainer struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	Port        int       `json:"port"`
	ExternalURL string    `json:"external_url"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	Status      string    `json:"status"`
	Config      PreviewConfig `json:"config"`
}

// PreviewConfig contains the configuration for launching a preview container
type PreviewConfig struct {
	Type        string            `json:"type"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	BaseImage   string            `json:"base_image"`
	Commands    []string          `json:"commands"`
	Environment map[string]string `json:"environment"`
	Volumes     []string          `json:"volumes"`
	Duration    int               `json:"duration"` // minutes
	Port        int               `json:"port"`
	Requirements []string         `json:"requirements"`
	Tags        []string          `json:"tags"`
}

// PreviewContainerManager manages temporary containers for preview purposes
type PreviewContainerManager struct {
	client      *client.Client
	containers  map[string]*PreviewContainer
	mutex       sync.RWMutex
	hostIP      string
	portRange   PortRange
	cleanupTick *time.Ticker
}

type PortRange struct {
	Start int
	End   int
}

// NewPreviewContainerManager creates a new preview container manager
func NewPreviewContainerManager(hostIP string) (*PreviewContainerManager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %v", err)
	}

	manager := &PreviewContainerManager{
		client:     cli,
		containers: make(map[string]*PreviewContainer),
		hostIP:     hostIP,
		portRange: PortRange{
			Start: 8100,
			End:   8200,
		},
	}

	// Start cleanup routine
	manager.startCleanupRoutine()

	log.Printf("🐳 Preview Container Manager initialized")
	return manager, nil
}

// LaunchPreviewContainer launches a new temporary container for preview
func (pcm *PreviewContainerManager) LaunchPreviewContainer(config PreviewConfig) (*PreviewContainer, error) {
	pcm.mutex.Lock()
	defer pcm.mutex.Unlock()

	// Get available port
	port, err := pcm.getAvailablePort()
	if err != nil {
		return nil, fmt.Errorf("no available ports: %v", err)
	}

	// Generate container configuration
	containerConfig, hostConfig, networkConfig, err := pcm.generateContainerConfig(config, port)
	if err != nil {
		return nil, fmt.Errorf("failed to generate config: %v", err)
	}

	// Create container
	resp, err := pcm.client.ContainerCreate(
		context.Background(),
		containerConfig,
		hostConfig,
		networkConfig,
		nil,
		fmt.Sprintf("preview-%s-%d", config.Type, time.Now().Unix()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create container: %v", err)
	}

	// Start container
	if err := pcm.client.ContainerStart(context.Background(), resp.ID, containertypes.StartOptions{}); err != nil {
		// Cleanup on failure
		pcm.client.ContainerRemove(context.Background(), resp.ID, containertypes.RemoveOptions{Force: true})
		return nil, fmt.Errorf("failed to start container: %v", err)
	}

	// Create preview container info
	previewContainer := &PreviewContainer{
		ID:          resp.ID,
		Type:        config.Type,
		Port:        port,
		ExternalURL: fmt.Sprintf("http://%s:%d", pcm.hostIP, port),
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(time.Duration(config.Duration) * time.Minute),
		Status:      "running",
		Config:      config,
	}

	pcm.containers[resp.ID] = previewContainer

	log.Printf("🚀 Preview container launched: %s (Type: %s, Port: %d)", resp.ID[:12], config.Type, port)
	return previewContainer, nil
}

// generateContainerConfig generates Docker container configuration based on preview type
func (pcm *PreviewContainerManager) generateContainerConfig(config PreviewConfig, port int) (
	*containertypes.Config, *containertypes.HostConfig, *network.NetworkingConfig, error) {

	// Base configuration
	containerConfig := &containertypes.Config{
		Image:        config.BaseImage,
		ExposedPorts: nat.PortSet{},
		Env:          []string{},
		WorkingDir:   "/workspace",
	}

	hostConfig := &containertypes.HostConfig{
		PortBindings: nat.PortMap{},
		AutoRemove:   false, // We manage removal ourselves
		Resources: containertypes.Resources{
			Memory:   512 * 1024 * 1024, // 512MB limit
			NanoCPUs: 1000000000,        // 1 CPU limit
		},
		Tmpfs: map[string]string{
			"/tmp": "rw,noexec,nosuid,size=100m",
		},
	}

	networkConfig := &network.NetworkingConfig{}

	// Type-specific configuration
	switch config.Type {
	case "web_app":
		pcm.configureWebApp(containerConfig, hostConfig, port)
	case "matplotlib":
		pcm.configureMatplotlib(containerConfig, hostConfig, port)
	case "jupyter":
		pcm.configureJupyter(containerConfig, hostConfig, port)
	case "gui_app":
		pcm.configureGUIApp(containerConfig, hostConfig, port)
	case "data_analysis":
		pcm.configureDataAnalysis(containerConfig, hostConfig, port)
	default:
		return nil, nil, nil, fmt.Errorf("unsupported preview type: %s", config.Type)
	}

	// Add custom environment variables
	for key, value := range config.Environment {
		containerConfig.Env = append(containerConfig.Env, fmt.Sprintf("%s=%s", key, value))
	}

	// Add custom commands
	if len(config.Commands) > 0 {
		containerConfig.Cmd = config.Commands
	}

	return containerConfig, hostConfig, networkConfig, nil
}

func (pcm *PreviewContainerManager) configureWebApp(containerConfig *containertypes.Config, hostConfig *containertypes.HostConfig, port int) {
	// Default web application configuration
	if containerConfig.Image == "" {
		containerConfig.Image = "nginx:alpine"
	}

	containerPortStr := "80/tcp"
	containerConfig.ExposedPorts[nat.Port(containerPortStr)] = struct{}{}
	hostConfig.PortBindings[nat.Port(containerPortStr)] = []nat.PortBinding{
		{
			HostIP:   "0.0.0.0",
			HostPort: fmt.Sprintf("%d", port),
		},
	}

	// Add environment for web development
	containerConfig.Env = append(containerConfig.Env,
		"NODE_ENV=development",
		"PORT=80",
	)
}

func (pcm *PreviewContainerManager) configureMatplotlib(containerConfig *containertypes.Config, hostConfig *containertypes.HostConfig, port int) {
	// Matplotlib/Data visualization configuration
	if containerConfig.Image == "" {
		containerConfig.Image = "python:3.9-slim"
	}

	// Install matplotlib and start a simple HTTP server
	containerConfig.Cmd = []string{
		"sh", "-c",
		`pip install matplotlib numpy scipy seaborn jupyter &&
		 python -c "
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import http.server
import socketserver
import os

# Create sample plots
x = np.linspace(0, 10, 100)
plt.figure(figsize=(10, 6))
plt.plot(x, np.sin(x), label='sin(x)')
plt.plot(x, np.cos(x), label='cos(x)')
plt.legend()
plt.title('Sample Plot - W&B Integration Demo')
plt.savefig('/tmp/sample_plot.png')
plt.close()

# Start HTTP server
os.chdir('/tmp')
PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'Server running at port {PORT}')
    httpd.serve_forever()
"`,
	}

	containerPortStr := "8000/tcp"
	containerConfig.ExposedPorts[nat.Port(containerPortStr)] = struct{}{}
	hostConfig.PortBindings[nat.Port(containerPortStr)] = []nat.PortBinding{
		{
			HostIP:   "0.0.0.0",
			HostPort: fmt.Sprintf("%d", port),
		},
	}
}

func (pcm *PreviewContainerManager) configureJupyter(containerConfig *containertypes.Config, hostConfig *containertypes.HostConfig, port int) {
	// Jupyter Notebook configuration
	if containerConfig.Image == "" {
		containerConfig.Image = "jupyter/datascience-notebook:latest"
	}

	containerConfig.Cmd = []string{
		"start-notebook.sh",
		"--NotebookApp.token=''",
		"--NotebookApp.password=''",
		"--NotebookApp.allow_origin='*'",
		"--NotebookApp.base_url='/'",
		"--NotebookApp.port=8888",
		"--NotebookApp.ip=0.0.0.0",
	}

	containerPortStr := "8888/tcp"
	containerConfig.ExposedPorts[nat.Port(containerPortStr)] = struct{}{}
	hostConfig.PortBindings[nat.Port(containerPortStr)] = []nat.PortBinding{
		{
			HostIP:   "0.0.0.0",
			HostPort: fmt.Sprintf("%d", port),
		},
	}

	containerConfig.Env = append(containerConfig.Env,
		"JUPYTER_ENABLE_LAB=yes",
		"GRANT_SUDO=yes",
	)
}

func (pcm *PreviewContainerManager) configureGUIApp(containerConfig *containertypes.Config, hostConfig *containertypes.HostConfig, port int) {
	// GUI Application configuration (VNC-based)
	if containerConfig.Image == "" {
		containerConfig.Image = "dorowu/ubuntu-desktop-lxde-vnc:latest"
	}

	containerPortStr := "6080/tcp"
	containerConfig.ExposedPorts[nat.Port(containerPortStr)] = struct{}{}
	hostConfig.PortBindings[nat.Port(containerPortStr)] = []nat.PortBinding{
		{
			HostIP:   "0.0.0.0",
			HostPort: fmt.Sprintf("%d", port),
		},
	}

	containerConfig.Env = append(containerConfig.Env,
		"VNC_PASSWORD=password",
		"RESOLUTION=1280x720",
	)
}

func (pcm *PreviewContainerManager) configureDataAnalysis(containerConfig *containertypes.Config, hostConfig *containertypes.HostConfig, port int) {
	// Data Analysis environment
	if containerConfig.Image == "" {
		containerConfig.Image = "jupyter/scipy-notebook:latest"
	}

	// Start JupyterLab with data science tools
	containerConfig.Cmd = []string{
		"start-notebook.sh",
		"--NotebookApp.token=''",
		"--NotebookApp.password=''",
		"--NotebookApp.allow_origin='*'",
		"--LabApp.default_url='/lab'",
		"--NotebookApp.port=8888",
		"--NotebookApp.ip=0.0.0.0",
	}

	containerPortStr := "8888/tcp"
	containerConfig.ExposedPorts[nat.Port(containerPortStr)] = struct{}{}
	hostConfig.PortBindings[nat.Port(containerPortStr)] = []nat.PortBinding{
		{
			HostIP:   "0.0.0.0",
			HostPort: fmt.Sprintf("%d", port),
		},
	}
}

// getAvailablePort finds an available port in the specified range
func (pcm *PreviewContainerManager) getAvailablePort() (int, error) {
	usedPorts := make(map[int]bool)
	for _, container := range pcm.containers {
		usedPorts[container.Port] = true
	}

	for port := pcm.portRange.Start; port <= pcm.portRange.End; port++ {
		if !usedPorts[port] {
			return port, nil
		}
	}

	return 0, fmt.Errorf("no available ports in range %d-%d", pcm.portRange.Start, pcm.portRange.End)
}

// GetRunningContainers returns all currently running preview containers
func (pcm *PreviewContainerManager) GetRunningContainers() []*PreviewContainer {
	pcm.mutex.RLock()
	defer pcm.mutex.RUnlock()

	containers := make([]*PreviewContainer, 0, len(pcm.containers))
	for _, container := range pcm.containers {
		containers = append(containers, container)
	}
	return containers
}

// StopContainer stops and removes a preview container
func (pcm *PreviewContainerManager) StopContainer(containerID string) error {
	pcm.mutex.Lock()
	defer pcm.mutex.Unlock()

	container, exists := pcm.containers[containerID]
	if !exists {
		return fmt.Errorf("container not found: %s", containerID)
	}

	// Stop and remove container
	timeout := 10
	stopOpts := containertypes.StopOptions{Timeout: &timeout}
	if err := pcm.client.ContainerStop(context.Background(), containerID, stopOpts); err != nil {
		log.Printf("Warning: failed to stop container %s: %v", containerID, err)
	}

	removeOpts := containertypes.RemoveOptions{Force: true}
	if err := pcm.client.ContainerRemove(context.Background(), containerID, removeOpts); err != nil {
		log.Printf("Warning: failed to remove container %s: %v", containerID, err)
	}

	delete(pcm.containers, containerID)
	log.Printf("🛑 Preview container stopped: %s (Type: %s)", containerID[:12], container.Type)

	return nil
}

// startCleanupRoutine starts the automatic cleanup routine for expired containers
func (pcm *PreviewContainerManager) startCleanupRoutine() {
	pcm.cleanupTick = time.NewTicker(1 * time.Minute)

	go func() {
		for range pcm.cleanupTick.C {
			pcm.cleanupExpiredContainers()
		}
	}()
}

// cleanupExpiredContainers removes containers that have exceeded their duration
func (pcm *PreviewContainerManager) cleanupExpiredContainers() {
	pcm.mutex.Lock()
	defer pcm.mutex.Unlock()

	now := time.Now()
	var expiredContainers []string

	for id, container := range pcm.containers {
		if now.After(container.ExpiresAt) {
			expiredContainers = append(expiredContainers, id)
		}
	}

	for _, id := range expiredContainers {
		cont := pcm.containers[id]

		// Stop and remove container
		timeout := 5
		stopOpts := containertypes.StopOptions{Timeout: &timeout}
		removeOpts := containertypes.RemoveOptions{Force: true}
		pcm.client.ContainerStop(context.Background(), id, stopOpts)
		pcm.client.ContainerRemove(context.Background(), id, removeOpts)

		delete(pcm.containers, id)
		log.Printf("🧹 Cleaned up expired preview container: %s (Type: %s)", id[:12], cont.Type)
	}
}

// GetPredefinedConfigs returns predefined configurations for common preview types
func GetPredefinedConfigs() map[string]PreviewConfig {
	return map[string]PreviewConfig{
		"web_app_demo": {
			Type:        "web_app",
			Title:       "🌐 Sample Web Application",
			Description: "Simple web application demonstration",
			BaseImage:   "nginx:alpine",
			Duration:    10,
			Requirements: []string{"HTTP Server", "Static Content"},
			Tags:        []string{"Web", "Demo", "Static"},
		},
		"matplotlib_demo": {
			Type:        "matplotlib",
			Title:       "📊 Data Visualization Demo",
			Description: "Interactive matplotlib plotting demonstration",
			BaseImage:   "python:3.9-slim",
			Duration:    5,
			Requirements: []string{"Python", "Matplotlib", "NumPy"},
			Tags:        []string{"DataViz", "Python", "Plotting"},
		},
		"jupyter_demo": {
			Type:        "jupyter",
			Title:       "📔 Jupyter Notebook Environment",
			Description: "Full Jupyter environment for data science",
			BaseImage:   "jupyter/datascience-notebook:latest",
			Duration:    15,
			Requirements: []string{"Jupyter", "Python", "Data Science Libraries"},
			Tags:        []string{"Jupyter", "DataScience", "Interactive"},
		},
		"gui_demo": {
			Type:        "gui_app",
			Title:       "🖥️ Desktop Environment",
			Description: "Remote desktop environment via VNC",
			BaseImage:   "dorowu/ubuntu-desktop-lxde-vnc:latest",
			Duration:    8,
			Requirements: []string{"VNC", "Desktop Environment", "Web Browser"},
			Tags:        []string{"GUI", "Desktop", "VNC"},
		},
		"data_analysis_demo": {
			Type:        "data_analysis",
			Title:       "📈 Data Analysis Workspace",
			Description: "Complete data analysis environment with JupyterLab",
			BaseImage:   "jupyter/scipy-notebook:latest",
			Duration:    12,
			Requirements: []string{"JupyterLab", "SciPy", "Pandas", "Scikit-learn"},
			Tags:        []string{"DataAnalysis", "ML", "Statistics"},
		},
	}
}

// Close stops the cleanup routine and cleans up all containers
func (pcm *PreviewContainerManager) Close() {
	if pcm.cleanupTick != nil {
		pcm.cleanupTick.Stop()
	}

	// Stop all running containers
	for id := range pcm.containers {
		pcm.StopContainer(id)
	}

	log.Printf("🐳 Preview Container Manager closed")
}
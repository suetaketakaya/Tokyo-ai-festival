package main

import (
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"
)

// setupJupyterEnvironment sets up Jupyter for a new project container
func (dm *DockerManager) setupJupyterEnvironment(project *Project) error {
	log.Printf("🔧 Setting up Jupyter environment for project: %s", project.ID)

	// Step 1: Create necessary directories with correct permissions
	setupDirsCmd := exec.Command("docker", "exec", "-u", "root", project.ContainerID, "bash", "-c", `
		# Create Jupyter directories
		mkdir -p /home/claude/.local/share/jupyter/runtime
		mkdir -p /home/claude/.jupyter/lab/user-settings
		mkdir -p /tmp/jupyter_runtime
		mkdir -p /tmp/jupyter_data

		# Set correct ownership
		chown -R claude:claude /home/claude/.local
		chown -R claude:claude /home/claude/.jupyter
		chown -R claude:claude /tmp/jupyter_runtime
		chown -R claude:claude /tmp/jupyter_data

		# Create Jupyter config directory
		mkdir -p /home/claude/.jupyter
		chown -R claude:claude /home/claude/.jupyter

		echo "Jupyter directories created successfully"
	`)

	output, err := setupDirsCmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ Failed to setup Jupyter directories: %v, output: %s", err, string(output))
		return fmt.Errorf("jupyter directory setup failed: %v", err)
	}

	log.Printf("✅ Jupyter directories created for %s", project.ID)

	// Step 2: Create Jupyter configuration
	configCmd := exec.Command("docker", "exec", project.ContainerID, "bash", "-c", `
		cat > /home/claude/.jupyter/jupyter_notebook_config.py << 'EOF'
# Jupyter Notebook Configuration
c.NotebookApp.ip = '0.0.0.0'
c.NotebookApp.port = 8888
c.NotebookApp.open_browser = False
c.NotebookApp.allow_root = True
c.NotebookApp.notebook_dir = '/workspace'
c.NotebookApp.token = ''
c.NotebookApp.password = ''
c.NotebookApp.allow_origin = '*'
c.NotebookApp.disable_check_xsrf = True

# ServerApp configuration for newer versions
c.ServerApp.ip = '0.0.0.0'
c.ServerApp.port = 8888
c.ServerApp.open_browser = False
c.ServerApp.allow_root = True
c.ServerApp.root_dir = '/workspace'
c.ServerApp.token = ''
c.ServerApp.password = ''
c.ServerApp.allow_origin = '*'
c.ServerApp.disable_check_xsrf = True

# Runtime and data directories
c.ServerApp.runtime_dir = '/tmp/jupyter_runtime'
c.ServerApp.data_dir = '/tmp/jupyter_data'
EOF

		echo "Jupyter configuration created"
	`)

	configOutput, configErr := configCmd.CombinedOutput()
	if configErr != nil {
		log.Printf("⚠️ Failed to create Jupyter config: %v, output: %s", configErr, string(configOutput))
		// Continue anyway, as default config might work
	} else {
		log.Printf("✅ Jupyter configuration created for %s", project.ID)
	}

	// Step 3: Start Jupyter automatically
	return dm.startJupyterService(project)
}

// startJupyterService starts Jupyter Notebook service in the container
func (dm *DockerManager) startJupyterService(project *Project) error {
	log.Printf("🚀 Starting Jupyter service for project: %s", project.ID)

	// Start Jupyter with environment variables and configuration
	startCmd := exec.Command("docker", "exec", "-d", project.ContainerID, "bash", "-c", `
		cd /workspace && \
		JUPYTER_RUNTIME_DIR=/tmp/jupyter_runtime \
		JUPYTER_DATA_DIR=/tmp/jupyter_data \
		nohup jupyter notebook \
			--ip=0.0.0.0 \
			--port=8888 \
			--no-browser \
			--allow-root \
			--notebook-dir=/workspace \
			--ServerApp.token='' \
			--ServerApp.password='' \
			--ServerApp.allow_origin='*' \
			--ServerApp.runtime_dir=/tmp/jupyter_runtime \
			--ServerApp.data_dir=/tmp/jupyter_data \
			> /tmp/jupyter.log 2>&1 &

		echo "Jupyter started in background"
	`)

	output, err := startCmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ Failed to start Jupyter: %v, output: %s", err, string(output))
		return fmt.Errorf("jupyter startup failed: %v", err)
	}

	log.Printf("✅ Jupyter start command executed for %s", project.ID)

	// Wait for Jupyter to start and verify
	return dm.verifyJupyterStartup(project)
}

// verifyJupyterStartup verifies that Jupyter is running properly
func (dm *DockerManager) verifyJupyterStartup(project *Project) error {
	log.Printf("🔍 Verifying Jupyter startup for project: %s", project.ID)

	// Wait for startup
	time.Sleep(3 * time.Second)

	// Check if Jupyter is listening on port 8888
	for attempt := 1; attempt <= 5; attempt++ {
		verifyCmd := exec.Command("docker", "exec", project.ContainerID, "ss", "-tuln")
		output, err := verifyCmd.Output()

		if err == nil && len(output) > 0 {
			outputStr := string(output)
			if strings.Contains(outputStr, ":8888") {
				log.Printf("✅ Jupyter verified running on port 8888 for %s (attempt %d)", project.ID, attempt)
				return nil
			}
		}

		log.Printf("⏳ Jupyter not yet ready for %s (attempt %d/5)", project.ID, attempt)
		time.Sleep(2 * time.Second)
	}

	// Check Jupyter logs for troubleshooting
	logCmd := exec.Command("docker", "exec", project.ContainerID, "tail", "-20", "/tmp/jupyter.log")
	logOutput, _ := logCmd.Output()

	log.Printf("⚠️ Jupyter verification failed for %s. Recent logs: %s", project.ID, string(logOutput))

	// Return warning but don't fail the project creation
	log.Printf("⚠️ Jupyter may not be fully ready, but project creation will continue")
	return nil
}

// stopJupyterService stops Jupyter service in the container
func (dm *DockerManager) stopJupyterService(project *Project) error {
	log.Printf("🛑 Stopping Jupyter service for project: %s", project.ID)

	stopCmd := exec.Command("docker", "exec", project.ContainerID, "bash", "-c", `
		# Kill Jupyter processes
		pkill -f "jupyter.*notebook" || true

		# Also kill any processes on port 8888
		fuser -k 8888/tcp 2>/dev/null || true

		echo "Jupyter stopped"
	`)

	output, err := stopCmd.CombinedOutput()
	if err != nil {
		log.Printf("⚠️ Error stopping Jupyter: %v, output: %s", err, string(output))
		return err
	}

	log.Printf("✅ Jupyter service stopped for %s", project.ID)
	return nil
}

// restartJupyterService restarts Jupyter service
func (dm *DockerManager) restartJupyterService(project *Project) error {
	log.Printf("🔄 Restarting Jupyter service for project: %s", project.ID)

	// Stop first
	if err := dm.stopJupyterService(project); err != nil {
		log.Printf("⚠️ Warning during Jupyter stop: %v", err)
	}

	// Wait a moment
	time.Sleep(2 * time.Second)

	// Start again
	return dm.startJupyterService(project)
}

// checkJupyterStatus checks if Jupyter is running
func (dm *DockerManager) checkJupyterStatus(project *Project) (bool, error) {
	checkCmd := exec.Command("docker", "exec", project.ContainerID, "ss", "-tuln")
	output, err := checkCmd.Output()

	if err != nil {
		return false, err
	}

	isRunning := strings.Contains(string(output), ":8888")
	return isRunning, nil
}

// getJupyterLogs retrieves Jupyter logs for debugging
func (dm *DockerManager) getJupyterLogs(project *Project) (string, error) {
	logCmd := exec.Command("docker", "exec", project.ContainerID, "cat", "/tmp/jupyter.log")
	output, err := logCmd.Output()

	if err != nil {
		return "", err
	}

	return string(output), nil
}
package main

import (
	// "context"
	// "encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	// "strconv"
	"strings"
	"time"
)

// Enhanced Execution Handler for priority-based command processing
type EnhancedExecutionHandler struct {
	previewManager *PreviewManager
	wandbIntegrated bool
}

// CommandClassification moved to common_utils.go

type ExecutionRequest struct {
	Type      string `json:"type"`
	Command   string `json:"command"`
	ProjectID string `json:"projectId"`
	Priority  string `json:"priority,omitempty"`
}

type ExecutionResponse struct {
	Output     string `json:"output"`
	Error      bool   `json:"error"`
	PreviewURL string `json:"previewUrl,omitempty"`
	Classification *CommandClassification `json:"classification,omitempty"`
}

// PreviewManager moved to common_utils.go

func NewEnhancedExecutionHandler() *EnhancedExecutionHandler {
	return &EnhancedExecutionHandler{
		previewManager: &PreviewManager{
			previewPorts: []int{3000, 5000, 8000, 8080, 8501, 7860},
			activeWebApps: make(map[int]string),
		},
		wandbIntegrated: false,
	}
}

// Smart command classification engine
func (h *EnhancedExecutionHandler) ClassifyCommand(command string) CommandClassification {
	cmd := strings.TrimSpace(strings.ToLower(command))

	// Linux commands - immediate execution
	linuxCommands := []string{"ls", "pwd", "cd", "mkdir", "rm", "cp", "mv", "cat", "grep", "find", "top", "ps", "kill", "chmod", "chown", "df", "du", "free", "uname"}
	for _, linuxCmd := range linuxCommands {
		if strings.HasPrefix(cmd, linuxCmd) {
			return CommandClassification{
				Type:        "linux",
				Priority:    "immediate",
				Description: fmt.Sprintf("Linux command '%s' - executing immediately", linuxCmd),
			}
		}
	}

	// Python execution - immediate with preview potential
	if strings.HasPrefix(cmd, "python") || strings.HasSuffix(cmd, ".py") {
		return CommandClassification{
			Type:        "python",
			Priority:    "immediate",
			Description: "Python execution - checking for visualization output",
			Suggestions: []string{"python -i", "python -u", "python -m"},
		}
	}

	// Package management - immediate
	packageManagers := []string{"pip", "npm", "yarn", "conda", "apt", "brew", "yum"}
	for _, pm := range packageManagers {
		if strings.HasPrefix(cmd, pm) {
			return CommandClassification{
				Type:        "linux",
				Priority:    "immediate",
				Description: fmt.Sprintf("Package management command - executing %s", pm),
			}
		}
	}

	// File operations - immediate with tab completion
	if (strings.Contains(cmd, ".") && strings.Contains(cmd, "/")) || (!strings.Contains(cmd, " ") && strings.Contains(cmd, ".")) {
		return CommandClassification{
			Type:        "file",
			Priority:    "immediate",
			Description: "File operation - enabling tab completion",
		}
	}

	// Web applications and servers - deferred with special handling
	webAppKeywords := []string{"flask", "django", "streamlit", "gradio", "serve", "http.server", "uvicorn", "gunicorn", "fastapi"}
	for _, keyword := range webAppKeywords {
		if strings.Contains(cmd, keyword) {
			return CommandClassification{
				Type:        "webapp",
				Priority:    "deferred",
				Description: fmt.Sprintf("Web application (%s) - preparing preview mode", keyword),
			}
		}
	}

	// Jupyter/Notebook commands
	if strings.Contains(cmd, "jupyter") || strings.Contains(cmd, "notebook") {
		return CommandClassification{
			Type:        "webapp",
			Priority:    "deferred",
			Description: "Jupyter notebook - setting up preview",
		}
	}

	// Complex development tasks - Claude assistance recommended
	complexKeywords := []string{"implement", "create", "build", "fix", "refactor", "optimize", "deploy", "configure", "setup"}
	for _, keyword := range complexKeywords {
		if strings.Contains(cmd, keyword) && len(command) > 30 {
			return CommandClassification{
				Type:        "claude",
				Priority:    "claude-assisted",
				Description: "Complex development task - Claude Code integration recommended",
			}
		}
	}

	// Default to immediate Linux execution
	return CommandClassification{
		Type:        "linux",
		Priority:    "immediate",
		Description: "Standard command execution",
	}
}

// Execute command with priority handling
func (h *EnhancedExecutionHandler) ExecuteCommand(req ExecutionRequest) ExecutionResponse {
	classification := h.ClassifyCommand(req.Command)

	switch classification.Priority {
	case "immediate":
		return h.executeImmediate(req.Command, classification)
	case "deferred":
		return h.executeDeferred(req.Command, classification)
	case "claude-assisted":
		return h.suggestClaudeAssistance(req.Command, classification)
	default:
		return h.executeImmediate(req.Command, classification)
	}
}

// Execute command immediately for Linux/Python commands
func (h *EnhancedExecutionHandler) executeImmediate(command string, classification CommandClassification) ExecutionResponse {
	var cmd *exec.Cmd
	var output []byte
	var err error

	// Handle different command types
	switch classification.Type {
	case "python":
		return h.executePythonCommand(command)
	case "file":
		return h.executeFileCommand(command)
	default:
		// Standard shell execution
		cmd = exec.Command("bash", "-c", command)
		cmd.Dir = getCurrentWorkingDirectory()
		output, err = cmd.CombinedOutput()
	}

	response := ExecutionResponse{
		Output: string(output),
		Error:  err != nil,
		Classification: &classification,
	}

	if err != nil {
		response.Output = fmt.Sprintf("Error: %s\n%s", err.Error(), string(output))
	}

	return response
}

// Execute Python commands with enhanced preview detection
func (h *EnhancedExecutionHandler) executePythonCommand(command string) ExecutionResponse {
	// Create temporary Python script for better control
	tempDir := "/tmp/remote_claude_python"
	os.MkdirAll(tempDir, 0755)

	scriptPath := filepath.Join(tempDir, fmt.Sprintf("script_%d.py", time.Now().Unix()))

	// Enhanced Python wrapper for preview detection
	enhancedScript := fmt.Sprintf(`
import sys
import os
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt

# Capture original command
original_command = %q

# Set up preview directory
preview_dir = "/tmp/remote_claude_previews"
os.makedirs(preview_dir, exist_ok=True)

# Execute original command
try:
    if original_command.startswith('python '):
        # Execute external Python file
        exec_command = original_command[7:]  # Remove 'python '
        with open(exec_command, 'r') as f:
            exec(f.read())
    else:
        # Direct Python code execution
        exec(original_command.replace('python -c "', '').replace('"', ''))

    # Check if matplotlib figures were created
    if plt.get_fignums():
        preview_file = f"{preview_dir}/plot_{int(time.time())}.png"
        plt.savefig(preview_file, dpi=150, bbox_inches='tight')
        print(f"PREVIEW_AVAILABLE:{preview_file}")
        plt.close('all')

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
`, command)

	// Write enhanced script
	err := ioutil.WriteFile(scriptPath, []byte(enhancedScript), 0755)
	if err != nil {
		return ExecutionResponse{
			Output: fmt.Sprintf("Error creating Python script: %s", err),
			Error:  true,
		}
	}

	// Execute enhanced Python script
	cmd := exec.Command("python3", scriptPath)
	cmd.Dir = getCurrentWorkingDirectory()
	output, err := cmd.CombinedOutput()

	response := ExecutionResponse{
		Output: string(output),
		Error:  err != nil,
	}

	// Check for preview availability
	if strings.Contains(string(output), "PREVIEW_AVAILABLE:") {
		parts := strings.Split(string(output), "PREVIEW_AVAILABLE:")
		if len(parts) > 1 {
			previewPath := strings.TrimSpace(parts[1])
			// Serve preview file via HTTP
			previewURL := h.servePreviewFile(previewPath)
			response.PreviewURL = previewURL
		}
	}

	// Clean up temporary script
	os.Remove(scriptPath)

	return response
}

// Execute file operations with tab completion support
func (h *EnhancedExecutionHandler) executeFileCommand(command string) ExecutionResponse {
	// Check if it's a tab completion request
	if strings.HasSuffix(command, "*") {
		return h.handleTabCompletion(command)
	}

	// Regular file command execution
	cmd := exec.Command("bash", "-c", command)
	cmd.Dir = getCurrentWorkingDirectory()
	output, err := cmd.CombinedOutput()

	return ExecutionResponse{
		Output: string(output),
		Error:  err != nil,
	}
}

// Handle tab completion for file operations
func (h *EnhancedExecutionHandler) handleTabCompletion(partial string) ExecutionResponse {
	// Remove trailing asterisk
	prefix := strings.TrimSuffix(partial, "*")

	// Get directory and filename parts
	dir := filepath.Dir(prefix)
	if dir == "." {
		dir = getCurrentWorkingDirectory()
	}

	filename := filepath.Base(prefix)

	// Read directory contents
	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return ExecutionResponse{
			Output: fmt.Sprintf("Tab completion error: %s", err),
			Error:  true,
		}
	}

	// Filter matching files
	var matches []string
	for _, file := range files {
		if strings.HasPrefix(file.Name(), filename) {
			if file.IsDir() {
				matches = append(matches, file.Name()+"/")
			} else {
				matches = append(matches, file.Name())
			}
		}
	}

	if len(matches) == 0 {
		return ExecutionResponse{
			Output: "No matching files found",
			Error:  false,
		}
	}

	return ExecutionResponse{
		Output: strings.Join(matches, "\n"),
		Error:  false,
	}
}

// Execute deferred commands (web applications)
func (h *EnhancedExecutionHandler) executeDeferred(command string, classification CommandClassification) ExecutionResponse {
	// Start the web application in background
	go h.startWebApplicationBackground(command)

	// Return immediate response with preview setup message
	return ExecutionResponse{
		Output: fmt.Sprintf("🌐 Starting %s application...\n📱 Preview will be available on detected port shortly.\n⏱️  Monitoring ports: %v",
			classification.Type, h.previewManager.previewPorts),
		Error: false,
		Classification: &classification,
	}
}

// Start web application in background and monitor for preview
func (h *EnhancedExecutionHandler) startWebApplicationBackground(command string) {
	cmd := exec.Command("bash", "-c", command)
	cmd.Dir = getCurrentWorkingDirectory()

	// Start command
	err := cmd.Start()
	if err != nil {
		return
	}

	// Monitor for web application availability
	go h.monitorWebAppPorts(command)
}

// Monitor web application ports for preview availability
func (h *EnhancedExecutionHandler) monitorWebAppPorts(originalCommand string) {
	for i := 0; i < 30; i++ { // Monitor for 30 seconds
		for _, port := range h.previewManager.previewPorts {
			if h.isPortActive(port) {
				h.previewManager.activeWebApps[port] = originalCommand
				// Could send WebSocket notification here about preview availability
				return
			}
		}
		time.Sleep(1 * time.Second)
	}
}

// Check if port is active
func (h *EnhancedExecutionHandler) isPortActive(port int) bool {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://localhost:%d", port))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 400
}

// Suggest Claude Code assistance for complex tasks
func (h *EnhancedExecutionHandler) suggestClaudeAssistance(command string, classification CommandClassification) ExecutionResponse {
	// Still attempt basic execution but suggest Claude integration
	basicResponse := h.executeImmediate(command, classification)

	assistanceMessage := fmt.Sprintf(`
🤖 Complex Task Detected: "%s"

💡 Claude Code Integration Recommended:
   • Better error handling and debugging
   • Step-by-step implementation guidance
   • Advanced code generation and optimization
   • Integrated testing and validation

📋 Basic execution result:
%s

🚀 For enhanced development experience, enable Claude Code integration in the app.
`, command, basicResponse.Output)

	return ExecutionResponse{
		Output: assistanceMessage,
		Error:  basicResponse.Error,
		Classification: &classification,
	}
}

// Serve preview file via HTTP
func (h *EnhancedExecutionHandler) servePreviewFile(filePath string) string {
	// Copy file to public preview directory
	previewPublicDir := "/tmp/remote_claude_public"
	os.MkdirAll(previewPublicDir, 0755)

	filename := filepath.Base(filePath)
	publicPath := filepath.Join(previewPublicDir, filename)

	// Copy file
	input, err := ioutil.ReadFile(filePath)
	if err != nil {
		return ""
	}

	err = ioutil.WriteFile(publicPath, input, 0644)
	if err != nil {
		return ""
	}

	// Return URL for preview
	return fmt.Sprintf("http://localhost:8080/preview/%s", filename)
}

// Setup W&B Integration
func (h *EnhancedExecutionHandler) SetupWandB(apiKey string) ExecutionResponse {
	// Install wandb and login
	commands := []string{
		"pip install wandb",
		fmt.Sprintf("echo '%s' | wandb login", apiKey),
	}

	var allOutput strings.Builder
	for i, cmd := range commands {
		execCmd := exec.Command("bash", "-c", cmd)
		execCmd.Dir = getCurrentWorkingDirectory()
		output, err := execCmd.CombinedOutput()

		allOutput.WriteString(fmt.Sprintf("Step %d: %s\n", i+1, cmd))
		allOutput.WriteString(string(output))
		allOutput.WriteString("\n")

		if err != nil {
			return ExecutionResponse{
				Output: fmt.Sprintf("W&B setup failed at step %d: %s\n%s", i+1, err, allOutput.String()),
				Error:  true,
			}
		}
	}

	h.wandbIntegrated = true

	// Add sample code template
	sampleCode := `
✅ W&B Integration Complete!

📊 Sample Usage:
import wandb

# Initialize run
run = wandb.init(
    project="my-ai-project",
    entity="your-team",
    config={
        "learning_rate": 0.02,
        "architecture": "CNN",
        "dataset": "custom",
        "epochs": 10,
    }
)

# Log metrics
wandb.log({"accuracy": 0.95, "loss": 0.05})

# Log model
wandb.save("model.pkl")

🔗 View your experiments at: https://wandb.ai
`

	allOutput.WriteString(sampleCode)

	return ExecutionResponse{
		Output: allOutput.String(),
		Error:  false,
	}
}

// Get current working directory
func getCurrentWorkingDirectory() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "/tmp"
	}
	return cwd
}

// Enhanced file completion with fuzzy matching
func (h *EnhancedExecutionHandler) GetSmartCompletions(input string) []string {
	var completions []string

	// Basic file completion
	if strings.Contains(input, "/") || strings.Contains(input, ".") {
		dir := filepath.Dir(input)
		if dir == "." {
			dir = getCurrentWorkingDirectory()
		}

		files, err := ioutil.ReadDir(dir)
		if err == nil {
			prefix := filepath.Base(input)
			for _, file := range files {
				if strings.HasPrefix(file.Name(), prefix) {
					if file.IsDir() {
						completions = append(completions, file.Name()+"/")
					} else {
						completions = append(completions, file.Name())
					}
				}
			}
		}
	}

	// Command completions
	commonCommands := []string{
		"ls -la", "pwd", "cd ..", "python --version", "pip list",
		"git status", "git add .", "git commit -m", "git push",
		"npm install", "npm start", "npm run build",
		"docker ps", "docker build", "docker run",
		"jupyter notebook", "streamlit run", "flask run",
	}

	for _, cmd := range commonCommands {
		if strings.HasPrefix(cmd, input) {
			completions = append(completions, cmd)
		}
	}

	return completions
}

// Detect visualization libraries in Python code
func (h *EnhancedExecutionHandler) detectVisualizationLibraries(code string) []string {
	var detected []string

	patterns := map[string]*regexp.Regexp{
		"matplotlib": regexp.MustCompile(`import matplotlib|from matplotlib|plt\.`),
		"seaborn":    regexp.MustCompile(`import seaborn|sns\.`),
		"plotly":     regexp.MustCompile(`import plotly|plotly\.`),
		"bokeh":      regexp.MustCompile(`import bokeh|from bokeh`),
		"altair":     regexp.MustCompile(`import altair|alt\.`),
	}

	for lib, pattern := range patterns {
		if pattern.MatchString(code) {
			detected = append(detected, lib)
		}
	}

	return detected
}
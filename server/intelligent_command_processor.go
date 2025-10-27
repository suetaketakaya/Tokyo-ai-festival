package main

import (
	"fmt"
	"log"
	"regexp"
	"strings"
	"path/filepath"
	"os"

	"github.com/gorilla/websocket"
)

// IntelligentCommandProcessor handles smart command routing and execution
type IntelligentCommandProcessor struct {
	dockerManager *DockerManager
	matplotlibDetector *MatplotlibDetector
}

// IntelligentCommandType represents the category of command
type IntelligentCommandType int

const (
	LinuxCommand IntelligentCommandType = iota
	PythonExecution
	IntelligentFileExecution
	CodeImplementation
	WebAppExecution
)

// IntelligentCommandClassification contains analysis of the input command
// (renamed to avoid conflict with CommandClassification in common_utils.go)
type IntelligentCommandClassification struct {
	Type IntelligentCommandType
	Command string
	Priority int
	RequiresGUI bool
	RequiresPort bool
	SuggestedPort int
	AutoCompleteOptions []string
}

// NewIntelligentCommandProcessor creates a new intelligent command processor
func NewIntelligentCommandProcessor(dm *DockerManager, md *MatplotlibDetector) *IntelligentCommandProcessor {
	return &IntelligentCommandProcessor{
		dockerManager: dm,
		matplotlibDetector: md,
	}
}

// ClassifyCommand analyzes the input and determines the appropriate execution strategy
func (icp *IntelligentCommandProcessor) ClassifyCommand(input string) IntelligentCommandClassification {
	input = strings.TrimSpace(input)

	// Priority 1: Linux basic commands (highest priority)
	if icp.isLinuxCommand(input) {
		return IntelligentCommandClassification{
			Type: LinuxCommand,
			Command: input,
			Priority: 1,
			RequiresGUI: false,
			RequiresPort: false,
			AutoCompleteOptions: icp.getLinuxAutoComplete(input),
		}
	}

	// Priority 2: Python execution with GUI/plotting
	if icp.isPythonWithGUI(input) {
		return IntelligentCommandClassification{
			Type: PythonExecution,
			Command: input,
			Priority: 2,
			RequiresGUI: true,
			RequiresPort: true,
			SuggestedPort: 8888,
			AutoCompleteOptions: icp.getPythonAutoComplete(input),
		}
	}

	// Priority 3: File execution
	if icp.isFileExecution(input) {
		classification := IntelligentCommandClassification{
			Type:        IntelligentFileExecution,
			Command: input,
			Priority: 3,
			RequiresGUI: icp.fileRequiresGUI(input),
			RequiresPort: icp.fileRequiresPort(input),
			AutoCompleteOptions: icp.getFileAutoComplete(input),
		}

		if classification.RequiresPort {
			classification.SuggestedPort = icp.getSuggestedPort(input)
		}

		return classification
	}

	// Priority 4: Web application execution
	if icp.isWebAppExecution(input) {
		return IntelligentCommandClassification{
			Type: WebAppExecution,
			Command: input,
			Priority: 4,
			RequiresGUI: true,
			RequiresPort: true,
			SuggestedPort: icp.getWebAppPort(input),
			AutoCompleteOptions: icp.getWebAppAutoComplete(input),
		}
	}

	// Priority 5: Complex code implementation (lowest priority - route to Claude Code CLI)
	return IntelligentCommandClassification{
		Type: CodeImplementation,
		Command: input,
		Priority: 5,
		RequiresGUI: false,
		RequiresPort: false,
		AutoCompleteOptions: []string{},
	}
}

// isLinuxCommand checks if the input is a basic Linux command
func (icp *IntelligentCommandProcessor) isLinuxCommand(input string) bool {
	linuxCommands := map[string]bool{
		"ls": true, "pwd": true, "cd": true, "mkdir": true, "rmdir": true,
		"cp": true, "mv": true, "rm": true, "touch": true, "cat": true,
		"head": true, "tail": true, "grep": true, "find": true, "which": true,
		"ps": true, "top": true, "kill": true, "killall": true, "df": true,
		"du": true, "free": true, "uname": true, "whoami": true, "date": true,
		"wget": true, "curl": true, "ssh": true, "scp": true, "rsync": true,
		"tar": true, "gzip": true, "gunzip": true, "zip": true, "unzip": true,
		"chmod": true, "chown": true, "sudo": true, "su": true, "history": true,
		"clear": true, "exit": true, "logout": true, "man": true, "help": true,
	}

	parts := strings.Fields(input)
	if len(parts) == 0 {
		return false
	}

	command := parts[0]
	return linuxCommands[command]
}

// isPythonWithGUI checks if the command involves Python with GUI/plotting
func (icp *IntelligentCommandProcessor) isPythonWithGUI(input string) bool {
	// Check for python command with GUI libraries
	if strings.Contains(input, "python") {
		guiLibraries := []string{
			"matplotlib", "pyplot", "plt", "seaborn", "sns",
			"plotly", "bokeh", "dash", "streamlit", "gradio",
			"tkinter", "PyQt", "PySide", "kivy", "wx",
		}

		for _, lib := range guiLibraries {
			if strings.Contains(input, lib) {
				return true
			}
		}
	}

	return false
}

// isFileExecution checks if the command is executing a file
func (icp *IntelligentCommandProcessor) isFileExecution(input string) bool {
	// Check for file execution patterns
	patterns := []string{
		`python\s+\w+\.py`,
		`node\s+\w+\.js`,
		`npm\s+run\s+\w+`,
		`yarn\s+\w+`,
		`\.\/\w+`,
		`bash\s+\w+\.sh`,
		`sh\s+\w+\.sh`,
	}

	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, input)
		if matched {
			return true
		}
	}

	return false
}

// isWebAppExecution checks if the command starts a web application
func (icp *IntelligentCommandProcessor) isWebAppExecution(input string) bool {
	webAppPatterns := []string{
		"streamlit run", "gradio", "flask run", "django runserver",
		"npm start", "yarn start", "next dev", "gatsby develop",
		"vue serve", "ng serve", "rails server", "php -S",
	}

	for _, pattern := range webAppPatterns {
		if strings.Contains(input, pattern) {
			return true
		}
	}

	return false
}

// fileRequiresGUI checks if the file execution will require GUI display
func (icp *IntelligentCommandProcessor) fileRequiresGUI(input string) bool {
	// Extract filename
	parts := strings.Fields(input)
	for _, part := range parts {
		if strings.HasSuffix(part, ".py") {
			// Check if Python file contains GUI libraries
			if icp.pythonFileHasGUI(part) {
				return true
			}
		}
	}
	return false
}

// fileRequiresPort checks if the file execution will require a port
func (icp *IntelligentCommandProcessor) fileRequiresPort(input string) bool {
	return icp.fileRequiresGUI(input) || icp.isWebAppExecution(input)
}

// pythonFileHasGUI checks if a Python file imports GUI libraries
func (icp *IntelligentCommandProcessor) pythonFileHasGUI(filename string) bool {
	// This would need to be implemented to actually read the file
	// For now, return true if the filename suggests GUI usage
	guiIndicators := []string{
		"plot", "gui", "visual", "chart", "graph", "dashboard",
		"streamlit", "gradio", "dash", "bokeh", "matplotlib",
	}

	for _, indicator := range guiIndicators {
		if strings.Contains(strings.ToLower(filename), indicator) {
			return true
		}
	}

	return false
}

// getSuggestedPort returns the suggested port based on the command type
func (icp *IntelligentCommandProcessor) getSuggestedPort(input string) int {
	if strings.Contains(input, "streamlit") {
		return 8501
	}
	if strings.Contains(input, "gradio") {
		return 7860
	}
	if strings.Contains(input, "flask") {
		return 5000
	}
	if strings.Contains(input, "django") {
		return 8000
	}
	if strings.Contains(input, "jupyter") {
		return 8888
	}
	if strings.Contains(input, "next") || strings.Contains(input, "react") {
		return 3000
	}

	// Default for Python GUI applications
	return 8888
}

// getWebAppPort returns the port for web applications
func (icp *IntelligentCommandProcessor) getWebAppPort(input string) int {
	return icp.getSuggestedPort(input)
}

// getLinuxAutoComplete provides autocomplete suggestions for Linux commands
func (icp *IntelligentCommandProcessor) getLinuxAutoComplete(input string) []string {
	parts := strings.Fields(input)
	if len(parts) == 0 {
		return []string{}
	}

	command := parts[0]

	// File/directory completion for commands that work with paths
	pathCommands := map[string]bool{
		"ls": true, "cd": true, "cp": true, "mv": true, "rm": true,
		"cat": true, "head": true, "tail": true, "chmod": true,
		"chown": true, "find": true,
	}

	if pathCommands[command] && len(parts) > 1 {
		return icp.getPathAutoComplete(parts[len(parts)-1])
	}

	return []string{}
}

// getPythonAutoComplete provides autocomplete for Python commands
func (icp *IntelligentCommandProcessor) getPythonAutoComplete(input string) []string {
	suggestions := []string{}

	if strings.Contains(input, "python") && !strings.Contains(input, ".py") {
		// Suggest Python files
		return icp.getPathAutoComplete("*.py")
	}

	return suggestions
}

// getFileAutoComplete provides autocomplete for file execution
func (icp *IntelligentCommandProcessor) getFileAutoComplete(input string) []string {
	parts := strings.Fields(input)
	if len(parts) > 1 {
		return icp.getPathAutoComplete(parts[len(parts)-1])
	}
	return []string{}
}

// getWebAppAutoComplete provides autocomplete for web app commands
func (icp *IntelligentCommandProcessor) getWebAppAutoComplete(input string) []string {
	// This could be enhanced to suggest package.json scripts, etc.
	return []string{}
}

// getPathAutoComplete provides file/directory path completion
func (icp *IntelligentCommandProcessor) getPathAutoComplete(partial string) []string {
	var suggestions []string

	// Get directory to search
	dir := "."
	pattern := partial

	if strings.Contains(partial, "/") {
		dir = filepath.Dir(partial)
		pattern = filepath.Base(partial)
	}

	// Read directory contents
	files, err := os.ReadDir(dir)
	if err != nil {
		return suggestions
	}

	// Filter matches
	for _, file := range files {
		if strings.HasPrefix(file.Name(), pattern) {
			if file.IsDir() {
				suggestions = append(suggestions, file.Name()+"/")
			} else {
				suggestions = append(suggestions, file.Name())
			}
		}
	}

	return suggestions
}

// ProcessCommand executes the command based on its classification
func (icp *IntelligentCommandProcessor) ProcessCommand(conn *websocket.Conn, classification IntelligentCommandClassification, projectID string) {
	log.Printf("🧠 Processing command: %s (Type: %d, Priority: %d)", classification.Command, classification.Type, classification.Priority)

	switch classification.Type {
	case LinuxCommand:
		icp.executeLinuxCommand(conn, classification, projectID)
	case PythonExecution:
		icp.executePythonWithGUI(conn, classification, projectID)
	case IntelligentFileExecution:
		icp.executeFile(conn, classification, projectID)
	case WebAppExecution:
		icp.executeWebApp(conn, classification, projectID)
	case CodeImplementation:
		icp.routeToClaudeCodeCLI(conn, classification, projectID)
	}
}

// executeLinuxCommand executes basic Linux commands directly
func (icp *IntelligentCommandProcessor) executeLinuxCommand(conn *websocket.Conn, classification IntelligentCommandClassification, projectID string) {
	log.Printf("🐧 Executing Linux command: %s", classification.Command)

	// Execute command in container
	output, err := icp.dockerManager.ExecuteCommand(projectID, classification.Command)
	if err != nil {
		icp.sendExecutionError(conn, fmt.Sprintf("Command failed: %v", err))
		return
	}

	// Send immediate response
	response := map[string]interface{}{
		"type": "terminal_output",
		"data": map[string]interface{}{
			"output": output,
			"command": classification.Command,
			"execution_type": "linux_direct",
		},
	}

	conn.WriteJSON(response)
}

// executePythonWithGUI executes Python commands that require GUI display
func (icp *IntelligentCommandProcessor) executePythonWithGUI(conn *websocket.Conn, classification IntelligentCommandClassification, projectID string) {
	log.Printf("🐍 Executing Python with GUI: %s", classification.Command)

	// Set up port forwarding for GUI display
	if classification.RequiresPort {
		log.Printf("🌐 Setting up port forwarding for port %d", classification.SuggestedPort)
		// This would set up the port forwarding in the Docker container
	}

	// Execute with matplotlib detection
	output, err := icp.dockerManager.ExecuteCommand(projectID, classification.Command)
	if err != nil {
		icp.sendExecutionError(conn, fmt.Sprintf("Python execution failed: %v", err))
		return
	}

	// Check for matplotlib output
	// TODO: Implement CheckForMatplotlibOutput method or use alternative
	// icp.matplotlibDetector.CheckForMatplotlibOutput(output, projectID)

	// Send response with preview information
	response := map[string]interface{}{
		"type": "execution_result",
		"data": map[string]interface{}{
			"output": output,
			"command": classification.Command,
			"execution_type": "python_gui",
			"requires_preview": classification.RequiresGUI,
			"port": classification.SuggestedPort,
		},
	}

	conn.WriteJSON(response)
}

// executeFile executes file-based commands
func (icp *IntelligentCommandProcessor) executeFile(conn *websocket.Conn, classification IntelligentCommandClassification, projectID string) {
	log.Printf("📄 Executing file: %s", classification.Command)

	// Set up port if needed
	if classification.RequiresPort {
		log.Printf("🌐 Setting up port forwarding for port %d", classification.SuggestedPort)
	}

	// Execute file
	output, err := icp.dockerManager.ExecuteCommand(projectID, classification.Command)
	if err != nil {
		icp.sendExecutionError(conn, fmt.Sprintf("File execution failed: %v", err))
		return
	}

	// Send response
	response := map[string]interface{}{
		"type": "execution_result",
		"data": map[string]interface{}{
			"output": output,
			"command": classification.Command,
			"execution_type": "file_execution",
			"requires_preview": classification.RequiresGUI,
			"port": classification.SuggestedPort,
		},
	}

	conn.WriteJSON(response)
}

// executeWebApp executes web application commands
func (icp *IntelligentCommandProcessor) executeWebApp(conn *websocket.Conn, classification IntelligentCommandClassification, projectID string) {
	log.Printf("🌐 Starting web application: %s", classification.Command)

	// Set up port forwarding
	log.Printf("🔗 Setting up port forwarding for port %d", classification.SuggestedPort)

	// Execute in background
	output, err := icp.dockerManager.ExecuteCommand(projectID, classification.Command+" &")
	if err != nil {
		icp.sendExecutionError(conn, fmt.Sprintf("Web app startup failed: %v", err))
		return
	}

	// Send response with web app info
	response := map[string]interface{}{
		"type": "webapp_started",
		"data": map[string]interface{}{
			"output": output,
			"command": classification.Command,
			"execution_type": "webapp",
			"port": classification.SuggestedPort,
			"url": fmt.Sprintf("http://localhost:%d", classification.SuggestedPort),
		},
	}

	conn.WriteJSON(response)
}

// routeToClaudeCodeCLI routes complex commands to Claude Code CLI
func (icp *IntelligentCommandProcessor) routeToClaudeCodeCLI(conn *websocket.Conn, classification IntelligentCommandClassification, projectID string) {
	log.Printf("🤖 Routing to Claude Code CLI: %s", classification.Command)

	// Send to Claude Code CLI processing
	response := map[string]interface{}{
		"type": "claude_code_required",
		"data": map[string]interface{}{
			"command": classification.Command,
			"message": "This request requires code implementation and will be handled by Claude Code CLI",
			"execution_type": "claude_code_cli",
		},
	}

	conn.WriteJSON(response)
}

// sendExecutionError sends an error response
func (icp *IntelligentCommandProcessor) sendExecutionError(conn *websocket.Conn, message string) {
	response := map[string]interface{}{
		"type": "execution_error",
		"data": map[string]interface{}{
			"error": message,
		},
	}
	conn.WriteJSON(response)
}

// Global intelligent command processor instance
var globalIntelligentCommandProcessor *IntelligentCommandProcessor

// InitializeIntelligentCommandProcessor initializes the global command processor
func InitializeIntelligentCommandProcessor(dm *DockerManager, md *MatplotlibDetector) {
	globalIntelligentCommandProcessor = NewIntelligentCommandProcessor(dm, md)
	log.Printf("🧠 Intelligent command processor initialized")
}
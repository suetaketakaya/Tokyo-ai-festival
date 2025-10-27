package main

import (
	// "bufio"
	// "context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// SmartTerminalProcessor handles intelligent command processing
type SmartTerminalProcessor struct {
	currentDir    string
	history       []string
	historyMutex  sync.RWMutex
	envVars       map[string]string
	claudeMode    bool
	previewPort   int
	contextCache  map[string]interface{}
	pythonProcess *exec.Cmd
	processManager *ProcessManager
}

// ProcessManager manages running processes
type ProcessManager struct {
	processes map[string]*exec.Cmd
	mutex     sync.RWMutex
}

// CommandType represents the type of command
type TerminalCommandType int

const (
	SystemCommand TerminalCommandType = iota  // ls, pwd, cd, etc.
	PythonCode                                // Python execution
	TerminalFileExecution                     // Script/binary execution
	ClaudeCodeTask                            // Complex development task
	PreviewRequired                           // GUI/Web preview needed
)

// CommandContext contains command execution context
type CommandContext struct {
	Type        TerminalCommandType
	Command     string
	Args        []string
	WorkingDir  string
	RequiresPreview bool
	Port        int
	Environment map[string]string
}

// NewSmartTerminalProcessor creates a new smart terminal processor
func NewSmartTerminalProcessor() *SmartTerminalProcessor {
	homeDir, _ := os.UserHomeDir()

	return &SmartTerminalProcessor{
		currentDir:    homeDir,
		history:       make([]string, 0),
		envVars:       make(map[string]string),
		claudeMode:    false,
		previewPort:   8080,
		contextCache:  make(map[string]interface{}),
		processManager: &ProcessManager{
			processes: make(map[string]*exec.Cmd),
		},
	}
}

// AnalyzeCommand analyzes the input and determines command type
func (stp *SmartTerminalProcessor) AnalyzeCommand(input string) *CommandContext {
	input = strings.TrimSpace(input)

	// Add to history
	stp.addToHistory(input)

	// Detect command type
	ctx := &CommandContext{
		Command:     input,
		WorkingDir:  stp.currentDir,
		Environment: stp.envVars,
	}

	// Priority 1: Basic Linux commands (highest priority)
	if stp.isSystemCommand(input) {
		ctx.Type = SystemCommand
		return ctx
	}

	// Priority 2: Python code detection
	if stp.isPythonCode(input) {
		ctx.Type = PythonCode
		ctx.RequiresPreview = stp.requiresPreview(input)
		if ctx.RequiresPreview {
			ctx.Port = stp.previewPort
		}
		return ctx
	}

	// Priority 3: File execution
	if stp.isFileExecution(input) {
		ctx.Type = TerminalFileExecution
		ctx.RequiresPreview = stp.detectPreviewNeed(input)
		if ctx.RequiresPreview {
			ctx.Port = stp.previewPort
		}
		return ctx
	}

	// Priority 4: Complex tasks for Claude Code
	ctx.Type = ClaudeCodeTask
	return ctx
}

// isSystemCommand checks if the command is a basic Linux command
func (stp *SmartTerminalProcessor) isSystemCommand(input string) bool {
	basicCommands := []string{
		"ls", "pwd", "cd", "mkdir", "rmdir", "rm", "cp", "mv",
		"cat", "head", "tail", "grep", "find", "ps", "top",
		"kill", "chmod", "chown", "df", "du", "whoami", "date",
		"echo", "which", "whereis", "history", "clear", "tree",
		"wget", "curl", "ssh", "scp", "rsync", "tar", "unzip",
		"git", "nano", "vim", "emacs", "less", "more",
	}

	parts := strings.Fields(input)
	if len(parts) == 0 {
		return false
	}

	command := parts[0]
	for _, cmd := range basicCommands {
		if command == cmd {
			return true
		}
	}

	// Check if it's a shell operator or pipe
	if strings.Contains(input, "|") || strings.Contains(input, "&&") ||
	   strings.Contains(input, "||") || strings.Contains(input, ";") {
		return true
	}

	return false
}

// isPythonCode detects Python code patterns
func (stp *SmartTerminalProcessor) isPythonCode(input string) bool {
	pythonPatterns := []string{
		`^python\s+`,
		`^python3\s+`,
		`\.py$`,
		`import\s+\w+`,
		`from\s+\w+\s+import`,
		`def\s+\w+\(`,
		`class\s+\w+`,
		`if\s+__name__\s*==\s*["\']__main__["\']`,
		`print\s*\(`,
		`plt\.`,
		`matplotlib`,
		`streamlit`,
		`flask`,
		`django`,
		`fastapi`,
	}

	for _, pattern := range pythonPatterns {
		matched, _ := regexp.MatchString(pattern, input)
		if matched {
			return true
		}
	}

	// Check for Python file execution
	if strings.HasPrefix(input, "python ") || strings.HasPrefix(input, "python3 ") {
		return true
	}

	return false
}

// isFileExecution detects file execution patterns
func (stp *SmartTerminalProcessor) isFileExecution(input string) bool {
	// Check for executable files
	executionPatterns := []string{
		`^\.\/.*`,         // ./script
		`.*\.sh$`,         // shell script
		`.*\.py$`,         // python script
		`.*\.js$`,         // node script
		`.*\.rb$`,         // ruby script
		`npm\s+run`,       // npm scripts
		`yarn\s+`,         // yarn scripts
		`go\s+run`,        // go execution
		`cargo\s+run`,     // rust execution
		`make\s+`,         // makefile
	}

	for _, pattern := range executionPatterns {
		matched, _ := regexp.MatchString(pattern, input)
		if matched {
			return true
		}
	}

	return false
}

// requiresPreview detects if Python code needs GUI preview
func (stp *SmartTerminalProcessor) requiresPreview(input string) bool {
	previewPatterns := []string{
		`matplotlib`,
		`plt\.show`,
		`streamlit`,
		`dash`,
		`bokeh`,
		`plotly`,
		`seaborn`,
		`tkinter`,
		`PyQt`,
		`kivy`,
		`flask.*run`,
		`app\.run`,
		`uvicorn`,
		`gunicorn`,
	}

	for _, pattern := range previewPatterns {
		matched, _ := regexp.MatchString(pattern, input)
		if matched {
			return true
		}
	}

	return false
}

// detectPreviewNeed detects if file execution needs preview
func (stp *SmartTerminalProcessor) detectPreviewNeed(input string) bool {
	// Web server patterns
	webPatterns := []string{
		`.*server\.js`,
		`.*app\.js`,
		`npm\s+start`,
		`npm\s+run\s+dev`,
		`yarn\s+start`,
		`yarn\s+dev`,
		`streamlit\s+run`,
		`flask\s+run`,
		`python.*app\.py`,
	}

	for _, pattern := range webPatterns {
		matched, _ := regexp.MatchString(pattern, input)
		if matched {
			return true
		}
	}

	return false
}

// ExecuteCommand executes the command based on its type
func (stp *SmartTerminalProcessor) ExecuteCommand(ctx *CommandContext) (*TerminalExecutionResult, error) {
	switch ctx.Type {
	case SystemCommand:
		return stp.executeSystemCommand(ctx)
	case PythonCode:
		return stp.executePythonCode(ctx)
	case TerminalFileExecution:
		return stp.executeFile(ctx)
	case ClaudeCodeTask:
		return stp.handleClaudeCodeTask(ctx)
	default:
		return nil, fmt.Errorf("unknown command type")
	}
}

// ExecutionResult contains command execution results
type TerminalExecutionResult struct {
	Output          string
	Error           string
	ExitCode        int
	PreviewURL      string
	RequiresPreview bool
	Duration        time.Duration
	ProcessID       string
}

// executeSystemCommand executes basic Linux commands
func (stp *SmartTerminalProcessor) executeSystemCommand(ctx *CommandContext) (*TerminalExecutionResult, error) {
	start := time.Now()

	// Handle cd command specially
	if strings.HasPrefix(ctx.Command, "cd ") {
		return stp.handleCdCommand(ctx)
	}

	// Execute command
	cmd := exec.Command("bash", "-c", ctx.Command)
	cmd.Dir = ctx.WorkingDir

	// Set environment variables
	cmd.Env = os.Environ()
	for k, v := range ctx.Environment {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}

	output, err := cmd.CombinedOutput()

	result := &TerminalExecutionResult{
		Output:   string(output),
		Duration: time.Since(start),
	}

	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitError.ExitCode()
		}
		result.Error = err.Error()
	}

	return result, nil
}

// handleCdCommand handles directory changes
func (stp *SmartTerminalProcessor) handleCdCommand(ctx *CommandContext) (*TerminalExecutionResult, error) {
	parts := strings.Fields(ctx.Command)
	var targetDir string

	if len(parts) == 1 {
		// cd without arguments goes to home
		homeDir, _ := os.UserHomeDir()
		targetDir = homeDir
	} else {
		targetDir = parts[1]
	}

	// Handle relative paths
	if !filepath.IsAbs(targetDir) {
		targetDir = filepath.Join(stp.currentDir, targetDir)
	}

	// Check if directory exists
	if _, err := os.Stat(targetDir); os.IsNotExist(err) {
		return &TerminalExecutionResult{
			Error:    fmt.Sprintf("cd: %s: No such file or directory", targetDir),
			ExitCode: 1,
		}, nil
	}

	// Update current directory
	stp.currentDir = targetDir

	return &TerminalExecutionResult{
		Output: fmt.Sprintf("Changed directory to: %s", targetDir),
	}, nil
}

// executePythonCode executes Python code with preview support
func (stp *SmartTerminalProcessor) executePythonCode(ctx *CommandContext) (*TerminalExecutionResult, error) {
	start := time.Now()

	// Prepare Python execution environment
	var cmd *exec.Cmd

	if ctx.RequiresPreview {
		// Setup preview environment
		pythonCode := stp.wrapPythonForPreview(ctx.Command, ctx.Port)
		cmd = exec.Command("python3", "-c", pythonCode)
	} else {
		cmd = exec.Command("bash", "-c", ctx.Command)
	}

	cmd.Dir = ctx.WorkingDir

	// Execute
	output, err := cmd.CombinedOutput()

	result := &TerminalExecutionResult{
		Output:          string(output),
		Duration:        time.Since(start),
		RequiresPreview: ctx.RequiresPreview,
	}

	if ctx.RequiresPreview {
		result.PreviewURL = fmt.Sprintf("http://localhost:%d", ctx.Port)
	}

	if err != nil {
		result.Error = err.Error()
		if exitError, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitError.ExitCode()
		}
	}

	return result, nil
}

// wrapPythonForPreview wraps Python code for preview
func (stp *SmartTerminalProcessor) wrapPythonForPreview(code string, port int) string {
	wrapper := fmt.Sprintf(`
import sys
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import time

# Execute original code
try:
    %s

    # Save any matplotlib figures
    if plt.get_fignums():
        plt.savefig('preview_output.png', dpi=150, bbox_inches='tight')
        plt.close('all')

        # Start simple HTTP server for preview
        class PreviewHandler(SimpleHTTPRequestHandler):
            def do_GET(self):
                if self.path == '/' or self.path == '/preview':
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    html = '''
                    <!DOCTYPE html>
                    <html>
                    <head><title>Python Output Preview</title></head>
                    <body>
                        <h1>Python Execution Result</h1>
                        <img src="preview_output.png" alt="Generated Plot">
                    </body>
                    </html>
                    '''
                    self.wfile.write(html.encode())
                else:
                    super().do_GET()

        def start_server():
            httpd = HTTPServer(('localhost', %d), PreviewHandler)
            httpd.timeout = 300  # 5 minutes timeout
            httpd.handle_request()

        server_thread = threading.Thread(target=start_server)
        server_thread.daemon = True
        server_thread.start()

        print(f"Preview available at: http://localhost:%d")
        time.sleep(1)  # Give server time to start

except Exception as e:
    print(f"Execution error: {e}")
    sys.exit(1)
`, code, port, port)

	return wrapper
}

// executeFile executes files with preview support
func (stp *SmartTerminalProcessor) executeFile(ctx *CommandContext) (*TerminalExecutionResult, error) {
	start := time.Now()

	cmd := exec.Command("bash", "-c", ctx.Command)
	cmd.Dir = ctx.WorkingDir

	if ctx.RequiresPreview {
		// For web servers, run in background
		err := cmd.Start()
		if err != nil {
			return &TerminalExecutionResult{
				Error: err.Error(),
			}, err
		}

		// Store process for management
		stp.processManager.mutex.Lock()
		processID := fmt.Sprintf("proc_%d", cmd.Process.Pid)
		stp.processManager.processes[processID] = cmd
		stp.processManager.mutex.Unlock()

		// Give server time to start
		time.Sleep(2 * time.Second)

		return &TerminalExecutionResult{
			Output:          fmt.Sprintf("Server started with PID: %d", cmd.Process.Pid),
			Duration:        time.Since(start),
			RequiresPreview: true,
			PreviewURL:      fmt.Sprintf("http://localhost:%d", ctx.Port),
			ProcessID:       processID,
		}, nil
	}

	// Regular execution
	output, err := cmd.CombinedOutput()

	result := &TerminalExecutionResult{
		Output:   string(output),
		Duration: time.Since(start),
	}

	if err != nil {
		result.Error = err.Error()
		if exitError, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitError.ExitCode()
		}
	}

	return result, nil
}

// handleClaudeCodeTask handles complex development tasks
func (stp *SmartTerminalProcessor) handleClaudeCodeTask(ctx *CommandContext) (*TerminalExecutionResult, error) {
	// This will be handled by the main Claude Code integration
	return &TerminalExecutionResult{
		Output: fmt.Sprintf("Complex task identified: %s", ctx.Command),
		RequiresPreview: false,
	}, nil
}

// addToHistory adds command to history
func (stp *SmartTerminalProcessor) addToHistory(command string) {
	stp.historyMutex.Lock()
	defer stp.historyMutex.Unlock()

	stp.history = append(stp.history, command)

	// Keep only last 1000 commands
	if len(stp.history) > 1000 {
		stp.history = stp.history[len(stp.history)-1000:]
	}
}

// GetHistory returns command history
func (stp *SmartTerminalProcessor) GetHistory() []string {
	stp.historyMutex.RLock()
	defer stp.historyMutex.RUnlock()

	// Return copy
	history := make([]string, len(stp.history))
	copy(history, stp.history)
	return history
}

// GetTabCompletion provides tab completion suggestions
func (stp *SmartTerminalProcessor) GetTabCompletion(partial string) []string {
	suggestions := make([]string, 0)

	// File/directory completion
	if strings.Contains(partial, "/") || strings.HasPrefix(partial, "./") {
		return stp.getFileCompletions(partial)
	}

	// Command completion
	commands := []string{
		"ls", "cd", "pwd", "mkdir", "rm", "cp", "mv", "cat", "grep", "find",
		"python", "python3", "node", "npm", "yarn", "git", "docker", "make",
		"vim", "nano", "code", "clear", "history", "echo", "export",
	}

	for _, cmd := range commands {
		if strings.HasPrefix(cmd, partial) {
			suggestions = append(suggestions, cmd)
		}
	}

	// History-based completion
	for _, histCmd := range stp.GetHistory() {
		if strings.HasPrefix(histCmd, partial) && !containsString(suggestions, histCmd) {
			suggestions = append(suggestions, histCmd)
		}
	}

	return suggestions
}

// getFileCompletions provides file/directory completions
func (stp *SmartTerminalProcessor) getFileCompletions(partial string) []string {
	suggestions := make([]string, 0)

	dir := filepath.Dir(partial)
	if dir == "." {
		dir = stp.currentDir
	} else if !filepath.IsAbs(dir) {
		dir = filepath.Join(stp.currentDir, dir)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return suggestions
	}

	prefix := filepath.Base(partial)
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), prefix) {
			fullPath := filepath.Join(filepath.Dir(partial), entry.Name())
			if entry.IsDir() {
				fullPath += "/"
			}
			suggestions = append(suggestions, fullPath)
		}
	}

	return suggestions
}

// Helper function to check if slice contains string
func containsString(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// StopProcess stops a running process
func (stp *SmartTerminalProcessor) StopProcess(processID string) error {
	stp.processManager.mutex.Lock()
	defer stp.processManager.mutex.Unlock()

	if cmd, exists := stp.processManager.processes[processID]; exists {
		err := cmd.Process.Kill()
		delete(stp.processManager.processes, processID)
		return err
	}

	return fmt.Errorf("process not found: %s", processID)
}

// GetCurrentDirectory returns the current working directory
func (stp *SmartTerminalProcessor) GetCurrentDirectory() string {
	return stp.currentDir
}

// SetEnvironmentVariable sets an environment variable
func (stp *SmartTerminalProcessor) SetEnvironmentVariable(key, value string) {
	stp.envVars[key] = value
}
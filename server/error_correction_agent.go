package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// ErrorType defines different types of errors that can be corrected
type ErrorType string

const (
	SyntaxError        ErrorType = "syntax"
	DependencyError    ErrorType = "dependency"
	ImportError        ErrorType = "import"
	RuntimeError       ErrorType = "runtime"
	PermissionError    ErrorType = "permission"
	ConfigurationError ErrorType = "configuration"
	NetworkError       ErrorType = "network"
)

// ErrorAnalysis contains detailed analysis of an error
type ErrorAnalysis struct {
	Type             ErrorType         `json:"type"`
	Severity         string            `json:"severity"` // "low", "medium", "high", "critical"
	Message          string            `json:"message"`
	SourceFile       string            `json:"source_file,omitempty"`
	LineNumber       int               `json:"line_number,omitempty"`
	Column           int               `json:"column,omitempty"`
	StackTrace       []string          `json:"stack_trace,omitempty"`
	SuggestedFixes   []FixSuggestion   `json:"suggested_fixes"`
	RelatedErrors    []string          `json:"related_errors,omitempty"`
	FrameworkContext string            `json:"framework_context,omitempty"`
	Metadata         map[string]string `json:"metadata,omitempty"`
}

// FixSuggestion represents a potential fix for an error
type FixSuggestion struct {
	ID          string            `json:"id"`
	Description string            `json:"description"`
	Actions     []FixAction       `json:"actions"`
	Confidence  float64           `json:"confidence"` // 0.0 - 1.0
	AutoApply   bool              `json:"auto_apply"`
	TestCommand string            `json:"test_command,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// FixAction represents a single action to fix an error
type FixAction struct {
	Type        string            `json:"type"`        // "command", "file_edit", "install", "config"
	Target      string            `json:"target"`      // file path, command, package name
	Content     string            `json:"content"`     // new content, command to run
	Description string            `json:"description"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// ValidationResult contains the result of validating a fix
type ValidationResult struct {
	Success     bool     `json:"success"`
	Message     string   `json:"message"`
	NewErrors   []string `json:"new_errors,omitempty"`
	Warnings    []string `json:"warnings,omitempty"`
	Performance string   `json:"performance,omitempty"`
}

// ErrorCorrectionAgent handles automatic error detection and correction
type ErrorCorrectionAgent struct {
	projectPath     string
	errorPatterns   map[ErrorType][]ErrorPattern
	fixTemplates    map[ErrorType][]FixTemplate
	executionLog    []ExecutionEvent
	enableAutoFix   bool
	claudeCodePath  string
	debugMode       bool
}

// ErrorPattern defines regex patterns for detecting specific errors
type ErrorPattern struct {
	Pattern     *regexp.Regexp
	Language    string
	Framework   string
	Severity    string
	Description string
}

// FixTemplate defines templates for fixing specific error types
type FixTemplate struct {
	ErrorPattern string
	Actions      []FixAction
	Confidence   float64
	AutoApply    bool
	TestCommand  string
}

// ExecutionEvent logs events during error correction
type ExecutionEvent struct {
	Timestamp   time.Time `json:"timestamp"`
	Type        string    `json:"type"` // "error_detected", "fix_applied", "validation_success", "validation_failed"
	Description string    `json:"description"`
	Details     string    `json:"details,omitempty"`
}

// NewErrorCorrectionAgent creates a new error correction agent
func NewErrorCorrectionAgent(projectPath string, enableAutoFix bool) *ErrorCorrectionAgent {
	agent := &ErrorCorrectionAgent{
		projectPath:    projectPath,
		enableAutoFix:  enableAutoFix,
		claudeCodePath: "/usr/local/bin/claude",
		debugMode:      false,
		executionLog:   make([]ExecutionEvent, 0),
	}

	agent.initializeErrorPatterns()
	agent.initializeFixTemplates()

	return agent
}

// initializeErrorPatterns sets up error detection patterns
func (agent *ErrorCorrectionAgent) initializeErrorPatterns() {
	agent.errorPatterns = map[ErrorType][]ErrorPattern{
		SyntaxError: {
			{
				Pattern:     regexp.MustCompile(`SyntaxError: (.+)`),
				Language:    "python",
				Framework:   "any",
				Severity:    "high",
				Description: "Python syntax error",
			},
			{
				Pattern:     regexp.MustCompile(`SyntaxError: Unexpected token (.+)`),
				Language:    "javascript",
				Framework:   "any",
				Severity:    "high",
				Description: "JavaScript syntax error",
			},
			{
				Pattern:     regexp.MustCompile(`error: expected (.+)`),
				Language:    "go",
				Framework:   "any",
				Severity:    "high",
				Description: "Go syntax error",
			},
		},
		DependencyError: {
			{
				Pattern:     regexp.MustCompile(`ModuleNotFoundError: No module named '(.+)'`),
				Language:    "python",
				Framework:   "any",
				Severity:    "medium",
				Description: "Missing Python module",
			},
			{
				Pattern:     regexp.MustCompile(`Cannot find module '(.+)'`),
				Language:    "javascript",
				Framework:   "any",
				Severity:    "medium",
				Description: "Missing Node.js module",
			},
			{
				Pattern:     regexp.MustCompile(`package (.+): cannot find package`),
				Language:    "go",
				Framework:   "any",
				Severity:    "medium",
				Description: "Missing Go package",
			},
		},
		ImportError: {
			{
				Pattern:     regexp.MustCompile(`ImportError: (.+)`),
				Language:    "python",
				Framework:   "any",
				Severity:    "medium",
				Description: "Python import error",
			},
		},
		RuntimeError: {
			{
				Pattern:     regexp.MustCompile(`RuntimeError: (.+)`),
				Language:    "python",
				Framework:   "any",
				Severity:    "high",
				Description: "Python runtime error",
			},
			{
				Pattern:     regexp.MustCompile(`TypeError: (.+)`),
				Language:    "python",
				Framework:   "any",
				Severity:    "medium",
				Description: "Python type error",
			},
		},
		PermissionError: {
			{
				Pattern:     regexp.MustCompile(`PermissionError: \[Errno 13\] Permission denied: '(.+)'`),
				Language:    "python",
				Framework:   "any",
				Severity:    "medium",
				Description: "File permission error",
			},
			{
				Pattern:     regexp.MustCompile(`EACCES: permission denied`),
				Language:    "javascript",
				Framework:   "any",
				Severity:    "medium",
				Description: "Node.js permission error",
			},
		},
		ConfigurationError: {
			{
				Pattern:     regexp.MustCompile(`Error: (.+) is not defined`),
				Language:    "javascript",
				Framework:   "any",
				Severity:    "medium",
				Description: "Configuration or variable not defined",
			},
		},
		NetworkError: {
			{
				Pattern:     regexp.MustCompile(`ConnectionError: (.+)`),
				Language:    "python",
				Framework:   "any",
				Severity:    "medium",
				Description: "Network connection error",
			},
		},
	}
}

// initializeFixTemplates sets up fix templates
func (agent *ErrorCorrectionAgent) initializeFixTemplates() {
	agent.fixTemplates = map[ErrorType][]FixTemplate{
		DependencyError: {
			{
				ErrorPattern: `ModuleNotFoundError: No module named '(.+)'`,
				Actions: []FixAction{
					{
						Type:        "install",
						Target:      "pip",
						Content:     "pip install $1",
						Description: "Install missing Python package",
					},
				},
				Confidence:  0.9,
				AutoApply:   true,
				TestCommand: "python -c 'import $1'",
			},
			{
				ErrorPattern: `Cannot find module '(.+)'`,
				Actions: []FixAction{
					{
						Type:        "install",
						Target:      "npm",
						Content:     "npm install $1",
						Description: "Install missing Node.js package",
					},
				},
				Confidence:  0.9,
				AutoApply:   true,
				TestCommand: "node -e 'require(\"$1\")'",
			},
		},
		PermissionError: {
			{
				ErrorPattern: `PermissionError: \[Errno 13\] Permission denied: '(.+)'`,
				Actions: []FixAction{
					{
						Type:        "command",
						Target:      "chmod",
						Content:     "chmod +x $1",
						Description: "Add execute permission to file",
					},
				},
				Confidence: 0.8,
				AutoApply:  false, // Require user confirmation for permission changes
			},
		},
		ConfigurationError: {
			{
				ErrorPattern: `Error: (.+) is not defined`,
				Actions: []FixAction{
					{
						Type:        "file_edit",
						Target:      "configuration",
						Content:     "Define missing variable or configuration",
						Description: "Add missing configuration",
					},
				},
				Confidence: 0.6,
				AutoApply:  false,
			},
		},
	}
}

// AnalyzeError analyzes an error message and returns detailed analysis
func (agent *ErrorCorrectionAgent) AnalyzeError(errorMessage string, sourceCode string, framework string) *ErrorAnalysis {
	log.Printf("🔍 Analyzing error: %s", strings.TrimSpace(errorMessage))

	analysis := &ErrorAnalysis{
		Message:          errorMessage,
		FrameworkContext: framework,
		SuggestedFixes:   make([]FixSuggestion, 0),
		Metadata:         make(map[string]string),
	}

	// Detect error type and extract details
	for errorType, patterns := range agent.errorPatterns {
		for _, pattern := range patterns {
			if matches := pattern.Pattern.FindStringSubmatch(errorMessage); matches != nil {
				analysis.Type = errorType
				analysis.Severity = pattern.Severity

				// Extract specific error details
				if len(matches) > 1 {
					analysis.Metadata["extracted_value"] = matches[1]
				}

				// Generate fix suggestions
				agent.generateFixSuggestions(analysis, matches)
				break
			}
		}
		if analysis.Type != "" {
			break
		}
	}

	// If no pattern matched, classify as generic runtime error
	if analysis.Type == "" {
		analysis.Type = RuntimeError
		analysis.Severity = "medium"
	}

	// Add Claude Code CLI integration suggestions
	agent.addClaudeCodeSuggestions(analysis)

	// Log the analysis
	agent.logEvent("error_detected", fmt.Sprintf("Error type: %s, Severity: %s", analysis.Type, analysis.Severity), errorMessage)

	log.Printf("✅ Error analysis complete: Type=%s, Fixes=%d", analysis.Type, len(analysis.SuggestedFixes))
	return analysis
}

// generateFixSuggestions generates fix suggestions based on error analysis
func (agent *ErrorCorrectionAgent) generateFixSuggestions(analysis *ErrorAnalysis, matches []string) {
	if templates, exists := agent.fixTemplates[analysis.Type]; exists {
		for _, template := range templates {
			// Replace placeholders in template actions
			actions := make([]FixAction, len(template.Actions))
			for i, action := range template.Actions {
				actions[i] = action
				if len(matches) > 1 {
					actions[i].Content = strings.ReplaceAll(action.Content, "$1", matches[1])
					actions[i].Target = strings.ReplaceAll(action.Target, "$1", matches[1])
				}
			}

			suggestion := FixSuggestion{
				ID:          fmt.Sprintf("fix_%s_%d", analysis.Type, len(analysis.SuggestedFixes)+1),
				Description: template.Actions[0].Description,
				Actions:     actions,
				Confidence:  template.Confidence,
				AutoApply:   template.AutoApply && agent.enableAutoFix,
				TestCommand: template.TestCommand,
				Metadata:    make(map[string]string),
			}

			if len(matches) > 1 {
				suggestion.TestCommand = strings.ReplaceAll(template.TestCommand, "$1", matches[1])
			}

			analysis.SuggestedFixes = append(analysis.SuggestedFixes, suggestion)
		}
	}
}

// addClaudeCodeSuggestions adds Claude Code CLI specific suggestions
func (agent *ErrorCorrectionAgent) addClaudeCodeSuggestions(analysis *ErrorAnalysis) {
	// Add Claude Code CLI consultation suggestion
	claudeSuggestion := FixSuggestion{
		ID:          "claude_consultation",
		Description: "Consult Claude Code CLI for advanced error resolution",
		Actions: []FixAction{
			{
				Type:        "command",
				Target:      "claude",
				Content:     fmt.Sprintf("claude code --fix-error \"%s\"", analysis.Message),
				Description: "Use Claude Code CLI to analyze and fix the error",
			},
		},
		Confidence: 0.95,
		AutoApply:  false, // Always require user confirmation for Claude CLI
		Metadata: map[string]string{
			"tool": "claude_code_cli",
			"type": "ai_assisted_fix",
		},
	}

	analysis.SuggestedFixes = append(analysis.SuggestedFixes, claudeSuggestion)
}

// ApplyAutomaticFixes applies fixes that are marked for automatic application
func (agent *ErrorCorrectionAgent) ApplyAutomaticFixes(analysis *ErrorAnalysis) []ValidationResult {
	results := make([]ValidationResult, 0)

	for _, fix := range analysis.SuggestedFixes {
		if fix.AutoApply && fix.Confidence >= 0.8 {
			log.Printf("🔧 Applying automatic fix: %s", fix.Description)

			result := agent.applyFix(fix)
			results = append(results, result)

			if result.Success {
				agent.logEvent("fix_applied", fix.Description, fmt.Sprintf("Fix ID: %s", fix.ID))
			} else {
				agent.logEvent("fix_failed", fix.Description, result.Message)
			}
		}
	}

	return results
}

// applyFix applies a single fix
func (agent *ErrorCorrectionAgent) applyFix(fix FixSuggestion) ValidationResult {
	for _, action := range fix.Actions {
		switch action.Type {
		case "install":
			if err := agent.executeInstallCommand(action.Content); err != nil {
				return ValidationResult{
					Success: false,
					Message: fmt.Sprintf("Failed to install package: %s", err.Error()),
				}
			}

		case "command":
			if err := agent.executeCommand(action.Content); err != nil {
				return ValidationResult{
					Success: false,
					Message: fmt.Sprintf("Failed to execute command: %s", err.Error()),
				}
			}

		case "file_edit":
			if err := agent.applyFileEdit(action.Target, action.Content); err != nil {
				return ValidationResult{
					Success: false,
					Message: fmt.Sprintf("Failed to edit file: %s", err.Error()),
				}
			}

		case "config":
			if err := agent.updateConfiguration(action.Target, action.Content); err != nil {
				return ValidationResult{
					Success: false,
					Message: fmt.Sprintf("Failed to update configuration: %s", err.Error()),
				}
			}
		}
	}

	// Validate the fix if test command is provided
	if fix.TestCommand != "" {
		if err := agent.executeCommand(fix.TestCommand); err != nil {
			return ValidationResult{
				Success: false,
				Message: fmt.Sprintf("Fix validation failed: %s", err.Error()),
			}
		}
	}

	return ValidationResult{
		Success: true,
		Message: "Fix applied successfully",
	}
}

// executeInstallCommand executes package installation commands
func (agent *ErrorCorrectionAgent) executeInstallCommand(command string) error {
	log.Printf("📦 Installing package: %s", command)

	// Change to project directory
	cmd := exec.Command("bash", "-c", command)
	cmd.Dir = agent.projectPath

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ Install failed: %s", string(output))
		return fmt.Errorf("installation failed: %s", string(output))
	}

	log.Printf("✅ Package installed successfully")
	return nil
}

// executeCommand executes a shell command
func (agent *ErrorCorrectionAgent) executeCommand(command string) error {
	log.Printf("⚡ Executing command: %s", command)

	cmd := exec.Command("bash", "-c", command)
	cmd.Dir = agent.projectPath

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ Command failed: %s", string(output))
		return fmt.Errorf("command failed: %s", string(output))
	}

	log.Printf("✅ Command executed successfully")
	return nil
}

// applyFileEdit applies edits to source files
func (agent *ErrorCorrectionAgent) applyFileEdit(filePath, content string) error {
	log.Printf("📝 Editing file: %s", filePath)

	fullPath := filepath.Join(agent.projectPath, filePath)

	// Read existing file content
	existingContent, err := os.ReadFile(fullPath)
	if err != nil {
		return fmt.Errorf("failed to read file: %s", err.Error())
	}

	// Apply intelligent edit based on content type
	newContent := agent.applyIntelligentEdit(string(existingContent), content)

	// Write updated content
	if err := os.WriteFile(fullPath, []byte(newContent), 0644); err != nil {
		return fmt.Errorf("failed to write file: %s", err.Error())
	}

	log.Printf("✅ File edited successfully")
	return nil
}

// applyIntelligentEdit applies intelligent edits to file content
func (agent *ErrorCorrectionAgent) applyIntelligentEdit(existing, edit string) string {
	// For now, simple append - in production this would be more sophisticated
	return existing + "\n" + edit
}

// updateConfiguration updates configuration files
func (agent *ErrorCorrectionAgent) updateConfiguration(configType, content string) error {
	log.Printf("⚙️ Updating configuration: %s", configType)

	switch configType {
	case "package.json":
		return agent.updatePackageJSON(content)
	case "requirements.txt":
		return agent.updateRequirementsTxt(content)
	case "go.mod":
		return agent.updateGoMod(content)
	default:
		return fmt.Errorf("unsupported configuration type: %s", configType)
	}
}

// updatePackageJSON updates package.json file
func (agent *ErrorCorrectionAgent) updatePackageJSON(dependency string) error {
	packagePath := filepath.Join(agent.projectPath, "package.json")

	// Read existing package.json
	data, err := os.ReadFile(packagePath)
	if err != nil {
		return err
	}

	var pkg map[string]interface{}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return err
	}

	// Add dependency
	if deps, ok := pkg["dependencies"].(map[string]interface{}); ok {
		deps[dependency] = "latest"
	} else {
		pkg["dependencies"] = map[string]interface{}{
			dependency: "latest",
		}
	}

	// Write updated package.json
	updatedData, err := json.MarshalIndent(pkg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(packagePath, updatedData, 0644)
}

// updateRequirementsTxt updates requirements.txt file
func (agent *ErrorCorrectionAgent) updateRequirementsTxt(dependency string) error {
	reqPath := filepath.Join(agent.projectPath, "requirements.txt")

	file, err := os.OpenFile(reqPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(dependency + "\n")
	return err
}

// updateGoMod updates go.mod file
func (agent *ErrorCorrectionAgent) updateGoMod(dependency string) error {
	// Execute go get command
	return agent.executeCommand(fmt.Sprintf("go get %s", dependency))
}

// logEvent logs an event in the execution log
func (agent *ErrorCorrectionAgent) logEvent(eventType, description, details string) {
	event := ExecutionEvent{
		Timestamp:   time.Now(),
		Type:        eventType,
		Description: description,
		Details:     details,
	}

	agent.executionLog = append(agent.executionLog, event)

	if agent.debugMode {
		log.Printf("📋 Event logged: %s - %s", eventType, description)
	}
}

// GetExecutionLog returns the execution log
func (agent *ErrorCorrectionAgent) GetExecutionLog() []ExecutionEvent {
	return agent.executionLog
}

// SetDebugMode enables or disables debug mode
func (agent *ErrorCorrectionAgent) SetDebugMode(enabled bool) {
	agent.debugMode = enabled
	log.Printf("🐛 Debug mode: %t", enabled)
}

// MonitorProjectErrors monitors a project directory for errors
func (agent *ErrorCorrectionAgent) MonitorProjectErrors(projectPath string) error {
	log.Printf("👁️ Starting error monitoring for project: %s", projectPath)

	// This would implement real-time monitoring
	// For now, return success
	return nil
}

// GenerateErrorReport generates a comprehensive error report
func (agent *ErrorCorrectionAgent) GenerateErrorReport() map[string]interface{} {
	report := map[string]interface{}{
		"timestamp":       time.Now(),
		"project_path":    agent.projectPath,
		"auto_fix_enabled": agent.enableAutoFix,
		"total_events":    len(agent.executionLog),
		"events":          agent.executionLog,
		"supported_error_types": []string{
			string(SyntaxError),
			string(DependencyError),
			string(ImportError),
			string(RuntimeError),
			string(PermissionError),
			string(ConfigurationError),
			string(NetworkError),
		},
	}

	return report
}

// InitializeErrorCorrectionAgent initializes the global error correction agent
func InitializeErrorCorrectionAgent(server *Server) {
	log.Println("🤖 Initializing Error Correction Agent...")

	// Create agent with auto-fix enabled for testing
	agent := NewErrorCorrectionAgent("/tmp/demo_project", true)
	agent.SetDebugMode(true)

	// Attach to server for WebSocket communication
	server.ErrorAgent = agent

	log.Println("✅ Error Correction Agent initialized successfully")
}
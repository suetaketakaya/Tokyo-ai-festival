package main

import (
	"sync"
	"time"
)

// Common utility functions and types used across multiple files

// Math helpers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// Float64 math helpers
func minf(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func maxf(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// CommandType represents the type of command
type CommandType int

const (
	FileExecution CommandType = iota
	DirectExecution
	InteractiveExecution
)

// CommandClassification holds command analysis results
// Unified from enhanced_execution_handler.go and intelligent_command_processor.go
type CommandClassification struct {
	// From enhanced_execution_handler.go
	Type        string   `json:"type"`        // linux, python, code, webapp, file, claude
	Priority    string   `json:"priority"`    // immediate, deferred, claude-assisted
	Suggestions []string `json:"suggestions,omitempty"`
	Description string   `json:"description,omitempty"`

	// From intelligent_command_processor.go
	Confidence    float64 `json:"confidence"`
	RequiresDocker bool   `json:"requires_docker"`
	Complexity    int     `json:"complexity"`
	EstimatedTime int     `json:"estimated_time"`
	Framework     string  `json:"framework,omitempty"`
}

// ExecutionResult represents command execution result
type ExecutionResult struct {
	Success    bool   `json:"success"`
	Output     string `json:"output"`
	Error      string `json:"error,omitempty"`
	ExitCode   int    `json:"exit_code"`
	Duration   int64  `json:"duration"`
	CommandType string `json:"command_type"`
}

// PreviewManager handles preview-related operations
// Unified from enhanced_execution_handler.go and preview_manager.go
type PreviewManager struct {
	// Fields from preview_manager.go
	Sessions        map[string]*PreviewSession
	mu              sync.RWMutex
	previewRegistry map[string]*PreviewInfo

	// Fields from enhanced_execution_handler.go
	previewPorts  []int
	activeWebApps map[int]string
}

// PreviewSession represents a preview session
type PreviewSession struct {
	ID        string
	Type      string
	URL       string
	CreatedAt time.Time
}

// PreviewInfo contains preview information
type PreviewInfo struct {
	SessionKey string
	Type       string
	URL        string
	FilePath   string
	CreatedAt  time.Time
}

// WandBIntegration represents W&B integration configuration
type WandBIntegration struct {
	APIKey      string
	Entity      string
	Project     string
	ProjectName string
	Enabled     bool
	RunID       string
	mutex       sync.RWMutex
}

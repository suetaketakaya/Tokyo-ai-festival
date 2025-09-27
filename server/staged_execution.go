package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

// StagedExecutor handles staged execution with progress updates
type StagedExecutor struct {
	projectID string
	wsConn    *websocket.Conn
	context   context.Context
	cancel    context.CancelFunc
}

// ExecutionStage represents different stages of execution
type ExecutionStage string

const (
	StageAnalyzing  ExecutionStage = "analyzing"
	StageGenerating ExecutionStage = "generating"
	StageExecuting  ExecutionStage = "executing"
	StagePreviewing ExecutionStage = "previewing"
	StageCompleted  ExecutionStage = "completed"
	StageError      ExecutionStage = "error"
)

// ProgressMessage represents a progress update
type ProgressMessage struct {
	Type      string `json:"type"`
	Data      ProgressData `json:"data"`
	Timestamp int64  `json:"timestamp"`
}

type ProgressData struct {
	Stage         ExecutionStage `json:"stage"`
	Progress      int           `json:"progress"`
	Message       string        `json:"message"`
	EstimatedTime int           `json:"estimated_time,omitempty"`
	Details       interface{}   `json:"details,omitempty"`
}

// ExecutionResult holds the final result
type ExecutionResult struct {
	Success      bool        `json:"success"`
	Output       string      `json:"output"`
	ErrorMessage string      `json:"error,omitempty"`
	FilesCreated []string    `json:"files_created,omitempty"`
	Previews     []Preview   `json:"previews,omitempty"`
}

type Preview struct {
	Type string `json:"type"`
	URL  string `json:"url"`
	Path string `json:"path"`
}

// NewStagedExecutor creates a new staged executor
func NewStagedExecutor(projectID string, wsConn *websocket.Conn) *StagedExecutor {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)

	return &StagedExecutor{
		projectID: projectID,
		wsConn:    wsConn,
		context:   ctx,
		cancel:    cancel,
	}
}

// ExecuteStaged performs staged execution with progress updates
func (se *StagedExecutor) ExecuteStaged(command string) (*ExecutionResult, error) {
	defer se.cancel()

	log.Printf("🚀 Starting staged execution for project %s", se.projectID)

	// Stage 1: Analyzing (5-10 seconds)
	if err := se.sendProgress(StageAnalyzing, 0, "要求を分析し、実行計画を作成中...", 10); err != nil {
		return nil, err
	}

	analysis, err := se.analyzeCommand(command)
	if err != nil {
		se.sendError("分析段階でエラーが発生しました", err)
		return nil, err
	}

	// Stage 2: Generating (20-30 seconds)
	if err := se.sendProgress(StageGenerating, 25, "コードを生成中...", 30); err != nil {
		return nil, err
	}

	generatedCode, err := se.generateCode(analysis)
	if err != nil {
		se.sendError("コード生成段階でエラーが発生しました", err)
		return nil, err
	}

	// Send code generation result
	se.sendCodeGenerated(generatedCode)

	// Stage 3: Executing (30-60 seconds)
	if err := se.sendProgress(StageExecuting, 50, "コードを実行中...", 60); err != nil {
		return nil, err
	}

	executionResult, err := se.executeCode(generatedCode)
	if err != nil {
		se.sendError("実行段階でエラーが発生しました", err)
		return nil, err
	}

	// Stage 4: Previewing (10-15 seconds)
	if err := se.sendProgress(StagePreviewing, 75, "プレビューを生成中...", 15); err != nil {
		return nil, err
	}

	previews, err := se.generatePreviews(executionResult)
	if err != nil {
		log.Printf("⚠️ Preview generation failed: %v", err)
		// Continue without previews - not a critical failure
	}

	// Stage 5: Completed
	if err := se.sendProgress(StageCompleted, 100, "実行完了", 0); err != nil {
		return nil, err
	}

	result := &ExecutionResult{
		Success:      true,
		Output:       executionResult.Output,
		FilesCreated: executionResult.FilesCreated,
		Previews:     previews,
	}

	se.sendFinalResult(result)
	log.Printf("✅ Staged execution completed successfully for project %s", se.projectID)

	return result, nil
}

// sendProgress sends a progress update to the client
func (se *StagedExecutor) sendProgress(stage ExecutionStage, progress int, message string, estimatedTime int) error {
	progressMsg := ProgressMessage{
		Type: "execution_progress",
		Data: ProgressData{
			Stage:         stage,
			Progress:      progress,
			Message:       message,
			EstimatedTime: estimatedTime,
		},
		Timestamp: time.Now().Unix(),
	}

	return se.wsConn.WriteJSON(progressMsg)
}

// sendError sends an error message to the client
func (se *StagedExecutor) sendError(message string, err error) {
	errorMsg := map[string]interface{}{
		"type": "execution_error",
		"data": map[string]interface{}{
			"stage":   StageError,
			"message": message,
			"error":   err.Error(),
		},
		"timestamp": time.Now().Unix(),
	}

	se.wsConn.WriteJSON(errorMsg)
}

// sendCodeGenerated sends the generated code to the client
func (se *StagedExecutor) sendCodeGenerated(code GeneratedCode) {
	codeMsg := map[string]interface{}{
		"type": "code_generated",
		"data": map[string]interface{}{
			"stage":           StageGenerating,
			"code":            code.Content,
			"files":           code.Files,
			"estimated_runtime": code.EstimatedRuntime,
		},
		"timestamp": time.Now().Unix(),
	}

	se.wsConn.WriteJSON(codeMsg)
}

// sendFinalResult sends the final execution result
func (se *StagedExecutor) sendFinalResult(result *ExecutionResult) {
	resultMsg := map[string]interface{}{
		"type": "execution_completed",
		"data": result,
		"timestamp": time.Now().Unix(),
	}

	se.wsConn.WriteJSON(resultMsg)
}

// analyzeCommand analyzes the command and creates execution plan
func (se *StagedExecutor) analyzeCommand(command string) (CommandAnalysis, error) {
	// Simulate analysis time
	time.Sleep(3 * time.Second)

	// Check if cancelled
	select {
	case <-se.context.Done():
		return CommandAnalysis{}, fmt.Errorf("execution cancelled")
	default:
	}

	analysis := CommandAnalysis{
		Command:     command,
		Type:        determineCommandType(command),
		Complexity:  estimateComplexity(command),
		Language:    detectLanguage(command),
		Framework:   detectFramework(command),
		RequiredTools: getRequiredTools(command),
	}

	log.Printf("📊 Command analysis completed: %+v", analysis)
	return analysis, nil
}

// generateCode generates code based on analysis
func (se *StagedExecutor) generateCode(analysis CommandAnalysis) (GeneratedCode, error) {
	// Simulate code generation time
	time.Sleep(5 * time.Second)

	// Check if cancelled
	select {
	case <-se.context.Done():
		return GeneratedCode{}, fmt.Errorf("execution cancelled")
	default:
	}

	// Send intermediate progress
	se.sendProgress(StageGenerating, 35, "コード構造を設計中...", 20)
	time.Sleep(2 * time.Second)

	se.sendProgress(StageGenerating, 45, "コードを生成中...", 10)
	time.Sleep(3 * time.Second)

	code := GeneratedCode{
		Content:          generateCodeContent(analysis),
		Files:           []string{"generated_script.py", "requirements.txt"},
		EstimatedRuntime: estimateRuntime(analysis),
	}

	log.Printf("📝 Code generation completed: %d characters", len(code.Content))
	return code, nil
}

// executeCode executes the generated code
func (se *StagedExecutor) executeCode(code GeneratedCode) (CodeExecutionResult, error) {
	// Get docker manager for actual execution
	dm := NewDockerManager("/tmp/projects")

	// Send intermediate progress updates
	se.sendProgress(StageExecuting, 55, "実行環境を準備中...", 50)
	time.Sleep(2 * time.Second)

	se.sendProgress(StageExecuting, 65, "コードを実行中...", 30)

	// Execute the actual command in the container
	output, err := dm.ExecuteCommand(se.projectID, code.Content)
	if err != nil {
		return CodeExecutionResult{}, fmt.Errorf("code execution failed: %v", err)
	}

	se.sendProgress(StageExecuting, 70, "実行結果を処理中...", 10)
	time.Sleep(1 * time.Second)

	result := CodeExecutionResult{
		Output:       output,
		Success:      true,
		FilesCreated: []string{}, // TODO: Detect created files
		ExecutionTime: time.Second * 5,
	}

	log.Printf("⚡ Code execution completed: %d characters output", len(result.Output))
	return result, nil
}

// generatePreviews generates preview URLs for created content
func (se *StagedExecutor) generatePreviews(result CodeExecutionResult) ([]Preview, error) {
	time.Sleep(2 * time.Second)

	// Check if cancelled
	select {
	case <-se.context.Done():
		return nil, fmt.Errorf("execution cancelled")
	default:
	}

	var previews []Preview

	// Check for Jupyter files
	if containsJupyterContent(result.Output) {
		previews = append(previews, Preview{
			Type: "jupyter",
			URL:  fmt.Sprintf("http://localhost:8888/tree?project=%s", se.projectID),
			Path: "/workspace",
		})
	}

	// Check for web applications
	if containsWebContent(result.Output) {
		previews = append(previews, Preview{
			Type: "web",
			URL:  fmt.Sprintf("http://localhost:3000?project=%s", se.projectID),
			Path: "/workspace",
		})
	}

	// Check for image files
	if containsImageContent(result.Output) {
		previews = append(previews, Preview{
			Type: "image",
			URL:  fmt.Sprintf("http://localhost:8888/files/output.png?project=%s", se.projectID),
			Path: "/workspace/output.png",
		})
	}

	log.Printf("🖼️ Generated %d previews", len(previews))
	return previews, nil
}

// Supporting types and functions

type CommandAnalysis struct {
	Command       string   `json:"command"`
	Type          string   `json:"type"`
	Complexity    string   `json:"complexity"`
	Language      string   `json:"language"`
	Framework     string   `json:"framework"`
	RequiredTools []string `json:"required_tools"`
}

type GeneratedCode struct {
	Content          string   `json:"content"`
	Files           []string `json:"files"`
	EstimatedRuntime int      `json:"estimated_runtime"`
}

type CodeExecutionResult struct {
	Output        string        `json:"output"`
	Success       bool          `json:"success"`
	FilesCreated  []string      `json:"files_created"`
	ExecutionTime time.Duration `json:"execution_time"`
}

func determineCommandType(command string) string {
	// Simple command type detection
	if contains(command, "plot") || contains(command, "matplotlib") {
		return "visualization"
	}
	if contains(command, "web") || contains(command, "app") {
		return "web_app"
	}
	if contains(command, "data") || contains(command, "analysis") {
		return "data_analysis"
	}
	return "general"
}

func estimateComplexity(command string) string {
	if len(command) > 200 {
		return "high"
	}
	if len(command) > 100 {
		return "medium"
	}
	return "low"
}

func detectLanguage(command string) string {
	if contains(command, "python") || contains(command, "pip") {
		return "python"
	}
	if contains(command, "node") || contains(command, "npm") {
		return "javascript"
	}
	return "python" // default
}

func detectFramework(command string) string {
	if contains(command, "flask") {
		return "flask"
	}
	if contains(command, "streamlit") {
		return "streamlit"
	}
	if contains(command, "jupyter") {
		return "jupyter"
	}
	return "standard"
}

func getRequiredTools(command string) []string {
	tools := []string{}
	if contains(command, "matplotlib") {
		tools = append(tools, "matplotlib")
	}
	if contains(command, "pandas") {
		tools = append(tools, "pandas")
	}
	if contains(command, "numpy") {
		tools = append(tools, "numpy")
	}
	return tools
}

func generateCodeContent(analysis CommandAnalysis) string {
	// This would typically call Claude API to generate actual code
	// For now, return a simple template
	return fmt.Sprintf(`# Generated code based on: %s
import sys
import os

def main():
    print("Executing: %s")
    # Generated implementation here
    return "Success"

if __name__ == "__main__":
    result = main()
    print(f"Result: {result}")
`, analysis.Command, analysis.Command)
}

func estimateRuntime(analysis CommandAnalysis) int {
	switch analysis.Complexity {
	case "high":
		return 60
	case "medium":
		return 30
	default:
		return 15
	}
}

func containsJupyterContent(output string) bool {
	return contains(output, ".ipynb") || contains(output, "jupyter")
}

func containsWebContent(output string) bool {
	return contains(output, "http://") || contains(output, "web") || contains(output, "app")
}

func containsImageContent(output string) bool {
	return contains(output, ".png") || contains(output, ".jpg") || contains(output, "plot")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		   (s == substr ||
		    s[:len(substr)] == substr ||
		    s[len(s)-len(substr):] == substr ||
		    containsSubstring(s, substr))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
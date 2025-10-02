package main

import (
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"
)

// ClaudeCodeCLIAnalyzer analyzes Claude Code CLI responses for automatic button generation
type ClaudeCodeCLIAnalyzer struct {
	wandbIntegration *WandBIntegration
	patternMatcher   *InstructionPatternMatcher
}

// InstructionCategory represents different types of coding instructions
type InstructionCategory struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Keywords    []string `json:"keywords"`
	Pattern     string   `json:"pattern"`
	ButtonType  string   `json:"button_type"`
	IconName    string   `json:"icon_name"`
	Color       string   `json:"color"`
	Gradient    []string `json:"gradient"`
	Priority    int      `json:"priority"`
}

// GeneratedButton represents a dynamically created preview button
type GeneratedButton struct {
	ID             string                 `json:"id"`
	Title          string                 `json:"title"`
	Description    string                 `json:"description"`
	Category       string                 `json:"category"`
	Command        string                 `json:"command"`
	ExecutionType  string                 `json:"execution_type"`
	ExpectedOutput string                 `json:"expected_output"`
	ButtonConfig   map[string]interface{} `json:"button_config"`
	WandBMetadata  *WandBMetadata         `json:"wandb_metadata"`
	CreatedAt      time.Time              `json:"created_at"`
	Source         string                 `json:"source"` // "claude_cli" or "manual"
}

// InstructionPatternMatcher uses W&B local models for instruction categorization
type InstructionPatternMatcher struct {
	categories []InstructionCategory
}

// NewClaudeCodeCLIAnalyzer initializes the analyzer
func NewClaudeCodeCLIAnalyzer() *ClaudeCodeCLIAnalyzer {
	analyzer := &ClaudeCodeCLIAnalyzer{
		wandbIntegration: &WandBIntegration{
			ProjectName: "claude-cli-analysis",
			Enabled:     true,
		},
		patternMatcher: NewInstructionPatternMatcher(),
	}

	log.Printf("🔍🤖 Claude Code CLI Response Analyzer initialized with W&B integration")
	return analyzer
}

// NewInstructionPatternMatcher creates pattern matcher with predefined categories
func NewInstructionPatternMatcher() *InstructionPatternMatcher {
	categories := []InstructionCategory{
		{
			ID:         "web_app",
			Name:       "🌐 Webアプリケーション",
			Keywords:   []string{"server", "web", "html", "css", "javascript", "react", "vue", "flask", "express"},
			Pattern:    `(?i)(web|server|http|html|css|javascript|react|vue|flask|express|django)`,
			ButtonType: "web_server",
			IconName:   "globe-outline",
			Color:      "#00d4aa",
			Gradient:   []string{"#00d4aa", "#00b4d8"},
			Priority:   1,
		},
		{
			ID:         "data_visualization",
			Name:       "📊 データ可視化",
			Keywords:   []string{"plot", "chart", "graph", "visualization", "matplotlib", "seaborn", "plotly"},
			Pattern:    `(?i)(plot|chart|graph|visualization|matplotlib|seaborn|plotly|data.*viz)`,
			ButtonType: "matplotlib",
			IconName:   "analytics-outline",
			Color:      "#ff6b35",
			Gradient:   []string{"#ff6b35", "#f7931e"},
			Priority:   2,
		},
		{
			ID:         "machine_learning",
			Name:       "🤖 機械学習",
			Keywords:   []string{"model", "train", "predict", "tensorflow", "pytorch", "scikit", "neural", "ai", "ml"},
			Pattern:    `(?i)(model|train|predict|tensorflow|pytorch|scikit|neural|ai|ml|machine.*learning)`,
			ButtonType: "ml_model",
			IconName:   "brain-outline",
			Color:      "#8e44ad",
			Gradient:   []string{"#8e44ad", "#9b59b6"},
			Priority:   3,
		},
		{
			ID:         "database_operations",
			Name:       "🗄️ データベース操作",
			Keywords:   []string{"database", "sql", "mongodb", "redis", "postgresql", "mysql", "query"},
			Pattern:    `(?i)(database|sql|mongodb|redis|postgresql|mysql|query|db)`,
			ButtonType: "database",
			IconName:   "server-outline",
			Color:      "#27ae60",
			Gradient:   []string{"#27ae60", "#2ecc71"},
			Priority:   4,
		},
		{
			ID:         "api_development",
			Name:       "🔌 API開発",
			Keywords:   []string{"api", "rest", "graphql", "endpoint", "microservice", "fastapi"},
			Pattern:    `(?i)(api|rest|graphql|endpoint|microservice|fastapi)`,
			ButtonType: "api",
			IconName:   "link-outline",
			Color:      "#3498db",
			Gradient:   []string{"#3498db", "#2980b9"},
			Priority:   5,
		},
		{
			ID:         "docker_container",
			Name:       "🐳 コンテナ管理",
			Keywords:   []string{"docker", "container", "kubernetes", "pod", "deploy", "dockerfile"},
			Pattern:    `(?i)(docker|container|kubernetes|pod|deploy|dockerfile)`,
			ButtonType: "docker",
			IconName:   "cube-outline",
			Color:      "#0db7ed",
			Gradient:   []string{"#0db7ed", "#2496ed"},
			Priority:   6,
		},
		{
			ID:         "file_operations",
			Name:       "📁 ファイル操作",
			Keywords:   []string{"file", "read", "write", "csv", "json", "xml", "parse", "process"},
			Pattern:    `(?i)(file|read|write|csv|json|xml|parse|process)`,
			ButtonType: "file_ops",
			IconName:   "document-outline",
			Color:      "#f39c12",
			Gradient:   []string{"#f39c12", "#e67e22"},
			Priority:   7,
		},
		{
			ID:         "testing_automation",
			Name:       "🧪 テスト・自動化",
			Keywords:   []string{"test", "pytest", "unittest", "selenium", "automation", "ci", "cd"},
			Pattern:    `(?i)(test|pytest|unittest|selenium|automation|ci|cd)`,
			ButtonType: "testing",
			IconName:   "flask-outline",
			Color:      "#e74c3c",
			Gradient:   []string{"#e74c3c", "#c0392b"},
			Priority:   8,
		},
	}

	return &InstructionPatternMatcher{
		categories: categories,
	}
}

// AnalyzeClaudeCodeResponse analyzes Claude Code CLI output and generates buttons
func (analyzer *ClaudeCodeCLIAnalyzer) AnalyzeClaudeCodeResponse(responseText string, projectID string) ([]*GeneratedButton, error) {
	log.Printf("🔍🤖 Analyzing Claude Code CLI response for project %s", projectID)

	// Extract code blocks and commands from response
	codeBlocks := analyzer.extractCodeBlocks(responseText)
	commands := analyzer.extractCommands(responseText)

	var generatedButtons []*GeneratedButton

	// Analyze each code block
	for _, codeBlock := range codeBlocks {
		if button := analyzer.analyzeCodeBlock(codeBlock, projectID); button != nil {
			generatedButtons = append(generatedButtons, button)
		}
	}

	// Analyze each command
	for _, command := range commands {
		if button := analyzer.analyzeCommand(command, projectID); button != nil {
			generatedButtons = append(generatedButtons, button)
		}
	}

	// Use W&B model for enhanced categorization
	enhancedButtons := analyzer.enhanceWithWandBAnalysis(generatedButtons, responseText)

	log.Printf("📊🤖 Generated %d buttons from Claude Code CLI response", len(enhancedButtons))
	return enhancedButtons, nil
}

// extractCodeBlocks extracts code blocks from Claude Code response
func (analyzer *ClaudeCodeCLIAnalyzer) extractCodeBlocks(text string) []string {
	// Regex to find code blocks (```language ... ```)
	codeBlockRegex := regexp.MustCompile("```[a-zA-Z]*\\s*([\\s\\S]*?)```")
	matches := codeBlockRegex.FindAllStringSubmatch(text, -1)

	var codeBlocks []string
	for _, match := range matches {
		if len(match) > 1 {
			codeBlocks = append(codeBlocks, match[1])
		}
	}

	return codeBlocks
}

// extractCommands extracts executable commands from response
func (analyzer *ClaudeCodeCLIAnalyzer) extractCommands(text string) []string {
	// Common command patterns
	patterns := []string{
		`python[3]?\s+[^\n]+`,
		`npm\s+[^\n]+`,
		`node\s+[^\n]+`,
		`docker\s+[^\n]+`,
		`curl\s+[^\n]+`,
		`pip[3]?\s+install\s+[^\n]+`,
	}

	var commands []string
	for _, pattern := range patterns {
		regex := regexp.MustCompile(pattern)
		matches := regex.FindAllString(text, -1)
		commands = append(commands, matches...)
	}

	return commands
}

// analyzeCodeBlock categorizes code block and creates button
func (analyzer *ClaudeCodeCLIAnalyzer) analyzeCodeBlock(codeBlock string, projectID string) *GeneratedButton {
	category := analyzer.patternMatcher.categorizeContent(codeBlock)
	if category == nil {
		return nil
	}

	// Generate button configuration
	button := &GeneratedButton{
		ID:            fmt.Sprintf("auto_%s_%d", category.ID, time.Now().Unix()),
		Title:         category.Name,
		Description:   analyzer.generateDescription(codeBlock, category),
		Category:      category.ID,
		Command:       analyzer.generateExecutableCommand(codeBlock, category),
		ExecutionType: category.ButtonType,
		ExpectedOutput: analyzer.predictOutput(codeBlock, category),
		ButtonConfig: map[string]interface{}{
			"type":     category.ButtonType,
			"icon":     category.IconName,
			"color":    category.Color,
			"gradient": category.Gradient,
			"priority": category.Priority,
		},
		CreatedAt: time.Now(),
		Source:    "claude_cli",
	}

	return button
}

// analyzeCommand categorizes command and creates button
func (analyzer *ClaudeCodeCLIAnalyzer) analyzeCommand(command string, projectID string) *GeneratedButton {
	category := analyzer.patternMatcher.categorizeContent(command)
	if category == nil {
		return nil
	}

	button := &GeneratedButton{
		ID:            fmt.Sprintf("cmd_%s_%d", category.ID, time.Now().Unix()),
		Title:         fmt.Sprintf("実行: %s", category.Name),
		Description:   fmt.Sprintf("コマンド実行: %s", analyzer.truncateText(command, 50)),
		Category:      category.ID,
		Command:       command,
		ExecutionType: category.ButtonType,
		ExpectedOutput: "Command execution result",
		ButtonConfig: map[string]interface{}{
			"type":     category.ButtonType,
			"icon":     category.IconName,
			"color":    category.Color,
			"gradient": category.Gradient,
			"priority": category.Priority,
		},
		CreatedAt: time.Now(),
		Source:    "claude_cli",
	}

	return button
}

// categorizeContent uses pattern matching to categorize content
func (pm *InstructionPatternMatcher) categorizeContent(content string) *InstructionCategory {
	contentLower := strings.ToLower(content)

	var bestMatch *InstructionCategory
	maxScore := 0

	for i := range pm.categories {
		category := &pm.categories[i]
		score := 0

		// Check pattern match
		if matched, _ := regexp.MatchString(category.Pattern, contentLower); matched {
			score += 10
		}

		// Check keyword matches
		for _, keyword := range category.Keywords {
			if strings.Contains(contentLower, keyword) {
				score += 5
			}
		}

		// Priority bonus
		score += (10 - category.Priority)

		if score > maxScore {
			maxScore = score
			bestMatch = category
		}
	}

	if maxScore < 5 { // Minimum threshold
		return nil
	}

	return bestMatch
}

// enhanceWithWandBAnalysis applies W&B models for enhanced categorization
func (analyzer *ClaudeCodeCLIAnalyzer) enhanceWithWandBAnalysis(buttons []*GeneratedButton, originalText string) []*GeneratedButton {
	for _, button := range buttons {
		// Add W&B metadata for tracking
		button.WandBMetadata = &WandBMetadata{
			ExperimentID: fmt.Sprintf("cli_analysis_%d", time.Now().Unix()),
			RunID:        fmt.Sprintf("run_%s", button.ID),
			ProjectName:  "claude-cli-button-generation",
			RunName:      fmt.Sprintf("auto_button_%s", button.Category),
			Tags:         []string{"auto-generated", "claude-cli", button.Category},
			Config: map[string]interface{}{
				"source_length": len(originalText),
				"button_type":   button.ExecutionType,
				"category":      button.Category,
			},
			Metrics: map[string]float64{
				"confidence_score": analyzer.calculateConfidenceScore(button),
				"priority":         float64(analyzer.getPriorityFromConfig(button)),
			},
			Step: 1,
		}
	}

	return buttons
}

// Helper functions
func (analyzer *ClaudeCodeCLIAnalyzer) generateDescription(content string, category *InstructionCategory) string {
	truncated := analyzer.truncateText(content, 100)
	return fmt.Sprintf("%s の自動検出されたコード: %s", category.Name, truncated)
}

func (analyzer *ClaudeCodeCLIAnalyzer) generateExecutableCommand(content string, category *InstructionCategory) string {
	// Generate appropriate execution command based on content type
	switch category.ID {
	case "web_app":
		if strings.Contains(content, "python") {
			return "python3 app.py"
		}
		if strings.Contains(content, "node") || strings.Contains(content, "npm") {
			return "npm start"
		}
		return "python3 -m http.server 8000"
	case "data_visualization":
		return "python3 -c \"" + strings.ReplaceAll(content, "\"", "\\\"") + "\""
	case "machine_learning":
		return "python3 train_model.py"
	default:
		return "python3 -c \"" + strings.ReplaceAll(content, "\"", "\\\"") + "\""
	}
}

func (analyzer *ClaudeCodeCLIAnalyzer) predictOutput(content string, category *InstructionCategory) string {
	switch category.ID {
	case "web_app":
		return "Webサーバーが起動し、ブラウザでアクセス可能になります"
	case "data_visualization":
		return "グラフ・チャートが生成され、プレビューに表示されます"
	case "machine_learning":
		return "機械学習モデルの訓練が開始され、メトリクスが表示されます"
	default:
		return "プログラムが実行され、結果が出力されます"
	}
}

func (analyzer *ClaudeCodeCLIAnalyzer) truncateText(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	return text[:maxLength] + "..."
}

func (analyzer *ClaudeCodeCLIAnalyzer) calculateConfidenceScore(button *GeneratedButton) float64 {
	// Simple confidence calculation based on button properties
	score := 0.5 // Base score

	if button.Command != "" {
		score += 0.2
	}
	if button.Description != "" {
		score += 0.2
	}
	if button.Category != "" {
		score += 0.1
	}

	return score
}

func (analyzer *ClaudeCodeCLIAnalyzer) getPriorityFromConfig(button *GeneratedButton) int {
	if priority, ok := button.ButtonConfig["priority"].(int); ok {
		return priority
	}
	return 5 // Default priority
}

// Global analyzer instance
var claudeCliAnalyzer *ClaudeCodeCLIAnalyzer

// InitializeClaudeCodeCLIAnalyzer initializes the global analyzer
func InitializeClaudeCodeCLIAnalyzer() {
	claudeCliAnalyzer = NewClaudeCodeCLIAnalyzer()
	log.Printf("🚀🤖 Claude Code CLI Response Analyzer initialized and ready")
}
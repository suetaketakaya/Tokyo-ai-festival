package main

import (
	"fmt"
	"strings"
)

// Command Router for unified command processing
type CommandRouter struct {
	prefixMap map[string]CommandHandler
}

type CommandHandler interface {
	Execute(s *Server, projectID, command, context string) (string, error)
	GetDescription() string
}

// Code Execution Handler
type CodeExecutionHandler struct{}

func (h *CodeExecutionHandler) Execute(s *Server, projectID, command, context string) (string, error) {
	// Remove "code:" prefix and execute as shell command
	actualCommand := strings.TrimSpace(strings.TrimPrefix(command, "code:"))
	return s.dockerManager.ExecuteCommand(projectID, actualCommand)
}

func (h *CodeExecutionHandler) GetDescription() string {
	return "Execute shell commands and code directly in the container"
}

// Enhanced Claude CLI Handler
type ClaudeHandler struct{}

func (h *ClaudeHandler) Execute(s *Server, projectID, command, context string) (string, error) {
	// Special handling for claude --help command
	if strings.Contains(strings.ToLower(command), "claude") && strings.Contains(strings.ToLower(command), "help") {
		return generateContextualHelp("en"), nil
	}
	
	// Generate enhanced Claude response
	return generateEnhancedClaudeResponse(command, context), nil
}

func (h *ClaudeHandler) GetDescription() string {
	return "Natural language conversation with Claude AI assistant"
}

// File Operation Handler
type FileHandler struct{}

func (h *FileHandler) Execute(s *Server, projectID, command, context string) (string, error) {
	// Remove "file:" prefix
	fileCommand := strings.TrimSpace(strings.TrimPrefix(command, "file:"))
	parts := strings.Fields(fileCommand)
	
	if len(parts) < 2 {
		return "❌ File command format: file:[read|write|create|list] <filename> [content]", fmt.Errorf("invalid file command")
	}
	
	operation := parts[0]
	filename := parts[1]
	
	switch operation {
	case "read":
		return s.dockerManager.ExecuteCommand(projectID, fmt.Sprintf("cat %s", filename))
	case "list", "ls":
		return s.dockerManager.ExecuteCommand(projectID, "ls -la")
	case "create", "write":
		if len(parts) < 3 {
			return "❌ Write command needs content: file:write <filename> <content>", fmt.Errorf("missing content")
		}
		content := strings.Join(parts[2:], " ")
		return s.dockerManager.ExecuteCommand(projectID, fmt.Sprintf("echo '%s' > %s", content, filename))
	default:
		return fmt.Sprintf("❌ Unknown file operation: %s", operation), fmt.Errorf("unknown operation")
	}
}

func (h *FileHandler) GetDescription() string {
	return "File operations: file:[read|write|create|list] <filename> [content]"
}

// Git Operation Handler  
type GitHandler struct{}

func (h *GitHandler) Execute(s *Server, projectID, command, context string) (string, error) {
	// Remove "git:" prefix
	gitCommand := strings.TrimSpace(strings.TrimPrefix(command, "git:"))
	return s.dockerManager.ExecuteCommand(projectID, fmt.Sprintf("git %s", gitCommand))
}

func (h *GitHandler) GetDescription() string {
	return "Git operations: git:<git-command>"
}

// Docker Operation Handler
type DockerInfoHandler struct{}

func (h *DockerInfoHandler) Execute(s *Server, projectID, command, context string) (string, error) {
	// Remove "info:" prefix
	infoCommand := strings.TrimSpace(strings.TrimPrefix(command, "info:"))
	
	switch infoCommand {
	case "status":
		return s.dockerManager.ExecuteCommand(projectID, "ps aux | head -10")
	case "disk":
		return s.dockerManager.ExecuteCommand(projectID, "df -h")
	case "memory":
		return s.dockerManager.ExecuteCommand(projectID, "free -h")
	case "env":
		return s.dockerManager.ExecuteCommand(projectID, "env")
	default:
		return s.dockerManager.ExecuteCommand(projectID, "uname -a && whoami && pwd")
	}
}

func (h *DockerInfoHandler) GetDescription() string {
	return "Container info: info:[status|disk|memory|env]"
}

// Help Handler
type HelpHandler struct{}

func (h *HelpHandler) Execute(s *Server, projectID, command, context string) (string, error) {
	var help strings.Builder
	
	help.WriteString("🚀 RemoteClaude Command System - Enhanced UX\n")
	help.WriteString("==========================================\n\n")
	help.WriteString("📋 Available Command Prefixes:\n\n")
	
	router := NewCommandRouter()
	for prefix, handler := range router.prefixMap {
		help.WriteString(fmt.Sprintf("🔸 %s - %s\n", prefix, handler.GetDescription()))
	}
	
	help.WriteString("\n📝 Examples:\n")
	help.WriteString("• code: ls -la                    # Execute shell command\n")
	help.WriteString("• code: python hello.py           # Run Python script\n")
	help.WriteString("• file:read README.md             # Read file contents\n")
	help.WriteString("• file:write test.py print('Hi')  # Create file with content\n")
	help.WriteString("• git: status                     # Git command\n")
	help.WriteString("• info:disk                       # Check disk usage\n")
	help.WriteString("• help:                           # Show this help\n")
	help.WriteString("• PythonでWebアプリを作って          # Natural language (no prefix)\n")
	help.WriteString("• Create a React component        # Natural language (no prefix)\n\n")
	
	help.WriteString("💡 Tips:\n")
	help.WriteString("• No prefix = Claude AI conversation\n")
	help.WriteString("• Prefixes enable direct system access\n")
	help.WriteString("• Commands are case-insensitive\n")
	help.WriteString("• Japanese and English supported\n")
	
	return help.String(), nil
}

func (h *HelpHandler) GetDescription() string {
	return "Show command help and usage examples"
}

// Initialize Command Router
func NewCommandRouter() *CommandRouter {
	router := &CommandRouter{
		prefixMap: make(map[string]CommandHandler),
	}
	
	// Register handlers
	router.prefixMap["code:"] = &CodeExecutionHandler{}
	router.prefixMap["file:"] = &FileHandler{}  
	router.prefixMap["git:"] = &GitHandler{}
	router.prefixMap["info:"] = &DockerInfoHandler{}
	router.prefixMap["help:"] = &HelpHandler{}
	router.prefixMap["help"] = &HelpHandler{} // Allow both help: and help
	
	return router
}

// Simplified 3-pattern command processing
func (s *Server) processEnhancedCommand(projectID, command, context string) (string, error) {
	command = strings.TrimSpace(command)
	
	// Detect command type using simple 3-pattern detection
	commandType := detectCommandType(command)
	
	switch commandType {
	case "prefixed":
		// Handle prefixed commands (code:, file:, git:, info:, help:)
		router := NewCommandRouter()
		commandLower := strings.ToLower(command)
		for prefix, handler := range router.prefixMap {
			if strings.HasPrefix(commandLower, strings.ToLower(prefix)) {
				result, err := handler.Execute(s, projectID, command, context)
				if err != nil {
					return fmt.Sprintf("❌ %s command failed: %s", prefix, err.Error()), err
				}
				return result, nil
			}
		}
		fallthrough // If no prefix handler found, treat as docker
		
	case "docker":
		// Handle Quick Commands & Docker commands directly
		return s.dockerManager.ExecuteCommand(projectID, command)
		
	case "claude":
		// Handle Claude AI conversation
		claudeHandler := &ClaudeHandler{}
		return claudeHandler.Execute(s, projectID, command, context)
		
	default:
		// Default to Claude AI for unknown types
		claudeHandler := &ClaudeHandler{}
		return claudeHandler.Execute(s, projectID, command, context)
	}
}

// Simple 3-pattern command detection
func detectCommandType(command string) string {
	command = strings.TrimSpace(strings.ToLower(command))
	
	if len(command) == 0 {
		return "claude"
	}
	
	// 1. Prefixed commands (existing system)
	prefixes := []string{"code:", "file:", "git:", "info:", "help:", "help"}
	for _, prefix := range prefixes {
		if strings.HasPrefix(command, prefix) {
			return "prefixed"
		}
	}
	
	// 2. Quick Commands & Docker commands (common shell commands)
	shellCommands := []string{
		"ls", "cd", "pwd", "cat", "echo", "grep", "find", "awk", "sed",
		"mkdir", "rmdir", "rm", "cp", "mv", "chmod", "touch", "which",
		"ps", "top", "kill", "curl", "wget", "ssh", "tar", "gzip",
		"python", "node", "npm", "pip", "go", "rust", "java", "javac",
	}
	
	fields := strings.Fields(command)
	if len(fields) > 0 {
		firstWord := fields[0]
		for _, shellCmd := range shellCommands {
			if firstWord == shellCmd {
				return "docker"
			}
		}
	}
	
	// 3. Everything else goes to Claude AI
	return "claude"
}

// Generate comprehensive help message based on detected language
func generateContextualHelp(language string) string {
	if language == "ja" {
		return `🚀 RemoteClaude 拡張コマンドシステム

📋 利用可能なコマンドプレフィックス:
• code: <コマンド>     - シェルコマンドやコード実行
• file: <操作> <ファイル> - ファイル操作
• git: <gitコマンド>   - Git操作  
• info: <情報タイプ>   - コンテナ情報表示
• help: または help    - ヘルプ表示

📝 使用例:
• code: ls -la
• file:read README.md  
• git: status
• info:disk
• PythonでWebアプリを作って (プレフィックスなし)

💡 プレフィックスがない場合はClaude AIとの会話として処理されます。`
	}
	
	return `🚀 RemoteClaude Enhanced Command System

📋 Available Command Prefixes:
• code: <command>     - Execute shell commands/code
• file: <operation> <file> - File operations
• git: <git-command>  - Git operations  
• info: <info-type>   - Container information
• help: or help       - Show help

📝 Examples:
• code: ls -la
• file:read README.md  
• git: status
• info:disk
• Create a React component (no prefix)

💡 Commands without prefix are treated as Claude AI conversation.`
}
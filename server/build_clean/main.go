package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	qrcode "github.com/skip2/go-qrcode"
)

const (
	DefaultPort  = "8090"
	QRWidth      = 256
	QRHeight     = 256
)

type Server struct {
	Port            string
	Host            string
	FeedbackManager *FeedbackManager
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	port := os.Getenv("REMOTECLAUDE_PORT")
	if port == "" {
		port = DefaultPort
	}

	for i, arg := range os.Args {
		if arg == "--port" && i+1 < len(os.Args) {
			port = os.Args[i+1]
		}
	}

	// Initialize feedback manager
	feedbackManager := NewFeedbackManager("./data/user_feedback.json")

	server := &Server{
		Port:            port,
		Host:            "192.168.0.135",
		FeedbackManager: feedbackManager,
	}

	log.Printf("🚀 Starting ClaudeOps Remote Server on port %s", port)

	// Generate QR code
	sessionKey := generateSessionKey()
	url := fmt.Sprintf("ws://%s:%s/ws?key=%s", server.Host, port, sessionKey)

	qr, _ := qrcode.New(url, qrcode.Medium)
	qr.WriteFile(QRWidth, "qr-code.png")

	log.Printf("🔗 Connection URL: %s", url)
	log.Printf("🔑 Session Key: %s", sessionKey)

	// Setup WebSocket handler
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(w, r, sessionKey, server)
	})

	http.HandleFunc("/status", handleStatus)

	// Serve static HTML files from ./html/ directory
	http.Handle("/html/", http.StripPrefix("/html/", http.FileServer(http.Dir("./html"))))
	log.Printf("📁 Serving HTML files from ./html/ directory")

	bindAddr := "0.0.0.0:" + port
	log.Printf("🎯 Ready for connections on %s...", bindAddr)

	if err := http.ListenAndServe(bindAddr, nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func generateSessionKey() string {
	return fmt.Sprintf("%d", time.Now().UnixNano()%1000000000000)
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request, validKey string, server *Server) {
	_ = r.URL.Query().Get("key") // Session key validation can be added here

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("✅ Mobile app connected from: %s", r.RemoteAddr)

	// Send preview_clear message on connection to reset preview items
	log.Printf("📤 Sending preview_clear message to reset preview items")
	err = conn.WriteJSON(map[string]interface{}{
		"type": "preview_clear",
		"data": map[string]interface{}{
			"message": "Preview items cleared on server restart",
		},
	})
	if err != nil {
		log.Printf("❌ Failed to send preview_clear: %v", err)
	}

	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}

		log.Printf("📱 Received from app: %v", msg)

		msgType, _ := msg["type"].(string)

		switch msgType {
		case "ping":
			conn.WriteJSON(map[string]interface{}{
				"type": "pong",
				"data": msg["data"],
			})

		case "project_list_request":
			conn.WriteJSON(map[string]interface{}{
				"type": "project_list_response",
				"data": map[string]interface{}{
					"projects": []map[string]interface{}{
						{
							"id":           "demo-1759406078",
							"name":         "demo",
							"status":       "running",
							"container_id": "8f0bf28051d0",
							"type":         "general",
						},
					},
					"total": 1,
				},
			})

		case "claude_execute":
			handleClaudeExecute(conn, msg, server)

		case "user_feedback":
			handleUserFeedback(conn, msg, server)

		case "feedback_stats":
			handleFeedbackStats(conn, msg, server)

		case "clear_previews":
			log.Printf("📤 Manual preview clear requested")
			err := conn.WriteJSON(map[string]interface{}{
				"type": "preview_clear",
				"data": map[string]interface{}{
					"message": "Preview items cleared manually",
				},
			})
			if err != nil {
				log.Printf("❌ Failed to send preview_clear: %v", err)
			} else {
				log.Printf("✅ Sent preview_clear message")
			}
		}
	}
}

func handleClaudeExecute(conn *websocket.Conn, msg map[string]interface{}, server *Server) {
	data, _ := msg["data"].(map[string]interface{})
	command, _ := data["command"].(string)

	log.Printf("🎯 Executing command: %s", command)

	// Determine if this is a Linux command or needs code generation
	if isDirectLinuxCommand(command) {
		executeDirectCommand(conn, command, data)
	} else {
		executeWithCodeGeneration(conn, command, data, server)
	}
}

func isDirectLinuxCommand(command string) bool {
	// Check if this is a simple Linux command
	cmd := strings.TrimSpace(command)
	if len(strings.Fields(cmd)) == 0 {
		return false
	}

	directCommands := []string{
		"ls", "pwd", "cd", "cat", "echo", "mkdir", "rm", "cp", "mv",
		"grep", "find", "ps", "top", "df", "du", "free", "uname",
		"python", "python3", "python3.11", "python3.10", "python3.9",
		"node", "npm", "go", "java", "gcc", "make",
		"git", "docker", "curl", "wget", "which", "whereis",
	}

	firstWord := strings.Fields(cmd)[0]

	// Check exact match
	for _, dc := range directCommands {
		if firstWord == dc {
			return true
		}
	}

	// Check if it's a version check command (--version, -v, --help)
	if len(strings.Fields(cmd)) > 1 {
		secondWord := strings.Fields(cmd)[1]
		if secondWord == "--version" || secondWord == "-v" || secondWord == "--help" || secondWord == "-h" {
			return true
		}
	}

	return false
}

func executeDirectCommand(conn *websocket.Conn, command string, data map[string]interface{}) {
	// Send progress
	log.Printf("📤 Sending execution_progress message")
	err := conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "executing",
			"progress": 50,
			"message":  "コマンド実行中...",
		},
	})
	if err != nil {
		log.Printf("❌ Failed to send progress: %v", err)
	}

	// Get project_id from data
	projectID, _ := data["project_id"].(string)
	if projectID == "" {
		projectID = "demo-1759406078" // Default project
	}

	// Execute command via docker exec
	containerID := getContainerIDForProject(projectID)
	var output string
	var execErr error

	if containerID != "" {
		log.Printf("🐳 Executing in container %s: %s", containerID, command)
		output, execErr = executeInContainer(containerID, command)
		if execErr != nil {
			log.Printf("❌ Docker exec error: %v", execErr)
			output = fmt.Sprintf("❌ Error executing command: %v", execErr)
		}
	} else {
		log.Printf("⚠️ No container found for project %s, showing placeholder", projectID)
		output = fmt.Sprintf("Command: %s\n(Container not available - start project first)", command)
	}

	// Send result
	log.Printf("📤 Sending claude_output message (%d bytes)", len(output))
	err = conn.WriteJSON(map[string]interface{}{
		"type": "claude_output",
		"data": map[string]interface{}{
			"output":  output,
			"command": command,
			"status":  "completed",
		},
	})
	if err != nil {
		log.Printf("❌ Failed to send output: %v", err)
	} else {
		log.Printf("✅ Successfully sent claude_output")
	}
}

func getContainerIDForProject(projectID string) string {
	log.Printf("🔍 Looking for container for project: %s", projectID)

	// Extract base project name from project_id (e.g., "demo-1759406078" -> "demo")
	baseName := projectID
	if idx := strings.LastIndex(projectID, "-"); idx > 0 {
		// Check if everything after '-' is numeric (timestamp)
		suffix := projectID[idx+1:]
		isNumeric := true
		for _, c := range suffix {
			if c < '0' || c > '9' {
				isNumeric = false
				break
			}
		}
		if isNumeric && len(suffix) >= 10 { // Unix timestamp length
			baseName = projectID[:idx]
		}
	}

	log.Printf("🔍 Extracted base name: %s", baseName)

	// Try to find container by exact project_id match first
	cmd := exec.Command("docker", "ps", "-q", "--filter", "status=running", "--filter", fmt.Sprintf("name=%s", projectID))
	output, err := cmd.Output()
	if err == nil && strings.TrimSpace(string(output)) != "" {
		containerID := strings.TrimSpace(string(output))
		log.Printf("✅ Found container by project_id: %s", containerID)
		return containerID
	}

	// Try to find by base name
	cmd = exec.Command("docker", "ps", "-q", "--filter", "status=running", "--filter", fmt.Sprintf("name=%s", baseName))
	output, err = cmd.Output()
	if err == nil && strings.TrimSpace(string(output)) != "" {
		containerID := strings.TrimSpace(string(output))
		log.Printf("✅ Found container by base name: %s", containerID)
		return containerID
	}

	// Fallback: get ANY running container with remoteclaude image
	cmd = exec.Command("docker", "ps", "-q", "--filter", "status=running", "--filter", "ancestor=remoteclaude-ubuntu-claude:latest")
	output, err = cmd.Output()
	if err == nil && strings.TrimSpace(string(output)) != "" {
		containerID := strings.TrimSpace(string(output))
		log.Printf("✅ Found container by image: %s", containerID)
		return containerID
	}

	// Last resort: get any running container
	cmd = exec.Command("docker", "ps", "-q", "--filter", "status=running")
	output, err = cmd.Output()
	if err != nil {
		log.Printf("⚠️ Failed to get container ID: %v", err)
		return ""
	}

	containerID := strings.TrimSpace(string(output))
	if containerID != "" {
		// If multiple containers, take the first one
		if idx := strings.Index(containerID, "\n"); idx > 0 {
			containerID = containerID[:idx]
		}
		log.Printf("✅ Found first running container: %s", containerID)
	} else {
		log.Printf("⚠️ No running containers found")
	}

	return containerID
}

func executeInContainer(containerID, command string) (string, error) {
	// Execute command in container
	cmd := exec.Command("docker", "exec", containerID, "sh", "-c", command)
	output, err := cmd.CombinedOutput()

	// If command failed with "command not found" (exit 127), try alternatives
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 127 {
			// Try alternative commands for common cases
			altCommand := getAlternativeCommand(command)
			if altCommand != "" && altCommand != command {
				log.Printf("⚠️ Command not found, trying alternative: %s", altCommand)
				cmd = exec.Command("docker", "exec", containerID, "sh", "-c", altCommand)
				altOutput, altErr := cmd.CombinedOutput()
				if altErr == nil {
					return string(altOutput), nil
				}
			}
		}
	}

	return string(output), err
}

func getAlternativeCommand(command string) string {
	cmd := strings.TrimSpace(command)

	// Python version alternatives
	if strings.HasPrefix(cmd, "python3.11") {
		return strings.Replace(cmd, "python3.11", "python3", 1)
	}
	if strings.HasPrefix(cmd, "python3.10") {
		return strings.Replace(cmd, "python3.10", "python3", 1)
	}
	if strings.HasPrefix(cmd, "python3.9") {
		return strings.Replace(cmd, "python3.9", "python3", 1)
	}

	// Node version alternatives
	if strings.HasPrefix(cmd, "node18") || strings.HasPrefix(cmd, "node20") {
		return strings.Replace(cmd, strings.Fields(cmd)[0], "node", 1)
	}

	return ""
}

func executeWithCodeGeneration(conn *websocket.Conn, command string, data map[string]interface{}, server *Server) {
	// Stage 1: AI Analysis with Claude CLI
	log.Printf("📤 Stage 1: AI Analysis with Claude CLI")
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "analyzing",
			"progress": 10,
			"message":  "🤖 AI分析中...",
		},
	})

	// Get project path
	projectID, _ := data["project_id"].(string)
	if projectID == "" {
		projectID = "demo-1759406078"
	}
	projectPath := fmt.Sprintf("/workspace") // Container path

	// Execute Claude CLI
	cliResponse, err := ExecuteClaudeCLI(command, projectPath)
	if err != nil {
		log.Printf("❌ Claude CLI failed: %v, falling back to keyword analysis", err)
		// Fallback to existing system
		analysis := AnalyzeCommandWithScoring(command)
		cliResponse = convertAnalysisToCliResponse(analysis)
	}

	// Stage 1.5: W&B ML Enhancement (Stage 2)
	log.Printf("🧠 Stage 1.5: W&B ML Enhancement")
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "ml_enhancing",
			"progress": 20,
			"message":  "🧠 ML精度向上中...",
		},
	})

	// Enhance with W&B ML Model (92% -> 96% accuracy)
	enhancedResponse, mlErr := EnhanceClaudeResponseWithML(command, cliResponse)
	if mlErr != nil {
		log.Printf("⚠️ ML enhancement failed: %v, using Claude CLI only", mlErr)
		enhancedResponse = cliResponse
	}

	cmdType := enhancedResponse.CommandType
	framework := enhancedResponse.Framework

	log.Printf("📊 Enhanced AI Analysis: type=%s, framework=%s, confidence=%.2f",
		cmdType, framework, enhancedResponse.Confidence)

	// Stage 3: Generate Dynamic Buttons from ML prediction
	buttonGenerator := NewDynamicButtonGenerator()
	mlPrediction := &WandbMLPrediction{
		CommandType:           cmdType,
		Confidence:            enhancedResponse.Confidence,
		MLCategory:            cmdType,
		MLConfidence:          enhancedResponse.Confidence,
		CategoryProbabilities: map[string]float64{cmdType: enhancedResponse.Confidence},
	}
	dynamicButtons := buttonGenerator.GenerateButtons(mlPrediction, command)
	log.Printf("🎨 Generated %d dynamic action buttons", len(dynamicButtons))

	// Stage 2: Use AI-generated code
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "generating",
			"progress": 30,
			"message":  "🤖 AIコード生成完了",
		},
	})

	time.Sleep(300 * time.Millisecond)

	// Use ML-enhanced generated code
	code := enhancedResponse.GeneratedCode
	if code == "" {
		// Fallback: generate code using template
		log.Printf("⚠️ No code from ML/Claude, using template generation")
		code = generateCodeContent(command, cmdType, framework)
	}

	// Send generated code
	log.Printf("📤 Sending code_generated message (%d bytes)", len(code))
	conn.WriteJSON(map[string]interface{}{
		"type": "code_generated",
		"data": map[string]interface{}{
			"code": code,
		},
	})

	// Stage 3: Execution
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "executing",
			"progress": 70,
			"message":  "コード実行中...",
		},
	})

	time.Sleep(500 * time.Millisecond)

	// Execute the generated code in Docker container
	// projectID already defined above
	containerID := getContainerIDForProject(projectID)

	var output string
	var generatedFileName string

	if containerID != "" && (cmdType == "web_app" || cmdType == "visualization" || cmdType == "api" || cmdType == "machine_learning" || cmdType == "data_analysis") {
		log.Printf("🐳 Executing generated code in container %s", containerID)

		// Save and execute the script
		execCmd := fmt.Sprintf("cat > /tmp/generated_script.sh << 'EOF'\n%s\nEOF\nchmod +x /tmp/generated_script.sh\n/tmp/generated_script.sh", code)
		execOutput, err := executeInContainer(containerID, execCmd)
		output = execOutput

		if err != nil {
			log.Printf("⚠️ Execution error: %v", err)
		} else {
			log.Printf("✅ Code executed successfully")
			log.Printf("📄 Output: %s", output[:min(len(output), 200)])
		}

		// Copy HTML files from container to host for static serving
		if cmdType == "web_app" || framework == "react" {
			log.Printf("📋 Copying HTML files from container to host")
			os.MkdirAll("./html", 0755)

			// Extract filename from output
			generatedFileName = extractGeneratedFileName(output)
			log.Printf("🔍 Detected generated file: %s", generatedFileName)

			// Copy the generated HTML file from container
			copyCmd := exec.Command("docker", "cp", fmt.Sprintf("%s:/workspace/%s", containerID, generatedFileName), fmt.Sprintf("./html/%s", generatedFileName))
			if copyErr := copyCmd.Run(); copyErr != nil {
				log.Printf("⚠️ Failed to copy HTML file: %v", copyErr)
			} else {
				log.Printf("✅ HTML file copied to ./html/%s", generatedFileName)
			}
		}
	}

	// Check if preview should be shown (React/HTML static apps, not Flask)
	if (cmdType == "web_app" || framework == "react") && framework != "flask" {
		// Use extracted filename or default
		if generatedFileName == "" {
			generatedFileName = extractGeneratedFileName(output)
		}
		appType := detectWebAppType(command)

		// Generate title based on app type
		appTitle := map[string]string{
			"calculator": "Calculator App",
			"timer":      "Timer App",
			"notes":      "Notes App",
			"counter":    "Counter App",
			"quiz":       "Quiz App",
			"form":       "Form App",
			"dashboard":  "Dashboard",
			"todo":       "Todo App",
			"generic":    "Web App",
		}[appType]

		// Generate stable ID based on app type
		previewID := fmt.Sprintf("%s-app-8090", appType)

		log.Printf("📤 Sending preview_ready message for %s (%s)", appTitle, generatedFileName)
		err := conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"id":        previewID,
				"name":      generatedFileName,
				"title":     appTitle,
				"type":      "webapp",
				"path":      fmt.Sprintf("/workspace/%s", generatedFileName),
				"port":      8090,
				"url":       fmt.Sprintf("http://%s:%s/html/%s", server.Host, server.Port, generatedFileName),
				"proxy_url": fmt.Sprintf("http://%s:%s/html/%s", server.Host, server.Port, generatedFileName),
			},
		})
		if err != nil {
			log.Printf("❌ Failed to send preview_ready: %v", err)
		} else {
			log.Printf("✅ Successfully sent preview_ready for %s", appTitle)
		}
	}

	// Check if this is a visualization or machine learning command
	if cmdType == "visualization" || cmdType == "machine_learning" || cmdType == "data_analysis" {
		log.Printf("📋 Copying visualization/ML images from container to host")
		os.MkdirAll("./html/images", 0755)

		// List of possible image files to copy
		imageFiles := []string{
			"visualization.png",
			"data_analysis.png",
			"mnist_training_history.png",
			"mnist_predictions.png",
		}

		var copiedImages []string
		for _, imgFile := range imageFiles {
			copyCmd := exec.Command("docker", "cp", fmt.Sprintf("%s:/workspace/%s", containerID, imgFile), fmt.Sprintf("./html/images/%s", imgFile))
			if copyErr := copyCmd.Run(); copyErr == nil {
				log.Printf("✅ Copied image: %s", imgFile)
				copiedImages = append(copiedImages, imgFile)
			}
		}

		// Send preview_ready for each copied image
		for _, imgFile := range copiedImages {
			previewID := fmt.Sprintf("image-%s", imgFile)
			title := map[string]string{
				"visualization.png":          "Data Visualization",
				"data_analysis.png":          "Data Analysis",
				"mnist_training_history.png": "MNIST Training History",
				"mnist_predictions.png":      "MNIST Predictions",
			}[imgFile]

			if title == "" {
				title = imgFile
			}

			log.Printf("📤 Sending preview_ready for %s", imgFile)
			err := conn.WriteJSON(map[string]interface{}{
				"type": "preview_ready",
				"data": map[string]interface{}{
					"id":        previewID,
					"name":      imgFile,
					"title":     title,
					"type":      "image",
					"path":      fmt.Sprintf("/workspace/%s", imgFile),
					"url":       fmt.Sprintf("http://%s:%s/html/images/%s", server.Host, server.Port, imgFile),
					"proxy_url": fmt.Sprintf("http://%s:%s/html/images/%s", server.Host, server.Port, imgFile),
				},
			})
			if err != nil {
				log.Printf("❌ Failed to send preview_ready for %s: %v", imgFile, err)
			} else {
				log.Printf("✅ Successfully sent preview_ready for %s", imgFile)
			}
		}
	}

	// Check if this is an API command (FastAPI, Flask, etc.)
	if cmdType == "api" || framework == "fastapi" || framework == "django" {
		log.Printf("📤 Sending preview_ready message for API")
		apiPort := 8000
		if framework == "django" {
			apiPort = 8000
		}
		apiURL := fmt.Sprintf("http://%s:%d/docs", server.Host, apiPort)

		err := conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"id":        fmt.Sprintf("%s-api-%d", framework, apiPort), // Stable ID based on framework and port
				"name":      "API Documentation",
				"title":     fmt.Sprintf("%s API", strings.Title(framework)),
				"type":      "webapp",
				"path":      "/workspace",
				"port":      apiPort,
				"url":       apiURL,
				"proxy_url": apiURL,
			},
		})
		if err != nil {
			log.Printf("❌ Failed to send preview_ready: %v", err)
		} else {
			log.Printf("✅ Successfully sent preview_ready for API")
		}
	}

	// Flask Web App (not API) - separate handling
	if framework == "flask" && cmdType != "api" {
		log.Printf("📤 Sending preview_ready message for Flask Web App")
		flaskPort := 5000
		flaskURL := fmt.Sprintf("http://%s:%d/", server.Host, flaskPort)

		err := conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"id":        fmt.Sprintf("flask-%d", flaskPort), // Stable ID based on port
				"name":      "Flask Web App",
				"title":     "Flask Application",
				"type":      "webapp",
				"path":      "/workspace",
				"port":      flaskPort,
				"url":       flaskURL,
				"proxy_url": flaskURL,
			},
		})
		if err != nil {
			log.Printf("❌ Failed to send preview_ready: %v", err)
		} else {
			log.Printf("✅ Successfully sent preview_ready for Flask")
		}
	}

	// Jupyter Notebook (only for explicit jupyter commands, not ML)
	if cmdType == "jupyter" && cmdType != "machine_learning" {
		log.Printf("📤 Sending preview_ready message for Jupyter")
		err := conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"id":        "jupyter-8888",
				"name":      "Jupyter Notebook",
				"title":     "Jupyter Notebook",
				"type":      "webapp",
				"path":      "/workspace",
				"port":      8888,
				"url":       fmt.Sprintf("http://%s:8888", server.Host),
				"proxy_url": fmt.Sprintf("http://%s:8888", server.Host),
			},
		})
		if err != nil {
			log.Printf("❌ Failed to send preview_ready: %v", err)
		} else {
			log.Printf("✅ Successfully sent preview_ready for Jupyter")
		}
	}

	// Docker containers
	if cmdType == "docker" {
		log.Printf("📤 Sending preview_ready message for Docker")
		err := conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"id":    "docker-container",
				"name":  "Docker Container",
				"title": "Container Status",
				"type":  "terminal",
				"path":  "/workspace",
			},
		})
		if err != nil {
			log.Printf("❌ Failed to send preview_ready: %v", err)
		} else {
			log.Printf("✅ Successfully sent preview_ready for Docker")
		}
	}

	// Database
	if cmdType == "database" {
		log.Printf("📤 Sending preview_ready message for Database")
		err := conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"id":    "database-results",
				"name":  "Database",
				"title": "Database Query Results",
				"type":  "terminal",
				"path":  "/workspace",
			},
		})
		if err != nil {
			log.Printf("❌ Failed to send preview_ready: %v", err)
		} else {
			log.Printf("✅ Successfully sent preview_ready for Database")
		}
	}

	// Testing
	if cmdType == "testing" {
		log.Printf("📤 Sending preview_ready message for Testing")
		err := conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"id":    "test-results",
				"name":  "Test Results",
				"title": "Test Execution Results",
				"type":  "terminal",
				"path":  "/workspace",
			},
		})
		if err != nil {
			log.Printf("❌ Failed to send preview_ready: %v", err)
		} else {
			log.Printf("✅ Successfully sent preview_ready for Testing")
		}
	}

	// Data Analysis
	if cmdType == "data_analysis" {
		log.Printf("📤 Sending preview_ready message for Data Analysis")
		err := conn.WriteJSON(map[string]interface{}{
			"type": "preview_ready",
			"data": map[string]interface{}{
				"id":    "data-analysis-csv",
				"name":  "analysis_results.csv",
				"title": "Data Analysis Results",
				"type":  "file",
				"path":  "/workspace/analysis_results.csv",
			},
		})
		if err != nil {
			log.Printf("❌ Failed to send preview_ready: %v", err)
		} else {
			log.Printf("✅ Successfully sent preview_ready for Data Analysis")
		}
	}

	// Stage 4: Completion with Dynamic Buttons
	conn.WriteJSON(map[string]interface{}{
		"type": "execution_progress",
		"data": map[string]interface{}{
			"stage":    "completed",
			"progress": 100,
			"message":  "実行完了",
		},
	})

	// Send dynamic action buttons
	time.Sleep(100 * time.Millisecond)
	topButtons := buttonGenerator.GetButtonsByPriority(dynamicButtons, 6) // Top 6 buttons
	conn.WriteJSON(map[string]interface{}{
		"type": "dynamic_buttons",
		"data": map[string]interface{}{
			"buttons":  topButtons,
			"category": cmdType,
			"metadata": map[string]interface{}{
				"confidence":     enhancedResponse.Confidence,
				"ml_confidence":  enhancedResponse.Confidence,
				"command":        truncateString(command, 50),
				"framework":      framework,
				"total_buttons":  len(dynamicButtons),
				"shown_buttons":  len(topButtons),
				"generated_time": time.Now().Format(time.RFC3339),
			},
		},
	})
	log.Printf("📤 Sent %d dynamic action buttons to client", len(topButtons))
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok","mode":"local"}`))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// handleUserFeedback processes user feedback from client
func handleUserFeedback(conn *websocket.Conn, msg map[string]interface{}, server *Server) {
	data, _ := msg["data"].(map[string]interface{})

	log.Printf("📥 Received user feedback: predicted=%s, actual=%s, rating=%v",
		data["predicted_category"],
		data["actual_category"],
		data["user_rating"])

	err := server.FeedbackManager.HandleFeedbackMessage(data)
	if err != nil {
		log.Printf("❌ Failed to save feedback: %v", err)
		conn.WriteJSON(map[string]interface{}{
			"type": "feedback_error",
			"data": map[string]interface{}{
				"error": err.Error(),
			},
		})
		return
	}

	// Send confirmation
	conn.WriteJSON(map[string]interface{}{
		"type": "feedback_received",
		"data": map[string]interface{}{
			"success": true,
			"message": "フィードバックを受け付けました",
		},
	})

	// Check if retraining is needed
	if server.FeedbackManager.ShouldRetrain(20, 90.0) {
		log.Printf("🔄 Retraining threshold reached, triggering model update")
		go triggerModelRetraining(server.FeedbackManager)
	}
}

// handleFeedbackStats returns feedback statistics
func handleFeedbackStats(conn *websocket.Conn, msg map[string]interface{}, server *Server) {
	stats := server.FeedbackManager.GetStats()

	log.Printf("📊 Feedback stats requested: %d total, %.1f%% accuracy",
		stats["total_feedback"],
		stats["accuracy"])

	conn.WriteJSON(map[string]interface{}{
		"type": "feedback_stats",
		"data": stats,
	})
}

// triggerModelRetraining runs model retraining in background
func triggerModelRetraining(fm *FeedbackManager) {
	log.Printf("🔄 Starting model retraining...")

	// Export training data
	trainingFile := "./data/training_data.json"
	if err := fm.ExportToWandB(trainingFile); err != nil {
		log.Printf("❌ Failed to export training data: %v", err)
		return
	}

	// Call Python retraining script
	cmd := exec.Command("python3", "wandb_local_model.py", "--retrain", trainingFile)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ Model retraining failed: %v\nOutput: %s", err, string(output))
		return
	}

	log.Printf("✅ Model retraining completed successfully")
	log.Printf("📊 Output: %s", string(output))
}

package utils

import (
	"fmt"
	"net"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

// GetPlatformInfo returns detailed platform information
func GetPlatformInfo() map[string]string {
	info := make(map[string]string)
	
	info["os"] = runtime.GOOS
	info["arch"] = runtime.GOARCH
	info["platform"] = fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH)
	
	// Get more detailed OS info
	switch runtime.GOOS {
	case "windows":
		if output, err := exec.Command("systeminfo").Output(); err == nil {
			lines := strings.Split(string(output), "\n")
			for _, line := range lines {
				if strings.Contains(line, "OS Name:") {
					info["os_name"] = strings.TrimSpace(strings.Split(line, ":")[1])
					break
				}
			}
		}
	case "darwin":
		if output, err := exec.Command("sw_vers", "-productName").Output(); err == nil {
			info["os_name"] = strings.TrimSpace(string(output))
		}
		if output, err := exec.Command("sw_vers", "-productVersion").Output(); err == nil {
			info["os_version"] = strings.TrimSpace(string(output))
		}
	case "linux":
		if output, err := exec.Command("lsb_release", "-ds").Output(); err == nil {
			info["os_name"] = strings.TrimSpace(string(output))
		}
	}
	
	return info
}

// GetAvailablePort finds an available port starting from the given port
func GetAvailablePort(startPort int) (int, error) {
	for port := startPort; port <= startPort+100; port++ {
		if isPortAvailable(port) {
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port found in range %d-%d", startPort, startPort+100)
}

// isPortAvailable checks if a port is available
func isPortAvailable(port int) bool {
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return false
	}
	defer ln.Close()
	return true
}

// DetectDevelopmentServers scans for common development server ports
func DetectDevelopmentServers() []int {
	commonPorts := []int{3000, 3001, 4200, 5000, 5173, 8000, 8080, 8081, 9000}
	var activePorts []int
	
	for _, port := range commonPorts {
		if isPortActive(port) {
			activePorts = append(activePorts, port)
		}
	}
	
	return activePorts
}

// isPortActive checks if a port has an active server
func isPortActive(port int) bool {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("localhost:%d", port), 1*time.Second)
	if err != nil {
		return false
	}
	defer conn.Close()
	return true
}

// GetClaudeCodeInfo checks if Claude Code CLI is available
func GetClaudeCodeInfo() map[string]interface{} {
	info := make(map[string]interface{})
	
	// Check if claude command exists
	_, err := exec.LookPath("claude")
	info["installed"] = err == nil
	
	if err == nil {
		// Try to get version
		if output, err := exec.Command("claude", "--version").Output(); err == nil {
			info["version"] = strings.TrimSpace(string(output))
		}
		
		// Check if logged in
		if output, err := exec.Command("claude", "auth", "status").Output(); err == nil {
			info["authenticated"] = !strings.Contains(string(output), "not logged in")
		}
	}
	
	return info
}

// PrintSystemInfo prints comprehensive system information
func PrintSystemInfo(serverURL string, port int) {
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("🚀 RemoteClaude Server Starting...")
	fmt.Println(strings.Repeat("=", 60))
	
	// Platform info
	platformInfo := GetPlatformInfo()
	fmt.Printf("💻 Platform: %s\n", platformInfo["platform"])
	if osName, ok := platformInfo["os_name"]; ok {
		fmt.Printf("🖥️  OS: %s", osName)
		if osVersion, ok := platformInfo["os_version"]; ok {
			fmt.Printf(" %s", osVersion)
		}
		fmt.Println()
	}
	
	// Network info
	fmt.Printf("🌐 Server URL: %s\n", serverURL)
	fmt.Printf("🔗 WebSocket: %s\n", strings.Replace(serverURL, "http", "ws", 1)+"/api/ws")
	fmt.Printf("🔧 Management: %s/static/\n", serverURL)
	fmt.Printf("📱 Demo: %s/demo/\n", serverURL)
	
	// Claude info
	claudeInfo := GetClaudeCodeInfo()
	if installed, ok := claudeInfo["installed"].(bool); ok && installed {
		fmt.Printf("✅ Claude Code CLI: Installed")
		if version, ok := claudeInfo["version"].(string); ok {
			fmt.Printf(" (%s)", version)
		}
		fmt.Println()
		
		if auth, ok := claudeInfo["authenticated"].(bool); ok {
			if auth {
				fmt.Println("🔐 Authentication: ✅ Logged in")
			} else {
				fmt.Println("🔐 Authentication: ⚠️  Please run 'claude auth login'")
			}
		}
	} else {
		fmt.Println("❌ Claude Code CLI: Not installed")
		fmt.Println("💡 Install: https://claude.ai/code")
	}
	
	// Development servers
	activeServers := DetectDevelopmentServers()
	if len(activeServers) > 0 {
		fmt.Printf("🌍 Active Dev Servers: ")
		for i, port := range activeServers {
			if i > 0 {
				fmt.Print(", ")
			}
			fmt.Printf(":%d", port)
		}
		fmt.Println()
	} else {
		fmt.Println("🌍 Dev Servers: None detected")
	}
	
	fmt.Println(strings.Repeat("=", 60))
}
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Comprehensive Network & WebSocket Testing Tool
// Evaluates:
// 1. WebSocket connectivity and message flow
// 2. Port forwarding and availability
// 3. Network interface detection
// 4. Web preview functionality
// 5. Latency and performance metrics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// NetworkTestReport contains comprehensive test results
type NetworkTestReport struct {
	Timestamp          string                  `json:"timestamp"`
	TestDurationMs     int64                   `json:"test_duration_ms"`
	WebSocketTest      *WebSocketTestResult    `json:"websocket_test"`
	PortForwardingTest *PortForwardingResult   `json:"port_forwarding_test"`
	NetworkInterfaces  []NetworkInterfaceInfo  `json:"network_interfaces"`
	WebPreviewTest     *WebPreviewResult       `json:"web_preview_test"`
	PerformanceMetrics *PerformanceMetrics     `json:"performance_metrics"`
	Summary            string                  `json:"summary"`
}

// WebSocketTestResult contains WebSocket-specific test results
type WebSocketTestResult struct {
	ConnectionSuccess  bool    `json:"connection_success"`
	ConnectionTimeMs   int64   `json:"connection_time_ms"`
	MessagesSent       int     `json:"messages_sent"`
	MessagesReceived   int     `json:"messages_received"`
	AverageLatencyMs   float64 `json:"average_latency_ms"`
	Errors             []string `json:"errors"`
	ProtocolVersion    string  `json:"protocol_version"`
}

// PortForwardingResult contains port forwarding test results
type PortForwardingResult struct {
	RequestedPort      string   `json:"requested_port"`
	ActualPort         string   `json:"actual_port"`
	IsForwarded        bool     `json:"is_forwarded"`
	AccessibleFrom     []string `json:"accessible_from"`
	ExternalIP         string   `json:"external_ip"`
	InternalIP         string   `json:"internal_ip"`
}

// NetworkInterfaceInfo contains network interface details
type NetworkInterfaceInfo struct {
	Name      string   `json:"name"`
	IPAddress string   `json:"ip_address"`
	IsUp      bool     `json:"is_up"`
	IsLoopback bool    `json:"is_loopback"`
}

// WebPreviewResult contains web preview test results
type WebPreviewResult struct {
	PreviewsGenerated  int      `json:"previews_generated"`
	PreviewURLs        []string `json:"preview_urls"`
	AccessiblePreviews int      `json:"accessible_previews"`
	FailedPreviews     []string `json:"failed_previews"`
}

// PerformanceMetrics contains performance-related metrics
type PerformanceMetrics struct {
	WebSocketLatencyP50 float64 `json:"websocket_latency_p50_ms"`
	WebSocketLatencyP95 float64 `json:"websocket_latency_p95_ms"`
	WebSocketLatencyP99 float64 `json:"websocket_latency_p99_ms"`
	HTTPResponseTime    float64 `json:"http_response_time_ms"`
	TotalBytesTransferred int64 `json:"total_bytes_transferred"`
}

// NetworkTester performs comprehensive network tests
type NetworkTester struct {
	ServerURL  string
	ServerPort string
	Report     *NetworkTestReport
}

// NewNetworkTester creates a new network tester
func NewNetworkTester(serverURL, serverPort string) *NetworkTester {
	return &NetworkTester{
		ServerURL:  serverURL,
		ServerPort: serverPort,
		Report: &NetworkTestReport{
			Timestamp:          time.Now().Format(time.RFC3339),
			NetworkInterfaces:  []NetworkInterfaceInfo{},
			WebSocketTest:      &WebSocketTestResult{Errors: []string{}},
			PortForwardingTest: &PortForwardingResult{AccessibleFrom: []string{}},
			WebPreviewTest:     &WebPreviewResult{PreviewURLs: []string{}, FailedPreviews: []string{}},
			PerformanceMetrics: &PerformanceMetrics{},
		},
	}
}

// RunFullNetworkTest executes all network tests
func (nt *NetworkTester) RunFullNetworkTest() error {
	startTime := time.Now()

	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🌐 RemoteClaudeOPS Network Test Suite")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Test 1: Network Interfaces
	log.Println("\n📡 Test 1: Network Interface Discovery")
	nt.TestNetworkInterfaces()

	// Test 2: Port Forwarding
	log.Println("\n🔌 Test 2: Port Forwarding & Accessibility")
	nt.TestPortForwarding()

	// Test 3: WebSocket Communication
	log.Println("\n🔄 Test 3: WebSocket Communication")
	if err := nt.TestWebSocketCommunication(); err != nil {
		log.Printf("⚠️ WebSocket test error: %v", err)
	}

	// Test 4: Web Preview
	log.Println("\n🌐 Test 4: Web Preview Functionality")
	nt.TestWebPreview()

	// Test 5: Performance Metrics
	log.Println("\n📊 Test 5: Performance Metrics")
	nt.MeasurePerformance()

	nt.Report.TestDurationMs = time.Since(startTime).Milliseconds()
	nt.GenerateSummary()

	log.Println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("📋 Test Summary")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Printf("\n%s", nt.Report.Summary)

	return nil
}

// TestNetworkInterfaces discovers all network interfaces
func (nt *NetworkTester) TestNetworkInterfaces() {
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Printf("❌ Failed to get interfaces: %v", err)
		return
	}

	for _, iface := range interfaces {
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP.To4() == nil {
				continue
			}

			info := NetworkInterfaceInfo{
				Name:       iface.Name,
				IPAddress:  ipNet.IP.String(),
				IsUp:       iface.Flags&net.FlagUp != 0,
				IsLoopback: iface.Flags&net.FlagLoopback != 0,
			}

			nt.Report.NetworkInterfaces = append(nt.Report.NetworkInterfaces, info)
			log.Printf("  ✅ %s: %s (Up: %v, Loopback: %v)",
				info.Name, info.IPAddress, info.IsUp, info.IsLoopback)
		}
	}
}

// TestPortForwarding tests port accessibility and forwarding
func (nt *NetworkTester) TestPortForwarding() {
	nt.Report.PortForwardingTest.RequestedPort = nt.ServerPort

	// Get internal IP
	nt.Report.PortForwardingTest.InternalIP = nt.getPreferredIP()

	// Test local accessibility
	localAddr := fmt.Sprintf("127.0.0.1:%s", nt.ServerPort)
	if nt.testPortAccessibility(localAddr, 2*time.Second) {
		nt.Report.PortForwardingTest.AccessibleFrom = append(
			nt.Report.PortForwardingTest.AccessibleFrom,
			"localhost",
		)
		log.Printf("  ✅ Port %s accessible from localhost", nt.ServerPort)
	} else {
		log.Printf("  ❌ Port %s NOT accessible from localhost", nt.ServerPort)
	}

	// Test internal network accessibility
	internalAddr := fmt.Sprintf("%s:%s", nt.Report.PortForwardingTest.InternalIP, nt.ServerPort)
	if nt.testPortAccessibility(internalAddr, 2*time.Second) {
		nt.Report.PortForwardingTest.AccessibleFrom = append(
			nt.Report.PortForwardingTest.AccessibleFrom,
			"internal_network",
		)
		log.Printf("  ✅ Port %s accessible from internal network (%s)",
			nt.ServerPort, nt.Report.PortForwardingTest.InternalIP)
	}

	// Get external IP (if available)
	if externalIP := nt.getExternalIP(); externalIP != "" {
		nt.Report.PortForwardingTest.ExternalIP = externalIP
		log.Printf("  🌍 External IP: %s", externalIP)
	}

	nt.Report.PortForwardingTest.ActualPort = nt.ServerPort
	nt.Report.PortForwardingTest.IsForwarded = len(nt.Report.PortForwardingTest.AccessibleFrom) > 0
}

// TestWebSocketCommunication tests WebSocket connectivity
func (nt *NetworkTester) TestWebSocketCommunication() error {
	wsURL := nt.ServerURL
	if !strings.HasPrefix(wsURL, "ws://") && !strings.HasPrefix(wsURL, "wss://") {
		wsURL = "ws://" + wsURL
	}

	log.Printf("  🔗 Connecting to: %s", wsURL)

	startTime := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dialer := websocket.Dialer{
		HandshakeTimeout: 5 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, wsURL, nil)
	if err != nil {
		nt.Report.WebSocketTest.Errors = append(nt.Report.WebSocketTest.Errors, err.Error())
		log.Printf("  ❌ Connection failed: %v", err)
		return err
	}
	defer conn.Close()

	nt.Report.WebSocketTest.ConnectionSuccess = true
	nt.Report.WebSocketTest.ConnectionTimeMs = time.Since(startTime).Milliseconds()
	log.Printf("  ✅ Connected in %dms", nt.Report.WebSocketTest.ConnectionTimeMs)

	// Test message exchange
	latencies := []float64{}

	for i := 0; i < 5; i++ {
		msgStart := time.Now()

		// Send ping
		msg := map[string]interface{}{
			"type": "ping",
			"data": map[string]interface{}{
				"timestamp": time.Now().Unix(),
				"sequence":  i,
			},
		}

		if err := conn.WriteJSON(msg); err != nil {
			nt.Report.WebSocketTest.Errors = append(nt.Report.WebSocketTest.Errors, err.Error())
			continue
		}
		nt.Report.WebSocketTest.MessagesSent++

		// Read pong
		var response map[string]interface{}
		if err := conn.ReadJSON(&response); err != nil {
			nt.Report.WebSocketTest.Errors = append(nt.Report.WebSocketTest.Errors, err.Error())
			continue
		}
		nt.Report.WebSocketTest.MessagesReceived++

		latency := float64(time.Since(msgStart).Milliseconds())
		latencies = append(latencies, latency)

		log.Printf("  📊 Message %d: %dms latency", i+1, int(latency))
	}

	// Calculate average latency
	if len(latencies) > 0 {
		var sum float64
		for _, lat := range latencies {
			sum += lat
		}
		nt.Report.WebSocketTest.AverageLatencyMs = sum / float64(len(latencies))
	}

	log.Printf("  ✅ Average latency: %.2fms", nt.Report.WebSocketTest.AverageLatencyMs)

	return nil
}

// TestWebPreview tests web preview functionality
func (nt *NetworkTester) TestWebPreview() {
	baseURL := strings.Replace(nt.ServerURL, "ws://", "http://", 1)
	baseURL = strings.Replace(baseURL, "/ws", "", 1)

	// Test HTML directory
	htmlURL := baseURL + "/html/"
	if nt.testHTTPEndpoint(htmlURL, 2*time.Second) {
		nt.Report.WebPreviewTest.PreviewURLs = append(nt.Report.WebPreviewTest.PreviewURLs, htmlURL)
		nt.Report.WebPreviewTest.AccessiblePreviews++
		log.Printf("  ✅ HTML directory accessible: %s", htmlURL)
	} else {
		nt.Report.WebPreviewTest.FailedPreviews = append(nt.Report.WebPreviewTest.FailedPreviews, htmlURL)
		log.Printf("  ❌ HTML directory not accessible: %s", htmlURL)
	}

	// Test status endpoint
	statusURL := baseURL + "/status"
	if nt.testHTTPEndpoint(statusURL, 2*time.Second) {
		nt.Report.WebPreviewTest.PreviewURLs = append(nt.Report.WebPreviewTest.PreviewURLs, statusURL)
		nt.Report.WebPreviewTest.AccessiblePreviews++
		log.Printf("  ✅ Status endpoint accessible: %s", statusURL)
	}

	nt.Report.WebPreviewTest.PreviewsGenerated = len(nt.Report.WebPreviewTest.PreviewURLs)
}

// MeasurePerformance measures performance metrics
func (nt *NetworkTester) MeasurePerformance() {
	// Already captured in WebSocket test
	nt.Report.PerformanceMetrics.WebSocketLatencyP50 = nt.Report.WebSocketTest.AverageLatencyMs

	// Test HTTP response time
	baseURL := strings.Replace(nt.ServerURL, "ws://", "http://", 1)
	baseURL = strings.Replace(baseURL, "/ws", "/status", 1)

	start := time.Now()
	resp, err := http.Get(baseURL)
	if err == nil {
		resp.Body.Close()
		nt.Report.PerformanceMetrics.HTTPResponseTime = float64(time.Since(start).Milliseconds())
		log.Printf("  📊 HTTP response time: %.2fms", nt.Report.PerformanceMetrics.HTTPResponseTime)
	}
}

// Helper methods

func (nt *NetworkTester) testPortAccessibility(addr string, timeout time.Duration) bool {
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func (nt *NetworkTester) testHTTPEndpoint(url string, timeout time.Duration) bool {
	client := &http.Client{Timeout: timeout}
	resp, err := client.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func (nt *NetworkTester) getPreferredIP() string {
	interfaces, _ := net.Interfaces()
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, _ := iface.Addrs()
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if ok && ipNet.IP.To4() != nil {
				return ipNet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}

func (nt *NetworkTester) getExternalIP() string {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://api.ipify.org?format=text")
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(body))
}

func (nt *NetworkTester) GenerateSummary() {
	var summary strings.Builder

	summary.WriteString(fmt.Sprintf("Test Duration: %dms\n\n", nt.Report.TestDurationMs))

	// Network Interfaces
	summary.WriteString(fmt.Sprintf("Network Interfaces: %d\n", len(nt.Report.NetworkInterfaces)))
	for _, iface := range nt.Report.NetworkInterfaces {
		summary.WriteString(fmt.Sprintf("  - %s: %s\n", iface.Name, iface.IPAddress))
	}
	summary.WriteString("\n")

	// WebSocket
	if nt.Report.WebSocketTest.ConnectionSuccess {
		summary.WriteString("WebSocket: ✅ CONNECTED\n")
		summary.WriteString(fmt.Sprintf("  Connection Time: %dms\n", nt.Report.WebSocketTest.ConnectionTimeMs))
		summary.WriteString(fmt.Sprintf("  Messages Sent: %d\n", nt.Report.WebSocketTest.MessagesSent))
		summary.WriteString(fmt.Sprintf("  Messages Received: %d\n", nt.Report.WebSocketTest.MessagesReceived))
		summary.WriteString(fmt.Sprintf("  Average Latency: %.2fms\n", nt.Report.WebSocketTest.AverageLatencyMs))
	} else {
		summary.WriteString("WebSocket: ❌ FAILED\n")
		if len(nt.Report.WebSocketTest.Errors) > 0 {
			summary.WriteString(fmt.Sprintf("  Error: %s\n", nt.Report.WebSocketTest.Errors[0]))
		}
	}
	summary.WriteString("\n")

	// Port Forwarding
	summary.WriteString(fmt.Sprintf("Port Forwarding: %s\n", nt.ServerPort))
	summary.WriteString(fmt.Sprintf("  Internal IP: %s\n", nt.Report.PortForwardingTest.InternalIP))
	if nt.Report.PortForwardingTest.ExternalIP != "" {
		summary.WriteString(fmt.Sprintf("  External IP: %s\n", nt.Report.PortForwardingTest.ExternalIP))
	}
	summary.WriteString(fmt.Sprintf("  Accessible From: %v\n", nt.Report.PortForwardingTest.AccessibleFrom))
	summary.WriteString("\n")

	// Web Preview
	summary.WriteString(fmt.Sprintf("Web Preview: %d accessible / %d total\n",
		nt.Report.WebPreviewTest.AccessiblePreviews,
		nt.Report.WebPreviewTest.PreviewsGenerated))

	nt.Report.Summary = summary.String()
}

// SaveReport saves the test report to a JSON file
func (nt *NetworkTester) SaveReport(filename string) error {
	data, err := json.MarshalIndent(nt.Report, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(filename, data, 0644)
}

// OpenWebPreview opens a web preview in the default browser
func OpenWebPreview(url string) error {
	var cmd *exec.Command

	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	return cmd.Start()
}

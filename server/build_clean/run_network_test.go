package main

import (
	"flag"
	"fmt"
	"log"
	"os"
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Network Test Runner
// Usage: go run run_network_test.go network_test.go -url ws://localhost:8090/ws -port 8090
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

func main() {
	// Command-line flags
	serverURL := flag.String("url", "ws://localhost:8090/ws", "WebSocket server URL")
	serverPort := flag.String("port", "8090", "Server port")
	outputFile := flag.String("output", "network_test_report.json", "Output report file")
	openPreview := flag.Bool("preview", false, "Open web preview after test")

	flag.Parse()

	log.SetFlags(log.LstdFlags | log.Lshortfile)

	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("🌐 RemoteClaudeOPS Network Test Runner")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("Server URL: %s\n", *serverURL)
	fmt.Printf("Server Port: %s\n", *serverPort)
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Create tester
	tester := NewNetworkTester(*serverURL, *serverPort)

	// Run full test suite
	if err := tester.RunFullNetworkTest(); err != nil {
		log.Fatalf("❌ Test failed: %v", err)
	}

	// Save report
	if err := tester.SaveReport(*outputFile); err != nil {
		log.Printf("⚠️ Failed to save report: %v", err)
	} else {
		fmt.Printf("\n💾 Report saved to: %s\n", *outputFile)
	}

	// Open web preview if requested
	if *openPreview && len(tester.Report.WebPreviewTest.PreviewURLs) > 0 {
		previewURL := tester.Report.WebPreviewTest.PreviewURLs[0]
		fmt.Printf("\n🌐 Opening web preview: %s\n", previewURL)
		if err := OpenWebPreview(previewURL); err != nil {
			log.Printf("⚠️ Failed to open preview: %v", err)
		}
	}

	// Exit with appropriate code
	if !tester.Report.WebSocketTest.ConnectionSuccess {
		os.Exit(1)
	}
}

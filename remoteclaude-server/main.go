package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"remoteclaude/handlers"
	"remoteclaude/utils"

	"github.com/gorilla/mux"
)

func main() {
	// Get available port
	defaultPort := 8080
	if envPort := os.Getenv("PORT"); envPort != "" {
		fmt.Sscanf(envPort, "%d", &defaultPort)
	}
	
	port, err := utils.GetAvailablePort(defaultPort)
	if err != nil {
		log.Fatalf("Failed to find available port: %v", err)
	}
	
	// Get server IP
	serverIP, err := utils.GetLocalIP()
	if err != nil {
		log.Fatalf("Failed to get local IP: %v", err)
	}
	
	serverURL := fmt.Sprintf("http://%s:%d", serverIP, port)
	
	// Print system info
	utils.PrintSystemInfo(serverURL, port)
	
	// Generate and display terminal QR code
	terminalQR, err := utils.GenerateTerminalQR(serverURL)
	if err != nil {
		log.Printf("Warning: Failed to generate terminal QR code: %v", err)
	} else {
		fmt.Print(terminalQR)
	}
	
	// Generate file QR code for web interface
	err = utils.GenerateQRCode(serverURL, "static/qr.png")
	if err != nil {
		log.Printf("Warning: Failed to generate QR code file: %v", err)
	}
	
	// Initialize router
	r := mux.NewRouter()
	
	// Static files
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))
	r.PathPrefix("/demo/").Handler(http.StripPrefix("/demo/", http.FileServer(http.Dir("../web-demo/"))))
	
	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/ws", handlers.HandleWebSocket).Methods("GET")
	api.HandleFunc("/qr", handlers.HandleQRCode).Methods("GET")
	api.HandleFunc("/system/info", handlers.HandleSystemInfo).Methods("GET")
	api.HandleFunc("/preview/status", handlers.HandlePreviewStatus).Methods("GET")
	api.PathPrefix("/preview/").HandlerFunc(handlers.HandlePreviewProxyEnhanced)
	
	// Setup graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	
	go func() {
		<-c
		fmt.Println("\n\n🛑 Shutting down RemoteClaude server...")
		fmt.Println("👋 Goodbye!")
		os.Exit(0)
	}()
	
	// Start server
	fmt.Printf("✅ Server running at %s\n", serverURL)
	fmt.Printf("📱 Ready for mobile connections!\n\n")
	
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), r))
}
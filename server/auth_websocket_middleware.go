package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

// AuthWebSocketMiddleware handles WebSocket authentication
type AuthWebSocketMiddleware struct {
	authManager *AuthManager
	upgrader    websocket.Upgrader
}

// AuthMessage represents authentication message structure
type AuthMessage struct {
	Type    string `json:"type"`     // "auth", "command", etc.
	Token   string `json:"token"`    // JWT token
	Payload interface{} `json:"payload"` // Command payload
}

// AuthResponse represents authentication response
type AuthResponse struct {
	Type    string      `json:"type"`    // "auth_success", "auth_error"
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Session *AuthSession `json:"session,omitempty"`
}

// NewAuthWebSocketMiddleware creates a new auth WebSocket middleware
func NewAuthWebSocketMiddleware(authManager *AuthManager) *AuthWebSocketMiddleware {
	return &AuthWebSocketMiddleware{
		authManager: authManager,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// TODO: Implement proper origin checking in production
				return true
			},
		},
	}
}

// HandleAuthenticatedWebSocket handles WebSocket connections with authentication
func (mw *AuthWebSocketMiddleware) HandleAuthenticatedWebSocket(w http.ResponseWriter, r *http.Request, handler func(*websocket.Conn, *AuthSession)) {
	// Upgrade connection
	conn, err := mw.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("🔌 New WebSocket connection from %s (awaiting authentication)", r.RemoteAddr)

	// Wait for authentication message (30 second timeout)
	conn.SetReadDeadline(time.Now().Add(30 * time.Second))

	var authMsg AuthMessage
	if err := conn.ReadJSON(&authMsg); err != nil {
		log.Printf("❌ Failed to read auth message: %v", err)
		mw.sendAuthError(conn, "Invalid authentication message")
		return
	}

	// Reset read deadline after auth
	conn.SetReadDeadline(time.Time{})

	// Check message type
	if authMsg.Type != "auth" {
		log.Printf("❌ Expected 'auth' message, got: %s", authMsg.Type)
		mw.sendAuthError(conn, "Authentication required")
		return
	}

	// Validate token
	session, err := mw.validateAuthToken(authMsg.Token, r.RemoteAddr)
	if err != nil {
		log.Printf("❌ Authentication failed: %v", err)
		mw.sendAuthError(conn, fmt.Sprintf("Authentication failed: %v", err))
		return
	}

	// Send success response
	if err := mw.sendAuthSuccess(conn, session); err != nil {
		log.Printf("❌ Failed to send auth success: %v", err)
		return
	}

	log.Printf("✅ User authenticated: %s (%s)", session.Username, session.SessionID)

	// Call the authenticated handler
	handler(conn, session)
}

// validateAuthToken validates the authentication token
func (mw *AuthWebSocketMiddleware) validateAuthToken(tokenString, remoteAddr string) (*AuthSession, error) {
	if tokenString == "" {
		return nil, errors.New("token is required")
	}

	// Validate JWT token
	session, err := mw.authManager.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	// Optionally check IP address
	// if session.IPAddress != extractIP(remoteAddr) {
	//     return nil, errors.New("IP address mismatch")
	// }

	return session, nil
}

// sendAuthSuccess sends authentication success response
func (mw *AuthWebSocketMiddleware) sendAuthSuccess(conn *websocket.Conn, session *AuthSession) error {
	response := AuthResponse{
		Type:    "auth_success",
		Success: true,
		Message: "Authentication successful",
		Session: session,
	}

	return conn.WriteJSON(response)
}

// sendAuthError sends authentication error response
func (mw *AuthWebSocketMiddleware) sendAuthError(conn *websocket.Conn, message string) {
	response := AuthResponse{
		Type:    "auth_error",
		Success: false,
		Message: message,
	}

	conn.WriteJSON(response)
}

// LoginRequest represents login request
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse represents login response
type LoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
	Session *AuthSession `json:"session,omitempty"`
}

// HandleLogin handles HTTP login requests
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendLoginError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate credentials
	authManager := GetGlobalAuthManager()
	if authManager == nil {
		sendLoginError(w, "Authentication system not initialized", http.StatusInternalServerError)
		return
	}

	// TODO: Implement proper password verification with bcrypt
	// For now, simple check (INSECURE - demo only)
	if req.Username != "admin" || req.Password != "admin123" {
		sendLoginError(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	// Create session
	ipAddress := extractIP(r.RemoteAddr)
	permissions := []string{"admin", "execute", "read", "write"}
	session, err := authManager.CreateSession(req.Username, "admin@remoteclaude.dev", ipAddress, permissions)
	if err != nil {
		sendLoginError(w, fmt.Sprintf("Failed to create session: %v", err), http.StatusInternalServerError)
		return
	}

	// Generate JWT token
	token, err := authManager.GenerateToken(session)
	if err != nil {
		sendLoginError(w, fmt.Sprintf("Failed to generate token: %v", err), http.StatusInternalServerError)
		return
	}

	// Send success response
	response := LoginResponse{
		Success: true,
		Message: "Login successful",
		Token:   token,
		Session: session,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	log.Printf("✅ User logged in: %s (IP: %s)", req.Username, ipAddress)
}

// HandleLogout handles HTTP logout requests
func HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header required", http.StatusUnauthorized)
		return
	}

	// Extract token (format: "Bearer <token>")
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
		return
	}

	tokenString := parts[1]

	// Validate token and get session
	authManager := GetGlobalAuthManager()
	session, err := authManager.ValidateToken(tokenString)
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Delete session
	if err := authManager.DeleteSession(session.SessionID); err != nil {
		http.Error(w, "Failed to logout", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Logout successful",
	})

	log.Printf("✅ User logged out: %s", session.Username)
}

// sendLoginError sends login error response
func sendLoginError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := LoginResponse{
		Success: false,
		Message: message,
	}

	json.NewEncoder(w).Encode(response)
}

// extractIP extracts IP address from RemoteAddr
func extractIP(remoteAddr string) string {
	parts := strings.Split(remoteAddr, ":")
	if len(parts) > 0 {
		return parts[0]
	}
	return remoteAddr
}

package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// AuthManager handles JWT authentication and session management
type AuthManager struct {
	jwtSecret     []byte
	sessions      map[string]*AuthSession
	sessionsMutex sync.RWMutex
	configPath    string
}

// AuthSession represents an authenticated user session
type AuthSession struct {
	SessionID   string    `json:"session_id"`
	Username    string    `json:"username"`
	Email       string    `json:"email"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	LastAccess  time.Time `json:"last_access"`
	IPAddress   string    `json:"ip_address"`
	Permissions []string  `json:"permissions"`
}

// JWTClaims represents JWT token claims
type JWTClaims struct {
	SessionID string   `json:"session_id"`
	Username  string   `json:"username"`
	Email     string   `json:"email"`
	Permissions []string `json:"permissions"`
	jwt.RegisteredClaims
}

// User represents a user account
type User struct {
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"`
	CreatedAt    time.Time `json:"created_at"`
	Permissions  []string  `json:"permissions"`
}

// UserDatabase represents user storage
type UserDatabase struct {
	Users map[string]*User `json:"users"`
}

var globalAuthManager *AuthManager

// InitializeAuthManager creates and initializes the auth manager
func InitializeAuthManager(configDir string) (*AuthManager, error) {
	// Generate or load JWT secret
	secretPath := filepath.Join(configDir, "jwt_secret.key")
	var jwtSecret []byte

	if _, err := os.Stat(secretPath); os.IsNotExist(err) {
		// Generate new secret
		jwtSecret = make([]byte, 32)
		if _, err := rand.Read(jwtSecret); err != nil {
			return nil, fmt.Errorf("failed to generate JWT secret: %v", err)
		}

		// Save secret
		if err := os.WriteFile(secretPath, []byte(hex.EncodeToString(jwtSecret)), 0600); err != nil {
			return nil, fmt.Errorf("failed to save JWT secret: %v", err)
		}

		log.Printf("✅ Generated new JWT secret: %s", secretPath)
	} else {
		// Load existing secret
		secretHex, err := os.ReadFile(secretPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read JWT secret: %v", err)
		}

		jwtSecret, err = hex.DecodeString(string(secretHex))
		if err != nil {
			return nil, fmt.Errorf("failed to decode JWT secret: %v", err)
		}

		log.Printf("✅ Loaded existing JWT secret")
	}

	manager := &AuthManager{
		jwtSecret:  jwtSecret,
		sessions:   make(map[string]*AuthSession),
		configPath: configDir,
	}

	// Initialize user database
	if err := manager.loadUserDatabase(); err != nil {
		log.Printf("⚠️  Failed to load user database, creating new: %v", err)
		if err := manager.createDefaultUsers(); err != nil {
			return nil, fmt.Errorf("failed to create default users: %v", err)
		}
	}

	globalAuthManager = manager
	log.Printf("✅ Auth Manager initialized")

	return manager, nil
}

// GenerateToken generates a JWT token for a session
func (am *AuthManager) GenerateToken(session *AuthSession) (string, error) {
	claims := JWTClaims{
		SessionID:   session.SessionID,
		Username:    session.Username,
		Email:       session.Email,
		Permissions: session.Permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(session.ExpiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "remoteclaude",
			Subject:   session.Username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(am.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %v", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token and returns the session
func (am *AuthManager) ValidateToken(tokenString string) (*AuthSession, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return am.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %v", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		// Check if session exists
		am.sessionsMutex.RLock()
		session, exists := am.sessions[claims.SessionID]
		am.sessionsMutex.RUnlock()

		if !exists {
			return nil, errors.New("session not found")
		}

		// Check if session expired
		if time.Now().After(session.ExpiresAt) {
			am.sessionsMutex.Lock()
			delete(am.sessions, session.SessionID)
			am.sessionsMutex.Unlock()
			return nil, errors.New("session expired")
		}

		// Update last access
		am.sessionsMutex.Lock()
		session.LastAccess = time.Now()
		am.sessionsMutex.Unlock()

		return session, nil
	}

	return nil, errors.New("invalid token claims")
}

// CreateSession creates a new authenticated session
func (am *AuthManager) CreateSession(username, email, ipAddress string, permissions []string) (*AuthSession, error) {
	sessionID := generateSessionID()

	session := &AuthSession{
		SessionID:   sessionID,
		Username:    username,
		Email:       email,
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(24 * time.Hour), // 24 hour expiry
		LastAccess:  time.Now(),
		IPAddress:   ipAddress,
		Permissions: permissions,
	}

	am.sessionsMutex.Lock()
	am.sessions[sessionID] = session
	am.sessionsMutex.Unlock()

	log.Printf("✅ Created session for user: %s (ID: %s)", username, sessionID)

	return session, nil
}

// DeleteSession removes a session
func (am *AuthManager) DeleteSession(sessionID string) error {
	am.sessionsMutex.Lock()
	defer am.sessionsMutex.Unlock()

	if _, exists := am.sessions[sessionID]; !exists {
		return errors.New("session not found")
	}

	delete(am.sessions, sessionID)
	log.Printf("✅ Deleted session: %s", sessionID)

	return nil
}

// GetSession retrieves a session by ID
func (am *AuthManager) GetSession(sessionID string) (*AuthSession, error) {
	am.sessionsMutex.RLock()
	defer am.sessionsMutex.RUnlock()

	session, exists := am.sessions[sessionID]
	if !exists {
		return nil, errors.New("session not found")
	}

	return session, nil
}

// CleanupExpiredSessions removes expired sessions
func (am *AuthManager) CleanupExpiredSessions() {
	am.sessionsMutex.Lock()
	defer am.sessionsMutex.Unlock()

	now := time.Now()
	expiredCount := 0

	for sessionID, session := range am.sessions {
		if now.After(session.ExpiresAt) {
			delete(am.sessions, sessionID)
			expiredCount++
		}
	}

	if expiredCount > 0 {
		log.Printf("🧹 Cleaned up %d expired sessions", expiredCount)
	}
}

// StartSessionCleanup starts periodic cleanup of expired sessions
func (am *AuthManager) StartSessionCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			am.CleanupExpiredSessions()
		}
	}()
	log.Printf("✅ Session cleanup started (5 minute interval)")
}

// loadUserDatabase loads user database from disk
func (am *AuthManager) loadUserDatabase() error {
	dbPath := filepath.Join(am.configPath, "users.json")

	data, err := os.ReadFile(dbPath)
	if err != nil {
		return err
	}

	var db UserDatabase
	if err := json.Unmarshal(data, &db); err != nil {
		return err
	}

	log.Printf("✅ Loaded %d users from database", len(db.Users))
	return nil
}

// createDefaultUsers creates default admin user
func (am *AuthManager) createDefaultUsers() error {
	db := &UserDatabase{
		Users: make(map[string]*User),
	}

	// Create default admin user (password: admin123)
	// NOTE: In production, this should be changed immediately
	db.Users["admin"] = &User{
		Username:     "admin",
		Email:        "admin@remoteclaude.dev",
		PasswordHash: hashPassword("admin123"), // Simple hash for demo
		CreatedAt:    time.Now(),
		Permissions:  []string{"admin", "execute", "read", "write"},
	}

	// Save database
	dbPath := filepath.Join(am.configPath, "users.json")
	data, err := json.MarshalIndent(db, "", "  ")
	if err != nil {
		return err
	}

	if err := os.WriteFile(dbPath, data, 0600); err != nil {
		return err
	}

	log.Printf("✅ Created default users (admin)")
	log.Printf("⚠️  WARNING: Default password is 'admin123' - change immediately!")

	return nil
}

// generateSessionID generates a random session ID
func generateSessionID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// hashPassword creates a simple hash (use bcrypt in production)
func hashPassword(password string) string {
	// TODO: Use bcrypt in production
	// This is a placeholder for demo purposes
	b := make([]byte, 16)
	rand.Read(b)
	salt := hex.EncodeToString(b)
	return fmt.Sprintf("%s:%s", salt, password) // INSECURE - for demo only
}

// GetGlobalAuthManager returns the global auth manager instance
func GetGlobalAuthManager() *AuthManager {
	return globalAuthManager
}

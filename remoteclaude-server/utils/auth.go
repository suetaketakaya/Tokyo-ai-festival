package utils

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

var jwtSecret []byte

func init() {
	// Generate a random JWT secret on startup
	jwtSecret = make([]byte, 32)
	rand.Read(jwtSecret)
}

type Claims struct {
	SessionID string `json:"session_id"`
	ClientIP  string `json:"client_ip"`
	Platform  string `json:"platform"`
	jwt.RegisteredClaims
}

// GenerateJWT creates a JWT token for authentication
func GenerateJWT(sessionID, clientIP, platform string) (string, error) {
	claims := &Claims{
		SessionID: sessionID,
		ClientIP:  clientIP,
		Platform:  platform,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateJWT validates and parses a JWT token
func ValidateJWT(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, err
}

// GenerateSessionID creates a random session ID
func GenerateSessionID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return base64.URLEncoding.EncodeToString(bytes)
}
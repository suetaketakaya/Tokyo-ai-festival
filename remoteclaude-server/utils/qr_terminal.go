package utils

import (
	"fmt"
	"strings"

	"github.com/skip2/go-qrcode"
)

// GenerateTerminalQR generates ASCII QR code for terminal display
func GenerateTerminalQR(content string) (string, error) {
	q, err := qrcode.New(content, qrcode.Medium)
	if err != nil {
		return "", err
	}

	// Get the QR code as a 2D boolean array
	bitmap := q.Bitmap()
	
	var result strings.Builder
	
	// Header
	result.WriteString(fmt.Sprintf("\n📱 RemoteClaude Server Ready!\n"))
	result.WriteString(fmt.Sprintf("🌐 Server URL: %s\n", content))
	result.WriteString(fmt.Sprintf("📷 Scan this QR code with your mobile app:\n\n"))
	
	// Top border
	result.WriteString("  ")
	for range bitmap[0] {
		result.WriteString("██")
	}
	result.WriteString("\n")
	
	// QR code content with border
	for _, row := range bitmap {
		result.WriteString("██") // Left border
		for _, module := range row {
			if module {
				result.WriteString("  ") // Black module (space for better contrast)
			} else {
				result.WriteString("██") // White module (block)
			}
		}
		result.WriteString("██\n") // Right border
	}
	
	// Bottom border
	result.WriteString("  ")
	for range bitmap[0] {
		result.WriteString("██")
	}
	result.WriteString("\n\n")
	
	// Instructions
	result.WriteString("📋 Instructions:\n")
	result.WriteString("   1. Install RemoteClaude mobile app\n")
	result.WriteString("   2. Scan the QR code above\n")
	result.WriteString("   3. Start coding remotely!\n\n")
	result.WriteString("💡 Commands:\n")
	result.WriteString("   • Claude: claude -p \"your prompt\"\n")
	result.WriteString("   • Git: git status, git diff, git commit\n")
	result.WriteString("   • Preview: http://localhost:3000 (auto-detected)\n\n")
	result.WriteString("🛑 Press Ctrl+C to stop server\n")
	result.WriteString("" + strings.Repeat("─", 60) + "\n")
	
	return result.String(), nil
}

// GenerateCompactQR generates a smaller ASCII QR code
func GenerateCompactQR(content string) (string, error) {
	q, err := qrcode.New(content, qrcode.Low) // Use Low recovery for smaller size
	if err != nil {
		return "", err
	}

	bitmap := q.Bitmap()
	var result strings.Builder
	
	// Compact version using single characters
	for _, row := range bitmap {
		for _, module := range row {
			if module {
				result.WriteString("█")
			} else {
				result.WriteString(" ")
			}
		}
		result.WriteString("\n")
	}
	
	return result.String(), nil
}
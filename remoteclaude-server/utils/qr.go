package utils

import (
	"github.com/skip2/go-qrcode"
)

// GenerateQRCode generates a QR code with the given content and saves it to the specified file
func GenerateQRCode(content, filename string) error {
	return qrcode.WriteFile(content, qrcode.Medium, 256, filename)
}
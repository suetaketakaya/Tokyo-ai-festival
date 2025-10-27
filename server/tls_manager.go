package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"log"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"
)

// TLSManager handles TLS certificate generation and management
type TLSManager struct {
	certPath   string
	keyPath    string
	configPath string
}

// NewTLSManager creates a new TLS manager
func NewTLSManager(configDir string) *TLSManager {
	return &TLSManager{
		certPath:   filepath.Join(configDir, "server.crt"),
		keyPath:    filepath.Join(configDir, "server.key"),
		configPath: configDir,
	}
}

// EnsureCertificates ensures TLS certificates exist or generates them
func (tm *TLSManager) EnsureCertificates() error {
	// Check if certificates exist
	if _, err := os.Stat(tm.certPath); os.IsNotExist(err) {
		log.Printf("📜 TLS certificates not found, generating...")
		if err := tm.generateSelfSignedCert(); err != nil {
			return fmt.Errorf("failed to generate certificates: %v", err)
		}
		log.Printf("✅ Generated self-signed TLS certificates")
	} else {
		log.Printf("✅ TLS certificates found")
	}

	return nil
}

// GetTLSConfig returns TLS configuration
func (tm *TLSManager) GetTLSConfig() (*tls.Config, error) {
	// Load certificate and key
	cert, err := tls.LoadX509KeyPair(tm.certPath, tm.keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load certificates: %v", err)
	}

	// Create TLS configuration
	config := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS12, // Minimum TLS 1.2
		CipherSuites: []uint16{
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		},
		PreferServerCipherSuites: true,
	}

	return config, nil
}

// generateSelfSignedCert generates a self-signed certificate
func (tm *TLSManager) generateSelfSignedCert() error {
	// Generate RSA key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %v", err)
	}

	// Create certificate template
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization:  []string{"RemoteClaude"},
			Country:       []string{"US"},
			Province:      []string{""},
			Locality:      []string{""},
			StreetAddress: []string{""},
			PostalCode:    []string{""},
			CommonName:    "RemoteClaude Server",
		},
		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(365 * 24 * time.Hour), // 1 year validity
		KeyUsage:  x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{
			x509.ExtKeyUsageServerAuth,
			x509.ExtKeyUsageClientAuth,
		},
		BasicConstraintsValid: true,
		IPAddresses: []net.IP{
			net.ParseIP("127.0.0.1"),
			net.ParseIP("::1"),
		},
		DNSNames: []string{
			"localhost",
			"remoteclaude.local",
		},
	}

	// Add local network IPs
	addrs, err := net.InterfaceAddrs()
	if err == nil {
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil {
					template.IPAddresses = append(template.IPAddresses, ipnet.IP)
				}
			}
		}
	}

	// Create certificate
	certBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %v", err)
	}

	// Save certificate
	certOut, err := os.Create(tm.certPath)
	if err != nil {
		return fmt.Errorf("failed to create cert file: %v", err)
	}
	defer certOut.Close()

	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: certBytes}); err != nil {
		return fmt.Errorf("failed to encode certificate: %v", err)
	}

	log.Printf("✅ Certificate saved: %s", tm.certPath)

	// Save private key
	keyOut, err := os.OpenFile(tm.keyPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("failed to create key file: %v", err)
	}
	defer keyOut.Close()

	privBytes, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		return fmt.Errorf("failed to marshal private key: %v", err)
	}

	if err := pem.Encode(keyOut, &pem.Block{Type: "PRIVATE KEY", Bytes: privBytes}); err != nil {
		return fmt.Errorf("failed to encode private key: %v", err)
	}

	log.Printf("✅ Private key saved: %s", tm.keyPath)

	return nil
}

// GetCertificateInfo returns certificate information
func (tm *TLSManager) GetCertificateInfo() (map[string]interface{}, error) {
	certPEM, err := os.ReadFile(tm.certPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate: %v", err)
	}

	block, _ := pem.Decode(certPEM)
	if block == nil {
		return nil, fmt.Errorf("failed to decode certificate PEM")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %v", err)
	}

	info := map[string]interface{}{
		"subject":     cert.Subject.CommonName,
		"issuer":      cert.Issuer.CommonName,
		"not_before":  cert.NotBefore,
		"not_after":   cert.NotAfter,
		"dns_names":   cert.DNSNames,
		"ip_addresses": cert.IPAddresses,
		"expires_in_days": int(time.Until(cert.NotAfter).Hours() / 24),
	}

	return info, nil
}

// CheckCertificateExpiry checks if certificate is expiring soon
func (tm *TLSManager) CheckCertificateExpiry() (bool, int, error) {
	info, err := tm.GetCertificateInfo()
	if err != nil {
		return false, 0, err
	}

	daysUntilExpiry := info["expires_in_days"].(int)

	// Warn if expiring in less than 30 days
	if daysUntilExpiry < 30 {
		log.Printf("⚠️  TLS certificate expires in %d days", daysUntilExpiry)
		return true, daysUntilExpiry, nil
	}

	return false, daysUntilExpiry, nil
}

// RenewCertificate renews the TLS certificate
func (tm *TLSManager) RenewCertificate() error {
	log.Printf("🔄 Renewing TLS certificate...")

	// Backup old certificates
	backupDir := filepath.Join(tm.configPath, "cert_backups")
	os.MkdirAll(backupDir, 0700)

	timestamp := time.Now().Format("20060102_150405")
	backupCert := filepath.Join(backupDir, fmt.Sprintf("server_%s.crt", timestamp))
	backupKey := filepath.Join(backupDir, fmt.Sprintf("server_%s.key", timestamp))

	if err := copyFile(tm.certPath, backupCert); err != nil {
		log.Printf("⚠️  Failed to backup certificate: %v", err)
	}
	if err := copyFile(tm.keyPath, backupKey); err != nil {
		log.Printf("⚠️  Failed to backup key: %v", err)
	}

	// Generate new certificate
	if err := tm.generateSelfSignedCert(); err != nil {
		return fmt.Errorf("failed to renew certificate: %v", err)
	}

	log.Printf("✅ TLS certificate renewed successfully")

	return nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0600)
}

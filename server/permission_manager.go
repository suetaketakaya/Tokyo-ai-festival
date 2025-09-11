package main

import (
	"fmt"
	"strings"
	"regexp"
	"time"
	"sync"
)

// PermissionRequest represents a request for user permission
type PermissionRequest struct {
	RequestID   string `json:"request_id"`
	Action      string `json:"action"`      // "create_file", "modify_file", "delete_file", "execute_command"
	Target      string `json:"target"`      // file name or command
	Description string `json:"description"` // human readable description
	Preview     string `json:"preview"`     // content preview (for files)
	Timestamp   int64  `json:"timestamp"`
}

// PermissionResponse represents user's response to permission request
type PermissionResponse struct {
	RequestID   string `json:"request_id"`
	Approved    bool   `json:"approved"`
	UserComment string `json:"user_comment"`
}

// PermissionManager handles permission requests and responses
type PermissionManager struct {
	pendingRequests map[string]*PermissionRequest
	responses       map[string]*PermissionResponse
	mu              sync.RWMutex
	timeout         time.Duration
}

// NewPermissionManager creates a new permission manager
func NewPermissionManager() *PermissionManager {
	return &PermissionManager{
		pendingRequests: make(map[string]*PermissionRequest),
		responses:       make(map[string]*PermissionResponse),
		timeout:         30 * time.Second, // 30 second timeout
	}
}

// DetectPermissionNeeded analyzes Claude's response to detect if permission is needed
func (pm *PermissionManager) DetectPermissionNeeded(response string) *PermissionRequest {
	response = strings.TrimSpace(response)
	
	// Pattern 1: File creation requests
	if pm.containsFileCreation(response) {
		filename, content := pm.extractFileInfo(response)
		if filename != "" {
			return &PermissionRequest{
				RequestID:   pm.generateRequestID(),
				Action:      "create_file",
				Target:      filename,
				Description: fmt.Sprintf("Create file: %s", filename),
				Preview:     content,
				Timestamp:   time.Now().Unix(),
			}
		}
	}
	
	// Pattern 2: File modification requests
	if pm.containsFileModification(response) {
		filename := pm.extractFilename(response)
		if filename != "" {
			return &PermissionRequest{
				RequestID:   pm.generateRequestID(),
				Action:      "modify_file", 
				Target:      filename,
				Description: fmt.Sprintf("Modify file: %s", filename),
				Preview:     "",
				Timestamp:   time.Now().Unix(),
			}
		}
	}
	
	// Pattern 3: Permission-related phrases
	permissionPhrases := []string{
		"I need permission",
		"Would you like me to create",
		"Should I create",
		"Can I create",
		"May I create",
		"permission to create",
		"create this as",
	}
	
	responseLower := strings.ToLower(response)
	for _, phrase := range permissionPhrases {
		if strings.Contains(responseLower, phrase) {
			filename := pm.extractFilenameFromPhrase(response)
			content := pm.extractCodeBlock(response)
			return &PermissionRequest{
				RequestID:   pm.generateRequestID(),
				Action:      "create_file",
				Target:      filename,
				Description: "Claude is requesting permission to create a file",
				Preview:     content,
				Timestamp:   time.Now().Unix(),
			}
		}
	}
	
	return nil
}

// containsFileCreation checks if response contains file creation intent
func (pm *PermissionManager) containsFileCreation(response string) bool {
	patterns := []string{
		`create.*\.py`,
		`create.*\.js`, 
		`create.*\.go`,
		`create.*\.html`,
		`save.*as.*\.`,
		`write.*to.*\.`,
	}
	
	responseLower := strings.ToLower(response)
	for _, pattern := range patterns {
		if matched, _ := regexp.MatchString(pattern, responseLower); matched {
			return true
		}
	}
	return false
}

// containsFileModification checks if response contains file modification intent
func (pm *PermissionManager) containsFileModification(response string) bool {
	patterns := []string{
		`modify.*file`,
		`update.*file`,
		`edit.*file`,
		`change.*in.*file`,
	}
	
	responseLower := strings.ToLower(response)
	for _, pattern := range patterns {
		if matched, _ := regexp.MatchString(pattern, responseLower); matched {
			return true
		}
	}
	return false
}

// extractFileInfo extracts filename and content from response
func (pm *PermissionManager) extractFileInfo(response string) (filename, content string) {
	// Extract filename
	filename = pm.extractFilename(response)
	
	// Extract code content
	content = pm.extractCodeBlock(response)
	
	return filename, content
}

// extractFilename extracts filename from response
func (pm *PermissionManager) extractFilename(response string) string {
	// Common filename patterns
	patterns := []string{
		`([a-zA-Z0-9_-]+\.(py|js|go|html|css|txt|md))`,
		`create.*?([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)`,
		`save.*?as.*?([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)`,
	}
	
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(response)
		if len(matches) > 1 {
			return matches[1]
		}
	}
	
	return ""
}

// extractFilenameFromPhrase extracts filename from permission phrases
func (pm *PermissionManager) extractFilenameFromPhrase(response string) string {
	// Look for quoted filenames
	re := regexp.MustCompile(`['"\x60]([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)['"\x60]`)
	matches := re.FindStringSubmatch(response)
	if len(matches) > 1 {
		return matches[1]
	}
	
	// Fallback to common filename pattern
	return pm.extractFilename(response)
}

// extractCodeBlock extracts code content from markdown code blocks
func (pm *PermissionManager) extractCodeBlock(response string) string {
	// Extract content between ```
	re := regexp.MustCompile("```(?:[a-z]+)?\n?(.*?)\n?```")
	matches := re.FindStringSubmatch(response)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	
	return ""
}

// generateRequestID generates a unique request ID
func (pm *PermissionManager) generateRequestID() string {
	return fmt.Sprintf("req_%d", time.Now().UnixNano())
}

// AddPendingRequest adds a permission request to pending list
func (pm *PermissionManager) AddPendingRequest(req *PermissionRequest) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.pendingRequests[req.RequestID] = req
}

// HandleResponse handles user's permission response
func (pm *PermissionManager) HandleResponse(resp *PermissionResponse) bool {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	
	if _, exists := pm.pendingRequests[resp.RequestID]; exists {
		pm.responses[resp.RequestID] = resp
		delete(pm.pendingRequests, resp.RequestID)
		return true
	}
	
	return false
}

// WaitForResponse waits for user response with timeout
func (pm *PermissionManager) WaitForResponse(requestID string) (*PermissionResponse, bool) {
	timeout := time.After(pm.timeout)
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	
	for {
		select {
		case <-timeout:
			// Remove pending request on timeout
			pm.mu.Lock()
			delete(pm.pendingRequests, requestID)
			pm.mu.Unlock()
			return nil, false
			
		case <-ticker.C:
			pm.mu.RLock()
			if resp, exists := pm.responses[requestID]; exists {
				pm.mu.RUnlock()
				// Clean up response after reading
				pm.mu.Lock()
				delete(pm.responses, requestID)
				pm.mu.Unlock()
				return resp, true
			}
			pm.mu.RUnlock()
		}
	}
}

// GetPendingRequests returns all pending permission requests
func (pm *PermissionManager) GetPendingRequests() map[string]*PermissionRequest {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	
	result := make(map[string]*PermissionRequest)
	for k, v := range pm.pendingRequests {
		result[k] = v
	}
	return result
}

// CleanupExpiredRequests removes expired permission requests
func (pm *PermissionManager) CleanupExpiredRequests() {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	
	now := time.Now().Unix()
	for id, req := range pm.pendingRequests {
		if now-req.Timestamp > int64(pm.timeout.Seconds()) {
			delete(pm.pendingRequests, id)
		}
	}
}
package main

import (
	"fmt"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

// MatplotlibDetector handles detection and processing of matplotlib outputs
type MatplotlibDetector struct {
	dockerManager *DockerManager
}

// MatplotlibOutput represents a matplotlib visualization output
type MatplotlibOutput struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"`
	Title        string    `json:"title"`
	Filename     string    `json:"filename"`
	Base64Image  string    `json:"base64_image"`
	Path         string    `json:"path"`
	Timestamp    time.Time `json:"timestamp"`
	ProjectID    string    `json:"project_id"`
	Size         int       `json:"size"`
	Format       string    `json:"format"`
}

// NewMatplotlibDetector creates a new matplotlib detector
func NewMatplotlibDetector(dm *DockerManager) *MatplotlibDetector {
	return &MatplotlibDetector{
		dockerManager: dm,
	}
}

// DetectMatplotlibOutputs scans for matplotlib-generated images in a project
func (md *MatplotlibDetector) DetectMatplotlibOutputs(projectID string) ([]*MatplotlibOutput, error) {
	log.Printf("🔍 Scanning for matplotlib outputs in project: %s", projectID)

	var outputs []*MatplotlibOutput

	// Check common matplotlib output directories
	searchPaths := []string{
		"/workspace",
		"/workspace/output",
		"/workspace/plots",
		"/workspace/images",
		"/workspace/figures",
		"/tmp",
	}

	for _, searchPath := range searchPaths {
		// Find image files created recently (within last 10 minutes)
		findCmd := fmt.Sprintf("find %s -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.svg' -mmin -10 2>/dev/null | head -20", searchPath)

		output, err := md.dockerManager.ExecuteCommand(projectID, findCmd)
		if err != nil {
			continue // Skip if path doesn't exist or command fails
		}

		files := strings.Split(strings.TrimSpace(output), "\n")
		for _, file := range files {
			if file != "" && md.isLikelyMatplotlibOutput(file) {
				matplotlibOutput, err := md.processImageFile(projectID, file)
				if err != nil {
					log.Printf("⚠️ Failed to process image file %s: %v", file, err)
					continue
				}
				outputs = append(outputs, matplotlibOutput)
			}
		}
	}

	log.Printf("📊 Found %d matplotlib outputs for project %s", len(outputs), projectID)
	return outputs, nil
}

// isLikelyMatplotlibOutput determines if a file is likely a matplotlib output
func (md *MatplotlibDetector) isLikelyMatplotlibOutput(filename string) bool {
	// Check file extension
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".svg" {
		return false
	}

	// Check for typical matplotlib naming patterns
	basename := strings.ToLower(filepath.Base(filename))
	matplotlibPatterns := []string{
		"figure",
		"plot",
		"chart",
		"graph",
		"visualization",
		"output",
		"temp",
		"matplotlib",
	}

	for _, pattern := range matplotlibPatterns {
		if strings.Contains(basename, pattern) {
			return true
		}
	}

	// Check if file was created recently (likely output)
	return true // For now, assume all recent image files could be matplotlib outputs
}

// processImageFile converts an image file to a MatplotlibOutput structure
func (md *MatplotlibDetector) processImageFile(projectID, filePath string) (*MatplotlibOutput, error) {
	// Get file info
	statCmd := fmt.Sprintf("stat -c '%%s %%Y' '%s' 2>/dev/null || stat -f '%%z %%m' '%s' 2>/dev/null", filePath, filePath)
	statOutput, err := md.dockerManager.ExecuteCommand(projectID, statCmd)
	if err != nil {
		return nil, fmt.Errorf("failed to get file stats: %v", err)
	}

	var fileSize int64
	var modTime int64
	fmt.Sscanf(strings.TrimSpace(statOutput), "%d %d", &fileSize, &modTime)

	// Read and encode image file
	catCmd := fmt.Sprintf("cat '%s' | base64 -w 0", filePath)
	base64Output, err := md.dockerManager.ExecuteCommand(projectID, catCmd)
	if err != nil {
		return nil, fmt.Errorf("failed to read image file: %v", err)
	}

	base64Data := strings.TrimSpace(base64Output)
	if len(base64Data) == 0 {
		return nil, fmt.Errorf("empty image file")
	}

	// Check if image size is reasonable (limit to 5MB)
	if len(base64Data) > 5*1024*1024 {
		return nil, fmt.Errorf("image too large: %d bytes", len(base64Data))
	}

	filename := filepath.Base(filePath)
	ext := strings.ToLower(filepath.Ext(filename))
	format := strings.TrimPrefix(ext, ".")

	output := &MatplotlibOutput{
		ID:          fmt.Sprintf("matplotlib_%s_%d", projectID, time.Now().Unix()),
		Type:        "matplotlib",
		Title:       md.generateTitle(filename),
		Filename:    filename,
		Base64Image: base64Data,
		Path:        filePath,
		Timestamp:   time.Unix(modTime, 0),
		ProjectID:   projectID,
		Size:        int(fileSize),
		Format:      format,
	}

	return output, nil
}

// generateTitle creates a human-readable title from a filename
func (md *MatplotlibDetector) generateTitle(filename string) string {
	// Remove extension
	name := strings.TrimSuffix(filename, filepath.Ext(filename))

	// Replace underscores and hyphens with spaces
	name = strings.ReplaceAll(name, "_", " ")
	name = strings.ReplaceAll(name, "-", " ")

	// Capitalize first letter
	if len(name) > 0 {
		name = strings.ToUpper(string(name[0])) + name[1:]
	}

	// Add default prefix if name is generic
	if name == "" || name == "temp" || name == "output" {
		name = "Matplotlib Plot"
	}

	return name
}

// SendMatplotlibOutputs sends matplotlib outputs to connected clients
func (md *MatplotlibDetector) SendMatplotlibOutputs(conn *websocket.Conn, projectID string) error {
	outputs, err := md.DetectMatplotlibOutputs(projectID)
	if err != nil {
		return fmt.Errorf("failed to detect matplotlib outputs: %v", err)
	}

	for _, output := range outputs {
		message := map[string]interface{}{
			"type": "matplotlib_generated",
			"data": map[string]interface{}{
				"id":           output.ID,
				"type":         output.Type,
				"title":        output.Title,
				"filename":     output.Filename,
				"base64_image": output.Base64Image,
				"path":         output.Path,
				"timestamp":    output.Timestamp.Unix(),
				"project_id":   output.ProjectID,
				"size":         output.Size,
				"format":       output.Format,
			},
			"timestamp": time.Now().Unix(),
		}

		if err := conn.WriteJSON(message); err != nil {
			log.Printf("❌ Failed to send matplotlib output: %v", err)
			continue
		}

		log.Printf("📊 Sent matplotlib output: %s (%s)", output.Title, output.Filename)
	}

	return nil
}

// MonitorForMatplotlibOutputs continuously monitors for new matplotlib outputs
func (md *MatplotlibDetector) MonitorForMatplotlibOutputs(conn *websocket.Conn, projectID string, stopChan <-chan bool) {
	log.Printf("👀 Starting matplotlib output monitoring for project: %s", projectID)

	ticker := time.NewTicker(5 * time.Second) // Check every 5 seconds
	defer ticker.Stop()

	lastCheckTime := time.Now()

	for {
		select {
		case <-stopChan:
			log.Printf("🛑 Stopping matplotlib monitoring for project: %s", projectID)
			return
		case <-ticker.C:
			// Check for new matplotlib outputs since last check
			outputs, err := md.detectNewMatplotlibOutputs(projectID, lastCheckTime)
			if err != nil {
				log.Printf("⚠️ Error checking for new matplotlib outputs: %v", err)
				continue
			}

			for _, output := range outputs {
				message := map[string]interface{}{
					"type": "matplotlib_generated",
					"data": map[string]interface{}{
						"id":           output.ID,
						"type":         output.Type,
						"title":        output.Title,
						"filename":     output.Filename,
						"base64_image": output.Base64Image,
						"path":         output.Path,
						"timestamp":    output.Timestamp.Unix(),
						"project_id":   output.ProjectID,
						"size":         output.Size,
						"format":       output.Format,
					},
					"timestamp": time.Now().Unix(),
				}

				if err := conn.WriteJSON(message); err != nil {
					log.Printf("❌ Failed to send new matplotlib output: %v", err)
					continue
				}

				log.Printf("📊 Sent new matplotlib output: %s (%s)", output.Title, output.Filename)
			}

			lastCheckTime = time.Now()
		}
	}
}

// detectNewMatplotlibOutputs finds matplotlib outputs created after the specified time
func (md *MatplotlibDetector) detectNewMatplotlibOutputs(projectID string, since time.Time) ([]*MatplotlibOutput, error) {
	var outputs []*MatplotlibOutput

	// Find image files created after the specified time
	sinceMinutes := int(time.Since(since).Minutes()) + 1
	searchPaths := []string{
		"/workspace",
		"/workspace/output",
		"/workspace/plots",
		"/workspace/images",
		"/workspace/figures",
		"/tmp",
	}

	for _, searchPath := range searchPaths {
		findCmd := fmt.Sprintf("find %s -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.svg' -mmin -%d 2>/dev/null | head -10", searchPath, sinceMinutes)

		output, err := md.dockerManager.ExecuteCommand(projectID, findCmd)
		if err != nil {
			continue
		}

		files := strings.Split(strings.TrimSpace(output), "\n")
		for _, file := range files {
			if file != "" && md.isLikelyMatplotlibOutput(file) {
				// Check if file was actually created after 'since' time
				statCmd := fmt.Sprintf("stat -c '%%Y' '%s' 2>/dev/null || stat -f '%%m' '%s' 2>/dev/null", file, file)
				statOutput, err := md.dockerManager.ExecuteCommand(projectID, statCmd)
				if err != nil {
					continue
				}

				var modTime int64
				fmt.Sscanf(strings.TrimSpace(statOutput), "%d", &modTime)
				fileTime := time.Unix(modTime, 0)

				if fileTime.After(since) {
					matplotlibOutput, err := md.processImageFile(projectID, file)
					if err != nil {
						log.Printf("⚠️ Failed to process new image file %s: %v", file, err)
						continue
					}
					outputs = append(outputs, matplotlibOutput)
				}
			}
		}
	}

	return outputs, nil
}

// Global matplotlib detector instance
var globalMatplotlibDetector *MatplotlibDetector

// InitializeMatplotlibDetector initializes the global matplotlib detector
func InitializeMatplotlibDetector(dm *DockerManager) {
	globalMatplotlibDetector = NewMatplotlibDetector(dm)
	log.Printf("📊 Matplotlib detector initialized")
}
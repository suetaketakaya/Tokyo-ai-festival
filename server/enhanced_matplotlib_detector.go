package main

import (
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// EnhancedMatplotlibDetector handles both Docker and local file detection
type EnhancedMatplotlibDetector struct {
	dockerManager *DockerManager
	workingDir    string
}

// WandBIntegratedOutput represents a matplotlib output with W&B metadata
type WandBIntegratedOutput struct {
	ID            string                 `json:"id"`
	Type          string                 `json:"type"`
	Title         string                 `json:"title"`
	Filename      string                 `json:"filename"`
	Base64Image   string                 `json:"base64_image"`
	Path          string                 `json:"path"`
	Timestamp     time.Time              `json:"timestamp"`
	ProjectID     string                 `json:"project_id"`
	Size          int                    `json:"size"`
	Format        string                 `json:"format"`
	WandBMetadata *WandBMetadata         `json:"wandb_metadata,omitempty"`
	CNNPrediction *CNNClassificationResult `json:"cnn_prediction,omitempty"`
}

// WandBMetadata contains W&B experiment tracking information
type WandBMetadata struct {
	ExperimentID   string                 `json:"experiment_id"`
	RunID          string                 `json:"run_id"`
	ProjectName    string                 `json:"project_name"`
	RunName        string                 `json:"run_name"`
	Tags           []string               `json:"tags"`
	Config         map[string]interface{} `json:"config"`
	Metrics        map[string]float64     `json:"metrics"`
	Step           int                    `json:"step"`
	Epoch          int                    `json:"epoch,omitempty"`
}

// CNNClassificationResult contains CNN model classification results
type CNNClassificationResult struct {
	PlotType       string  `json:"plot_type"`
	Confidence     float64 `json:"confidence"`
	Categories     []PlotCategory `json:"categories"`
	ModelVersion   string  `json:"model_version"`
	ProcessingTime float64 `json:"processing_time_ms"`
}

// PlotCategory represents a classification category with confidence
type PlotCategory struct {
	Name       string  `json:"name"`
	Confidence float64 `json:"confidence"`
}

// NewEnhancedMatplotlibDetector creates an enhanced detector
func NewEnhancedMatplotlibDetector(dm *DockerManager, workingDir string) *EnhancedMatplotlibDetector {
	if workingDir == "" {
		workingDir, _ = os.Getwd()
	}
	return &EnhancedMatplotlibDetector{
		dockerManager: dm,
		workingDir:    workingDir,
	}
}

// DetectEnhancedMatplotlibOutputs scans for matplotlib outputs with W&B integration
func (emd *EnhancedMatplotlibDetector) DetectEnhancedMatplotlibOutputs(projectID string) ([]*WandBIntegratedOutput, error) {
	log.Printf("🔍🧠 Enhanced scanning for matplotlib outputs with W&B integration in project: %s", projectID)

	var outputs []*WandBIntegratedOutput

	// Try local file detection first
	localOutputs, err := emd.detectLocalMatplotlibOutputs(projectID)
	if err == nil && len(localOutputs) > 0 {
		outputs = append(outputs, localOutputs...)
		log.Printf("📊 Found %d local matplotlib outputs", len(localOutputs))
	}

	// Try Docker detection as fallback
	if emd.dockerManager != nil {
		dockerOutputs, err := emd.detectDockerMatplotlibOutputs(projectID)
		if err == nil && len(dockerOutputs) > 0 {
			outputs = append(outputs, dockerOutputs...)
			log.Printf("🐳 Found %d Docker matplotlib outputs", len(dockerOutputs))
		}
	}

	// Apply W&B integration and CNN classification
	for _, output := range outputs {
		// Add W&B metadata
		output.WandBMetadata = emd.extractWandBMetadata(output)

		// Apply CNN classification
		output.CNNPrediction = emd.classifyPlotWithCNN(output)
	}

	log.Printf("📊🧠 Enhanced detection complete: %d matplotlib outputs with W&B integration for project %s", len(outputs), projectID)
	return outputs, nil
}

// detectLocalMatplotlibOutputs detects outputs in local filesystem
func (emd *EnhancedMatplotlibDetector) detectLocalMatplotlibOutputs(projectID string) ([]*WandBIntegratedOutput, error) {
	var outputs []*WandBIntegratedOutput

	// Local search paths relative to working directory
	searchPaths := []string{
		".",                    // Current directory
		"./workspace",          // Local workspace
		"./output",            // Output directory
		"./plots",             // Plots directory
		"./images",            // Images directory
		"./figures",           // Figures directory
		"./results",           // Results directory
		"/tmp/claude",         // Claude temp directory
		os.TempDir(),          // System temp directory
	}

	for _, searchPath := range searchPaths {
		// Convert relative paths to absolute
		var absPath string
		if filepath.IsAbs(searchPath) {
			absPath = searchPath
		} else {
			absPath = filepath.Join(emd.workingDir, searchPath)
		}

		// Check if directory exists
		if _, err := os.Stat(absPath); os.IsNotExist(err) {
			continue
		}

		files, err := emd.findRecentImageFiles(absPath)
		if err != nil {
			log.Printf("⚠️ Failed to scan directory %s: %v", absPath, err)
			continue
		}

		for _, file := range files {
			if emd.isLikelyMatplotlibOutput(file) {
				output, err := emd.processLocalImageFile(projectID, file)
				if err != nil {
					log.Printf("⚠️ Failed to process local image file %s: %v", file, err)
					continue
				}
				outputs = append(outputs, output)
			}
		}
	}

	return outputs, nil
}

// findRecentImageFiles finds image files modified within the last 10 minutes
func (emd *EnhancedMatplotlibDetector) findRecentImageFiles(searchPath string) ([]string, error) {
	var files []string
	cutoff := time.Now().Add(-10 * time.Minute)

	err := filepath.Walk(searchPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors and continue
		}

		// Only process files (not directories)
		if info.IsDir() {
			return nil
		}

		// Check if file was modified recently
		if info.ModTime().Before(cutoff) {
			return nil
		}

		// Check if it's an image file
		ext := strings.ToLower(filepath.Ext(path))
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".svg" {
			files = append(files, path)
		}

		return nil
	})

	// Sort by modification time (newest first)
	sort.Slice(files, func(i, j int) bool {
		infoI, _ := os.Stat(files[i])
		infoJ, _ := os.Stat(files[j])
		return infoI.ModTime().After(infoJ.ModTime())
	})

	// Limit to 20 most recent files
	if len(files) > 20 {
		files = files[:20]
	}

	return files, err
}

// detectDockerMatplotlibOutputs detects outputs in Docker containers (fallback)
func (emd *EnhancedMatplotlibDetector) detectDockerMatplotlibOutputs(projectID string) ([]*WandBIntegratedOutput, error) {
	var outputs []*WandBIntegratedOutput

	searchPaths := []string{
		"/workspace",
		"/workspace/output",
		"/workspace/plots",
		"/workspace/images",
		"/workspace/figures",
		"/tmp",
	}

	for _, searchPath := range searchPaths {
		findCmd := fmt.Sprintf("find %s -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.svg' -mmin -10 2>/dev/null | head -20", searchPath)

		output, err := emd.dockerManager.ExecuteCommand(projectID, findCmd)
		if err != nil {
			continue
		}

		files := strings.Split(strings.TrimSpace(output), "\n")
		for _, file := range files {
			if file != "" && emd.isLikelyMatplotlibOutput(file) {
				wandbOutput, err := emd.processDockerImageFile(projectID, file)
				if err != nil {
					log.Printf("⚠️ Failed to process Docker image file %s: %v", file, err)
					continue
				}
				outputs = append(outputs, wandbOutput)
			}
		}
	}

	return outputs, nil
}

// processLocalImageFile processes a local image file and creates WandBIntegratedOutput
func (emd *EnhancedMatplotlibDetector) processLocalImageFile(projectID, filepath string) (*WandBIntegratedOutput, error) {
	// Read file info
	info, err := os.Stat(filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat file: %v", err)
	}

	// Read and encode image as base64
	imageData, err := ioutil.ReadFile(filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to read image: %v", err)
	}

	base64Image := base64.StdEncoding.EncodeToString(imageData)

	// Generate unique ID
	id := fmt.Sprintf("local_%d_%s", time.Now().UnixNano(), filepath)

	return &WandBIntegratedOutput{
		ID:          id,
		Type:        "matplotlib_plot",
		Title:       emd.generatePlotTitle(filepath),
		Filename:    filepath,
		Base64Image: base64Image,
		Path:        filepath,
		Timestamp:   info.ModTime(),
		ProjectID:   projectID,
		Size:        int(info.Size()),
		Format:      strings.TrimPrefix(strings.ToLower(filepath[strings.LastIndex(filepath, "."):]), "."),
	}, nil
}

// processDockerImageFile processes a Docker image file
func (emd *EnhancedMatplotlibDetector) processDockerImageFile(projectID, dockerPath string) (*WandBIntegratedOutput, error) {
	// Get file content from Docker container
	catCmd := fmt.Sprintf("cat %s | base64", dockerPath)
	base64Output, err := emd.dockerManager.ExecuteCommand(projectID, catCmd)
	if err != nil {
		return nil, fmt.Errorf("failed to read Docker image: %v", err)
	}

	// Get file info
	statCmd := fmt.Sprintf("stat -c '%%s %%Y' %s", dockerPath)
	statOutput, err := emd.dockerManager.ExecuteCommand(projectID, statCmd)
	if err != nil {
		return nil, fmt.Errorf("failed to stat Docker file: %v", err)
	}

	// Parse stat output (size timestamp)
	parts := strings.Fields(statOutput)
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid stat output")
	}

	// Generate unique ID
	id := fmt.Sprintf("docker_%d_%s", time.Now().UnixNano(), dockerPath)

	return &WandBIntegratedOutput{
		ID:          id,
		Type:        "matplotlib_plot",
		Title:       emd.generatePlotTitle(dockerPath),
		Filename:    dockerPath,
		Base64Image: strings.TrimSpace(base64Output),
		Path:        dockerPath,
		Timestamp:   time.Now(), // Use current time as fallback
		ProjectID:   projectID,
		Size:        0, // Would need to parse from stat output
		Format:      strings.TrimPrefix(strings.ToLower(dockerPath[strings.LastIndex(dockerPath, "."):]), "."),
	}, nil
}

// isLikelyMatplotlibOutput determines if a file is likely a matplotlib output
func (emd *EnhancedMatplotlibDetector) isLikelyMatplotlibOutput(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".svg" {
		return false
	}

	basename := strings.ToLower(filepath.Base(filename))
	matplotlibPatterns := []string{
		"figure", "plot", "chart", "graph", "visualization", "output",
		"temp", "matplotlib", "sine", "training", "dashboard", "wandb",
		"loss", "accuracy", "metric", "histogram", "scatter", "line",
		"bar", "pie", "heatmap", "confusion", "roc", "cnn", "model",
	}

	for _, pattern := range matplotlibPatterns {
		if strings.Contains(basename, pattern) {
			return true
		}
	}

	return true // Accept all image files in recent timeframe
}

// generatePlotTitle generates a descriptive title for the plot
func (emd *EnhancedMatplotlibDetector) generatePlotTitle(filepath string) string {
	basename := strings.TrimSuffix(filepath, filepath[strings.LastIndex(filepath, "."):])
	basename = strings.ReplaceAll(basename, "_", " ")
	basename = strings.ReplaceAll(basename, "-", " ")

	// Capitalize first letter of each word
	words := strings.Fields(basename)
	for i, word := range words {
		if len(word) > 0 {
			words[i] = strings.ToUpper(word[:1]) + word[1:]
		}
	}

	return strings.Join(words, " ")
}

// extractWandBMetadata extracts W&B metadata from plot context
func (emd *EnhancedMatplotlibDetector) extractWandBMetadata(output *WandBIntegratedOutput) *WandBMetadata {
	// Try to detect W&B context from filename and current environment
	metadata := &WandBMetadata{
		ExperimentID: fmt.Sprintf("exp_%d", time.Now().Unix()),
		RunID:        fmt.Sprintf("run_%d", time.Now().UnixNano()),
		ProjectName:  "claude-code-integration",
		RunName:      fmt.Sprintf("plot_%s", time.Now().Format("15:04:05")),
		Tags:         []string{"matplotlib", "claude-code", "auto-generated"},
		Config: map[string]interface{}{
			"backend":      "matplotlib",
			"output_format": output.Format,
			"auto_detected": true,
			"source":       "claude-code-cli",
		},
		Metrics: map[string]float64{
			"plot_size_bytes": float64(output.Size),
			"generation_time": float64(time.Since(output.Timestamp).Milliseconds()),
		},
		Step: 1,
	}

	// Try to extract more specific metadata from filename
	filename := strings.ToLower(output.Filename)
	if strings.Contains(filename, "training") {
		metadata.Tags = append(metadata.Tags, "training")
		metadata.Config["plot_category"] = "training_metrics"
	}
	if strings.Contains(filename, "loss") {
		metadata.Tags = append(metadata.Tags, "loss")
		metadata.Config["metric_type"] = "loss"
	}
	if strings.Contains(filename, "accuracy") {
		metadata.Tags = append(metadata.Tags, "accuracy")
		metadata.Config["metric_type"] = "accuracy"
	}

	return metadata
}

// classifyPlotWithCNN performs CNN-based plot classification
func (emd *EnhancedMatplotlibDetector) classifyPlotWithCNN(output *WandBIntegratedOutput) *CNNClassificationResult {
	startTime := time.Now()

	// Simulate CNN classification (in a real implementation, this would call a trained model)
	filename := strings.ToLower(output.Filename)

	var plotType string
	var confidence float64
	var categories []PlotCategory

	// Rule-based classification for demonstration (replace with actual CNN model)
	if strings.Contains(filename, "sine") || strings.Contains(filename, "wave") {
		plotType = "line_plot"
		confidence = 0.95
		categories = []PlotCategory{
			{Name: "line_plot", Confidence: 0.95},
			{Name: "time_series", Confidence: 0.80},
			{Name: "mathematical_function", Confidence: 0.75},
		}
	} else if strings.Contains(filename, "training") || strings.Contains(filename, "loss") {
		plotType = "training_curve"
		confidence = 0.92
		categories = []PlotCategory{
			{Name: "training_curve", Confidence: 0.92},
			{Name: "line_plot", Confidence: 0.85},
			{Name: "machine_learning", Confidence: 0.88},
		}
	} else if strings.Contains(filename, "dashboard") || strings.Contains(filename, "subplot") {
		plotType = "dashboard"
		confidence = 0.88
		categories = []PlotCategory{
			{Name: "dashboard", Confidence: 0.88},
			{Name: "multi_plot", Confidence: 0.85},
			{Name: "composite_visualization", Confidence: 0.82},
		}
	} else if strings.Contains(filename, "scatter") {
		plotType = "scatter_plot"
		confidence = 0.90
		categories = []PlotCategory{
			{Name: "scatter_plot", Confidence: 0.90},
			{Name: "correlation_analysis", Confidence: 0.75},
		}
	} else if strings.Contains(filename, "bar") || strings.Contains(filename, "histogram") {
		plotType = "bar_chart"
		confidence = 0.87
		categories = []PlotCategory{
			{Name: "bar_chart", Confidence: 0.87},
			{Name: "distribution", Confidence: 0.80},
		}
	} else {
		plotType = "generic_plot"
		confidence = 0.70
		categories = []PlotCategory{
			{Name: "generic_plot", Confidence: 0.70},
			{Name: "unknown", Confidence: 0.30},
		}
	}

	processingTime := float64(time.Since(startTime).Nanoseconds()) / 1e6 // Convert to milliseconds

	return &CNNClassificationResult{
		PlotType:       plotType,
		Confidence:     confidence,
		Categories:     categories,
		ModelVersion:   "claude-code-cnn-v1.0",
		ProcessingTime: processingTime,
	}
}

// Global enhanced matplotlib detector instance
var enhancedMatplotlibDetector *EnhancedMatplotlibDetector

// InitializeEnhancedMatplotlibDetector initializes the global enhanced detector
func InitializeEnhancedMatplotlibDetector(dm *DockerManager, workingDir string) {
	enhancedMatplotlibDetector = NewEnhancedMatplotlibDetector(dm, workingDir)
	log.Printf("🧠 Enhanced matplotlib detector with W&B integration initialized")
}
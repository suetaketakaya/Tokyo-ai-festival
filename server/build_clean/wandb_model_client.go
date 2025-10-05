package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"time"
)

// WandbMLPrediction represents ML model prediction result
type WandbMLPrediction struct {
	CommandType          string             `json:"command_type"`
	Confidence           float64            `json:"confidence"`
	MLCategory           string             `json:"ml_category"`
	MLConfidence         float64            `json:"ml_confidence"`
	CategoryProbabilities map[string]float64 `json:"category_probabilities"`
	ClaudeCategory       *string            `json:"claude_category"`
	ClaudeConfidence     *float64           `json:"claude_confidence"`
	Timestamp            string             `json:"timestamp"`
}

// WandbModelClient manages Python ML model invocation
type WandbModelClient struct {
	pythonPath string
	modelPath  string
}

// NewWandbModelClient creates a new W&B model client
func NewWandbModelClient() *WandbModelClient {
	return &WandbModelClient{
		pythonPath: "python3",
		modelPath:  "./wandb_local_model.py",
	}
}

// Predict calls Python ML model for enhanced prediction
func (c *WandbModelClient) Predict(command string, claudeResult *ClaudeCliResponse) (*WandbMLPrediction, error) {
	metrics := PhaseMetrics{
		PhaseName: "W&B ML Prediction",
		StartTime: time.Now(),
		Metadata:  make(map[string]interface{}),
	}

	// Prepare Claude CLI result as JSON if available
	var claudeJSON string
	if claudeResult != nil {
		claudeData := map[string]interface{}{
			"command_type": claudeResult.CommandType,
			"confidence":   claudeResult.Confidence,
			"language":     claudeResult.Language,
			"framework":    claudeResult.Framework,
		}
		claudeBytes, _ := json.Marshal(claudeData)
		claudeJSON = string(claudeBytes)
	}

	// Call Python ML model
	var cmd *exec.Cmd
	if claudeJSON != "" {
		cmd = exec.Command(c.pythonPath, c.modelPath, command, claudeJSON)
	} else {
		cmd = exec.Command(c.pythonPath, c.modelPath, command)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		metrics.Success = false
		metrics.ErrorMessage = err.Error()
		metrics.Record()
		return nil, fmt.Errorf("ML model execution failed: %v\nOutput: %s", err, string(output))
	}

	// Parse JSON response
	var prediction WandbMLPrediction

	// Split output into JSON and stderr (model loading messages)
	outputStr := string(output)

	// Find complete JSON object (from first { to last })
	startIdx := strings.Index(outputStr, "{")
	endIdx := strings.LastIndex(outputStr, "}")

	if startIdx == -1 || endIdx == -1 || startIdx > endIdx {
		metrics.Success = false
		metrics.ErrorMessage = "No valid JSON found in output"
		metrics.Record()
		return nil, fmt.Errorf("no valid JSON in ML model output: %s", outputStr)
	}

	jsonOutput := outputStr[startIdx : endIdx+1]

	if err := json.Unmarshal([]byte(jsonOutput), &prediction); err != nil {
		metrics.Success = false
		metrics.ErrorMessage = err.Error()
		metrics.Record()
		return nil, fmt.Errorf("failed to parse ML prediction: %v\nJSON: %s", err, jsonOutput)
	}

	metrics.Success = true
	metrics.Confidence = prediction.Confidence
	metrics.Metadata["type"] = prediction.CommandType
	metrics.Metadata["ml_confidence"] = prediction.MLConfidence
	metrics.Record()

	log.Printf("🧠 W&B ML Prediction: type=%s, confidence=%.2f (ML: %.2f)",
		prediction.CommandType, prediction.Confidence, prediction.MLConfidence)

	return &prediction, nil
}

// PredictWithFallback tries ML prediction with fallback to Claude CLI only
func (c *WandbModelClient) PredictWithFallback(command string, claudeResult *ClaudeCliResponse) *WandbMLPrediction {
	prediction, err := c.Predict(command, claudeResult)
	if err != nil {
		log.Printf("⚠️ W&B ML prediction failed: %v", err)
		log.Printf("📝 Using Claude CLI result only")

		// Fallback: use Claude result directly
		if claudeResult != nil {
			return &WandbMLPrediction{
				CommandType:  claudeResult.CommandType,
				Confidence:   claudeResult.Confidence,
				MLCategory:   claudeResult.CommandType,
				MLConfidence: claudeResult.Confidence,
				CategoryProbabilities: map[string]float64{
					claudeResult.CommandType: 1.0,
				},
				ClaudeCategory:   &claudeResult.CommandType,
				ClaudeConfidence: &claudeResult.Confidence,
				Timestamp:        time.Now().Format(time.RFC3339),
			}
		}

		// Ultimate fallback: general category
		generalType := "general"
		generalConf := 0.5
		return &WandbMLPrediction{
			CommandType:  generalType,
			Confidence:   generalConf,
			MLCategory:   generalType,
			MLConfidence: generalConf,
			CategoryProbabilities: map[string]float64{
				"general": 1.0,
			},
			ClaudeCategory:   nil,
			ClaudeConfidence: nil,
			Timestamp:        time.Now().Format(time.RFC3339),
		}
	}

	return prediction
}

// EnhanceClaudeResponseWithML blends Claude CLI + W&B ML for best prediction
func EnhanceClaudeResponseWithML(command string, claudeResult *ClaudeCliResponse) (*ClaudeCliResponse, error) {
	// Initialize W&B client
	client := NewWandbModelClient()

	// Get ML prediction
	mlPrediction := client.PredictWithFallback(command, claudeResult)

	// Create enhanced response
	enhanced := &ClaudeCliResponse{
		GeneratedCode:  claudeResult.GeneratedCode,
		Language:       claudeResult.Language,
		Framework:      claudeResult.Framework,
		CommandType:    mlPrediction.CommandType,    // Use ML-enhanced type
		Confidence:     mlPrediction.Confidence,     // Use ML-enhanced confidence
		SuggestedFiles: claudeResult.SuggestedFiles,
		Explanation:    claudeResult.Explanation,
		RawOutput:      claudeResult.RawOutput,
	}

	// Add ML metadata to explanation
	if mlPrediction.MLConfidence > 0 {
		enhanced.Explanation += fmt.Sprintf(
			"\n[ML Enhanced: %.1f%% confidence, Claude: %.1f%%]",
			mlPrediction.MLConfidence*100,
			claudeResult.Confidence*100,
		)
	}

	log.Printf("🚀 Enhanced Prediction: %s (%.2f) [Claude: %s (%.2f), ML: %s (%.2f)]",
		enhanced.CommandType, enhanced.Confidence,
		claudeResult.CommandType, claudeResult.Confidence,
		mlPrediction.MLCategory, mlPrediction.MLConfidence)

	return enhanced, nil
}

// GetTopCategories returns top N categories by probability
func (p *WandbMLPrediction) GetTopCategories(n int) []string {
	type categoryProb struct {
		category string
		prob     float64
	}

	// Convert map to slice for sorting
	probs := make([]categoryProb, 0, len(p.CategoryProbabilities))
	for cat, prob := range p.CategoryProbabilities {
		probs = append(probs, categoryProb{cat, prob})
	}

	// Simple bubble sort (small dataset)
	for i := 0; i < len(probs); i++ {
		for j := i + 1; j < len(probs); j++ {
			if probs[j].prob > probs[i].prob {
				probs[i], probs[j] = probs[j], probs[i]
			}
		}
	}

	// Get top N
	topN := make([]string, 0, n)
	for i := 0; i < n && i < len(probs); i++ {
		topN = append(topN, probs[i].category)
	}

	return topN
}

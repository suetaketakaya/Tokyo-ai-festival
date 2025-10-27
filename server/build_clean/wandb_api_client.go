package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FastAPI Client for W&B ML Model
// Connects to persistent Python server for low-latency predictions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// WandbAPIClient manages HTTP connections to FastAPI server
type WandbAPIClient struct {
	baseURL    string
	httpClient *http.Client
}

// PredictionRequestAPI represents API request structure
type PredictionRequestAPI struct {
	Command      string                 `json:"command"`
	ClaudeResult *ClaudeResultAPI       `json:"claude_result,omitempty"`
}

// ClaudeResultAPI represents Claude CLI result for API
type ClaudeResultAPI struct {
	CommandType string  `json:"command_type,omitempty"`
	Confidence  float64 `json:"confidence,omitempty"`
	Language    string  `json:"language,omitempty"`
	Framework   string  `json:"framework,omitempty"`
}

// PredictionResponseAPI represents API response structure
type PredictionResponseAPI struct {
	CommandType           string             `json:"command_type"`
	Confidence            float64            `json:"confidence"`
	MLCategory            string             `json:"ml_category"`
	MLConfidence          float64            `json:"ml_confidence"`
	CategoryProbabilities map[string]float64 `json:"category_probabilities"`
	ClaudeCategory        *string            `json:"claude_category"`
	ClaudeConfidence      *float64           `json:"claude_confidence"`
	Timestamp             string             `json:"timestamp"`
}

// HealthResponseAPI represents health check response
type HealthResponseAPI struct {
	Status      string   `json:"status"`
	ModelLoaded bool     `json:"model_loaded"`
	Version     string   `json:"version"`
	Categories  []string `json:"categories"`
}

// NewWandbAPIClient creates a new FastAPI client
func NewWandbAPIClient(baseURL string) *WandbAPIClient {
	if baseURL == "" {
		baseURL = "http://127.0.0.1:8000"
	}

	return &WandbAPIClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Health checks if the API server is running and model is loaded
func (c *WandbAPIClient) Health() (*HealthResponseAPI, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/health")
	if err != nil {
		return nil, fmt.Errorf("health check failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("health check failed: status=%d, body=%s", resp.StatusCode, string(body))
	}

	var health HealthResponseAPI
	if err := json.NewDecoder(resp.Body).Decode(&health); err != nil {
		return nil, fmt.Errorf("failed to decode health response: %v", err)
	}

	return &health, nil
}

// Predict sends a prediction request to the API server
func (c *WandbAPIClient) Predict(command string, claudeResult *ClaudeCliResponse) (*WandbMLPrediction, error) {
	metrics := PhaseMetrics{
		PhaseName: "W&B API Prediction",
		StartTime: time.Now(),
		Metadata:  make(map[string]interface{}),
	}

	// Prepare request
	request := PredictionRequestAPI{
		Command: command,
	}

	// Convert Claude result if available
	if claudeResult != nil {
		request.ClaudeResult = &ClaudeResultAPI{
			CommandType: claudeResult.CommandType,
			Confidence:  claudeResult.Confidence,
			Language:    claudeResult.Language,
			Framework:   claudeResult.Framework,
		}
	}

	// Marshal request
	requestBody, err := json.Marshal(request)
	if err != nil {
		metrics.Success = false
		metrics.ErrorMessage = err.Error()
		metrics.Record()
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	// Send POST request
	resp, err := c.httpClient.Post(
		c.baseURL+"/predict",
		"application/json",
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		metrics.Success = false
		metrics.ErrorMessage = err.Error()
		metrics.Record()
		return nil, fmt.Errorf("API request failed: %v", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		metrics.Success = false
		metrics.ErrorMessage = fmt.Sprintf("status=%d, body=%s", resp.StatusCode, string(body))
		metrics.Record()
		return nil, fmt.Errorf("API error: status=%d, body=%s", resp.StatusCode, string(body))
	}

	// Parse response
	var apiResponse PredictionResponseAPI
	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		metrics.Success = false
		metrics.ErrorMessage = err.Error()
		metrics.Record()
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	// Convert to WandbMLPrediction
	prediction := &WandbMLPrediction{
		CommandType:           apiResponse.CommandType,
		Confidence:            apiResponse.Confidence,
		MLCategory:            apiResponse.MLCategory,
		MLConfidence:          apiResponse.MLConfidence,
		CategoryProbabilities: apiResponse.CategoryProbabilities,
		ClaudeCategory:        apiResponse.ClaudeCategory,
		ClaudeConfidence:      apiResponse.ClaudeConfidence,
		Timestamp:             apiResponse.Timestamp,
	}

	metrics.Success = true
	metrics.Confidence = prediction.Confidence
	metrics.Metadata["type"] = prediction.CommandType
	metrics.Metadata["ml_confidence"] = prediction.MLConfidence
	metrics.Record()

	log.Printf("🧠 W&B API Prediction: type=%s, confidence=%.2f (ML: %.2f)",
		prediction.CommandType, prediction.Confidence, prediction.MLConfidence)

	return prediction, nil
}

// PredictWithFallback tries API prediction with fallback to direct Python call
func (c *WandbAPIClient) PredictWithFallback(command string, claudeResult *ClaudeCliResponse) *WandbMLPrediction {
	// Try API first
	prediction, err := c.Predict(command, claudeResult)
	if err == nil {
		return prediction
	}

	log.Printf("⚠️ W&B API prediction failed: %v", err)
	log.Printf("📝 Falling back to direct Python call")

	// Fallback to direct Python execution
	directClient := NewWandbModelClient()
	return directClient.PredictWithFallback(command, claudeResult)
}

// GetCategories retrieves available categories from the API
func (c *WandbAPIClient) GetCategories() ([]string, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/categories")
	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %v", err)
	}
	defer resp.Body.Close()

	var result struct {
		Categories []string `json:"categories"`
		Count      int      `json:"count"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode categories: %v", err)
	}

	return result.Categories, nil
}

// WaitForServer waits for the API server to be ready
func (c *WandbAPIClient) WaitForServer(maxWait time.Duration) error {
	deadline := time.Now().Add(maxWait)

	for time.Now().Before(deadline) {
		health, err := c.Health()
		if err == nil && health.ModelLoaded {
			log.Printf("✅ W&B API server ready (version: %s)", health.Version)
			return nil
		}

		log.Printf("⏳ Waiting for W&B API server...")
		time.Sleep(1 * time.Second)
	}

	return fmt.Errorf("timeout waiting for server after %v", maxWait)
}

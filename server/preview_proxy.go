package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"
)

// PreviewProxyResponse represents the response from the Python plot server
type PreviewProxyResponse struct {
	PreviewItems []map[string]interface{} `json:"preview_items"`
	TotalCount   int                      `json:"total_count"`
	Timestamp    string                   `json:"timestamp"`
}

// getPreviewItemsFromPython fetches preview items from the Python plot server
func getPreviewItemsFromPython() ([]map[string]interface{}, error) {
	// Try to fetch from Python plot server on port 8094
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get("http://localhost:8094/preview")
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Python plot server: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Python plot server returned status: %d", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	var proxyResponse PreviewProxyResponse
	if err := json.Unmarshal(body, &proxyResponse); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %v", err)
	}

	fmt.Printf("✅ Fetched %d W&B plots from Python server\n", len(proxyResponse.PreviewItems))
	return proxyResponse.PreviewItems, nil
}

// enhancedGetPreviewItems fetches preview items with W&B integration
func enhancedGetPreviewItems(projectID string) []map[string]interface{} {
	var previewItems []map[string]interface{}

	// First try to get items from Python plot server
	if pythonItems, err := getPreviewItemsFromPython(); err == nil {
		fmt.Printf("📊 Using W&B enhanced plots from Python server: %d items\n", len(pythonItems))
		previewItems = append(previewItems, pythonItems...)
	} else {
		fmt.Printf("⚠️ Python plot server unavailable: %v\n", err)
	}

	// Fallback to existing logic if no items from Python server
	if len(previewItems) == 0 {
		fmt.Printf("📊 Falling back to existing plot detection for project: %s\n", projectID)
		// Here you would call the existing getPreviewItems logic
		// For now, return empty array as fallback
	}

	return previewItems
}
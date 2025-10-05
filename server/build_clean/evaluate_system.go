package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"sort"
	"strings"
	"time"
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Large-Scale Evaluation System
// Evaluates 1000+ test patterns to assess system limits
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// TestPattern represents a single test input
type TestPattern struct {
	ID         string                 `json:"id"`
	Command    string                 `json:"command"`
	Category   string                 `json:"category"`
	Framework  string                 `json:"framework"`
	Complexity string                 `json:"complexity"`
	Metadata   map[string]interface{} `json:"-"`
}

// EvaluationResult represents the result of evaluating one pattern
type EvaluationResult struct {
	PatternID         string  `json:"pattern_id"`
	Command           string  `json:"command"`
	ExpectedCategory  string  `json:"expected_category"`
	PredictedCategory string  `json:"predicted_category"`
	Confidence        float64 `json:"confidence"`
	MLConfidence      float64 `json:"ml_confidence"`
	IsCorrect         bool    `json:"is_correct"`
	LatencyMs         int64   `json:"latency_ms"`
	Error             string  `json:"error,omitempty"`
	ButtonsGenerated  int     `json:"buttons_generated"`
}

// EvaluationReport contains comprehensive evaluation statistics
type EvaluationReport struct {
	TotalPatterns     int                            `json:"total_patterns"`
	CorrectPredictions int                           `json:"correct_predictions"`
	Accuracy          float64                        `json:"accuracy"`
	AverageConfidence float64                        `json:"average_confidence"`
	AverageLatency    float64                        `json:"average_latency_ms"`
	CategoryStats     map[string]*CategoryStats      `json:"category_stats"`
	ComplexityStats   map[string]*ComplexityStats    `json:"complexity_stats"`
	FrameworkStats    map[string]*FrameworkStats     `json:"framework_stats"`
	ConfidenceBuckets map[string]int                 `json:"confidence_buckets"`
	LatencyBuckets    map[string]int                 `json:"latency_buckets"`
	ErrorAnalysis     map[string]int                 `json:"error_analysis"`
	TopErrors         []ErrorDetail                  `json:"top_errors"`
	Results           []EvaluationResult             `json:"results"`
}

// CategoryStats tracks statistics per category
type CategoryStats struct {
	Total      int     `json:"total"`
	Correct    int     `json:"correct"`
	Accuracy   float64 `json:"accuracy"`
	AvgConf    float64 `json:"avg_confidence"`
	AvgLatency float64 `json:"avg_latency_ms"`
}

// ComplexityStats tracks statistics per complexity level
type ComplexityStats struct {
	Total      int     `json:"total"`
	Correct    int     `json:"correct"`
	Accuracy   float64 `json:"accuracy"`
	AvgConf    float64 `json:"avg_confidence"`
}

// FrameworkStats tracks statistics per framework
type FrameworkStats struct {
	Total      int     `json:"total"`
	Correct    int     `json:"correct"`
	Accuracy   float64 `json:"accuracy"`
}

// ErrorDetail represents a detailed error record
type ErrorDetail struct {
	PatternID string `json:"pattern_id"`
	Command   string `json:"command"`
	Error     string `json:"error"`
	Count     int    `json:"count"`
}

// SystemEvaluator manages the evaluation process
type SystemEvaluator struct {
	Patterns        []TestPattern
	Results         []EvaluationResult
	Report          *EvaluationReport
	WandbClient     *WandbModelClient
	ButtonGenerator *DynamicButtonGenerator
}

// NewSystemEvaluator creates a new evaluator
func NewSystemEvaluator(patternsFile string) (*SystemEvaluator, error) {
	data, err := ioutil.ReadFile(patternsFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read patterns file: %v", err)
	}

	var patterns []TestPattern
	if err := json.Unmarshal(data, &patterns); err != nil {
		return nil, fmt.Errorf("failed to parse patterns: %v", err)
	}

	// Initialize W&B client and button generator
	wandbClient := NewWandbModelClient()

	buttonGenerator := NewDynamicButtonGenerator()

	return &SystemEvaluator{
		Patterns:        patterns,
		Results:         make([]EvaluationResult, 0, len(patterns)),
		WandbClient:     wandbClient,
		ButtonGenerator: buttonGenerator,
	}, nil
}

// EvaluatePattern evaluates a single pattern
func (se *SystemEvaluator) EvaluatePattern(pattern TestPattern) EvaluationResult {
	startTime := time.Now()

	result := EvaluationResult{
		PatternID:        pattern.ID,
		Command:          pattern.Command,
		ExpectedCategory: pattern.Category,
	}

	// Stage 1: Claude CLI (simulation mode)
	claudeResponse, err := ExecuteClaudeCLI(pattern.Command, "/tmp/test_project")
	if err != nil {
		result.Error = fmt.Sprintf("Claude CLI error: %v", err)
		result.LatencyMs = time.Since(startTime).Milliseconds()
		return result
	}

	// Stage 2: W&B ML Enhancement
	mlPrediction, err := se.WandbClient.Predict(pattern.Command, claudeResponse)
	if err != nil {
		result.Error = fmt.Sprintf("ML prediction error: %v", err)
		result.LatencyMs = time.Since(startTime).Milliseconds()
		return result
	}

	result.PredictedCategory = mlPrediction.CommandType
	result.Confidence = mlPrediction.Confidence
	result.MLConfidence = mlPrediction.MLConfidence

	// Stage 3: Button Generation
	buttons := se.ButtonGenerator.GenerateButtons(mlPrediction, pattern.Command)
	result.ButtonsGenerated = len(buttons)

	// Check correctness (skip for "unknown" category which has no ground truth)
	if pattern.Category != "unknown" {
		result.IsCorrect = normalizeCategory(result.PredictedCategory) == normalizeCategory(pattern.Category)
	} else {
		// For unknown category, just check if we got a prediction
		result.IsCorrect = result.PredictedCategory != ""
	}

	result.LatencyMs = time.Since(startTime).Milliseconds()
	return result
}

// normalizeCategory normalizes category names for comparison
func normalizeCategory(category string) string {
	normalized := strings.ToLower(category)
	normalized = strings.ReplaceAll(normalized, "_", "")
	normalized = strings.ReplaceAll(normalized, "-", "")
	normalized = strings.ReplaceAll(normalized, " ", "")

	// Map similar categories
	switch normalized {
	case "machinelearning", "ml":
		return "machinelearning"
	case "webapp", "web":
		return "webapp"
	case "visualization", "viz":
		return "visualization"
	case "dataanalysis", "data":
		return "dataanalysis"
	default:
		return normalized
	}
}

// EvaluateAll evaluates all patterns
func (se *SystemEvaluator) EvaluateAll() error {
	totalPatterns := len(se.Patterns)

	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("🚀 Starting Large-Scale Evaluation\n")
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("📊 Total patterns: %d\n\n", totalPatterns)

	for i, pattern := range se.Patterns {
		// Progress indicator
		if (i+1)%50 == 0 || i == 0 {
			fmt.Printf("Progress: %d/%d (%.1f%%)\n", i+1, totalPatterns, float64(i+1)/float64(totalPatterns)*100)
		}

		result := se.EvaluatePattern(pattern)
		se.Results = append(se.Results, result)
	}

	fmt.Printf("\n✅ Evaluation completed: %d/%d patterns\n", len(se.Results), totalPatterns)
	return nil
}

// GenerateReport generates comprehensive evaluation report
func (se *SystemEvaluator) GenerateReport() *EvaluationReport {
	report := &EvaluationReport{
		TotalPatterns:     len(se.Results),
		CategoryStats:     make(map[string]*CategoryStats),
		ComplexityStats:   make(map[string]*ComplexityStats),
		FrameworkStats:    make(map[string]*FrameworkStats),
		ConfidenceBuckets: make(map[string]int),
		LatencyBuckets:    make(map[string]int),
		ErrorAnalysis:     make(map[string]int),
		Results:           se.Results,
	}

	totalConfidence := 0.0
	totalLatency := int64(0)

	// Process each result
	for i, result := range se.Results {
		pattern := se.Patterns[i]

		// Count correct predictions (exclude unknown category)
		if pattern.Category != "unknown" && result.IsCorrect {
			report.CorrectPredictions++
		}

		totalConfidence += result.Confidence
		totalLatency += result.LatencyMs

		// Category stats
		if _, exists := report.CategoryStats[pattern.Category]; !exists {
			report.CategoryStats[pattern.Category] = &CategoryStats{}
		}
		catStats := report.CategoryStats[pattern.Category]
		catStats.Total++
		if result.IsCorrect {
			catStats.Correct++
		}
		catStats.AvgConf += result.Confidence
		catStats.AvgLatency += float64(result.LatencyMs)

		// Complexity stats
		if _, exists := report.ComplexityStats[pattern.Complexity]; !exists {
			report.ComplexityStats[pattern.Complexity] = &ComplexityStats{}
		}
		compStats := report.ComplexityStats[pattern.Complexity]
		compStats.Total++
		if result.IsCorrect {
			compStats.Correct++
		}
		compStats.AvgConf += result.Confidence

		// Framework stats
		if _, exists := report.FrameworkStats[pattern.Framework]; !exists {
			report.FrameworkStats[pattern.Framework] = &FrameworkStats{}
		}
		fwStats := report.FrameworkStats[pattern.Framework]
		fwStats.Total++
		if result.IsCorrect {
			fwStats.Correct++
		}

		// Confidence buckets
		confBucket := getConfidenceBucket(result.Confidence)
		report.ConfidenceBuckets[confBucket]++

		// Latency buckets
		latencyBucket := getLatencyBucket(result.LatencyMs)
		report.LatencyBuckets[latencyBucket]++

		// Error analysis
		if result.Error != "" {
			errorType := extractErrorType(result.Error)
			report.ErrorAnalysis[errorType]++
		}
	}

	// Calculate accuracy (exclude unknown category)
	knownPatterns := 0
	for _, pattern := range se.Patterns {
		if pattern.Category != "unknown" {
			knownPatterns++
		}
	}
	if knownPatterns > 0 {
		report.Accuracy = float64(report.CorrectPredictions) / float64(knownPatterns) * 100
	}

	report.AverageConfidence = totalConfidence / float64(report.TotalPatterns)
	report.AverageLatency = float64(totalLatency) / float64(report.TotalPatterns)

	// Finalize category stats
	for _, stats := range report.CategoryStats {
		if stats.Total > 0 {
			stats.Accuracy = float64(stats.Correct) / float64(stats.Total) * 100
			stats.AvgConf /= float64(stats.Total)
			stats.AvgLatency /= float64(stats.Total)
		}
	}

	// Finalize complexity stats
	for _, stats := range report.ComplexityStats {
		if stats.Total > 0 {
			stats.Accuracy = float64(stats.Correct) / float64(stats.Total) * 100
			stats.AvgConf /= float64(stats.Total)
		}
	}

	// Finalize framework stats
	for _, stats := range report.FrameworkStats {
		if stats.Total > 0 {
			stats.Accuracy = float64(stats.Correct) / float64(stats.Total) * 100
		}
	}

	// Top errors
	report.TopErrors = getTopErrors(report.ErrorAnalysis, se.Results)

	se.Report = report
	return report
}

// getConfidenceBucket categorizes confidence into buckets
func getConfidenceBucket(confidence float64) string {
	switch {
	case confidence >= 95:
		return "95-100%"
	case confidence >= 90:
		return "90-95%"
	case confidence >= 85:
		return "85-90%"
	case confidence >= 80:
		return "80-85%"
	case confidence >= 75:
		return "75-80%"
	default:
		return "<75%"
	}
}

// getLatencyBucket categorizes latency into buckets
func getLatencyBucket(latencyMs int64) string {
	switch {
	case latencyMs < 100:
		return "<100ms"
	case latencyMs < 500:
		return "100-500ms"
	case latencyMs < 1000:
		return "500ms-1s"
	case latencyMs < 2000:
		return "1-2s"
	case latencyMs < 5000:
		return "2-5s"
	default:
		return ">5s"
	}
}

// extractErrorType extracts error type from error message
func extractErrorType(errorMsg string) string {
	lower := strings.ToLower(errorMsg)
	switch {
	case strings.Contains(lower, "claude cli"):
		return "Claude CLI Error"
	case strings.Contains(lower, "ml prediction"):
		return "ML Prediction Error"
	case strings.Contains(lower, "timeout"):
		return "Timeout Error"
	case strings.Contains(lower, "json"):
		return "JSON Parse Error"
	default:
		return "Other Error"
	}
}

// getTopErrors returns top N errors by count
func getTopErrors(errorAnalysis map[string]int, results []EvaluationResult) []ErrorDetail {
	type errorCount struct {
		errorType string
		count     int
		example   string
		patternID string
	}

	errorCounts := make([]errorCount, 0)
	errorExamples := make(map[string]string)
	errorPatterns := make(map[string]string)

	// Find examples for each error type
	for _, result := range results {
		if result.Error != "" {
			errorType := extractErrorType(result.Error)
			if _, exists := errorExamples[errorType]; !exists {
				errorExamples[errorType] = result.Error
				errorPatterns[errorType] = result.PatternID
			}
		}
	}

	for errorType, count := range errorAnalysis {
		errorCounts = append(errorCounts, errorCount{
			errorType: errorType,
			count:     count,
			example:   errorExamples[errorType],
			patternID: errorPatterns[errorType],
		})
	}

	// Sort by count descending
	sort.Slice(errorCounts, func(i, j int) bool {
		return errorCounts[i].count > errorCounts[j].count
	})

	// Convert to ErrorDetail (top 10)
	topErrors := make([]ErrorDetail, 0)
	for i, ec := range errorCounts {
		if i >= 10 {
			break
		}
		topErrors = append(topErrors, ErrorDetail{
			PatternID: ec.patternID,
			Command:   ec.example,
			Error:     ec.errorType,
			Count:     ec.count,
		})
	}

	return topErrors
}

// SaveReport saves the report to a JSON file
func (se *SystemEvaluator) SaveReport(filename string) error {
	data, err := json.MarshalIndent(se.Report, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal report: %v", err)
	}

	if err := ioutil.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write report: %v", err)
	}

	return nil
}

// PrintReport prints a human-readable report to console
func (se *SystemEvaluator) PrintReport() {
	report := se.Report

	fmt.Printf("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("📊 EVALUATION REPORT\n")
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")

	// Overall metrics
	fmt.Printf("🎯 Overall Metrics:\n")
	fmt.Printf("   Total Patterns:       %d\n", report.TotalPatterns)
	fmt.Printf("   Correct Predictions:  %d\n", report.CorrectPredictions)
	fmt.Printf("   Accuracy:             %.2f%%\n", report.Accuracy)
	fmt.Printf("   Average Confidence:   %.2f%%\n", report.AverageConfidence)
	fmt.Printf("   Average Latency:      %.1fms\n\n", report.AverageLatency)

	// Category performance
	fmt.Printf("📂 Category Performance:\n")
	categoryNames := make([]string, 0, len(report.CategoryStats))
	for cat := range report.CategoryStats {
		categoryNames = append(categoryNames, cat)
	}
	sort.Strings(categoryNames)

	for _, cat := range categoryNames {
		stats := report.CategoryStats[cat]
		fmt.Printf("   %-20s: %3d patterns | Accuracy: %6.2f%% | Conf: %5.2f%% | Latency: %6.1fms\n",
			cat, stats.Total, stats.Accuracy, stats.AvgConf, stats.AvgLatency)
	}

	// Complexity performance
	fmt.Printf("\n🔧 Complexity Performance:\n")
	complexityLevels := []string{"low", "medium", "high", "variable"}
	for _, comp := range complexityLevels {
		if stats, exists := report.ComplexityStats[comp]; exists {
			fmt.Printf("   %-10s: %3d patterns | Accuracy: %6.2f%% | Conf: %5.2f%%\n",
				comp, stats.Total, stats.Accuracy, stats.AvgConf)
		}
	}

	// Confidence distribution
	fmt.Printf("\n📈 Confidence Distribution:\n")
	confBuckets := []string{"95-100%", "90-95%", "85-90%", "80-85%", "75-80%", "<75%"}
	for _, bucket := range confBuckets {
		if count, exists := report.ConfidenceBuckets[bucket]; exists {
			pct := float64(count) / float64(report.TotalPatterns) * 100
			fmt.Printf("   %s: %4d patterns (%5.1f%%)\n", bucket, count, pct)
		}
	}

	// Latency distribution
	fmt.Printf("\n⏱️  Latency Distribution:\n")
	latencyBuckets := []string{"<100ms", "100-500ms", "500ms-1s", "1-2s", "2-5s", ">5s"}
	for _, bucket := range latencyBuckets {
		if count, exists := report.LatencyBuckets[bucket]; exists {
			pct := float64(count) / float64(report.TotalPatterns) * 100
			fmt.Printf("   %s: %4d patterns (%5.1f%%)\n", bucket, count, pct)
		}
	}

	// Error analysis
	if len(report.ErrorAnalysis) > 0 {
		fmt.Printf("\n❌ Error Analysis:\n")
		for errorType, count := range report.ErrorAnalysis {
			pct := float64(count) / float64(report.TotalPatterns) * 100
			fmt.Printf("   %-20s: %3d occurrences (%5.1f%%)\n", errorType, count, pct)
		}

		if len(report.TopErrors) > 0 {
			fmt.Printf("\n🔍 Top Errors:\n")
			for i, errDetail := range report.TopErrors {
				fmt.Printf("   %d. [%s] %s (count: %d)\n",
					i+1, errDetail.PatternID, errDetail.Error, errDetail.Count)
			}
		}
	}

	// Framework performance (top 10)
	fmt.Printf("\n🛠️  Top Framework Performance:\n")
	type fwStat struct {
		name  string
		stats *FrameworkStats
	}
	fwStats := make([]fwStat, 0)
	for fw, stats := range report.FrameworkStats {
		fwStats = append(fwStats, fwStat{name: fw, stats: stats})
	}
	sort.Slice(fwStats, func(i, j int) bool {
		return fwStats[i].stats.Total > fwStats[j].stats.Total
	})
	for i, fw := range fwStats {
		if i >= 10 {
			break
		}
		fmt.Printf("   %-15s: %3d patterns | Accuracy: %6.2f%%\n",
			fw.name, fw.stats.Total, fw.stats.Accuracy)
	}

	fmt.Printf("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
}

func main() {
	// Create evaluator
	evaluator, err := NewSystemEvaluator("test_patterns_1000.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to create evaluator: %v\n", err)
		os.Exit(1)
	}

	// Run evaluation
	if err := evaluator.EvaluateAll(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Evaluation failed: %v\n", err)
		os.Exit(1)
	}

	// Generate report
	evaluator.GenerateReport()

	// Print report to console
	evaluator.PrintReport()

	// Save report to file
	reportFile := "evaluation_report_1000.json"
	if err := evaluator.SaveReport(reportFile); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to save report: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\n💾 Detailed report saved to: %s\n", reportFile)
}

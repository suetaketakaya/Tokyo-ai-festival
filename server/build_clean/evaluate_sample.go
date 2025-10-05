package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"os"
	"time"
)

// Quick sample evaluation - tests 100 random patterns for fast validation
func main() {
	// Load all patterns
	data, err := ioutil.ReadFile("test_patterns_1000.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to read patterns: %v\n", err)
		os.Exit(1)
	}

	var allPatterns []TestPattern
	if err := json.Unmarshal(data, &allPatterns); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to parse patterns: %v\n", err)
		os.Exit(1)
	}

	// Sample 100 random patterns (stratified by category)
	rand.Seed(time.Now().UnixNano())

	sampleSize := 100
	if len(allPatterns) < sampleSize {
		sampleSize = len(allPatterns)
	}

	// Stratified sampling
	categoryPatterns := make(map[string][]TestPattern)
	for _, p := range allPatterns {
		categoryPatterns[p.Category] = append(categoryPatterns[p.Category], p)
	}

	samplePatterns := make([]TestPattern, 0, sampleSize)
	patternsPerCategory := sampleSize / len(categoryPatterns)

	for _, patterns := range categoryPatterns {
		n := patternsPerCategory
		if n > len(patterns) {
			n = len(patterns)
		}

		// Random selection from category
		perm := rand.Perm(len(patterns))
		for i := 0; i < n; i++ {
			samplePatterns = append(samplePatterns, patterns[perm[i]])
		}
	}

	// Fill remaining slots randomly
	for len(samplePatterns) < sampleSize && len(samplePatterns) < len(allPatterns) {
		idx := rand.Intn(len(allPatterns))
		samplePatterns = append(samplePatterns, allPatterns[idx])
	}

	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("🔬 Sample Evaluation (100 patterns)\n")
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("📊 Sampled from %d total patterns\n\n", len(allPatterns))

	// Create evaluator with sample
	evaluator := &SystemEvaluator{
		Patterns:        samplePatterns,
		Results:         make([]EvaluationResult, 0, len(samplePatterns)),
		WandbClient:     NewWandbModelClient(),
		ButtonGenerator: NewDynamicButtonGenerator(),
	}

	// Run evaluation
	for i, pattern := range samplePatterns {
		if (i+1)%10 == 0 || i == 0 {
			fmt.Printf("Progress: %d/%d (%.1f%%)\n", i+1, len(samplePatterns),
				float64(i+1)/float64(len(samplePatterns))*100)
		}
		result := evaluator.EvaluatePattern(pattern)
		evaluator.Results = append(evaluator.Results, result)
	}

	fmt.Printf("\n✅ Sample evaluation completed\n")

	// Generate report
	evaluator.GenerateReport()
	evaluator.PrintReport()

	// Save report
	reportFile := "evaluation_sample_100.json"
	if err := evaluator.SaveReport(reportFile); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to save report: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\n💾 Sample report saved to: %s\n", reportFile)
	fmt.Printf("📈 Extrapolated full accuracy: ~%.2f%%\n", evaluator.Report.Accuracy)
}

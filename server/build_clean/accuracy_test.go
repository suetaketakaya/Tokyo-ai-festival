package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"testing"
	"time"
)

// TestCase represents a single test case
type TestCase struct {
	Input            string   `json:"input"`
	ExpectedType     string   `json:"expected_type"`
	MinConfidence    float64  `json:"min_confidence"`
	ExpectedKeywords []string `json:"expected_keywords"`
}

// AccuracyReport contains overall test results
type AccuracyReport struct {
	Timestamp        string                 `json:"timestamp"`
	OverallAccuracy  float64                `json:"overall_accuracy"`
	Phases           map[string]PhaseReport `json:"phases"`
	ImprovementsNeeded []string             `json:"improvements_needed"`
}

// PhaseReport contains phase-specific results
type PhaseReport struct {
	Accuracy        float64 `json:"accuracy"`
	Confidence      float64 `json:"confidence"`
	TestCount       int     `json:"test_count"`
	Passed          int     `json:"passed"`
	Failed          int     `json:"failed"`
	AvgDurationMs   int64   `json:"avg_duration_ms"`
	AdditionalStats map[string]interface{} `json:"additional_stats,omitempty"`
}

// Command analysis test cases
var commandAnalysisTests = []TestCase{
	// Web App Tests
	{
		Input:            "React.jsを使用してTodoアプリを作成してください",
		ExpectedType:     "web_app",
		MinConfidence:    0.6,
		ExpectedKeywords: []string{"react", "todo"},
	},
	{
		Input:            "シングルページアプリケーションでカウンターを作成",
		ExpectedType:     "web_app",
		MinConfidence:    0.5,
		ExpectedKeywords: []string{"spa", "counter"},
	},
	{
		Input:            "Vue.jsで計算機アプリケーションを開発してください",
		ExpectedType:     "web_app",
		MinConfidence:    0.6,
		ExpectedKeywords: []string{"vue", "calculator"},
	},

	// Machine Learning Tests
	{
		Input:            "TensorFlowでMNIST CNNモデルを訓練してください",
		ExpectedType:     "machine_learning",
		MinConfidence:    0.7,
		ExpectedKeywords: []string{"tensorflow", "mnist", "cnn"},
	},
	{
		Input:            "Kerasを使用して手書き数字認識モデルを作成",
		ExpectedType:     "machine_learning",
		MinConfidence:    0.6,
		ExpectedKeywords: []string{"keras", "手書き", "認識"},
	},
	{
		Input:            "PyTorchでアイリスデータセット分類",
		ExpectedType:     "machine_learning",
		MinConfidence:    0.6,
		ExpectedKeywords: []string{"pytorch", "アイリス", "分類"},
	},

	// Visualization Tests
	{
		Input:            "matplotlibでグラフを作成してください",
		ExpectedType:     "visualization",
		MinConfidence:    0.6,
		ExpectedKeywords: []string{"matplotlib", "グラフ"},
	},
	{
		Input:            "seabornを使って散布図とヒストグラムを可視化",
		ExpectedType:     "visualization",
		MinConfidence:    0.7,
		ExpectedKeywords: []string{"seaborn", "散布図", "可視化"},
	},
	{
		Input:            "データ可視化プロット作成",
		ExpectedType:     "visualization",
		MinConfidence:    0.5,
		ExpectedKeywords: []string{"可視化", "plot"},
	},

	// Data Analysis Tests
	{
		Input:            "pandasでCSVデータを分析してください",
		ExpectedType:     "data_analysis",
		MinConfidence:    0.6,
		ExpectedKeywords: []string{"pandas", "csv", "分析"},
	},
	{
		Input:            "numpyとpandasでデータ処理と統計分析",
		ExpectedType:     "data_analysis",
		MinConfidence:    0.7,
		ExpectedKeywords: []string{"numpy", "pandas", "統計"},
	},

	// API Tests
	{
		Input:            "FastAPIでREST APIを作成してください",
		ExpectedType:     "api",
		MinConfidence:    0.7,
		ExpectedKeywords: []string{"fastapi", "rest", "api"},
	},
	{
		Input:            "Flaskでバックエンドサーバーを開発",
		ExpectedType:     "api",
		MinConfidence:    0.6,
		ExpectedKeywords: []string{"flask", "サーバー"},
	},
}

// TestPhase1CommandAnalysis tests command analysis accuracy
func TestPhase1CommandAnalysis(t *testing.T) {
	log.Println("🧪 Starting Phase 1: Command Analysis Tests")

	passed := 0
	totalDuration := time.Duration(0)
	totalConfidence := 0.0

	for i, test := range commandAnalysisTests {
		startTime := time.Now()
		analysis := AnalyzeCommandWithScoring(test.Input)
		duration := time.Since(startTime)
		totalDuration += duration
		totalConfidence += analysis.Confidence

		// Check type match
		typeMatch := analysis.Type == test.ExpectedType

		// Check confidence threshold
		confidenceOK := analysis.Confidence >= test.MinConfidence

		// Check keyword matches
		keywordsMatch := containsExpectedKeywords(analysis.Keywords, test.ExpectedKeywords)

		// Overall pass/fail
		testPassed := typeMatch && confidenceOK && keywordsMatch

		if testPassed {
			passed++
			log.Printf("  ✅ Test %d PASS: %s → %s (%.2f)",
				i+1, truncate(test.Input, 40), analysis.Type, analysis.Confidence)
		} else {
			log.Printf("  ❌ Test %d FAIL: %s", i+1, truncate(test.Input, 40))
			if !typeMatch {
				log.Printf("     Type: got %s, expected %s", analysis.Type, test.ExpectedType)
			}
			if !confidenceOK {
				log.Printf("     Confidence: %.2f < %.2f", analysis.Confidence, test.MinConfidence)
			}
			if !keywordsMatch {
				log.Printf("     Keywords: missing %v", missingKeywords(analysis.Keywords, test.ExpectedKeywords))
			}
		}
	}

	// Calculate metrics
	total := len(commandAnalysisTests)
	accuracy := float64(passed) / float64(total) * 100
	avgDuration := totalDuration / time.Duration(total)
	avgConfidence := totalConfidence / float64(total)

	log.Printf("\n📊 Phase 1 Results:")
	log.Printf("   Accuracy: %.2f%% (%d/%d)", accuracy, passed, total)
	log.Printf("   Average Confidence: %.2f", avgConfidence)
	log.Printf("   Average Duration: %v", avgDuration)

	// Fail test if accuracy is too low
	if accuracy < 80.0 {
		t.Errorf("Phase 1 accuracy too low: %.2f%% < 80.0%%", accuracy)
	}
}

// TestPhase2CodeGeneration tests code generation quality
func TestPhase2CodeGeneration(t *testing.T) {
	log.Println("\n🧪 Starting Phase 2: Code Generation Tests")

	tests := []struct {
		command         string
		cmdType         string
		minSize         int
		mustContain     []string
		minCompleteness float64
	}{
		{
			command:         "Todoアプリ作成",
			cmdType:         "web_app",
			minSize:         1000,
			mustContain:     []string{"<style>", "<script>", "function"},
			minCompleteness: 0.7,
		},
		{
			command:         "TensorFlow MNIST",
			cmdType:         "machine_learning",
			minSize:         2000,
			mustContain:     []string{"import tensorflow", "model", "fit"},
			minCompleteness: 0.6,
		},
		{
			command:         "matplotlib グラフ",
			cmdType:         "visualization",
			minSize:         500,
			mustContain:     []string{"import matplotlib", "plt", "savefig"},
			minCompleteness: 0.7,
		},
	}

	passed := 0

	for i, test := range tests {
		code := generateCodeContent(test.command, test.cmdType, "standard")

		sizeOK := len(code) >= test.minSize
		containsAll := true
		missingElements := []string{}

		for _, required := range test.mustContain {
			if !containsSubstring(code, required) {
				containsAll = false
				missingElements = append(missingElements, required)
			}
		}

		completeness := evaluateCodeCompleteness(code, test.cmdType)
		completenessOK := completeness >= test.minCompleteness

		testPassed := sizeOK && containsAll && completenessOK

		if testPassed {
			passed++
			log.Printf("  ✅ Test %d PASS: %s (%d bytes, %.2f completeness)",
				i+1, test.command, len(code), completeness)
		} else {
			log.Printf("  ❌ Test %d FAIL: %s", i+1, test.command)
			if !sizeOK {
				log.Printf("     Size: %d < %d", len(code), test.minSize)
			}
			if !containsAll {
				log.Printf("     Missing: %v", missingElements)
			}
			if !completenessOK {
				log.Printf("     Completeness: %.2f < %.2f", completeness, test.minCompleteness)
			}
		}
	}

	accuracy := float64(passed) / float64(len(tests)) * 100
	log.Printf("\n📊 Phase 2 Results:")
	log.Printf("   Accuracy: %.2f%% (%d/%d)", accuracy, passed, len(tests))

	if accuracy < 75.0 {
		t.Errorf("Phase 2 accuracy too low: %.2f%% < 75.0%%", accuracy)
	}
}

// TestGenerateAccuracyReport generates comprehensive accuracy report
func TestGenerateAccuracyReport(t *testing.T) {
	log.Println("\n📝 Generating Accuracy Report...")

	report := AccuracyReport{
		Timestamp: time.Now().Format(time.RFC3339),
		Phases:    make(map[string]PhaseReport),
	}

	// Run Phase 1 tests
	phase1Passed := 0
	phase1Total := len(commandAnalysisTests)
	phase1Duration := time.Duration(0)
	phase1Confidence := 0.0

	for _, test := range commandAnalysisTests {
		start := time.Now()
		analysis := AnalyzeCommandWithScoring(test.Input)
		phase1Duration += time.Since(start)
		phase1Confidence += analysis.Confidence

		if analysis.Type == test.ExpectedType &&
		   analysis.Confidence >= test.MinConfidence &&
		   containsExpectedKeywords(analysis.Keywords, test.ExpectedKeywords) {
			phase1Passed++
		}
	}

	report.Phases["command_analysis"] = PhaseReport{
		Accuracy:      float64(phase1Passed) / float64(phase1Total) * 100,
		Confidence:    phase1Confidence / float64(phase1Total),
		TestCount:     phase1Total,
		Passed:        phase1Passed,
		Failed:        phase1Total - phase1Passed,
		AvgDurationMs: phase1Duration.Milliseconds() / int64(phase1Total),
	}

	// Calculate overall accuracy
	report.OverallAccuracy = report.Phases["command_analysis"].Accuracy

	// Identify improvements needed
	if report.Phases["command_analysis"].Accuracy < 90.0 {
		report.ImprovementsNeeded = append(report.ImprovementsNeeded,
			fmt.Sprintf("Phase 1: コマンド分析精度向上 (%.1f%% → 90.0%%)",
				report.Phases["command_analysis"].Accuracy))
	}

	// Save report to JSON file
	reportJSON, _ := json.MarshalIndent(report, "", "  ")
	err := os.WriteFile("accuracy_report.json", reportJSON, 0644)
	if err != nil {
		t.Errorf("Failed to save report: %v", err)
	}

	log.Printf("\n📊 Overall Accuracy: %.2f%%", report.OverallAccuracy)
	log.Printf("📄 Report saved to: accuracy_report.json")

	// Print report
	fmt.Println("\n" + string(reportJSON))
}

// Helper functions

func containsExpectedKeywords(actual, expected []string) bool {
	for _, exp := range expected {
		found := false
		for _, act := range actual {
			if act == exp {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

func missingKeywords(actual, expected []string) []string {
	missing := []string{}
	for _, exp := range expected {
		found := false
		for _, act := range actual {
			if act == exp {
				found = true
				break
			}
		}
		if !found {
			missing = append(missing, exp)
		}
	}
	return missing
}

func containsSubstring(text, substr string) bool {
	return len(text) > 0 && len(substr) > 0 &&
	       (text == substr || len(text) >= len(substr) &&
	        findSubstring(text, substr))
}

func findSubstring(text, substr string) bool {
	for i := 0; i <= len(text)-len(substr); i++ {
		if text[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func evaluateCodeCompleteness(code, cmdType string) float64 {
	completeness := 0.0

	switch cmdType {
	case "web_app":
		if containsSubstring(code, "<style>") {
			completeness += 0.3
		}
		if containsSubstring(code, "<script>") {
			completeness += 0.4
		}
		if containsSubstring(code, "<!DOCTYPE html>") {
			completeness += 0.3
		}

	case "machine_learning":
		if containsSubstring(code, "import") {
			completeness += 0.2
		}
		if containsSubstring(code, "model") {
			completeness += 0.3
		}
		if containsSubstring(code, "fit") || containsSubstring(code, "train") {
			completeness += 0.3
		}
		if containsSubstring(code, "savefig") {
			completeness += 0.2
		}

	case "visualization":
		if containsSubstring(code, "import matplotlib") {
			completeness += 0.3
		}
		if containsSubstring(code, "plt") {
			completeness += 0.3
		}
		if containsSubstring(code, "savefig") {
			completeness += 0.4
		}
	}

	return completeness
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

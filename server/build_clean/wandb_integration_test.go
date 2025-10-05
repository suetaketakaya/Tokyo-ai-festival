package main

import (
	"testing"
)

// TestWandbMLPrediction tests W&B ML model prediction
func TestWandbMLPrediction(t *testing.T) {
	client := NewWandbModelClient()

	tests := []struct {
		name          string
		command       string
		expectedType  string
		minConfidence float64
	}{
		{
			name:          "TensorFlow MNIST",
			command:       "TensorFlowでMNIST CNNモデルを訓練してください",
			expectedType:  "machine_learning",
			minConfidence: 0.90,
		},
		{
			name:          "React Todo App",
			command:       "React.jsを使用してTodoアプリを作成してください",
			expectedType:  "web_app",
			minConfidence: 0.85,
		},
		{
			name:          "Matplotlib Visualization",
			command:       "matplotlibでグラフを作成してください",
			expectedType:  "visualization",
			minConfidence: 0.85,
		},
		{
			name:          "Pandas Data Analysis",
			command:       "pandasでCSVデータを分析してください",
			expectedType:  "data_analysis",
			minConfidence: 0.80,
		},
		{
			name:          "FastAPI REST API",
			command:       "FastAPIでREST APIを作成してください",
			expectedType:  "api",
			minConfidence: 0.80,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prediction, err := client.Predict(tt.command, nil)

			if err != nil {
				t.Errorf("Predict() error = %v", err)
				return
			}

			// Type check
			if prediction.CommandType != tt.expectedType {
				t.Errorf("CommandType = %v, want %v",
					prediction.CommandType, tt.expectedType)
			}

			// Confidence check
			if prediction.Confidence < tt.minConfidence {
				t.Errorf("Confidence = %.2f, want >= %.2f",
					prediction.Confidence, tt.minConfidence)
			}

			// Log success
			t.Logf("✅ %s: type=%s, confidence=%.2f",
				tt.name, prediction.CommandType, prediction.Confidence)
		})
	}
}

// TestWandbMLWithClaudeBlending tests ML + Claude CLI blending
func TestWandbMLWithClaudeBlending(t *testing.T) {
	client := NewWandbModelClient()

	// Simulate Claude CLI result
	claudeResult := &ClaudeCliResponse{
		CommandType: "machine_learning",
		Confidence:  0.92,
		Language:    "python",
		Framework:   "tensorflow",
	}

	prediction, err := client.Predict("TensorFlowでMNIST CNNモデルを訓練してください", claudeResult)

	if err != nil {
		t.Fatalf("Predict() error = %v", err)
	}

	// Blended prediction should have higher confidence
	if prediction.Confidence < claudeResult.Confidence {
		t.Errorf("Blended confidence = %.2f, should be >= Claude confidence %.2f",
			prediction.Confidence, claudeResult.Confidence)
	}

	// Should match expected type
	if prediction.CommandType != "machine_learning" {
		t.Errorf("CommandType = %v, want machine_learning", prediction.CommandType)
	}

	t.Logf("✅ Blended prediction: type=%s, confidence=%.2f (Claude: %.2f, ML: %.2f)",
		prediction.CommandType, prediction.Confidence,
		*prediction.ClaudeConfidence, prediction.MLConfidence)
}

// TestWandbMLFallback tests fallback behavior
func TestWandbMLFallback(t *testing.T) {
	client := NewWandbModelClient()

	claudeResult := &ClaudeCliResponse{
		CommandType: "web_app",
		Confidence:  0.88,
		Language:    "html",
		Framework:   "react",
	}

	// Test with fallback (should not panic)
	prediction := client.PredictWithFallback("React Todo App", claudeResult)

	if prediction == nil {
		t.Fatal("PredictWithFallback() returned nil")
	}

	if prediction.CommandType == "" {
		t.Error("CommandType is empty")
	}

	if prediction.Confidence == 0 {
		t.Error("Confidence is 0")
	}

	t.Logf("✅ Fallback prediction: type=%s, confidence=%.2f",
		prediction.CommandType, prediction.Confidence)
}

// TestEnhanceClaudeResponseWithML tests full enhancement pipeline
func TestEnhanceClaudeResponseWithML(t *testing.T) {
	claudeResult := &ClaudeCliResponse{
		GeneratedCode: "import tensorflow as tf\n\nmodel = tf.keras.Sequential()",
		Language:      "python",
		Framework:     "tensorflow",
		CommandType:   "machine_learning",
		Confidence:    0.90,
		Explanation:   "TensorFlow model implementation",
	}

	enhanced, err := EnhanceClaudeResponseWithML("TensorFlow CNN model", claudeResult)

	if err != nil {
		t.Fatalf("EnhanceClaudeResponseWithML() error = %v", err)
	}

	// Enhanced response should preserve code
	if enhanced.GeneratedCode != claudeResult.GeneratedCode {
		t.Error("GeneratedCode was modified")
	}

	// Enhanced response should have ML confidence info
	if enhanced.Confidence == 0 {
		t.Error("Enhanced confidence is 0")
	}

	// Should have ML metadata in explanation
	if enhanced.Explanation == claudeResult.Explanation {
		t.Log("⚠️ Explanation was not enhanced with ML metadata")
	}

	t.Logf("✅ Enhanced response: type=%s, confidence=%.2f",
		enhanced.CommandType, enhanced.Confidence)
}

// TestTopCategories tests category probability ranking
func TestTopCategories(t *testing.T) {
	prediction := &WandbMLPrediction{
		CategoryProbabilities: map[string]float64{
			"machine_learning": 0.75,
			"web_app":          0.10,
			"visualization":    0.08,
			"data_analysis":    0.05,
			"api":              0.02,
		},
	}

	top3 := prediction.GetTopCategories(3)

	if len(top3) != 3 {
		t.Errorf("GetTopCategories(3) returned %d items, want 3", len(top3))
	}

	if top3[0] != "machine_learning" {
		t.Errorf("Top category = %s, want machine_learning", top3[0])
	}

	t.Logf("✅ Top 3 categories: %v", top3)
}

// TestMLAccuracyImprovement compares Stage 1 vs Stage 2 accuracy
func TestMLAccuracyImprovement(t *testing.T) {
	testCases := []struct {
		command      string
		expectedType string
	}{
		{"TensorFlowでMNIST CNNモデルを訓練してください", "machine_learning"},
		{"React.jsを使用してTodoアプリを作成してください", "web_app"},
		{"matplotlibでグラフを作成してください", "visualization"},
		{"pandasでCSVデータを分析してください", "data_analysis"},
		{"FastAPIでREST APIを作成してください", "api"},
	}

	stage1Correct := 0
	stage2Correct := 0

	for _, tc := range testCases {
		// Stage 1: Claude CLI only (simulation)
		claudeResult, _ := ExecuteClaudeCLI(tc.command, "/tmp/test")
		if claudeResult.CommandType == tc.expectedType {
			stage1Correct++
		}

		// Stage 2: Claude CLI + W&B ML
		client := NewWandbModelClient()
		mlResult := client.PredictWithFallback(tc.command, claudeResult)
		if mlResult.CommandType == tc.expectedType {
			stage2Correct++
		}
	}

	stage1Accuracy := float64(stage1Correct) / float64(len(testCases)) * 100
	stage2Accuracy := float64(stage2Correct) / float64(len(testCases)) * 100

	t.Logf("📊 Accuracy Comparison:")
	t.Logf("  Stage 1 (Claude CLI): %.1f%% (%d/%d)", stage1Accuracy, stage1Correct, len(testCases))
	t.Logf("  Stage 2 (ML Enhanced): %.1f%% (%d/%d)", stage2Accuracy, stage2Correct, len(testCases))

	improvement := stage2Accuracy - stage1Accuracy
	t.Logf("  Improvement: %+.1f%%", improvement)

	// Stage 2 should be >= Stage 1
	if stage2Accuracy < stage1Accuracy {
		t.Errorf("Stage 2 accuracy (%.1f%%) is worse than Stage 1 (%.1f%%)",
			stage2Accuracy, stage1Accuracy)
	}
}

// BenchmarkWandbMLPrediction benchmarks ML prediction performance
func BenchmarkWandbMLPrediction(b *testing.B) {
	client := NewWandbModelClient()
	command := "TensorFlowでMNIST CNNモデルを訓練してください"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = client.Predict(command, nil)
	}
}

// BenchmarkMLEnhancement benchmarks full enhancement pipeline
func BenchmarkMLEnhancement(b *testing.B) {
	claudeResult := &ClaudeCliResponse{
		GeneratedCode: "import tensorflow as tf",
		Language:      "python",
		Framework:     "tensorflow",
		CommandType:   "machine_learning",
		Confidence:    0.90,
	}
	command := "TensorFlowでMNIST CNNモデルを訓練してください"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = EnhanceClaudeResponseWithML(command, claudeResult)
	}
}

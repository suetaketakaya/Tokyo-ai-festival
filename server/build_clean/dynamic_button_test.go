package main

import (
	"testing"
)

// TestDynamicButtonGeneration tests button generation from ML predictions
func TestDynamicButtonGeneration(t *testing.T) {
	gen := NewDynamicButtonGenerator()

	tests := []struct {
		name            string
		prediction      *WandbMLPrediction
		command         string
		expectedCount   int
		expectedButtons []string
	}{
		{
			name: "Machine Learning - TensorFlow",
			prediction: &WandbMLPrediction{
				CommandType:  "machine_learning",
				Confidence:   0.95,
				MLConfidence: 0.94,
				CategoryProbabilities: map[string]float64{
					"machine_learning": 0.95,
				},
			},
			command:         "TensorFlowでMNIST CNNモデルを訓練してください",
			expectedCount:   5, // 4 base + 1 TensorBoard contextual
			expectedButtons: []string{"ml_train", "ml_visualize", "ml_export", "ml_predict", "tf_tensorboard"},
		},
		{
			name: "Web App - React",
			prediction: &WandbMLPrediction{
				CommandType:  "web_app",
				Confidence:   0.92,
				MLConfidence: 0.91,
				CategoryProbabilities: map[string]float64{
					"web_app": 0.92,
				},
			},
			command:         "React.jsを使用してTodoアプリを作成してください",
			expectedCount:   5, // 4 base + 1 React dev server
			expectedButtons: []string{"web_preview", "web_deploy", "web_edit", "web_share", "react_dev_server"},
		},
		{
			name: "Visualization - Matplotlib",
			prediction: &WandbMLPrediction{
				CommandType:  "visualization",
				Confidence:   0.90,
				MLConfidence: 0.90,
				CategoryProbabilities: map[string]float64{
					"visualization": 0.90,
				},
			},
			command:         "matplotlibでグラフを作成してください",
			expectedCount:   5, // 4 base + 1 interactive viz
			expectedButtons: []string{"viz_show", "viz_download", "viz_customize", "viz_export_data", "viz_interactive"},
		},
		{
			name: "Data Analysis - Pandas",
			prediction: &WandbMLPrediction{
				CommandType:  "data_analysis",
				Confidence:   0.88,
				MLConfidence: 0.88,
				CategoryProbabilities: map[string]float64{
					"data_analysis": 0.88,
				},
			},
			command:         "pandasでCSVデータを分析してください",
			expectedCount:   5, // 4 base + 1 data preview
			expectedButtons: []string{"data_show_stats", "data_visualize", "data_export", "data_filter", "data_preview"},
		},
		{
			name: "API - FastAPI",
			prediction: &WandbMLPrediction{
				CommandType:  "api",
				Confidence:   0.88,
				MLConfidence: 0.88,
				CategoryProbabilities: map[string]float64{
					"api": 0.88,
				},
			},
			command:         "FastAPIでREST APIを作成してください",
			expectedCount:   4, // 4 base only
			expectedButtons: []string{"api_test", "api_docs", "api_deploy", "api_monitor"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buttons := gen.GenerateButtons(tt.prediction, tt.command)

			// Check button count
			if len(buttons) != tt.expectedCount {
				t.Errorf("Button count = %d, want %d", len(buttons), tt.expectedCount)
			}

			// Check button IDs
			buttonIDs := make(map[string]bool)
			for _, btn := range buttons {
				buttonIDs[btn.ID] = true
			}

			for _, expectedID := range tt.expectedButtons {
				if !buttonIDs[expectedID] {
					t.Errorf("Expected button '%s' not found", expectedID)
				}
			}

			// Verify metadata
			for _, btn := range buttons {
				if btn.Command != tt.command {
					t.Errorf("Button command = %s, want %s", btn.Command, tt.command)
				}
				if btn.Metadata != nil {
					if conf, ok := btn.Metadata["confidence"].(float64); ok {
						if conf != tt.prediction.Confidence {
							t.Errorf("Button confidence = %v, want %v", conf, tt.prediction.Confidence)
						}
					}
				}
			}

			t.Logf("✅ %s: generated %d buttons", tt.name, len(buttons))
		})
	}
}

// TestButtonPrioritySorting tests button priority sorting
func TestButtonPrioritySorting(t *testing.T) {
	gen := NewDynamicButtonGenerator()

	prediction := &WandbMLPrediction{
		CommandType:  "machine_learning",
		Confidence:   0.95,
		MLConfidence: 0.94,
	}

	buttons := gen.GenerateButtons(prediction, "Test command")
	sortedButtons := gen.GetButtonsByPriority(buttons, 3)

	if len(sortedButtons) != 3 {
		t.Errorf("Sorted buttons count = %d, want 3", len(sortedButtons))
	}

	// Verify priority order
	for i := 0; i < len(sortedButtons)-1; i++ {
		if sortedButtons[i].Priority > sortedButtons[i+1].Priority {
			t.Errorf("Buttons not sorted by priority: %d > %d",
				sortedButtons[i].Priority, sortedButtons[i+1].Priority)
		}
	}

	t.Logf("✅ Top 3 buttons (priorities): %d, %d, %d",
		sortedButtons[0].Priority, sortedButtons[1].Priority, sortedButtons[2].Priority)
}

// TestCategoryInfo tests category template retrieval
func TestCategoryInfo(t *testing.T) {
	gen := NewDynamicButtonGenerator()

	categories := []string{
		"machine_learning",
		"web_app",
		"visualization",
		"data_analysis",
		"api",
		"docker",
		"jupyter",
		"general",
	}

	for _, category := range categories {
		info := gen.GetCategoryInfo(category)

		if info.Category != category {
			t.Errorf("Category = %s, want %s", info.Category, category)
		}

		if info.Icon == "" {
			t.Errorf("Category %s has no icon", category)
		}

		if info.Color == "" {
			t.Errorf("Category %s has no color", category)
		}

		if len(info.Templates) == 0 {
			t.Errorf("Category %s has no templates", category)
		}

		t.Logf("✅ %s: %s %s (%d templates)",
			category, info.Icon, info.Description, len(info.Templates))
	}
}

// TestUnknownCategory tests fallback for unknown categories
func TestUnknownCategory(t *testing.T) {
	gen := NewDynamicButtonGenerator()

	prediction := &WandbMLPrediction{
		CommandType:  "unknown_category",
		Confidence:   0.50,
		MLConfidence: 0.50,
	}

	buttons := gen.GenerateButtons(prediction, "Unknown command")

	// Should fall back to general category
	if len(buttons) == 0 {
		t.Error("No buttons generated for unknown category")
	}

	for _, btn := range buttons {
		if btn.Category != "general" {
			t.Errorf("Button category = %s, want general", btn.Category)
		}
	}

	t.Logf("✅ Unknown category fallback: generated %d buttons", len(buttons))
}

// TestContextualButtons tests context-specific button generation
func TestContextualButtons(t *testing.T) {
	gen := NewDynamicButtonGenerator()

	tests := []struct {
		name           string
		command        string
		category       string
		expectedButton string
	}{
		{
			name:           "TensorFlow adds TensorBoard",
			command:        "TensorFlowでモデル訓練",
			category:       "machine_learning",
			expectedButton: "tf_tensorboard",
		},
		{
			name:           "React adds dev server",
			command:        "Reactアプリ作成",
			category:       "web_app",
			expectedButton: "react_dev_server",
		},
		{
			name:           "Matplotlib adds interactive",
			command:        "matplotlibでグラフ作成",
			category:       "visualization",
			expectedButton: "viz_interactive",
		},
		{
			name:           "Pandas adds data preview",
			command:        "pandasでCSV分析",
			category:       "data_analysis",
			expectedButton: "data_preview",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prediction := &WandbMLPrediction{
				CommandType:  tt.category,
				Confidence:   0.90,
				MLConfidence: 0.90,
			}

			buttons := gen.GenerateButtons(prediction, tt.command)

			found := false
			for _, btn := range buttons {
				if btn.ID == tt.expectedButton {
					found = true
					if !btn.Metadata["contextual"].(bool) {
						t.Errorf("Button %s should be marked as contextual", tt.expectedButton)
					}
					break
				}
			}

			if !found {
				t.Errorf("Expected contextual button '%s' not found", tt.expectedButton)
			}

			t.Logf("✅ %s: found contextual button %s", tt.name, tt.expectedButton)
		})
	}
}

// BenchmarkButtonGeneration benchmarks button generation performance
func BenchmarkButtonGeneration(b *testing.B) {
	gen := NewDynamicButtonGenerator()
	prediction := &WandbMLPrediction{
		CommandType:  "machine_learning",
		Confidence:   0.95,
		MLConfidence: 0.94,
	}
	command := "TensorFlowでMNIST CNNモデルを訓練してください"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = gen.GenerateButtons(prediction, command)
	}
}

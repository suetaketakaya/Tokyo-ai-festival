package main

import (
	"fmt"
	"strings"
	"testing"
)

// TestClaudeCliSimulation tests Claude CLI simulation mode
func TestClaudeCliSimulation(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		expectedType   string
		expectedLang   string
		minConfidence  float64
		mustContain    string
	}{
		{
			name:          "TensorFlow MNIST",
			input:         "TensorFlowでMNIST CNNモデルを訓練してください",
			expectedType:  "machine_learning",
			expectedLang:  "python",
			minConfidence: 0.90,
			mustContain:   "import tensorflow",
		},
		{
			name:          "React Todo App",
			input:         "React.jsを使用してTodoアプリを作成してください",
			expectedType:  "web_app",
			expectedLang:  "html",
			minConfidence: 0.85,
			mustContain:   "<!DOCTYPE html>",
		},
		{
			name:          "Matplotlib Visualization",
			input:         "matplotlibでグラフを作成してください",
			expectedType:  "visualization",
			expectedLang:  "python",
			minConfidence: 0.85,
			mustContain:   "import matplotlib",
		},
		{
			name:          "Pandas Data Analysis",
			input:         "pandasでCSVデータを分析してください",
			expectedType:  "data_analysis",
			expectedLang:  "python",
			minConfidence: 0.80,
			mustContain:   "import pandas",
		},
		{
			name:          "日本語コマンド",
			input:         "手書き数字認識のCNNモデルを作成",
			expectedType:  "machine_learning",
			expectedLang:  "python",
			minConfidence: 0.85,
			mustContain:   "CNN",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response, err := ExecuteClaudeCLI(tt.input, "/tmp/test")

			if err != nil {
				t.Errorf("ExecuteClaudeCLI() error = %v", err)
				return
			}

			// Type check
			if response.CommandType != tt.expectedType {
				t.Errorf("CommandType = %v, want %v",
					response.CommandType, tt.expectedType)
			}

			// Language check
			if response.Language != tt.expectedLang {
				t.Errorf("Language = %v, want %v",
					response.Language, tt.expectedLang)
			}

			// Confidence check
			if response.Confidence < tt.minConfidence {
				t.Errorf("Confidence = %.2f, want >= %.2f",
					response.Confidence, tt.minConfidence)
			}

			// Code content check
			if !strings.Contains(response.GeneratedCode, tt.mustContain) {
				t.Errorf("GeneratedCode does not contain '%s'", tt.mustContain)
			}

			// Log success
			t.Logf("✅ %s: type=%s, lang=%s, confidence=%.2f",
				tt.name, response.CommandType, response.Language, response.Confidence)
		})
	}
}

// TestCodeBlockExtraction tests code block parsing
func TestCodeBlockExtraction(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name: "Python code block",
			input: "Here's a Python script:\n```python\nimport numpy as np\nprint(\"Hello\")\n```\nThat's it!",
			expected: "import numpy as np\nprint(\"Hello\")",
		},
		{
			name: "Multiple code blocks",
			input: "First block:\n```python\nprint(\"1\")\n```\nSecond block:\n```python\nprint(\"2\")\n```",
			expected: "print(\"1\")\n\nprint(\"2\")",
		},
		{
			name:     "No code blocks",
			input:    "Just plain text without any code",
			expected: "Just plain text without any code",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractCodeBlocks(tt.input)

			if result != tt.expected {
				t.Errorf("extractCodeBlocks() = %v, want %v", result, tt.expected)
			}
		})
	}
}

// TestCommandTypeInference tests command type inference from code
func TestCommandTypeInference(t *testing.T) {
	tests := []struct {
		name     string
		code     string
		expected string
	}{
		{
			name:     "TensorFlow code",
			code:     "import tensorflow as tf\nmodel = tf.keras.Sequential()\nmodel.fit(x, y)",
			expected: "machine_learning",
		},
		{
			name:     "HTML code",
			code:     "<!DOCTYPE html>\n<html>\n<head></head>\n<body></body>\n</html>",
			expected: "web_app",
		},
		{
			name:     "Matplotlib code",
			code:     "import matplotlib.pyplot as plt\nplt.plot([1,2,3])\nplt.savefig('plot.png')",
			expected: "visualization",
		},
		{
			name:     "Pandas code",
			code:     "import pandas as pd\ndf = pd.read_csv('data.csv')\nprint(df.describe())",
			expected: "data_analysis",
		},
		{
			name:     "FastAPI code",
			code:     "from fastapi import FastAPI\napp = FastAPI()\n@app.get(\"/\")\ndef root():\n    return {}",
			expected: "api",
		},
		{
			name:     "Generic Python",
			code:     "def hello():\n    print('Hello World')",
			expected: "general",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := inferCommandTypeFromCode(tt.code)

			if result != tt.expected {
				t.Errorf("inferCommandTypeFromCode() = %v, want %v", result, tt.expected)
			}
		})
	}
}

// TestLanguageDetection tests programming language detection
func TestLanguageDetection(t *testing.T) {
	tests := []struct {
		name     string
		code     string
		expected string
	}{
		{
			name:     "Python with imports",
			code:     "import os\nimport sys\ndef main():\n    pass",
			expected: "python",
		},
		{
			name:     "JavaScript with const",
			code:     "const x = 10;\nconst y = () => x * 2;",
			expected: "javascript",
		},
		{
			name:     "HTML",
			code:     "<!DOCTYPE html>\n<html lang=\"en\"></html>",
			expected: "html",
		},
		{
			name:     "Go",
			code:     "package main\nfunc main() {\n    fmt.Println(\"Hello\")\n}",
			expected: "go",
		},
		{
			name:     "Bash script",
			code:     "#!/bin/bash\necho 'Hello World'",
			expected: "bash",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detectLanguageFromCode(tt.code)

			if result != tt.expected {
				t.Errorf("detectLanguageFromCode() = %v, want %v", result, tt.expected)
			}
		})
	}
}

// TestFrameworkDetection tests framework detection
func TestFrameworkDetection(t *testing.T) {
	tests := []struct {
		name     string
		code     string
		expected string
	}{
		{
			name:     "TensorFlow",
			code:     "import tensorflow as tf",
			expected: "tensorflow",
		},
		{
			name:     "PyTorch",
			code:     "import torch\nimport torch.nn as nn",
			expected: "pytorch",
		},
		{
			name:     "Flask",
			code:     "from flask import Flask\napp = Flask(__name__)",
			expected: "flask",
		},
		{
			name:     "Pandas",
			code:     "import pandas as pd\nimport numpy as np",
			expected: "pandas",
		},
		{
			name:     "No framework",
			code:     "print('Hello World')",
			expected: "standard",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detectFrameworkFromCode(tt.code)

			if result != tt.expected {
				t.Errorf("detectFrameworkFromCode() = %v, want %v", result, tt.expected)
			}
		})
	}
}

// TestConfidenceEstimation tests confidence estimation from code quality
func TestConfidenceEstimation(t *testing.T) {
	tests := []struct {
		name        string
		code        string
		minConfidence float64
		maxConfidence float64
	}{
		{
			name:          "Empty code",
			code:          "",
			minConfidence: 0.0,
			maxConfidence: 0.0,
		},
		{
			name:          "Simple print",
			code:          "print('hello')",
			minConfidence: 0.5,
			maxConfidence: 0.6,
		},
		{
			name: "Complex with imports and functions",
			code: `import numpy as np
import pandas as pd

def process_data(df):
    # Process the dataframe
    return df.mean()

if __name__ == "__main__":
    main()`,
			minConfidence: 0.8,
			maxConfidence: 1.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := estimateConfidenceFromCode(tt.code)

			if result < tt.minConfidence || result > tt.maxConfidence {
				t.Errorf("estimateConfidenceFromCode() = %.2f, want [%.2f, %.2f]",
					result, tt.minConfidence, tt.maxConfidence)
			}

			t.Logf("Confidence for '%s': %.2f", tt.name, result)
		})
	}
}

// TestEndToEndIntegration tests full pipeline
func TestEndToEndIntegration(t *testing.T) {
	testCases := []struct {
		input string
		expectSuccess bool
	}{
		{
			input:         "TensorFlowでMNIST CNNモデルを作成してください",
			expectSuccess: true,
		},
		{
			input:         "Todoアプリを作成",
			expectSuccess: true,
		},
		{
			input:         "グラフを作成してください",
			expectSuccess: true,
		},
	}

	for i, tc := range testCases {
		t.Run(fmt.Sprintf("Integration_%d", i+1), func(t *testing.T) {
			response, err := ExecuteClaudeCLI(tc.input, "/tmp/test")

			if tc.expectSuccess && err != nil {
				t.Errorf("Expected success but got error: %v", err)
			}

			if tc.expectSuccess {
				// Verify response has necessary fields
				if response.GeneratedCode == "" {
					t.Error("Expected generated code but got empty")
				}
				if response.CommandType == "" {
					t.Error("Expected command type but got empty")
				}
				if response.Language == "" {
					t.Error("Expected language but got empty")
				}

				t.Logf("✅ Integration test passed: %s -> type=%s, lang=%s",
					tc.input, response.CommandType, response.Language)
			}
		})
	}
}

// BenchmarkClaudeCliSimulation benchmarks the simulation mode
func BenchmarkClaudeCliSimulation(b *testing.B) {
	input := "TensorFlowでMNIST CNNモデルを訓練してください"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = ExecuteClaudeCLI(input, "/tmp/test")
	}
}

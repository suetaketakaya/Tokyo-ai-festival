package main

import (
	"fmt"
	"log"
	"math"
	"strings"
	"time"
)

// CommandAnalysis represents enhanced command analysis with confidence scoring
type CommandAnalysis struct {
	Type       string             `json:"type"`
	Confidence float64            `json:"confidence"`
	Scores     map[string]float64 `json:"scores"`
	Keywords   []string           `json:"keywords"`
	Framework  string             `json:"framework"`
	Language   string             `json:"language"`
	Complexity string             `json:"complexity"`
}

// PhaseMetrics tracks performance metrics for each phase
type PhaseMetrics struct {
	PhaseName    string
	StartTime    time.Time
	EndTime      time.Time
	Duration     time.Duration
	Success      bool
	Confidence   float64
	ErrorMessage string
	Metadata     map[string]interface{}
}

// Record finalizes and logs the metrics
func (m *PhaseMetrics) Record() {
	m.EndTime = time.Now()
	m.Duration = m.EndTime.Sub(m.StartTime)

	successSymbol := "✅"
	if !m.Success {
		successSymbol = "❌"
	}

	log.Printf("📊 Phase: %s | Duration: %v | Success: %v %s | Confidence: %.2f",
		m.PhaseName, m.Duration, m.Success, successSymbol, m.Confidence)
}

// Keyword weights for different command types
var webAppKeywords = map[string]float64{
	"react":          0.35,
	"vue":            0.35,
	"angular":        0.35,
	"todo":           0.25,
	"calculator":     0.25,
	"計算機":           0.25,
	"counter":        0.25,
	"カウンター":         0.25,
	"webapp":         0.30,
	"spa":            0.30,
	"シングルページ":       0.25,
	"アプリケーション":       0.10,
	"アプリ":           0.10,
	"html":           0.20,
	"css":            0.15,
	"javascript":     0.20,
	"フロントエンド":       0.20,
	"ui":             0.15,
	"画面":            0.10,
	"ページ":           0.10,
	"作成":            0.05,
	"開発":            0.05,
	"svelte":         0.35,
	"next.js":        0.35,
	"nuxt":           0.35,
	"weather":        0.20,
	"gallery":        0.20,
	"chat":           0.20,
}

var mlKeywords = map[string]float64{
	"tensorflow":  0.40,
	"keras":       0.35,
	"pytorch":     0.40,
	"機械学習":       0.35,
	"ml":          0.25,
	"深層学習":       0.35,
	"mnist":       0.30,
	"cnn":         0.25,
	"rnn":         0.25,
	"lstm":        0.25,
	"訓練":         0.20,
	"トレーニング":     0.20,
	"モデル":        0.15,
	"分類":         0.15,
	"回帰":         0.15,
	"予測":         0.10,
	"ニューラルネット":   0.30,
	"neural":      0.30,
	"アイリス":       0.25,
	"iris":        0.25,
	"手書き":        0.20,
	"認識":         0.15,
	"画像分類":       0.25,
	"scikit-learn": 0.30,
	"sklearn":     0.30,
}

var visualizationKeywords = map[string]float64{
	"matplotlib":   0.40,
	"seaborn":      0.35,
	"plotly":       0.35,
	"グラフ":         0.30,
	"可視化":         0.35,
	"visualization": 0.35,
	"plot":         0.30,
	"プロット":        0.30,
	"chart":        0.25,
	"散布図":         0.25,
	"ヒストグラム":      0.25,
	"棒グラフ":        0.25,
	"折れ線グラフ":      0.25,
	"円グラフ":        0.25,
	"heatmap":      0.30,
	"散布":          0.20,
	"ビジュアライズ":     0.30,
}

var dataAnalysisKeywords = map[string]float64{
	"pandas":       0.40,
	"numpy":        0.35,
	"dataframe":    0.35,
	"csv":          0.30,
	"データ分析":       0.35,
	"data analysis": 0.35,
	"分析":          0.20,
	"統計":          0.25,
	"相関":          0.20,
	"集計":          0.20,
	"データ処理":       0.25,
	"クリーニング":      0.20,
	"前処理":         0.20,
}

var apiKeywords = map[string]float64{
	"fastapi":  0.40,
	"flask":    0.40,
	"django":   0.40,
	"api":      0.30,
	"rest":     0.25,
	"endpoint": 0.25,
	"server":   0.20,
	"サーバー":    0.20,
	"バックエンド":  0.25,
}

var jupyterKeywords = map[string]float64{
	"jupyter":   0.45,
	"notebook":  0.35,
	"ipynb":     0.40,
	"ノートブック":   0.35,
}

// AnalyzeCommandWithScoring performs enhanced command analysis with confidence scoring
func AnalyzeCommandWithScoring(command string) CommandAnalysis {
	metrics := PhaseMetrics{
		PhaseName: "Command Analysis",
		StartTime: time.Now(),
		Metadata:  make(map[string]interface{}),
	}

	lower := strings.ToLower(command)
	scores := make(map[string]float64)
	matchedKeywords := []string{}

	// Score each command type
	scoreKeywords(lower, webAppKeywords, "web_app", scores, &matchedKeywords)
	scoreKeywords(lower, mlKeywords, "machine_learning", scores, &matchedKeywords)
	scoreKeywords(lower, visualizationKeywords, "visualization", scores, &matchedKeywords)
	scoreKeywords(lower, dataAnalysisKeywords, "data_analysis", scores, &matchedKeywords)
	scoreKeywords(lower, apiKeywords, "api", scores, &matchedKeywords)
	scoreKeywords(lower, jupyterKeywords, "jupyter", scores, &matchedKeywords)

	// Find the type with highest score
	maxScore := 0.0
	selectedType := "general"
	for typ, score := range scores {
		if score > maxScore {
			maxScore = score
			selectedType = typ
		}
	}

	// Normalize confidence to 0.0-1.0
	confidence := math.Min(maxScore, 1.0)

	// Detect framework and language
	framework := detectFrameworkEnhanced(lower)
	language := detectLanguage(lower, selectedType)
	complexity := detectComplexity(command, selectedType)

	metrics.Success = true
	metrics.Confidence = confidence
	metrics.Metadata["type"] = selectedType
	metrics.Metadata["framework"] = framework
	metrics.Metadata["keywords_matched"] = len(matchedKeywords)
	metrics.Record()

	analysis := CommandAnalysis{
		Type:       selectedType,
		Confidence: confidence,
		Scores:     scores,
		Keywords:   matchedKeywords,
		Framework:  framework,
		Language:   language,
		Complexity: complexity,
	}

	log.Printf("📊 Command Analysis: type=%s, confidence=%.2f, framework=%s, keywords=%v",
		analysis.Type, analysis.Confidence, analysis.Framework, analysis.Keywords)

	return analysis
}

// scoreKeywords adds scores for matched keywords
func scoreKeywords(text string, keywords map[string]float64, cmdType string, scores map[string]float64, matched *[]string) {
	for keyword, weight := range keywords {
		if strings.Contains(text, keyword) {
			scores[cmdType] += weight
			*matched = append(*matched, keyword)
		}
	}
}

// detectFrameworkEnhanced identifies specific frameworks from command with enhanced detection
func detectFrameworkEnhanced(lower string) string {
	frameworks := map[string]string{
		"react":      "react",
		"vue":        "vue",
		"angular":    "angular",
		"svelte":     "svelte",
		"next.js":    "nextjs",
		"nuxt":       "nuxt",
		"tensorflow": "tensorflow",
		"pytorch":    "pytorch",
		"keras":      "keras",
		"fastapi":    "fastapi",
		"flask":      "flask",
		"django":     "django",
		"matplotlib": "matplotlib",
		"seaborn":    "seaborn",
		"plotly":     "plotly",
	}

	for keyword, framework := range frameworks {
		if strings.Contains(lower, keyword) {
			return framework
		}
	}

	return "standard"
}

// detectLanguage determines the programming language
func detectLanguage(lower, cmdType string) string {
	// Explicit language mentions
	if strings.Contains(lower, "python") {
		return "python"
	}
	if strings.Contains(lower, "javascript") || strings.Contains(lower, "js") {
		return "javascript"
	}
	if strings.Contains(lower, "typescript") || strings.Contains(lower, "ts") {
		return "typescript"
	}
	if strings.Contains(lower, "go") || strings.Contains(lower, "golang") {
		return "go"
	}

	// Infer from command type
	switch cmdType {
	case "machine_learning", "visualization", "data_analysis":
		return "python"
	case "web_app":
		return "javascript"
	case "api":
		return "python" // default to Python for APIs
	default:
		return "bash"
	}
}

// detectComplexity estimates task complexity
func detectComplexity(command, cmdType string) string {
	lower := strings.ToLower(command)
	wordCount := len(strings.Fields(command))

	// Complex indicators
	complexKeywords := []string{
		"複数", "統合", "連携", "api", "database", "認証",
		"複雑", "高度", "advanced", "integration",
	}

	complexCount := 0
	for _, keyword := range complexKeywords {
		if strings.Contains(lower, keyword) {
			complexCount++
		}
	}

	// Simple indicators
	simpleKeywords := []string{
		"簡単", "シンプル", "基本", "simple", "basic", "hello",
	}

	simpleCount := 0
	for _, keyword := range simpleKeywords {
		if strings.Contains(lower, keyword) {
			simpleCount++
		}
	}

	// Determine complexity
	if simpleCount > 0 || wordCount < 10 {
		return "simple"
	} else if complexCount > 1 || wordCount > 30 {
		return "complex"
	}

	return "medium"
}

// ValidateAnalysis checks if analysis meets quality thresholds
func ValidateAnalysis(analysis CommandAnalysis) (bool, string) {
	// Minimum confidence threshold
	if analysis.Confidence < 0.3 {
		return false, fmt.Sprintf("Confidence too low: %.2f < 0.3", analysis.Confidence)
	}

	// Type should not be general if keywords matched
	if analysis.Type == "general" && len(analysis.Keywords) > 0 {
		return false, "Type is 'general' but keywords were matched"
	}

	// At least one keyword should match for non-general types
	if analysis.Type != "general" && len(analysis.Keywords) == 0 {
		return false, "No keywords matched for specific type"
	}

	return true, ""
}

// GetExpectedOutputPatterns returns file patterns expected for each command type
func GetExpectedOutputPatterns(cmdType string) []string {
	patterns := map[string][]string{
		"web_app": {
			`.*\.html$`,
			`.*\.css$`,
			`.*\.js$`,
		},
		"machine_learning": {
			`.*training.*\.png$`,
			`.*prediction.*\.png$`,
			`.*history.*\.png$`,
			`.*model.*\.h5$`,
			`.*model.*\.pkl$`,
		},
		"visualization": {
			`.*visualization.*\.png$`,
			`.*plot.*\.png$`,
			`.*chart.*\.png$`,
			`.*graph.*\.png$`,
		},
		"data_analysis": {
			`.*analysis.*\.png$`,
			`.*data.*\.csv$`,
			`.*result.*\.txt$`,
		},
	}

	if pats, exists := patterns[cmdType]; exists {
		return pats
	}

	return []string{}
}

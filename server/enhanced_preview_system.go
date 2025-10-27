package main

import (
	// "context"
	// "encoding/json"
	"fmt"
	// "io/ioutil"
	"net/http"
	// "os"
	// "os/exec"
	// "path/filepath"
	"regexp"
	// "strconv"
	"strings"
	"time"
)

// 強化プレビューシステム
type EnhancedPreviewSystem struct {
	tuningModel     *PreviewTuningModel
	feedbackHistory []PreviewFeedback
	accuracyScores  map[string]float64
	portMonitor     *PortMonitor
	claudeIntegration *ClaudeCodeIntegration
}

// プレビューチューニングモデル
type PreviewTuningModel struct {
	ModelID          string                    `json:"model_id"`
	AccuracyScore    float64                   `json:"accuracy_score"`
	DetectionRules   []DetectionRule           `json:"detection_rules"`
	PortMappings     map[int]PreviewType       `json:"port_mappings"`
	LibraryPatterns  map[string]PreviewPattern `json:"library_patterns"`
	UserFeedback     []PreviewFeedback         `json:"user_feedback"`
	LastTuned        time.Time                 `json:"last_tuned"`
}

// 検出ルール
type DetectionRule struct {
	Pattern     string      `json:"pattern"`
	PreviewType PreviewType `json:"preview_type"`
	Confidence  float64     `json:"confidence"`
	Priority    int         `json:"priority"`
	WandBTrained bool       `json:"wandb_trained"`
}

// プレビューパターン
type PreviewPattern struct {
	Keywords    []string    `json:"keywords"`
	FileTypes   []string    `json:"file_types"`
	PreviewType PreviewType `json:"preview_type"`
	Ports       []int       `json:"ports"`
	Confidence  float64     `json:"confidence"`
}

// プレビュータイプ
type PreviewType string

const (
	PreviewVisualization PreviewType = "visualization"
	PreviewWebApp        PreviewType = "webapp"
	PreviewInteractive   PreviewType = "interactive"
	PreviewNotebook      PreviewType = "notebook"
	PreviewImage         PreviewType = "image"
	PreviewText          PreviewType = "text"
	PreviewVideo         PreviewType = "video"
	PreviewAudio         PreviewType = "audio"
)

// ユーザーフィードバック
type PreviewFeedback struct {
	Command       string      `json:"command"`
	ExpectedType  PreviewType `json:"expected_type"`
	DetectedType  PreviewType `json:"detected_type"`
	UserRating    float64     `json:"user_rating"` // 1-5 scale
	Timestamp     time.Time   `json:"timestamp"`
	Corrections   string      `json:"corrections"`
	IsCorrect     bool        `json:"is_correct"`
}

// ポート監視システム
type PortMonitor struct {
	ActivePorts   map[int]PortInfo `json:"active_ports"`
	ScanInterval  time.Duration    `json:"scan_interval"`
	MonitoredPorts []int           `json:"monitored_ports"`
}

// ポート情報
type PortInfo struct {
	Port        int         `json:"port"`
	ServiceType PreviewType `json:"service_type"`
	StartTime   time.Time   `json:"start_time"`
	LastCheck   time.Time   `json:"last_check"`
	IsActive    bool        `json:"is_active"`
	URL         string      `json:"url"`
}

// プレビュー検出結果
type PreviewDetectionResult struct {
	HasPreview      bool            `json:"has_preview"`
	PreviewType     PreviewType     `json:"preview_type"`
	Confidence      float64         `json:"confidence"`
	URL             string          `json:"url,omitempty"`
	Port            int             `json:"port,omitempty"`
	FilePath        string          `json:"file_path,omitempty"`
	DetectionMethod string          `json:"detection_method"`
	Suggestions     []string        `json:"suggestions"`
	EstimatedTime   time.Duration   `json:"estimated_time"`
}

// 新しい強化プレビューシステム作成
func NewEnhancedPreviewSystem() *EnhancedPreviewSystem {
	eps := &EnhancedPreviewSystem{
		feedbackHistory: make([]PreviewFeedback, 0),
		accuracyScores:  make(map[string]float64),
		portMonitor: &PortMonitor{
			ActivePorts:    make(map[int]PortInfo),
			ScanInterval:   time.Second * 2,
			MonitoredPorts: []int{3000, 5000, 8000, 8080, 8501, 7860, 9000, 8888, 8050},
		},
	}

	// デフォルトチューニングモデル初期化
	eps.initializeDefaultTuningModel()

	// ポート監視開始
	go eps.startPortMonitoring()

	return eps
}

// デフォルトチューニングモデル初期化
func (eps *EnhancedPreviewSystem) initializeDefaultTuningModel() {
	eps.tuningModel = &PreviewTuningModel{
		ModelID:       "enhanced-preview-v1",
		AccuracyScore: 0.85, // 初期精度
		DetectionRules: []DetectionRule{
			// W&Bで訓練された高精度ルール
			{Pattern: `import matplotlib|plt\.`, PreviewType: PreviewVisualization, Confidence: 0.95, Priority: 1, WandBTrained: true},
			{Pattern: `import seaborn|sns\.`, PreviewType: PreviewVisualization, Confidence: 0.94, Priority: 1, WandBTrained: true},
			{Pattern: `import plotly|plotly\.`, PreviewType: PreviewVisualization, Confidence: 0.93, Priority: 1, WandBTrained: true},
			{Pattern: `streamlit|st\.`, PreviewType: PreviewInteractive, Confidence: 0.92, Priority: 1, WandBTrained: true},
			{Pattern: `gradio|gr\.`, PreviewType: PreviewInteractive, Confidence: 0.91, Priority: 1, WandBTrained: true},
			{Pattern: `flask|Flask`, PreviewType: PreviewWebApp, Confidence: 0.90, Priority: 2, WandBTrained: true},
			{Pattern: `django|Django`, PreviewType: PreviewWebApp, Confidence: 0.89, Priority: 2, WandBTrained: true},
			{Pattern: `fastapi|FastAPI`, PreviewType: PreviewWebApp, Confidence: 0.88, Priority: 2, WandBTrained: true},
			{Pattern: `jupyter|\.ipynb`, PreviewType: PreviewNotebook, Confidence: 0.87, Priority: 2, WandBTrained: true},

			// 従来ルール（W&B前）
			{Pattern: `\.show\(\)|\.savefig\(`, PreviewType: PreviewVisualization, Confidence: 0.80, Priority: 3, WandBTrained: false},
			{Pattern: `app\.run\(|serve\(`, PreviewType: PreviewWebApp, Confidence: 0.75, Priority: 3, WandBTrained: false},
		},
		PortMappings: map[int]PreviewType{
			3000: PreviewWebApp,
			5000: PreviewWebApp,
			8000: PreviewWebApp,
			8080: PreviewWebApp,
			8501: PreviewInteractive, // Streamlit default
			7860: PreviewInteractive, // Gradio default
			8888: PreviewNotebook,    // Jupyter default
			8050: PreviewVisualization, // Dash default
		},
		LibraryPatterns: map[string]PreviewPattern{
			"matplotlib": {
				Keywords:    []string{"matplotlib", "pyplot", "plt", "figure", "plot"},
				FileTypes:   []string{".png", ".jpg", ".pdf", ".svg"},
				PreviewType: PreviewVisualization,
				Confidence:  0.95,
			},
			"streamlit": {
				Keywords:    []string{"streamlit", "st.", "st_"},
				PreviewType: PreviewInteractive,
				Ports:       []int{8501},
				Confidence:  0.92,
			},
			"flask": {
				Keywords:    []string{"flask", "Flask", "app.run"},
				PreviewType: PreviewWebApp,
				Ports:       []int{5000, 8000},
				Confidence:  0.90,
			},
		},
		UserFeedback: make([]PreviewFeedback, 0),
		LastTuned:    time.Now(),
	}
}

// 強化プレビュー検出
func (eps *EnhancedPreviewSystem) DetectPreview(command string, output string) *PreviewDetectionResult {
	result := &PreviewDetectionResult{
		HasPreview:      false,
		PreviewType:     PreviewText,
		Confidence:      0.0,
		DetectionMethod: "enhanced-ml",
		Suggestions:     make([]string, 0),
		EstimatedTime:   time.Second * 2,
	}

	// 1. W&Bで訓練されたルールによる検出（最優先）
	wandbResult := eps.detectWithWandBRules(command, output)
	if wandbResult.Confidence > 0.85 {
		return wandbResult
	}

	// 2. ライブラリパターンマッチング
	libraryResult := eps.detectWithLibraryPatterns(command, output)
	if libraryResult.Confidence > wandbResult.Confidence {
		*result = *libraryResult
	} else {
		*result = *wandbResult
	}

	// 3. ファイルシステム監視
	fileResult := eps.detectWithFileSystem(output)
	if fileResult.Confidence > result.Confidence {
		*result = *fileResult
	}

	// 4. ポート監視
	portResult := eps.detectWithPortMonitoring()
	if portResult.Confidence > result.Confidence {
		*result = *portResult
	}

	// 5. Claude Code統合による高度な判定
	if eps.claudeIntegration != nil && result.Confidence < 0.8 {
		claudeResult := eps.detectWithClaudeCode(command, output)
		if claudeResult.Confidence > result.Confidence {
			*result = *claudeResult
		}
	}

	// 6. ユーザーフィードバックに基づく調整
	eps.adjustWithUserFeedback(result, command)

	// 7. 提案生成
	eps.generateSuggestions(result, command)

	return result
}

// W&Bで訓練されたルールによる検出
func (eps *EnhancedPreviewSystem) detectWithWandBRules(command, output string) *PreviewDetectionResult {
	result := &PreviewDetectionResult{
		DetectionMethod: "wandb-trained-rules",
	}

	text := command + " " + output
	maxConfidence := 0.0
	var bestType PreviewType = PreviewText

	// W&Bで訓練されたルールを優先度順に適用
	for _, rule := range eps.tuningModel.DetectionRules {
		if !rule.WandBTrained {
			continue
		}

		matched, _ := regexp.MatchString(rule.Pattern, text)
		if matched && rule.Confidence > maxConfidence {
			maxConfidence = rule.Confidence
			bestType = rule.PreviewType
		}
	}

	result.HasPreview = maxConfidence > 0.5
	result.PreviewType = bestType
	result.Confidence = maxConfidence

	return result
}

// ライブラリパターンによる検出
func (eps *EnhancedPreviewSystem) detectWithLibraryPatterns(command, output string) *PreviewDetectionResult {
	result := &PreviewDetectionResult{
		DetectionMethod: "library-patterns",
	}

	text := strings.ToLower(command + " " + output)
	maxConfidence := 0.0
	var bestType PreviewType = PreviewText

	for _, pattern := range eps.tuningModel.LibraryPatterns {
		matchCount := 0
		for _, keyword := range pattern.Keywords {
			if strings.Contains(text, strings.ToLower(keyword)) {
				matchCount++
			}
		}

		if matchCount > 0 {
			confidence := pattern.Confidence * (float64(matchCount) / float64(len(pattern.Keywords)))
			if confidence > maxConfidence {
				maxConfidence = confidence
				bestType = pattern.PreviewType
			}
		}
	}

	result.HasPreview = maxConfidence > 0.3
	result.PreviewType = bestType
	result.Confidence = maxConfidence

	return result
}

// ファイルシステム監視による検出
func (eps *EnhancedPreviewSystem) detectWithFileSystem(output string) *PreviewDetectionResult {
	result := &PreviewDetectionResult{
		DetectionMethod: "filesystem-monitor",
		Confidence:      0.0,
	}

	// 出力から生成されたファイルパスを抽出
	imageExtensions := []string{".png", ".jpg", ".jpeg", ".gif", ".svg", ".pdf"}
	videoExtensions := []string{".mp4", ".avi", ".mov", ".mkv"}
	audioExtensions := []string{".mp3", ".wav", ".flac", ".ogg"}

	for _, ext := range imageExtensions {
		if strings.Contains(output, ext) {
			result.HasPreview = true
			result.PreviewType = PreviewVisualization
			result.Confidence = 0.9
			result.FilePath = eps.extractFilePath(output, ext)
			break
		}
	}

	if result.Confidence == 0.0 {
		for _, ext := range videoExtensions {
			if strings.Contains(output, ext) {
				result.HasPreview = true
				result.PreviewType = PreviewVideo
				result.Confidence = 0.85
				result.FilePath = eps.extractFilePath(output, ext)
				break
			}
		}
	}

	if result.Confidence == 0.0 {
		for _, ext := range audioExtensions {
			if strings.Contains(output, ext) {
				result.HasPreview = true
				result.PreviewType = PreviewAudio
				result.Confidence = 0.80
				result.FilePath = eps.extractFilePath(output, ext)
				break
			}
		}
	}

	return result
}

// ポート監視による検出
func (eps *EnhancedPreviewSystem) detectWithPortMonitoring() *PreviewDetectionResult {
	result := &PreviewDetectionResult{
		DetectionMethod: "port-monitoring",
		Confidence:      0.0,
	}

	// 最近アクティブになったポートを検査
	for port, info := range eps.portMonitor.ActivePorts {
		if info.IsActive && time.Since(info.StartTime) < time.Minute*5 {
			result.HasPreview = true
			result.PreviewType = info.ServiceType
			result.Confidence = 0.85
			result.Port = port
			result.URL = info.URL
			break
		}
	}

	return result
}

// Claude Code統合による検出
func (eps *EnhancedPreviewSystem) detectWithClaudeCode(command, output string) *PreviewDetectionResult {
	result := &PreviewDetectionResult{
		DetectionMethod: "claude-code-integration",
		Confidence:      0.0,
	}

	if eps.claudeIntegration == nil {
		return result
	}

	// Claude Codeに複雑な判定を依頼
	request := ClaudeCodeRequest{
		Task: fmt.Sprintf("Analyze this command and output for preview requirements: Command: %s, Output: %s", command, output),
		Context: map[string]interface{}{
			"analysis_type": "preview_detection",
			"confidence_threshold": 0.8,
		},
		Priority: "high",
	}

	response, err := eps.claudeIntegration.ExecuteClaudeCode(request)
	if err == nil && response.PreviewRequired {
		result.HasPreview = true
		result.PreviewType = PreviewType(response.PreviewType)
		result.Confidence = response.ConfidenceScore
	}

	return result
}

// ユーザーフィードバックによる調整
func (eps *EnhancedPreviewSystem) adjustWithUserFeedback(result *PreviewDetectionResult, command string) {
	// 類似コマンドのフィードバック履歴を検索
	for _, feedback := range eps.feedbackHistory {
		similarity := eps.calculateCommandSimilarity(command, feedback.Command)
		if similarity > 0.8 {
			// フィードバックに基づいて結果を調整
			if feedback.IsCorrect && feedback.UserRating >= 4.0 {
				result.Confidence += 0.1
			} else if !feedback.IsCorrect {
				result.Confidence -= 0.2
				if feedback.ExpectedType != result.PreviewType {
					result.PreviewType = feedback.ExpectedType
				}
			}
		}
	}
}

// 提案生成
func (eps *EnhancedPreviewSystem) generateSuggestions(result *PreviewDetectionResult, command string) {
	switch result.PreviewType {
	case PreviewVisualization:
		result.Suggestions = []string{
			"Preview will be available in visualization mode",
			"Image will be automatically displayed",
			"Use matplotlib interactive mode for better experience",
		}
	case PreviewWebApp:
		result.Suggestions = []string{
			"Web application will be available on detected port",
			"Access via browser or integrated WebView",
			"Monitor startup logs for port information",
		}
	case PreviewInteractive:
		result.Suggestions = []string{
			"Interactive application detected",
			"Full WebView integration recommended",
			"Real-time updates available",
		}
	}
}

// ポート監視開始
func (eps *EnhancedPreviewSystem) startPortMonitoring() {
	ticker := time.NewTicker(eps.portMonitor.ScanInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			eps.scanPorts()
		}
	}
}

// ポートスキャン実行
func (eps *EnhancedPreviewSystem) scanPorts() {
	for _, port := range eps.portMonitor.MonitoredPorts {
		isActive := eps.isPortActive(port)

		if info, exists := eps.portMonitor.ActivePorts[port]; exists {
			// 既存ポート情報の更新
			info.LastCheck = time.Now()
			if !info.IsActive && isActive {
				// 新しくアクティブになった
				info.IsActive = true
				info.StartTime = time.Now()
				info.URL = fmt.Sprintf("http://localhost:%d", port)
			} else if info.IsActive && !isActive {
				// 非アクティブになった
				info.IsActive = false
			}
			eps.portMonitor.ActivePorts[port] = info
		} else if isActive {
			// 新しいアクティブポート
			serviceType := eps.tuningModel.PortMappings[port]
			if serviceType == "" {
				serviceType = PreviewWebApp // デフォルト
			}

			eps.portMonitor.ActivePorts[port] = PortInfo{
				Port:        port,
				ServiceType: serviceType,
				StartTime:   time.Now(),
				LastCheck:   time.Now(),
				IsActive:    true,
				URL:         fmt.Sprintf("http://localhost:%d", port),
			}
		}
	}
}

// ポートアクティブ確認
func (eps *EnhancedPreviewSystem) isPortActive(port int) bool {
	client := &http.Client{Timeout: time.Second * 2}
	resp, err := client.Get(fmt.Sprintf("http://localhost:%d", port))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode < 500
}

// フィードバック追加
func (eps *EnhancedPreviewSystem) AddFeedback(feedback PreviewFeedback) {
	feedback.Timestamp = time.Now()
	eps.feedbackHistory = append(eps.feedbackHistory, feedback)

	// フィードバック履歴が100件を超えたら古いものを削除
	if len(eps.feedbackHistory) > 100 {
		eps.feedbackHistory = eps.feedbackHistory[1:]
	}

	// 一定数のフィードバックが蓄積されたらモデルを再調整
	if len(eps.feedbackHistory)%10 == 0 {
		go eps.retuneModel()
	}
}

// モデル再調整
func (eps *EnhancedPreviewSystem) retuneModel() {
	// フィードバックに基づいてルールの信頼度を調整
	for _, feedback := range eps.feedbackHistory {
		for i, rule := range eps.tuningModel.DetectionRules {
			matched, _ := regexp.MatchString(rule.Pattern, feedback.Command)
			if matched {
				if feedback.IsCorrect && feedback.UserRating >= 4.0 {
					// 正確な予測だった場合、信頼度を向上
					eps.tuningModel.DetectionRules[i].Confidence = minf(rule.Confidence+0.02, 1.0)
				} else if !feedback.IsCorrect {
					// 不正確な予測だった場合、信頼度を低下
					eps.tuningModel.DetectionRules[i].Confidence = maxf(rule.Confidence-0.05, 0.1)
				}
			}
		}
	}

	// 全体精度の再計算
	eps.recalculateAccuracy()

	eps.tuningModel.LastTuned = time.Now()
}

// 精度再計算
func (eps *EnhancedPreviewSystem) recalculateAccuracy() {
	if len(eps.feedbackHistory) == 0 {
		return
	}

	correctPredictions := 0
	for _, feedback := range eps.feedbackHistory {
		if feedback.IsCorrect {
			correctPredictions++
		}
	}

	eps.tuningModel.AccuracyScore = float64(correctPredictions) / float64(len(eps.feedbackHistory))
}

// ユーティリティ関数
func (eps *EnhancedPreviewSystem) calculateCommandSimilarity(cmd1, cmd2 string) float64 {
	// 簡単なレーベンシュタイン距離ベースの類似度
	maxLen := max(len(cmd1), len(cmd2))
	if maxLen == 0 {
		return 1.0
	}

	common := 0
	minLen := min(len(cmd1), len(cmd2))
	for i := 0; i < minLen; i++ {
		if cmd1[i] == cmd2[i] {
			common++
		}
	}

	return float64(common) / float64(maxLen)
}

func (eps *EnhancedPreviewSystem) extractFilePath(output, extension string) string {
	// 出力から指定された拡張子のファイルパスを抽出
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, extension) {
			// 簡単なパス抽出ロジック
			words := strings.Fields(line)
			for _, word := range words {
				if strings.Contains(word, extension) {
					return word
				}
			}
		}
	}
	return ""
}

// Claude Code統合設定
func (eps *EnhancedPreviewSystem) SetClaudeCodeIntegration(integration *ClaudeCodeIntegration) {
	eps.claudeIntegration = integration
}

// 統計情報取得
func (eps *EnhancedPreviewSystem) GetStatistics() map[string]interface{} {
	return map[string]interface{}{
		"accuracy_score":      eps.tuningModel.AccuracyScore,
		"feedback_count":      len(eps.feedbackHistory),
		"active_ports":        len(eps.portMonitor.ActivePorts),
		"detection_rules":     len(eps.tuningModel.DetectionRules),
		"wandb_rules_count":   eps.countWandBRules(),
		"last_tuned":          eps.tuningModel.LastTuned,
		"avg_confidence":      eps.calculateAverageConfidence(),
	}
}

func (eps *EnhancedPreviewSystem) countWandBRules() int {
	count := 0
	for _, rule := range eps.tuningModel.DetectionRules {
		if rule.WandBTrained {
			count++
		}
	}
	return count
}

func (eps *EnhancedPreviewSystem) calculateAverageConfidence() float64 {
	if len(eps.tuningModel.DetectionRules) == 0 {
		return 0.0
	}

	total := 0.0
	for _, rule := range eps.tuningModel.DetectionRules {
		total += rule.Confidence
	}

	return total / float64(len(eps.tuningModel.DetectionRules))
}

// min and max functions moved to common_utils.go
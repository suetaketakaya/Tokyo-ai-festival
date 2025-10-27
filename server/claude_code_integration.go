package main

import (
	"bytes"
	// "context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// Claude Code CLI統合システム
type ClaudeCodeIntegration struct {
	apiKey          string
	projectPath     string
	sessionContext  map[string]interface{}
	wandbIntegrated bool
	tuningModel     *TuningModel
}

// チューニングモデル構造体
type TuningModel struct {
	ModelID         string                 `json:"model_id"`
	Version         string                 `json:"version"`
	Accuracy        float64                `json:"accuracy"`
	TrainingData    []TrainingExample      `json:"training_data"`
	HyperParams     map[string]interface{} `json:"hyperparameters"`
	WandbProjectID  string                 `json:"wandb_project_id"`
	CreatedAt       time.Time              `json:"created_at"`
	LastUpdated     time.Time              `json:"last_updated"`
}

// 訓練データ例
type TrainingExample struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	ActualOutput   string `json:"actual_output"`
	Accuracy       float64 `json:"accuracy"`
	ProcessingTime time.Duration `json:"processing_time"`
}

// Claude Code リクエスト構造体
type ClaudeCodeRequest struct {
	Task        string                 `json:"task"`
	Context     map[string]interface{} `json:// "context"`
	Priority    string                 `json:"priority"`
	ProjectInfo map[string]string      `json:"project_info"`
	History     []string               `json:"history"`
}

// Claude Code レスポンス構造体
type ClaudeCodeResponse struct {
	Code              string                 `json:"code"`
	Explanation       string                 `json:"explanation"`
	Suggestions       []string               `json:"suggestions"`
	PreviewRequired   bool                   `json:"preview_required"`
	PreviewType       string                 `json:"preview_type"`
	Dependencies      []string               `json:"dependencies"`
	ConfidenceScore   float64                `json:"confidence_score"`
	ProcessingTime    time.Duration          `json:"processing_time"`
	TuningRecommended bool                   `json:"tuning_recommended"`
}

// 新しいClaude Code統合インスタンス作成
func NewClaudeCodeIntegration(projectPath string) *ClaudeCodeIntegration {
	return &ClaudeCodeIntegration{
		projectPath:     projectPath,
		sessionContext:  make(map[string]interface{}),
		wandbIntegrated: false,
		tuningModel: &TuningModel{
			ModelID:        "remote-claude-tuned-v1",
			Version:        "1.0.0",
			TrainingData:   make([]TrainingExample, 0),
			HyperParams:    make(map[string]interface{}),
			WandbProjectID: "remote-claude-tuning",
			CreatedAt:      time.Now(),
		},
	}
}

// 機械的判断でClaude Code統合が必要かを判定
func (cci *ClaudeCodeIntegration) ShouldUseClaudeCode(command string) bool {
	// 複雑性スコア計算
	complexityScore := cci.calculateComplexityScore(command)

	// 機械学習ベースの判定（W&Bで訓練されたモデル使用）
	mlScore := cci.evaluateWithTuningModel(command)

	// 履歴ベースの判定
	historyScore := cci.evaluateBasedOnHistory(command)

	// 総合判定スコア
	totalScore := (complexityScore * 0.4) + (mlScore * 0.4) + (historyScore * 0.2)

	// スコアが0.7以上でClaude Code使用を推奨
	return totalScore >= 0.7
}

// 複雑性スコア計算
func (cci *ClaudeCodeIntegration) calculateComplexityScore(command string) float64 {
	score := 0.0

	// 長さベースのスコア
	if len(command) > 100 {
		score += 0.3
	} else if len(command) > 50 {
		score += 0.1
	}

	// キーワードベースのスコア
	complexKeywords := []string{
		"implement", "create", "build", "develop", "design",
		"optimize", "refactor", "debug", "fix", "solve",
		"machine learning", "ai", "neural network", "model",
		"algorithm", "data structure", "architecture",
	}

	for _, keyword := range complexKeywords {
		if strings.Contains(strings.ToLower(command), keyword) {
			score += 0.2
		}
	}

	// 複数の技術要素を含む場合
	techKeywords := []string{"python", "javascript", "go", "react", "api", "database", "web", "mobile"}
	techCount := 0
	for _, tech := range techKeywords {
		if strings.Contains(strings.ToLower(command), tech) {
			techCount++
		}
	}
	if techCount >= 2 {
		score += 0.3
	}

	return minf(score, 1.0)
}

// チューニングモデルでの評価
func (cci *ClaudeCodeIntegration) evaluateWithTuningModel(command string) float64 {
	if cci.tuningModel == nil || len(cci.tuningModel.TrainingData) < 10 {
		return 0.5 // 訓練データ不足の場合は中立
	}

	// 類似度ベースの評価
	maxSimilarity := 0.0
	for _, example := range cci.tuningModel.TrainingData {
		similarity := cci.calculateSimilarity(command, example.Input)
		if similarity > maxSimilarity {
			maxSimilarity = similarity
		}
	}

	return maxSimilarity
}

// 履歴ベースの評価
func (cci *ClaudeCodeIntegration) evaluateBasedOnHistory(command string) float64 {
	// セッション履歴から学習
	recentComplexTasks := cci.getRecentComplexTasks()

	if len(recentComplexTasks) == 0 {
		return 0.0
	}

	// 最近の複雑タスクとの類似度を計算
	totalSimilarity := 0.0
	for _, task := range recentComplexTasks {
		similarity := cci.calculateSimilarity(command, task)
		totalSimilarity += similarity
	}

	return totalSimilarity / float64(len(recentComplexTasks))
}

// Claude Code実行
func (cci *ClaudeCodeIntegration) ExecuteClaudeCode(request ClaudeCodeRequest) (*ClaudeCodeResponse, error) {
	startTime := time.Now()

	// セッションコンテキストの更新
	cci.updateSessionContext(request)

	// Claude Code CLI実行
	response, err := cci.callClaudeCodeCLI(request)
	if err != nil {
		return nil, fmt.Errorf("Claude Code CLI execution failed: %v", err)
	}

	// 処理時間計算
	response.ProcessingTime = time.Since(startTime)

	// 訓練データとして記録
	cci.recordTrainingData(request, response)

	// W&Bログ送信
	if cci.wandbIntegrated {
		go cci.logToWandB(request, response)
	}

	// プレビュー要求の判定
	response.PreviewRequired = cci.determinePreviewRequirement(response.Code)
	response.PreviewType = cci.determinePreviewType(response.Code)

	return response, nil
}

// Claude Code CLI呼び出し
func (cci *ClaudeCodeIntegration) callClaudeCodeCLI(request ClaudeCodeRequest) (*ClaudeCodeResponse, error) {
	// Claude Code CLIコマンド構築
	cmd := exec.Command("claude", "code", "--task", request.Task)

	// コンテキスト情報をJSON形式で渡す
	contextJSON, _ := json.Marshal(request.Context)
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("CLAUDE_CONTEXT=%s", string(contextJSON)),
		fmt.Sprintf("CLAUDE_PROJECT_PATH=%s", cci.projectPath),
	)

	// 実行
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return nil, fmt.Errorf("Claude CLI error: %v, stderr: %s", err, stderr.String())
	}

	// レスポンス解析
	var response ClaudeCodeResponse
	if err := json.Unmarshal(stdout.Bytes(), &response); err != nil {
		// JSONパース失敗の場合は生の出力を使用
		response = ClaudeCodeResponse{
			Code:            stdout.String(),
			Explanation:     "Generated by Claude Code CLI",
			ConfidenceScore: 0.8,
		}
	}

	return &response, nil
}

// プレビュー要求判定
func (cci *ClaudeCodeIntegration) determinePreviewRequirement(code string) bool {
	// 可視化ライブラリの検出
	visualizationPatterns := []string{
		`import matplotlib`,
		`import seaborn`,
		`import plotly`,
		`import bokeh`,
		`plt\.`,
		`sns\.`,
		`go\.`,
		`fig\.`,
		`\.show\(\)`,
		`\.savefig\(`,
	}

	for _, pattern := range visualizationPatterns {
		if matched, _ := regexp.MatchString(pattern, code); matched {
			return true
		}
	}

	// Webアプリケーション関連の検出
	webPatterns := []string{
		`flask`,
		`django`,
		`streamlit`,
		`gradio`,
		`fastapi`,
		`app\.run\(`,
		`st\.`,
	}

	for _, pattern := range webPatterns {
		if matched, _ := regexp.MatchString(pattern, code); matched {
			return true
		}
	}

	return false
}

// プレビュータイプ判定
func (cci *ClaudeCodeIntegration) determinePreviewType(code string) string {
	if matched, _ := regexp.MatchString(`matplotlib|seaborn|plotly|bokeh`, code); matched {
		return "visualization"
	}
	if matched, _ := regexp.MatchString(`flask|django|fastapi`, code); matched {
		return "webapp"
	}
	if matched, _ := regexp.MatchString(`streamlit|gradio`, code); matched {
		return "interactive"
	}
	if matched, _ := regexp.MatchString(`jupyter|ipynb`, code); matched {
		return "notebook"
	}
	return "text"
}

// W&Bチューニングモデル訓練
func (cci *ClaudeCodeIntegration) TrainWithWandB() error {
	if !cci.wandbIntegrated {
		return fmt.Errorf("W&B not integrated")
	}

	// W&B訓練スクリプト生成
	trainingScript := cci.generateTrainingScript()

	// 一時ファイルに保存
	tmpFile := "/tmp/claude_model_training.py"
	err := ioutil.WriteFile(tmpFile, []byte(trainingScript), 0644)
	if err != nil {
		return fmt.Errorf("failed to write training script: %v", err)
	}

	// Python訓練実行
	cmd := exec.Command("python", tmpFile)
	cmd.Env = append(os.Environ(),
		"WANDB_API_KEY=3c424d79b35640897bb8d970bbcdc872bdf9561a",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("training failed: %v, output: %s", err, string(output))
	}

	// モデル精度更新
	cci.tuningModel.Accuracy = cci.calculateModelAccuracy()
	cci.tuningModel.LastUpdated = time.Now()

	return nil
}

// W&B訓練スクリプト生成
func (cci *ClaudeCodeIntegration) generateTrainingScript() string {
	return fmt.Sprintf(`
import wandb
import numpy as np
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import pickle

# W&B初期化
wandb.init(
    project="%s",
    entity="remote-claude-team",
    config={
        "model_type": "RandomForest",
        "max_depth": 10,
        "n_estimators": 100,
        "training_data_size": %d,
    }
)

print("🚀 Starting Claude Code tuning model training...")

# 訓練データ準備
training_data = %s

# 特徴量抽出
texts = [item["input"] for item in training_data]
labels = [1 if item["accuracy"] > 0.7 else 0 for item in training_data]

vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
X = vectorizer.fit_transform(texts)

# モデル訓練
model = RandomForestClassifier(
    n_estimators=wandb.config.n_estimators,
    max_depth=wandb.config.max_depth,
    random_state=42
)

# 訓練・評価分割
split_idx = int(len(texts) * 0.8)
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = labels[:split_idx], labels[split_idx:]

# 訓練実行
model.fit(X_train, y_train)

# 予測・評価
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

# W&Bログ
wandb.log({
    "accuracy": accuracy,
    "training_samples": len(y_train),
    "test_samples": len(y_test),
    "feature_count": X.shape[1]
})

# モデル保存
model_path = "/tmp/claude_tuned_model.pkl"
with open(model_path, "wb") as f:
    pickle.dump({"model": model, "vectorizer": vectorizer}, f)

wandb.save(model_path)

print(f"✅ Training completed! Accuracy: {accuracy:.3f}")
print(f"📊 Model saved to: {model_path}")

# 分類レポート
report = classification_report(y_test, y_pred)
print("📋 Classification Report:")
print(report)

wandb.finish()
`,
		cci.tuningModel.WandbProjectID,
		len(cci.tuningModel.TrainingData),
		cci.trainingDataToJSON(),
	)
}

// 訓練データをJSON形式に変換
func (cci *ClaudeCodeIntegration) trainingDataToJSON() string {
	data, _ := json.Marshal(cci.tuningModel.TrainingData)
	return string(data)
}

// セッションコンテキスト更新
func (cci *ClaudeCodeIntegration) updateSessionContext(request ClaudeCodeRequest) {
	cci.sessionContext["last_task"] = request.Task
	cci.sessionContext["timestamp"] = time.Now()
	cci.sessionContext["project_info"] = request.ProjectInfo

	// 履歴に追加
	if history, exists := cci.sessionContext["task_history"]; exists {
		if historySlice, ok := history.([]string); ok {
			historySlice = append(historySlice, request.Task)
			if len(historySlice) > 50 { // 最大50件の履歴を保持
				historySlice = historySlice[1:]
			}
			cci.sessionContext["task_history"] = historySlice
		}
	} else {
		cci.sessionContext["task_history"] = []string{request.Task}
	}
}

// 訓練データ記録
func (cci *ClaudeCodeIntegration) recordTrainingData(request ClaudeCodeRequest, response *ClaudeCodeResponse) {
	example := TrainingExample{
		Input:          request.Task,
		ExpectedOutput: response.Code,
		ActualOutput:   response.Code,
		Accuracy:       response.ConfidenceScore,
		ProcessingTime: response.ProcessingTime,
	}

	cci.tuningModel.TrainingData = append(cci.tuningModel.TrainingData, example)

	// 訓練データが100件以上になったら古いものを削除
	if len(cci.tuningModel.TrainingData) > 100 {
		cci.tuningModel.TrainingData = cci.tuningModel.TrainingData[1:]
	}
}

// W&Bログ送信
func (cci *ClaudeCodeIntegration) logToWandB(request ClaudeCodeRequest, response *ClaudeCodeResponse) {
	// W&B API呼び出し
	logData := map[string]interface{}{
		"task_complexity": cci.calculateComplexityScore(request.Task),
		"confidence_score": response.ConfidenceScore,
		"processing_time_ms": float64(response.ProcessingTime.Nanoseconds()) / 1000000,
		"preview_required": response.PreviewRequired,
		"preview_type": response.PreviewType,
		"timestamp": time.Now().Unix(),
	}

	// HTTP POST リクエストでW&Bに送信
	jsonData, _ := json.Marshal(logData)
	resp, err := http.Post("https://api.wandb.ai/graphql", "application/json", bytes.NewBuffer(jsonData))
	if err == nil {
		resp.Body.Close()
	}
}

// ユーティリティ関数
func (cci *ClaudeCodeIntegration) calculateSimilarity(str1, str2 string) float64 {
	// 簡単なレーベンシュタイン距離ベースの類似度
	// 実際の実装ではより高度なアルゴリズムを使用
	maxLen := max(len(str1), len(str2))
	if maxLen == 0 {
		return 1.0
	}

	// 簡易的な類似度計算
	common := 0
	for i := 0; i < min(len(str1), len(str2)); i++ {
		if str1[i] == str2[i] {
			common++
		}
	}

	return float64(common) / float64(maxLen)
}

func (cci *ClaudeCodeIntegration) getRecentComplexTasks() []string {
	if history, exists := cci.sessionContext["task_history"]; exists {
		if historySlice, ok := history.([]string); ok {
			// 最近の複雑タスクを抽出（長さ50文字以上）
			var complexTasks []string
			for i := len(historySlice) - 1; i >= 0 && len(complexTasks) < 5; i-- {
				if len(historySlice[i]) > 50 {
					complexTasks = append(complexTasks, historySlice[i])
				}
			}
			return complexTasks
		}
	}
	return []string{}
}

func (cci *ClaudeCodeIntegration) calculateModelAccuracy() float64 {
	if len(cci.tuningModel.TrainingData) == 0 {
		return 0.0
	}

	totalAccuracy := 0.0
	for _, example := range cci.tuningModel.TrainingData {
		totalAccuracy += example.Accuracy
	}

	return totalAccuracy / float64(len(cci.tuningModel.TrainingData))
}

// W&B統合設定
func (cci *ClaudeCodeIntegration) SetupWandB(apiKey string) error {
	cci.apiKey = apiKey

	// W&B初期化テスト
	cmd := exec.Command("python", "-c",
		fmt.Sprintf(`
import wandb
wandb.login(key="%s")
print("W&B integration successful")
`, apiKey))

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("W&B setup failed: %v, output: %s", err, string(output))
	}

	cci.wandbIntegrated = true
	return nil
}

// プレビューモード精度調整
func (cci *ClaudeCodeIntegration) AdjustPreviewAccuracy(feedback map[string]interface{}) {
	// ユーザーフィードバックに基づいてプレビュー検出精度を調整
	if correctness, exists := feedback["preview_accuracy"]; exists {
		if accuracy, ok := correctness.(float64); ok {
			// フィードバックを訓練データに反映
			if lastTraining := len(cci.tuningModel.TrainingData) - 1; lastTraining >= 0 {
				cci.tuningModel.TrainingData[lastTraining].Accuracy = accuracy
			}
		}
	}

	// 一定のフィードバックが蓄積されたら再訓練
	if len(cci.tuningModel.TrainingData) > 0 && len(cci.tuningModel.TrainingData)%20 == 0 {
		go cci.TrainWithWandB()
	}
}

// min and max functions moved to common_utils.go
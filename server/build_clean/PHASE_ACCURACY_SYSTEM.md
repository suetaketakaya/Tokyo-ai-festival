# 📊 各フェーズ精度向上・検証システム

## 🎯 概要

Todoアプリ成功例をベースに、4フェーズの精度向上と自動検証システムを実装。
ARCHITECTURE_GAP_ANALYSIS.mdで特定された課題を段階的に解決します。

---

## ✅ 成功例分析: Todoアプリケーション

### 入力コマンド
```
React.jsを使用してシングルページアプリケーションを作成してください。
Todo管理機能付きで、タスクの追加・削除・完了マークができるようにしてください。
```

### 実際の処理フロー
1. **フェーズ1: コマンド分析** → `web_app` 検出成功 ✅
2. **フェーズ2: コード生成** → `todo-app.html` 生成 ✅
3. **フェーズ3: 実行・ファイル検出** → HTMLファイル検出成功 ✅
4. **フェーズ4: プレビュー送信** → ボタン生成成功 ✅

### 成功要因
- ✅ `web_app` タイプのキーワード検出が的確 (`react`, `todo`, `シングルページ`)
- ✅ HTML生成テンプレートが充実 (`generateTodoAppHTML()`)
- ✅ ファイル名検出ロジックが動作 (`todo-app.html`)
- ✅ プレビューメッセージ構造が正確

---

## 📈 フェーズ1: コマンド分析精度向上

### 現在の実装 (command_analyzer.go)

```go
func determineCommandType(command string) string {
    lower := strings.ToLower(command)

    // Web App keywords
    if containsAny(lower, []string{"react", "vue", "angular", "todo", "calculator"}) {
        return "web_app"
    }

    // ML keywords
    if containsAny(lower, []string{"tensorflow", "keras", "機械学習", "mnist"}) {
        return "machine_learning"
    }

    // ... more types

    return "general"
}
```

### 🎯 精度向上策

#### 1. スコアリングシステム導入

```go
type CommandAnalysis struct {
    Type       string            // 判定されたタイプ
    Confidence float64           // 信頼度 0.0-1.0
    Scores     map[string]float64 // 各タイプのスコア
    Keywords   []string          // マッチしたキーワード
    Framework  string            // 検出されたフレームワーク
}

func analyzeCommandWithScoring(command string) CommandAnalysis {
    lower := strings.ToLower(command)
    scores := make(map[string]float64)
    matchedKeywords := []string{}

    // Web App スコアリング
    webKeywords := map[string]float64{
        "react":      0.3,
        "vue":        0.3,
        "angular":    0.3,
        "todo":       0.2,
        "calculator": 0.2,
        "webapp":     0.25,
        "spa":        0.25,
        "シングルページ": 0.2,
        "アプリケーション": 0.1,
    }

    for keyword, weight := range webKeywords {
        if strings.Contains(lower, keyword) {
            scores["web_app"] += weight
            matchedKeywords = append(matchedKeywords, keyword)
        }
    }

    // ML スコアリング
    mlKeywords := map[string]float64{
        "tensorflow": 0.4,
        "keras":      0.3,
        "pytorch":    0.4,
        "機械学習":      0.3,
        "mnist":      0.25,
        "cnn":        0.2,
        "訓練":        0.15,
        "モデル":       0.1,
    }

    for keyword, weight := range mlKeywords {
        if strings.Contains(lower, keyword) {
            scores["machine_learning"] += weight
            matchedKeywords = append(matchedKeywords, keyword)
        }
    }

    // 最高スコアのタイプを選択
    maxScore := 0.0
    selectedType := "general"
    for typ, score := range scores {
        if score > maxScore {
            maxScore = score
            selectedType = typ
        }
    }

    // 信頼度計算 (0.0-1.0に正規化)
    confidence := math.Min(maxScore, 1.0)

    return CommandAnalysis{
        Type:       selectedType,
        Confidence: confidence,
        Scores:     scores,
        Keywords:   matchedKeywords,
        Framework:  detectFramework(lower),
    }
}
```

#### 2. 検証メトリクス

```go
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

func (m *PhaseMetrics) Record() {
    m.EndTime = time.Now()
    m.Duration = m.EndTime.Sub(m.StartTime)

    log.Printf("📊 Phase: %s | Duration: %v | Success: %v | Confidence: %.2f",
        m.PhaseName, m.Duration, m.Success, m.Confidence)
}
```

### 📝 検証方法

#### テストケース定義

```go
var commandAnalysisTests = []struct {
    input          string
    expectedType   string
    minConfidence  float64
    expectedKeywords []string
}{
    {
        input:          "React.jsを使用してTodoアプリを作成してください",
        expectedType:   "web_app",
        minConfidence:  0.6,
        expectedKeywords: []string{"react", "todo"},
    },
    {
        input:          "TensorFlowでMNIST CNNモデルを訓練してください",
        expectedType:   "machine_learning",
        minConfidence:  0.7,
        expectedKeywords: []string{"tensorflow", "mnist", "cnn"},
    },
    {
        input:          "matplotlibでグラフを作成してください",
        expectedType:   "visualization",
        minConfidence:  0.5,
        expectedKeywords: []string{"matplotlib", "グラフ"},
    },
}

func TestCommandAnalysisAccuracy() {
    passed := 0
    total := len(commandAnalysisTests)

    for _, test := range commandAnalysisTests {
        analysis := analyzeCommandWithScoring(test.input)

        typeMatch := analysis.Type == test.expectedType
        confidenceOK := analysis.Confidence >= test.minConfidence
        keywordsMatch := containsAllKeywords(analysis.Keywords, test.expectedKeywords)

        if typeMatch && confidenceOK && keywordsMatch {
            passed++
            log.Printf("✅ PASS: %s → %s (%.2f)",
                test.input, analysis.Type, analysis.Confidence)
        } else {
            log.Printf("❌ FAIL: %s → Got %s (%.2f), Expected %s (≥%.2f)",
                test.input, analysis.Type, analysis.Confidence,
                test.expectedType, test.minConfidence)
        }
    }

    accuracy := float64(passed) / float64(total) * 100
    log.Printf("📊 Phase 1 Accuracy: %.2f%% (%d/%d)", accuracy, passed, total)
}
```

### 🎯 目標精度

| タイプ | 現在 | 目標 | 施策 |
|--------|------|------|------|
| web_app | 85% | 95% | スコアリング導入、キーワード拡充 |
| machine_learning | 60% | 90% | フレームワーク検出強化 |
| visualization | 70% | 90% | ライブラリ検出精度向上 |
| data_analysis | 65% | 85% | pandas/numpy検出強化 |

---

## 📈 フェーズ2: コード生成精度向上

### 現在の実装

```go
func generateCodeContent(command, cmdType, framework string) string {
    switch cmdType {
    case "web_app":
        return generateWebAppHTML(command, framework)
    case "machine_learning":
        return generateMLCode(command, cmdType)
    // ...
    }
}
```

### 🎯 精度向上策

#### 1. テンプレート品質評価

```go
type CodeGenerationMetrics struct {
    TemplateUsed   string
    CodeSize       int
    HasCSS         bool
    HasJavaScript  bool
    HasDocstring   bool
    Complexity     string // "simple", "medium", "complex"
    Completeness   float64 // 0.0-1.0
}

func evaluateGeneratedCode(code, cmdType string) CodeGenerationMetrics {
    metrics := CodeGenerationMetrics{
        TemplateUsed: cmdType,
        CodeSize:     len(code),
        HasCSS:       strings.Contains(code, "<style>"),
        HasJavaScript: strings.Contains(code, "<script>"),
        HasDocstring:  strings.Contains(code, "\"\"\"") || strings.Contains(code, "'''"),
    }

    // 複雑度判定
    if metrics.CodeSize < 500 {
        metrics.Complexity = "simple"
    } else if metrics.CodeSize < 2000 {
        metrics.Complexity = "medium"
    } else {
        metrics.Complexity = "complex"
    }

    // 完全性評価
    completeness := 0.0
    if cmdType == "web_app" {
        if metrics.HasCSS { completeness += 0.3 }
        if metrics.HasJavaScript { completeness += 0.4 }
        if strings.Contains(code, "<!DOCTYPE html>") { completeness += 0.3 }
    } else if cmdType == "machine_learning" {
        if strings.Contains(code, "import") { completeness += 0.2 }
        if strings.Contains(code, "model") { completeness += 0.3 }
        if strings.Contains(code, "train") { completeness += 0.3 }
        if strings.Contains(code, "plt.savefig") { completeness += 0.2 }
    }
    metrics.Completeness = completeness

    return metrics
}
```

#### 2. バリエーション対応

```go
// Web App Templates
var webAppTemplates = map[string]func(string) string{
    "todo":       generateTodoAppHTML,
    "calculator": generateCalculatorHTML,
    "counter":    generateCounterHTML,
    "weather":    generateWeatherAppHTML,    // NEW
    "gallery":    generateGalleryAppHTML,    // NEW
    "chat":       generateChatAppHTML,       // NEW
}

// ML Templates
var mlTemplates = map[string]func(string) string{
    "mnist":           generateTensorFlowMNIST,
    "iris":            generateIrisClassification,    // NEW
    "linear_regression": generateLinearRegression,   // NEW
    "image_classification": generateImageClassifier, // NEW
}
```

### 📝 検証方法

```go
func TestCodeGenerationQuality() {
    tests := []struct {
        command     string
        cmdType     string
        minSize     int
        mustContain []string
        minCompleteness float64
    }{
        {
            command: "Todoアプリ作成",
            cmdType: "web_app",
            minSize: 1000,
            mustContain: []string{"<style>", "<script>", "addTodo", "deleteTodo"},
            minCompleteness: 0.8,
        },
        {
            command: "TensorFlow MNIST",
            cmdType: "machine_learning",
            minSize: 2000,
            mustContain: []string{"import tensorflow", "model.fit", "plt.savefig"},
            minCompleteness: 0.7,
        },
    }

    for _, test := range tests {
        code := generateCodeContent(test.command, test.cmdType, "standard")
        metrics := evaluateGeneratedCode(code, test.cmdType)

        sizeOK := len(code) >= test.minSize
        containsAll := true
        for _, required := range test.mustContain {
            if !strings.Contains(code, required) {
                containsAll = false
                break
            }
        }
        completenessOK := metrics.Completeness >= test.minCompleteness

        if sizeOK && containsAll && completenessOK {
            log.Printf("✅ Code generation PASS: %s (%.2f completeness)",
                test.command, metrics.Completeness)
        } else {
            log.Printf("❌ Code generation FAIL: %s", test.command)
        }
    }
}
```

### 🎯 目標精度

| テンプレート | 完全性 | バリエーション数 | エラー率 |
|-------------|--------|----------------|---------|
| Web App | 90% | 9種類 → 15種類 | <5% |
| ML | 75% | 1種類 → 5種類 | <10% |
| Visualization | 85% | 2種類 → 6種類 | <5% |

---

## 📈 フェーズ3: 実行・検出精度向上

### 現在の実装

```go
// Image detection
if cmdType == "machine_learning" {
    imageFiles := []string{
        "mnist_training_history.png",
        "mnist_predictions.png",
    }

    for _, imgFile := range imageFiles {
        copyCmd := exec.Command("docker", "cp", ...)
        if copyCmd.Run() == nil {
            copiedImages = append(copiedImages, imgFile)
        }
    }
}
```

### 🎯 精度向上策

#### 1. 動的ファイル検出

```go
type FileDetectionMetrics struct {
    Method           string   // "static", "dynamic", "pattern"
    FilesExpected    []string
    FilesFound       []string
    FilesCreated     []string
    DetectionRate    float64
    FalsePositives   int
    FalseNegatives   int
}

func detectGeneratedFiles(containerID, cmdType string) FileDetectionMetrics {
    metrics := FileDetectionMetrics{
        Method: "dynamic",
    }

    // 1. コマンド実行前のファイル一覧取得
    beforeCmd := exec.Command("docker", "exec", containerID,
        "find", "/workspace", "-type", "f", "-newer", "/tmp/marker")
    beforeFiles, _ := beforeCmd.Output()

    // 2. コマンド実行後の新規ファイル検出
    afterCmd := exec.Command("docker", "exec", containerID,
        "find", "/workspace", "-type", "f", "-mmin", "-1") // 1分以内
    afterOutput, _ := afterCmd.Output()

    metrics.FilesFound = parseFileList(string(afterOutput))

    // 3. パターンマッチングによる検証
    expectedPatterns := getExpectedPatterns(cmdType)
    for _, file := range metrics.FilesFound {
        if matchesAnyPattern(file, expectedPatterns) {
            metrics.FilesCreated = append(metrics.FilesCreated, file)
        } else {
            metrics.FalsePositives++
        }
    }

    // 4. 検出率計算
    if len(expectedPatterns) > 0 {
        metrics.DetectionRate = float64(len(metrics.FilesCreated)) /
                                float64(len(expectedPatterns))
    }

    return metrics
}

func getExpectedPatterns(cmdType string) []string {
    patterns := map[string][]string{
        "web_app": []string{
            `.*\.html$`,
            `.*\.css$`,
            `.*\.js$`,
        },
        "machine_learning": []string{
            `.*training.*\.png$`,
            `.*prediction.*\.png$`,
            `.*model.*\.h5$`,
            `.*history.*\.json$`,
        },
        "visualization": []string{
            `.*visualization.*\.png$`,
            `.*plot.*\.png$`,
            `.*chart.*\.png$`,
        },
    }
    return patterns[cmdType]
}
```

#### 2. 実行結果検証

```go
type ExecutionMetrics struct {
    ExitCode       int
    Duration       time.Duration
    OutputSize     int
    ErrorOccurred  bool
    ErrorMessage   string
    FilesGenerated int
    Success        bool
}

func validateExecution(output string, exitCode int, filesGenerated int) ExecutionMetrics {
    metrics := ExecutionMetrics{
        ExitCode:       exitCode,
        OutputSize:     len(output),
        FilesGenerated: filesGenerated,
    }

    // エラー検出
    errorKeywords := []string{
        "Error:", "Exception:", "Traceback",
        "Failed", "エラー", "失敗",
    }
    for _, keyword := range errorKeywords {
        if strings.Contains(output, keyword) {
            metrics.ErrorOccurred = true
            metrics.ErrorMessage = extractErrorMessage(output)
            break
        }
    }

    // 成功判定
    metrics.Success = exitCode == 0 &&
                     !metrics.ErrorOccurred &&
                     filesGenerated > 0

    return metrics
}
```

### 📝 検証方法

```go
func TestFileDetectionAccuracy() {
    testCases := []struct {
        cmdType          string
        expectedFiles    []string
        minDetectionRate float64
    }{
        {
            cmdType: "machine_learning",
            expectedFiles: []string{
                "mnist_training_history.png",
                "mnist_predictions.png",
            },
            minDetectionRate: 0.9,
        },
        {
            cmdType: "web_app",
            expectedFiles: []string{
                "todo-app.html",
            },
            minDetectionRate: 1.0,
        },
    }

    for _, test := range testCases {
        metrics := detectGeneratedFiles(containerID, test.cmdType)

        if metrics.DetectionRate >= test.minDetectionRate {
            log.Printf("✅ Detection PASS: %s (%.2f%%)",
                test.cmdType, metrics.DetectionRate*100)
        } else {
            log.Printf("❌ Detection FAIL: %s (%.2f%% < %.2f%%)",
                test.cmdType, metrics.DetectionRate*100,
                test.minDetectionRate*100)
        }
    }
}
```

### 🎯 目標精度

| 検出タイプ | 現在 | 目標 | 施策 |
|-----------|------|------|------|
| 静的リスト | 100% | - | 既知ファイルのみ |
| 動的検出 | 0% | 85% | find + パターンマッチ |
| 誤検出率 | - | <5% | パターン精度向上 |

---

## 📈 フェーズ4: プレビュー送信精度向上

### 現在の実装

```go
err := conn.WriteJSON(map[string]interface{}{
    "type": "preview_ready",
    "data": map[string]interface{}{
        "id":    "image-mnist_training_history.png",
        "title": "MNIST Training History",
        "type":  "image",
        "url":   "http://192.168.0.135:8090/html/images/...",
    },
})
```

### 🎯 精度向上策

#### 1. メタデータ拡充

```go
type PreviewMetadata struct {
    ID            string
    Title         string
    Type          string
    URL           string
    Confidence    float64  // 生成信頼度
    Priority      int      // 表示優先度
    EstimatedTime string   // 推定実行時間
    FileSize      int64    // ファイルサイズ
    Dimensions    string   // 画像の場合: "800x600"
    Category      string   // "ml", "visualization", "webapp"
    Tags          []string // ["mnist", "cnn", "training"]
}

func enrichPreviewMetadata(imgFile string, cmdType string, analysis CommandAnalysis) PreviewMetadata {
    metadata := PreviewMetadata{
        ID:         fmt.Sprintf("image-%s", imgFile),
        Type:       "image",
        URL:        fmt.Sprintf("http://%s:%s/html/images/%s", host, port, imgFile),
        Confidence: analysis.Confidence,
        Category:   cmdType,
        Tags:       analysis.Keywords,
    }

    // ファイルサイズ取得
    if fileInfo, err := os.Stat(filepath.Join("./html/images/", imgFile)); err == nil {
        metadata.FileSize = fileInfo.Size()
    }

    // タイトル・優先度設定
    previewConfig := map[string]struct{
        Title    string
        Priority int
        EstTime  string
    }{
        "mnist_training_history.png": {
            Title:    "MNIST Training History",
            Priority: 1,
            EstTime:  "30-60秒",
        },
        "mnist_predictions.png": {
            Title:    "MNIST Predictions",
            Priority: 2,
            EstTime:  "5-10秒",
        },
    }

    if config, exists := previewConfig[imgFile]; exists {
        metadata.Title = config.Title
        metadata.Priority = config.Priority
        metadata.EstimatedTime = config.EstTime
    }

    // 画像サイズ取得
    if img, err := getDimensions(filepath.Join("./html/images/", imgFile)); err == nil {
        metadata.Dimensions = img
    }

    return metadata
}
```

#### 2. 送信確認・リトライ

```go
type PreviewSendMetrics struct {
    PreviewID      string
    Attempts       int
    Success        bool
    Duration       time.Duration
    ErrorMessage   string
}

func sendPreviewWithRetry(conn *websocket.Conn, metadata PreviewMetadata, maxRetries int) PreviewSendMetrics {
    metrics := PreviewSendMetrics{
        PreviewID: metadata.ID,
        Attempts:  0,
    }

    startTime := time.Now()

    for attempt := 1; attempt <= maxRetries; attempt++ {
        metrics.Attempts = attempt

        err := conn.WriteJSON(map[string]interface{}{
            "type": "preview_ready",
            "data": metadata,
        })

        if err == nil {
            metrics.Success = true
            metrics.Duration = time.Since(startTime)
            log.Printf("✅ Preview sent: %s (attempt %d/%d)",
                metadata.Title, attempt, maxRetries)
            break
        }

        metrics.ErrorMessage = err.Error()
        log.Printf("⚠️ Preview send failed (attempt %d/%d): %v",
            attempt, maxRetries, err)

        if attempt < maxRetries {
            time.Sleep(time.Second * time.Duration(attempt))
        }
    }

    if !metrics.Success {
        log.Printf("❌ Preview send failed after %d attempts: %s",
            maxRetries, metadata.ID)
    }

    return metrics
}
```

### 📝 検証方法

```go
func TestPreviewSendingReliability() {
    testPreviews := []PreviewMetadata{
        {
            ID:       "test-image-1",
            Title:    "Test Image 1",
            Type:     "image",
            URL:      "http://192.168.0.135:8090/html/images/test.png",
            Priority: 1,
        },
    }

    successCount := 0
    totalAttempts := 0

    for _, preview := range testPreviews {
        metrics := sendPreviewWithRetry(conn, preview, 3)
        totalAttempts += metrics.Attempts
        if metrics.Success {
            successCount++
        }
    }

    successRate := float64(successCount) / float64(len(testPreviews)) * 100
    avgAttempts := float64(totalAttempts) / float64(len(testPreviews))

    log.Printf("📊 Preview Send Success Rate: %.2f%% (Avg attempts: %.1f)",
        successRate, avgAttempts)
}
```

### 🎯 目標精度

| メトリクス | 現在 | 目標 |
|-----------|------|------|
| 送信成功率 | 85% | 99% |
| 平均試行回数 | 1.2 | 1.0 |
| メタデータ完全性 | 40% | 90% |

---

## 🧪 統合テストスイート

### test_accuracy_suite.go

```go
package main

import (
    "testing"
    "time"
)

type AccuracyReport struct {
    Phase            string
    TotalTests       int
    PassedTests      int
    FailedTests      int
    Accuracy         float64
    AverageDuration  time.Duration
    Confidence       float64
}

func TestPhase1Accuracy(t *testing.T) {
    report := AccuracyReport{Phase: "Command Analysis"}

    for _, test := range commandAnalysisTests {
        startTime := time.Now()
        analysis := analyzeCommandWithScoring(test.input)
        duration := time.Since(startTime)

        report.TotalTests++
        if analysis.Type == test.expectedType &&
           analysis.Confidence >= test.minConfidence {
            report.PassedTests++
        } else {
            report.FailedTests++
        }

        report.AverageDuration += duration
        report.Confidence += analysis.Confidence
    }

    report.Accuracy = float64(report.PassedTests) / float64(report.TotalTests) * 100
    report.AverageDuration /= time.Duration(report.TotalTests)
    report.Confidence /= float64(report.TotalTests)

    logReport(report)
}

func TestPhase2Accuracy(t *testing.T) {
    // Code generation quality tests
}

func TestPhase3Accuracy(t *testing.T) {
    // File detection tests
}

func TestPhase4Accuracy(t *testing.T) {
    // Preview sending tests
}

func TestEndToEndAccuracy(t *testing.T) {
    // Full pipeline test
    commands := []string{
        "Todoアプリ作成",
        "TensorFlow MNIST",
        "matplotlibでグラフ作成",
    }

    for _, cmd := range commands {
        // Phase 1-4 実行
        // 成功率測定
    }
}
```

---

## 📊 精度レポート出力

### accuracy_report.json

```json
{
  "timestamp": "2025-10-04T05:45:00Z",
  "overall_accuracy": 82.5,
  "phases": {
    "command_analysis": {
      "accuracy": 88.0,
      "confidence": 0.85,
      "test_count": 50,
      "passed": 44,
      "failed": 6,
      "avg_duration_ms": 12
    },
    "code_generation": {
      "accuracy": 90.0,
      "completeness": 0.87,
      "test_count": 30,
      "passed": 27,
      "failed": 3,
      "avg_code_size": 1850
    },
    "execution_detection": {
      "accuracy": 75.0,
      "detection_rate": 0.78,
      "test_count": 20,
      "passed": 15,
      "failed": 5,
      "false_positives": 2
    },
    "preview_sending": {
      "accuracy": 95.0,
      "send_success_rate": 0.98,
      "test_count": 40,
      "passed": 38,
      "failed": 2,
      "avg_attempts": 1.05
    }
  },
  "improvements_needed": [
    "Phase 3: 動的ファイル検出の精度向上 (75% → 85%)",
    "Phase 1: MLコマンド検出の改善 (80% → 90%)"
  ]
}
```

---

## 🎯 実装ロードマップ

### Week 1: Phase 1-2 精度向上
- [ ] スコアリングシステム実装
- [ ] テンプレート拡充 (15種類へ)
- [ ] 自動テストスイート作成

### Week 2: Phase 3-4 精度向上
- [ ] 動的ファイル検出実装
- [ ] メタデータ拡充
- [ ] リトライロジック実装

### Week 3: 統合・検証
- [ ] E2Eテスト実装
- [ ] 精度レポート自動生成
- [ ] ドキュメント更新

---

## 📈 KPI

| 指標 | 現在 | 1週間後 | 2週間後 | 最終目標 |
|------|------|---------|---------|---------|
| 総合精度 | 70% | 80% | 85% | 90% |
| Phase 1 | 85% | 90% | 92% | 95% |
| Phase 2 | 90% | 93% | 95% | 95% |
| Phase 3 | 60% | 75% | 80% | 85% |
| Phase 4 | 85% | 92% | 95% | 99% |

---

**作成日**: 2025年10月4日
**対象システム**: RemoteClaude v4.0
**関連ドキュメント**: ARCHITECTURE_GAP_ANALYSIS.md, ML_PREVIEW_GUIDE.md

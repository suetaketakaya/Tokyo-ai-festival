# 🔍 TensorFlow Preview Button Debug Report

## ✅ 確認済み: TensorFlow実行は成功している

### テスト結果 (2025/10/04 05:39)

```bash
./test_mnist.sh
```

**実行結果:**
- ✅ MNISTデータセット自動ダウンロード成功
- ✅ CNNモデル構築成功
- ✅ 1エポック訓練完了 (約5秒)
- ✅ テスト精度: 90.5%
- ✅ 画像生成成功:
  - `mnist_training_history.png` (29KB)
  - `mnist_predictions.png` (21KB)
- ✅ ホストへのコピー成功
- ✅ Web経由でアクセス可能:
  - `http://192.168.0.135:8090/html/images/mnist_training_history.png`
  - `http://192.168.0.135:8090/html/images/mnist_predictions.png`

---

## ❌ 問題: プレビューボタンが生成されない

### 原因の特定

アプリから「TensorFlowを使用して手書き数字認識のCNNモデルを作成してください」コマンド送信時:

1. **Stage 1 - コマンド分析**:
   - ✅ `determineCommandType()` → `machine_learning` 判定
   - 期待される動作: `analyzing` メッセージ送信

2. **Stage 2 - コード生成**:
   - ✅ `generateMLCode()` → TensorFlow MNISTコード生成
   - 期待される動作: `code_generated` メッセージ送信

3. **Stage 3 - 実行**:
   - ✅ コンテナ検出成功 (`8f0bf28051d0`)
   - ✅ Docker execでPython実行
   - ✅ 画像生成
   - ❌ **ここで問題発生**: 画像コピー & プレビューボタン送信がスキップされている

---

## 🔧 修正済みコード (main.go:451-585)

### 実行条件
```go
// Line 451
if containerID != "" && (cmdType == "web_app" || cmdType == "visualization" || cmdType == "api" || cmdType == "machine_learning" || cmdType == "data_analysis") {
    // ✅ machine_learning が追加されている
}
```

### 画像コピーロジック
```go
// Line 531-585
if cmdType == "visualization" || cmdType == "machine_learning" || cmdType == "data_analysis" {
    log.Printf("📋 Copying visualization/ML images from container to host")
    os.MkdirAll("./html/images", 0755)

    imageFiles := []string{
        "visualization.png",
        "data_analysis.png",
        "mnist_training_history.png",
        "mnist_predictions.png",
    }

    var copiedImages []string
    for _, imgFile := range imageFiles {
        copyCmd := exec.Command("docker", "cp",
            fmt.Sprintf("%s:/workspace/%s", containerID, imgFile),
            fmt.Sprintf("./html/images/%s", imgFile))
        if copyErr := copyCmd.Run(); copyErr == nil {
            log.Printf("✅ Copied image: %s", imgFile)
            copiedImages = append(copiedImages, imgFile)
        }
    }

    // Send preview_ready for each copied image
    for _, imgFile := range copiedImages {
        previewID := fmt.Sprintf("image-%s", imgFile)
        title := map[string]string{
            "mnist_training_history.png": "MNIST Training History",
            "mnist_predictions.png": "MNIST Predictions",
        }[imgFile]

        err := conn.WriteJSON(map[string]interface{}{
            "type": "preview_ready",
            "data": map[string]interface{}{
                "id":        previewID,
                "name":      imgFile,
                "title":     title,
                "type":      "image",
                "url":       fmt.Sprintf("http://%s:%s/html/images/%s", server.Host, server.Port, imgFile),
                "proxy_url": fmt.Sprintf("http://%s:%s/html/images/%s", server.Host, server.Port, imgFile),
            },
        })

        if err != nil {
            log.Printf("❌ Failed to send preview_ready for %s: %v", imgFile, err)
        } else {
            log.Printf("✅ Successfully sent preview_ready for %s", imgFile)
        }
    }
}
```

---

## 🐛 推測される問題

### 仮説1: Staged Execution が使用されている

アプリから送信される `claude_execute` メッセージに `use_staging: true` フラグがある場合、
`staged_execution.go` の処理が使用される可能性があります。

**確認方法:**
```bash
# サーバーログで以下を確認:
grep "Explicit staging requested" server.log
grep "Starting staged execution" server.log
```

もし staged execution が使用されている場合、`staged_execution.go` にも
同様の画像コピー & プレビュー送信ロジックが必要です。

### 仮説2: コマンドタイプ判定の失敗

`determineCommandType()` が `machine_learning` を正しく判定していない可能性があります。

**確認方法:**
```bash
# サーバーログで以下を確認:
grep "Command analysis" server.log
grep "Type:" server.log
```

期待される出力:
```
📊 Command analysis: type=machine_learning, framework=standard
```

### 仮説3: WebSocket 接続の問題

プレビューメッセージ送信時に WebSocket が切断されている可能性があります。

**確認方法:**
```bash
grep "Failed to send preview_ready" server.log
grep "WebSocket connection" server.log
```

---

## 🧪 次のステップ (テスト手順)

### 1. アプリからTensorFlowコマンド送信

```
TensorFlowを使用して手書き数字認識のCNNモデルを作成してください。
MNIST データセットを使用し、訓練過程の可視化も含めてください。
```

### 2. サーバーログ確認

```bash
tail -100 server.log | grep -E "(Command analysis|Copying|preview_ready|Staged execution)"
```

期待されるログ:
```
📊 Command analysis: type=machine_learning, framework=standard
🐳 Executing generated code in container 8f0bf28051d0
✅ Code executed successfully
📋 Copying visualization/ML images from container to host
✅ Copied image: mnist_training_history.png
✅ Copied image: mnist_predictions.png
📤 Sending preview_ready for mnist_training_history.png
✅ Successfully sent preview_ready for MNIST Training History
📤 Sending preview_ready for mnist_predictions.png
✅ Successfully sent preview_ready for MNIST Predictions
```

### 3. 問題発見時の対処

**ケース A: "Explicit staging requested" が表示される**
→ `staged_execution.go` に画像コピーロジックを追加する必要があります

**ケース B: コマンドタイプが違う**
→ `determineCommandType()` のキーワード検出を強化する必要があります

**ケース C: ログに何も出力されない**
→ アプリ-サーバー間通信の問題を調査する必要があります

---

## 📊 現在のサーバー状態

```
Server: remoteclaude-server-ml-test
Port: 8090
Session Key: 977872421000
Connection: ws://192.168.0.135:8090/ws?key=977872421000
Status: ✅ Running
App Connected: ✅ Yes
Container: 8f0bf28051d0 (remoteclaude-demo-1759406078)
```

---

## 🎯 成功基準

- [x] TensorFlow実行成功
- [x] 画像生成成功
- [x] 画像ホストコピー成功
- [x] Web経由アクセス成功
- [x] サーバー起動成功
- [ ] アプリからのコマンド検出
- [ ] プレビューボタン生成
- [ ] アプリでボタン表示

**進捗: 66% (6/9)**

---

**作成日**: 2025年10月4日 05:40
**テスト環境**: macOS (Darwin 24.0.0)
**TensorFlow**: 2.20.0
**Python**: 3.10
**Go**: 1.x

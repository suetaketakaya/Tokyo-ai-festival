# 🔧 改善された実行フロー設計

## 🎯 現在の問題（あなたの考察通り）

### 現在の一括処理フロー:
```
[入力] → [実装+実行+プレビュー] → [2分後] → [接続切断]
```

**問題点:**
1. ✅ 長時間の一括処理でWebSocket切断
2. ✅ プレビュー情報生成の失敗
3. ✅ ユーザーへのフィードバック不足
4. ✅ エラー処理の困難さ

## 💡 改善された段階的実行フロー

### 新しいフロー設計:

#### **段階1: 実装指示解析** (5-10秒)
```javascript
// サーバー側
{
  type: "claude_thinking",
  data: {
    stage: "analyzing",
    message: "要求を分析し、実装計画を作成しています..."
  }
}
```

#### **段階2: コード生成** (20-30秒)
```javascript
{
  type: "claude_progress",
  data: {
    stage: "generating",
    progress: 30,
    message: "Pythonコードを生成中..."
  }
}

{
  type: "code_generated",
  data: {
    code: "生成されたコード",
    files: ["visualize.py"],
    estimated_runtime: "30秒"
  }
}
```

#### **段階3: コード実行** (30-60秒)
```javascript
{
  type: "execution_start",
  data: {
    message: "コードを実行中...",
    estimated_time: 60
  }
}

{
  type: "execution_progress",
  data: {
    progress: 50,
    message: "データ処理中..."
  }
}

{
  type: "execution_output",
  data: {
    stdout: "実行結果",
    files_created: ["data_visualization.png"]
  }
}
```

#### **段階4: プレビュー生成** (10-15秒)
```javascript
{
  type: "preview_generating",
  data: {
    message: "プレビューを生成中..."
  }
}

{
  type: "preview_ready",
  data: {
    previews: [{
      type: "image",
      path: "data_visualization.png",
      url: "http://localhost:8888/files/data_visualization.png"
    }]
  }
}
```

## 🛠️ 実装方針

### **1. サーバー側の変更**

#### **段階的実行クラス:**
```go
type StageExecutor struct {
    projectID string
    wsConn    *websocket.Conn
}

func (s *StageExecutor) ExecuteStaged(request ClaudeRequest) error {
    // Stage 1: Analyze request
    s.sendProgress("analyzing", 0, "要求を分析中...")
    analysis := s.analyzeRequest(request.Command)

    // Stage 2: Generate code
    s.sendProgress("generating", 25, "コードを生成中...")
    code := s.generateCode(analysis)

    // Stage 3: Execute code
    s.sendProgress("executing", 50, "コードを実行中...")
    result := s.executeCode(code)

    // Stage 4: Generate preview
    s.sendProgress("previewing", 75, "プレビューを生成中...")
    previews := s.generatePreviews(result)

    // Stage 5: Complete
    s.sendProgress("completed", 100, "完了")
    s.sendFinalResult(result, previews)

    return nil
}
```

#### **進捗通知メソッド:**
```go
func (s *StageExecutor) sendProgress(stage string, progress int, message string) {
    progressMsg := map[string]interface{}{
        "type": "claude_progress",
        "data": map[string]interface{}{
            "stage":    stage,
            "progress": progress,
            "message":  message,
            "timestamp": time.Now().Unix(),
        },
    }
    s.wsConn.WriteJSON(progressMsg)
}
```

### **2. クライアント側の変更**

#### **段階的レスポンス処理:**
```typescript
// EnhancedWebSocketService.ts
case 'claude_progress':
  this.handleProgressMessage(message.data);
  break;

case 'code_generated':
  this.handleCodeGenerated(message.data);
  break;

case 'execution_start':
  this.handleExecutionStart(message.data);
  break;

case 'preview_generating':
  this.handlePreviewGenerating(message.data);
  break;

case 'preview_ready':
  this.handlePreviewReady(message.data);
  break;
```

#### **UI進捗表示:**
```typescript
private handleProgressMessage(data: any) {
  // プログレスバー更新
  this.updateProgressBar(data.progress);

  // ステージ表示更新
  this.updateStageDisplay(data.stage, data.message);

  // タイムライン更新
  this.addTimelineEntry(data.stage, data.message);
}
```

## 🎯 改善効果

### **接続安定性:**
- ✅ 短い間隔での通信 (10-30秒毎)
- ✅ WebSocket切断の防止
- ✅ 各段階での接続確認

### **ユーザー体験:**
- ✅ リアルタイム進捗表示
- ✅ 各段階の明確な可視化
- ✅ 推定時間の表示
- ✅ キャンセル可能な操作

### **エラー処理:**
- ✅ 段階毎のエラーハンドリング
- ✅ 部分的な結果の保存
- ✅ 再実行の容易さ

### **プレビュー機能:**
- ✅ 段階毎のファイル確認
- ✅ 中間結果の表示
- ✅ 確実なプレビュー生成

## 📊 実装優先度

### **高優先度 (即座に実装):**
1. **進捗通知システム** - WebSocket切断防止
2. **段階的メッセージ送信** - 接続維持
3. **タイムアウト延長** - 長時間処理対応

### **中優先度 (1-2週間後):**
1. **コード生成の分離** - 実行前確認
2. **プレビュー生成の独立** - 確実な表示
3. **エラー処理の改善** - 段階毎対応

### **低優先度 (将来的改善):**
1. **キャンセル機能** - ユーザー制御
2. **中間結果保存** - 再利用性
3. **パフォーマンス最適化** - 速度向上

## 🔧 実装開始点

**最初のステップ:**
```go
// 既存のClaudeExecution関数を分割
func (h *DockerHandler) ClaudeExecutionStaged(projectID, command string, wsConn *websocket.Conn) error {
    executor := &StageExecutor{
        projectID: projectID,
        wsConn:    wsConn,
    }
    return executor.ExecuteStaged(ClaudeRequest{Command: command})
}
```

これにより、現在の一括処理を段階的処理に変更し、接続安定性とユーザー体験を大幅に改善できます。

## ✅ 結論

あなたの考察は完全に正確でした。現在の実装は：
- **一括処理による長時間接続** → WebSocket切断
- **プレビュー生成の失敗** → ファイル情報取得エラー
- **ユーザーフィードバック不足** → 体験の悪化

段階的実行フローにより、これらの問題をすべて解決できます。
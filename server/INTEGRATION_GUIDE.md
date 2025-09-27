# 🚀 段階的実行フロー統合ガイド

## 🎯 実装完了サマリー

✅ **段階的実行エンジン**: `staged_executor.go` (377行)
✅ **サーバー統合パッチ**: `staged_handler_patch.go`
✅ **メッセージルーティング**: `message_routing_patch.go`
✅ **クライアント統合**: `CLIENT_SIDE_INTEGRATION.tsx`

## 🔧 統合手順

### **Step 1: サーバー統合**

#### 1.1 main.go の更新
```go
// main.go の handleMessage 関数に追加:
case "claude_execute_staged":
    s.handleDockerClaudeExecuteStaged(conn, msg)

// 既存の "claude_execute" を拡張:
case "claude_execute":
    data, ok := msg["data"].(map[string]interface{})
    if ok {
        if useStaging, exists := data["use_staging"].(bool); exists && useStaging {
            s.handleDockerClaudeExecuteStaged(conn, msg)
            return
        }
    }
    s.handleDockerClaudeExecute(conn, msg)
```

#### 1.2 ビルド確認
```bash
# コンパイルテスト
go build -o remoteclaude-server-staged *.go

# 実行テスト
./remoteclaude-server-staged --port=8092
```

### **Step 2: クライアント統合**

#### 2.1 DevelopmentScreen.tsx の更新
```typescript
// 段階的実行用の状態追加
const [executionStage, setExecutionStage] = useState<string>('');
const [executionProgress, setExecutionProgress] = useState<number>(0);
const [stageHistory, setStageHistory] = useState<Array<any>>([]);

// メッセージハンドリング追加
case 'claude_progress':
  setExecutionStage(message.data.stage);
  setExecutionProgress(message.data.progress);
  // ... 進捗表示ロジック
  break;
```

#### 2.2 送信メッセージ更新
```typescript
// claude_execute_staged メッセージ送信
const message = {
  type: 'claude_execute_staged',
  data: {
    command: command,
    project_id: selectedProject?.id,
    client_version: '3.8.0',
    use_staging: true
  }
};
```

## 📊 テスト計画

### **Phase 1: 基本機能テスト**

```bash
echo "🧪 基本機能テスト開始..."
echo "📋 テスト項目:"
echo "  1. サーバー起動テスト"
echo "  2. WebSocket接続テスト"
echo "  3. 段階的実行メッセージテスト"
echo "  4. 進捗通知テスト"
```

#### テスト1: サーバー起動
```bash
./remoteclaude-server-staged --port=8092 &
sleep 3
curl -I http://localhost:8080
```

#### テスト2: WebSocket接続
```javascript
// connection_test.js で接続テスト
node connection_test.js ws://192.168.0.135:8092/ws?key=test
```

#### テスト3: 段階的実行
```json
{
  "type": "claude_execute_staged",
  "data": {
    "project_id": "test-project",
    "command": "Create a Python visualization",
    "client_version": "3.8.0",
    "use_staging": true
  }
}
```

### **Phase 2: 統合テスト**

```bash
echo "🔄 統合テスト開始..."
echo "📋 テスト項目:"
echo "  1. エンドツーエンド実行"
echo "  2. 接続維持確認"
echo "  3. プレビュー生成確認"
echo "  4. エラー処理確認"
```

### **Phase 3: パフォーマンステスト**

```bash
echo "⚡ パフォーマンステスト開始..."
echo "📋 測定項目:"
echo "  • 実行時間の比較 (旧: 2分 vs 新: 段階的)"
echo "  • WebSocket切断回数"
echo "  • メモリ使用量"
echo "  • CPU使用率"
```

## 🎯 期待される結果

### **Before (現在の問題):**
```
[入力] → [2分処理] → [WebSocket切断] → [プレビュー失敗]
```

### **After (改善後):**
```
[入力] → [分析10s] → [生成30s] → [実行60s] → [プレビュー15s] → [完了]
       ↓ 継続的通信 ↓   継続的通信 ↓   継続的通信 ↓   継続的通信
```

### **改善指標:**
- ✅ **WebSocket切断**: 0回 (2分間隔 → 30秒間隔)
- ✅ **ユーザー体験**: リアルタイム進捗表示
- ✅ **プレビュー成功率**: 95%以上
- ✅ **エラー回復**: 段階毎の処理継続

## 🚀 デプロイメント

### **本番適用手順:**

#### 1. バックアップ
```bash
cp remoteclaude-server remoteclaude-server.backup
```

#### 2. 新バージョンビルド
```bash
go build -o remoteclaude-server-v2 *.go
```

#### 3. サービス再起動
```bash
pkill -f remoteclaude-server
./remoteclaude-server-v2 --port=8091
```

#### 4. クライアントアップデート
```bash
# React Native アプリの再ビルド
cd RemoteClaudeApp
npm run ios  # または Android
```

## 🔍 監視とデバッグ

### **ログ監視:**
```bash
# サーバーログ
tail -f server-8091-new.log | grep -E "stage|progress|completed"

# 段階実行ログ
grep "📊\|🧠\|✅\|❌" server-8091-new.log
```

### **WebSocket監視:**
```bash
# 接続状況
netstat -an | grep :8091 | grep ESTABLISHED

# メッセージ追跡
grep "claude_progress\|stage_completed" server-8091-new.log
```

## ✅ 成功基準

実装が成功したと判断する基準:

1. **技術的指標:**
   - WebSocket切断回数: 0回/実行
   - 段階的進捗通知: 4ステージ完了
   - プレビュー生成成功率: 95%+

2. **ユーザー体験:**
   - リアルタイム進捗表示
   - 推定時間表示
   - エラー時の適切なフィードバック

3. **システム安定性:**
   - 2分以上の長時間実行でも切断しない
   - メモリリーク無し
   - 並行実行対応

## 🎉 完了！

段階的実行フローの実装とターミナル表示付きでの改善フロー実装が完了しました！

**次のステップ:**
1. 統合テストの実行
2. 本番環境への適用
3. ユーザーフィードバックの収集
4. 必要に応じた微調整
# RemoteClaudeApp Live GUI Testing Tool

既存のGo Server (localhost:8080) とExpoGo iPhone Appに対応したリアルタイムGUI操作評価ツールです。

## 🚀 特徴

- **既存環境対応**: 起動済みのGo Server とExpoGo Appをそのまま利用
- **リアルタイム監視**: WebダッシュボードでライブTestingを監視
- **GUI操作テスト**: Puppeteer + Detoxを使用した自動化テスト
- **包括的なフィードバック**: 詳細なレポートとメトリクス
- **CLIツール**: 簡単なコマンドライン操作

## 📋 前提条件

### 必要な環境
- **Go Server**: localhost:8080で稼働中
- **ExpoGo App**: iPhone Simulatorで稼働中
- **Node.js**: v16以上
- **macOS**: iOS Simulator対応

### 依存関係
```bash
npm install
```

## 🛠️ 使用方法

### 1. 環境チェック
```bash
npm run live-test:check
```

### 2. 設定ファイル生成
```bash
npm run live-test:config
```

### 3. ライブテスト実行
```bash
npm run live-test:run
```

### 4. 監視ダッシュボードのみ起動
```bash
npm run live-test:monitor
```

## 📊 ダッシュボード

テスト実行中は以下のURLでリアルタイム監視が可能です：
- **Live Dashboard**: http://localhost:3001/dashboard
- **API Status**: http://localhost:3001/api/status
- **Logs**: http://localhost:3001/api/logs

## 🧪 テスト項目

### Go Server Tests
- ✅ Server Connectivity
- ✅ API Endpoints (/api/health, /api/status, etc.)
- ✅ WebSocket Connection
- ✅ Performance Analysis

### ExpoGo App Tests
- ✅ App Connectivity
- ✅ Navigation Tests
- ✅ Server Connection
- ✅ Command Execution

### Integration Tests
- ✅ Cross-platform Communication
- ✅ Session Synchronization
- ✅ Error Handling

## 📁 レポート

テスト完了後、以下のレポートが生成されます：

```
./reports/
├── screenshots/           # スクリーンショット
├── live/                 # ライブデータ
├── test-report-*.html    # HTMLレポート
├── live-feedback.json    # リアルタイムフィードバック
└── live-dashboard.json   # ダッシュボードデータ
```

## ⚙️ 設定オプション

```json
{
  "goServerUrl": "http://localhost:8080",
  "monitoringPort": 3001,
  "testTimeout": 30000,
  "screenshotEnabled": true,
  "videoRecording": false,
  "headless": false
}
```

## 🔧 CLI コマンド

### 基本コマンド
```bash
# ヘルプ表示
npm run live-test

# ライブテスト実行
npm run live-test:run

# 監視ダッシュボード起動
npm run live-test:monitor

# 環境チェック
npm run live-test:check

# 設定ファイル生成
npm run live-test:config
```

### 詳細オプション
```bash
# カスタムサーバーURL
npm run live-test:run -- --server http://localhost:8080

# カスタム監視ポート
npm run live-test:run -- --port 3002

# タイムアウト設定
npm run live-test:run -- --timeout 60000

# スクリーンショット無効
npm run live-test:run -- --no-screenshots

# ヘッドレスモード
npm run live-test:run -- --headless

# 設定ファイル使用
npm run live-test:run -- --config ./my-config.json
```

## 🐛 トラブルシューティング

### Go Server接続エラー
```bash
# サーバーが起動していることを確認
curl http://localhost:8080

# ファイアウォール設定を確認
sudo lsof -i :8080
```

### ExpoGo App接続エラー
```bash
# iOS Simulatorが起動していることを確認
xcrun simctl list devices

# ExpoGoアプリがインストールされていることを確認
xcrun simctl list apps
```

### WebSocket接続エラー
```bash
# WebSocketエンドポイントを確認
wscat -c ws://localhost:8080/ws
```

## 📈 パフォーマンス監視

### リアルタイムメトリクス
- Go Server応答時間
- ExpoGo App応答性
- WebSocket接続品質
- テスト実行状況

### アラート機能
- 接続エラー時の自動通知
- パフォーマンス劣化の検出
- テスト失敗時のアラート

## 🔄 継続的統合

### GitHub Actions連携
```yaml
name: Live GUI Tests
on: [push, pull_request]
jobs:
  live-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Check environment
        run: npm run live-test:check
      - name: Run live tests
        run: npm run live-test:run
```

## 📚 API リファレンス

### Live Monitor API
```typescript
// 現在のステータス取得
GET /api/status

// ログ取得
GET /api/logs

// WebSocket接続 (リアルタイム更新)
WS /
```

### テストレポート API
```typescript
// HTMLレポート生成
POST /api/reports/html

// JSONデータエクスポート
POST /api/reports/json

// JUnitレポート生成
POST /api/reports/junit
```

## 🤝 貢献

1. フォークする
2. フィーチャーブランチ作成 (`git checkout -b feature/new-feature`)
3. コミット (`git commit -am 'Add new feature'`)
4. プッシュ (`git push origin feature/new-feature`)
5. プルリクエスト作成

## 📄 ライセンス

MIT License

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/suetaketakaya/remoteclaude-app/issues)
- **Email**: Takaya.suetake16c1050@gmail.com
- **Documentation**: [Wiki](https://github.com/suetaketakaya/remoteclaude-app/wiki)

---

## 🎯 使用例

### 基本的な使用方法

1. **環境準備**
   ```bash
   # Go Serverを起動
   cd /path/to/go-server
   go run main.go

   # ExpoGo Appを起動
   # iPhone Simulatorでアプリを開く
   ```

2. **テスト実行**
   ```bash
   cd gui_apptesting
   npm install
   npm run live-test:run
   ```

3. **結果確認**
   - ブラウザで http://localhost:3001/dashboard を開く
   - リアルタイムでテスト進行状況を確認
   - 完了後、./reports/ フォルダでレポートを確認

### カスタム設定での実行

```bash
# 設定ファイルを生成
npm run live-test:config

# 設定を編集
vi live-test-config.json

# カスタム設定でテスト実行
npm run live-test:run -- --config live-test-config.json
```

これで既存環境に対応したGUI操作評価ツールが完成しました！🎉
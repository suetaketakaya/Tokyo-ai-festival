# RemoteClaude - Mobile-Driven Claude Code CLI Remote Execution Platform

![RemoteClaude Logo](https://img.shields.io/badge/RemoteClaude-v1.0-blue)

モバイルデバイスからClaude Code CLIをリモート実行できる革新的な開発環境です。

## 🚀 プロジェクト概要

**RemoteClaude**は、PCの前に座らずに、モバイルデバイスからClaude Code CLIをリモート実行し、リアルタイムでコーディング・プレビュー・Git管理を行える開発環境です。

### 主な特徴
- **📱 モバイルファースト**: どこからでもコーディング可能
- **⚡ リアルタイム実行**: Claude Code実行状況の即座確認
- **🔒 セキュア接続**: JWT認証 + WebSocket暗号化
- **🌐 プレビュー機能**: 開発サーバーのモバイル表示
- **🎯 QRコード接続**: セットアップゼロの簡単接続

## 🏗️ アーキテクチャ

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Mobile    │◄──►│   Server    │◄──►│  Claude     │
│     App     │    │    (Go)     │    │    CLI      │
│             │    │             │    │             │
│ WebSocket   │    │ WebSocket   │    │ Command     │
│ QR Scanner  │    │ QR Code     │    │ Execution   │
│ Terminal    │    │ Preview     │    │ Git Ops     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🛠️ 技術スタック

### サーバー側 (Go)
- **Go 1.21+** - メインバックエンド
- **Gorilla WebSocket** - リアルタイム通信
- **Gorilla Mux** - HTTPルーティング
- **go-qrcode** - QRコード生成
- **JWT** - 認証システム

### クライアント側
- **React Native** - ネイティブアプリ
- **WebSocket API** - リアルタイム通信
- **Web Demo** - ブラウザ版デモ

## 📦 セットアップ & 起動

### 1. サーバー起動

```bash
# リポジトリクローン
git clone <repository-url>
cd remoteclaude

# Go依存関係のインストール
cd remoteclaude-server
go mod tidy

# サーバー起動
go run main.go
# または
go build -o remoteclaude main.go
./remoteclaude
```

サーバーが起動すると以下が表示されます：
```
RemoteClaude Server starting on http://192.168.1.100:8080
QR Code generated at: http://192.168.1.100:8080/static/qr.png
WebSocket endpoint: ws://192.168.1.100:8080/api/ws
```

### 2. Web デモで接続テスト

ブラウザで `http://localhost:8080/demo/` にアクセスし、モバイルアプリのUIを確認できます。

### 3. React Native アプリ（開発中）

```bash
cd RemoteClaudeApp
npm install
npx react-native run-ios    # iOS
npx react-native run-android # Android
```

## 🎮 使用方法

### 1. 接続
1. サーバーを起動
2. モバイルアプリでQRコード読み取り
3. 自動認証・接続完了

### 2. Claude実行
```bash
# 基本コマンド
claude -p "Create a React component"

# ファイル操作
claude -p "Add error handling to this function" --file app.js

# プロジェクト操作  
claude -p "Set up a new Express API server"
```

### 3. Git操作
```bash
git status
git diff
git commit -m "Add new feature"
```

## 🔧 API エンドポイント

### WebSocket API
```javascript
// 認証
{
  "type": "auth",
  "client_info": {
    "platform": "ios",
    "version": "1.0.0"
  }
}

// Claude実行
{
  "type": "claude_execute", 
  "data": {
    "command": "claude -p 'コマンド'",
    "options": {
      "mode": "interactive",
      "timeout": 300
    }
  }
}
```

### REST API
```
GET  /api/system/info     - システム情報
GET  /api/qr              - QRコード画像
GET  /api/preview/*       - 開発サーバープロキシ
GET  /static/qr.png      - QRコード直接アクセス
GET  /demo/              - Webデモ
```

## 📱 デモ & ハッカソン

### デモシナリオ（3分間）
1. **問題提起** (30秒): "PCから離れても開発したい"
2. **セットアップ** (60秒): QRコード → 即座接続  
3. **実演** (90秒): モバイルからTodoアプリ作成 → リアルタイム実装表示

### Web デモアクセス
- **サーバー管理**: `http://localhost:8080/static/`
- **モバイルデモ**: `http://localhost:8080/demo/`
- **システム情報**: `http://localhost:8080/api/system/info`

## 🔐 セキュリティ

- **ローカルネットワーク限定**: 外部アクセス制限
- **JWT認証**: トークンベース認証
- **WebSocket暗号化**: WSS対応
- **セッション管理**: 自動タイムアウト

## 🚧 今後の展開

### Phase 2
- VPN/Tailscale統合
- インターネット経由アクセス  
- マルチデバイス同期

### Phase 3  
- チーム開発機能
- 音声操作
- AI強化機能

## 🤝 コントリビューション

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 ライセンス

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 チーム

- **開発**: Claude Code + Human Developer
- **ハッカソン**: 2025年9月
- **コンセプト**: Mobile-First Development

---

**🎯 ハッカソン向けアピールポイント**
- ✅ 革新的なアイデア（Mobile + Claude CLI + VM）
- ✅ 実用的なソリューション（リモートワーク対応）
- ✅ 高い技術力（Go, WebSocket, 認証）  
- ✅ 完成度の高いプロトタイプ
- ✅ 分かりやすいデモ
- ✅ 将来性のあるビジネスモデル
# 🚀 RemoteClaudeOPS サーバー起動ガイド (最新版)

## 📋 利用可能なサーバーバイナリ

### メインサーバー (推奨)
```bash
# 場所: /Users/suetaketakaya/1.prog/remote_manual/
./remoteclaude-server --port=8090
```

### 機能特化版サーバー

#### 1. Matplotlib管理サーバー (最新・推奨)
```bash
# 場所: /Users/suetaketakaya/1.prog/remote_manual/server/
./remoteclaude-server-matplotlib-mgmt --port=8090

# 特徴:
# ✅ React/HTML/Todo アプリ検出機能強化版
# ✅ containsWebContent() 拡張パターン対応
# ✅ 20種類のHTML/Web検出パターン
# ✅ strings パッケージ統合済み
```

#### 2. HTML検出強化サーバー
```bash
./remoteclaude-server-html-detection --port=8090

# 特徴:
# ✅ HTML/Web アプリケーション検出特化
```

#### 3. プロジェクト管理サーバー
```bash
./remoteclaude-server-project-mgmt --port=8090

# 特徴:
# ✅ プロジェクト管理機能強化
```

#### 4. Enhanced サーバー
```bash
./remoteclaude-server-enhanced --port=8090

# 特徴:
# ✅ 機能拡張版
```

## 🎯 推奨起動コマンド (2025年10月3日時点)

### ローカル開発環境用
```bash
cd /Users/suetaketakaya/1.prog/remote_manual/server
./remoteclaude-server-matplotlib-mgmt --port=8090
```

**理由:**
- ✅ 最新のプレビュー検出機能搭載
- ✅ React/HTML/Todo アプリ対応強化
- ✅ 日本語コマンド対応
- ✅ 機械学習モデル統合準備完了

### VPN接続用 (外部アクセス)
```bash
cd /Users/suetaketakaya/1.prog/remote_manual/server
./remoteclaude-server-matplotlib-mgmt --port=8090 --host=10.5.5.1
```

### Web管理画面アクセス
```bash
# サーバー起動後
open http://localhost:8080
```

## 📊 各サーバーバージョン比較

| サーバー | 最終更新 | サイズ | 特徴 | 推奨度 |
|---------|---------|--------|------|--------|
| **remoteclaude-server-matplotlib-mgmt** | 2025-09-27 | 10.1MB | **最新・Web検出強化** | ⭐⭐⭐⭐⭐ |
| remoteclaude-server-html-detection | 2025-10-03 | 10.1MB | HTML検出特化 | ⭐⭐⭐⭐ |
| remoteclaude-server-project-mgmt | 2025-09-27 | 10.1MB | プロジェクト管理 | ⭐⭐⭐ |
| remoteclaude-server-enhanced | 2025-09-27 | 9.6MB | 機能拡張版 | ⭐⭐⭐ |
| remoteclaude-server (ルート) | 2025-09-07 | 9.2MB | 基本版 | ⭐⭐ |

## 🔧 起動オプション

### 基本オプション
```bash
# ポート指定
./remoteclaude-server-matplotlib-mgmt --port=8090

# ホスト指定
./remoteclaude-server-matplotlib-mgmt --host=0.0.0.0 --port=8090

# デバッグモード
./remoteclaude-server-matplotlib-mgmt --debug --verbose --port=8090
```

### 高度なオプション (サーバーによって異なる可能性)
```bash
# 外部VPNモード
./remoteclaude-server-matplotlib-mgmt --external-vpn --port=8090

# ネットワーク制限
./remoteclaude-server-matplotlib-mgmt --allowed-networks="10.5.5.0/24" --port=8090

# Web UIポート指定
./remoteclaude-server-matplotlib-mgmt --port=8090 --web-port=8080
```

## 📱 モバイルアプリ接続

### 接続URL
```
# ローカルネットワーク
ws://<your-mac-ip>:8090/ws

# VPN経由
ws://10.5.5.1:8090/ws

# Web UI
http://<your-mac-ip>:8080
```

### QRコード生成
サーバー起動時に自動生成:
```bash
# QRコード確認
ls -la ~/.remoteclaude/qr-code.png
ls -la server/qr-code.png
```

## 🐛 トラブルシューティング

### ポートが使用中の場合
```bash
# ポート使用状況確認
lsof -i :8090

# プロセス終了
kill -9 <PID>

# 別ポートで起動
./remoteclaude-server-matplotlib-mgmt --port=8091
```

### 権限エラーの場合
```bash
# 実行権限付与
chmod +x remoteclaude-server-matplotlib-mgmt

# 必要に応じてsudo実行
sudo ./remoteclaude-server-matplotlib-mgmt --port=8090
```

### Docker デーモンエラー
```bash
# Docker起動確認
docker info

# macOS: Docker Desktop起動
open /Applications/Docker.app
```

## 📝 README.md との差異

### README.md 記載内容 (旧)
```bash
# ルートディレクトリから実行
./remoteclaude-server --port=8090
```

### 最新推奨コマンド (新)
```bash
# serverディレクトリから実行
cd server
./remoteclaude-server-matplotlib-mgmt --port=8090
```

**主な違い:**
1. **実行場所**: ルート → `server/`ディレクトリ
2. **バイナリ名**: `remoteclaude-server` → `remoteclaude-server-matplotlib-mgmt`
3. **機能**: 基本版 → プレビュー検出強化版

## ✅ 起動確認チェックリスト

- [ ] Docker Desktop が起動している
- [ ] ポート8090が空いている
- [ ] 実行権限が付与されている
- [ ] 正しいディレクトリにいる (`server/`)
- [ ] 最新バイナリを使用している (`remoteclaude-server-matplotlib-mgmt`)

## 🚀 クイックスタート (コピペ用)

```bash
# 1. Dockerチェック
docker info

# 2. serverディレクトリに移動
cd /Users/suetaketakaya/1.prog/remote_manual/server

# 3. ポート確認
lsof -i :8090 || echo "ポート8090は空いています"

# 4. サーバー起動
./remoteclaude-server-matplotlib-mgmt --port=8090

# 5. 別ターミナルでWeb UI確認
open http://localhost:8080
```

---

**作成日**: 2025年10月3日
**対象バージョン**: RemoteClaudeOPS v4.0
**ステータス**: ✅ 最新情報

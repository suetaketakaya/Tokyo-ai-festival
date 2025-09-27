# 🚀 Remote Claude - AI駆動開発環境

> 技術弱者から上級者まで誰もが使える、直感的なAI駆動開発プラットフォーム

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey.svg)

## 📋 概要

Remote Claudeは、モバイルデバイスからリモートサーバー上で開発作業を行うためのAI駆動プラットフォームです。ターミナル操作からプレビュー表示、AI統合まで、技術レベルに関係なく誰もが使える直感的なUXを実現しています。

### 🎯 主要機能

- **🖥️ 優先実行ターミナル**: Linuxコマンドの即座実行
- **📱 スマートプレビュー**: Matplotlib、Webアプリの自動表示
- **🤖 AI統合**: Weights & Biases連携、Claude Code統合
- **⚡ UX最適化**: TAB補完、履歴機能、80%ターミナル表示
- **🔒 セキュア接続**: QRコード接続、VPN対応

---

## 🚀 クイックスタート

### 必要条件

- **サーバー**:
  - Go 1.19+
  - Linux/macOS/Windows
  - ポート 8090-8091 開放
- **モバイル**:
  - iOS 13+ / Android 8+
  - Expo GO アプリ

### 📦 インストール

#### 1. サーバーセットアップ

```bash
# リポジトリクローン
git clone https://github.com/your-org/remote-claude.git
cd remote-claude

# Go依存関係インストール
cd server
go mod tidy

# サーバービルド
go build -o remoteclaude-server main.go

# サーバー起動 (ポート8091推奨)
./remoteclaude-server --port=8091
```

**起動確認**:
```
🚀 ClaudeOps Remote Server Started!
Connection URL: ws://192.168.x.x:8091/ws?key=xxxxx
📱 QRコードが表示されます
```

#### 2. モバイルアプリセットアップ

```bash
# React Nativeディレクトリ
cd RemoteClaudeApp

# 依存関係インストール
npm install
npx expo install @react-native-async-storage/async-storage

# 開発サーバー起動
npx expo start
```

#### 3. Expo GOで接続

1. スマートフォンに **Expo GO** アプリをインストール
2. 表示されたQRコードをスキャン、またはサーバーのQRコードをスキャン
3. アプリが起動したら **Server List** から接続

---

## 🎮 使用方法

### 基本操作フロー

```
1. QRコードスキャン/URL手動入力
     ↓
2. サーバー接続
     ↓
3. プロジェクト選択
     ↓
4. 🚀 AI Development 画面
     ↓
5. コマンド入力・実行
```

### ターミナル操作

#### Linux基本コマンド (即座実行)
```bash
ls -la          # ファイル一覧
pwd             # 現在のディレクトリ
cd project      # ディレクトリ移動
cat file.py     # ファイル内容表示
```

#### Python実行 (プレビュー対応)
```bash
python script.py                    # スクリプト実行
python -c "import matplotlib; ..."  # プレビュー自動表示
```

#### TABキー操作
- **Tab**: スマート補完
- **↑/↓**: コマンド履歴
- **Enter**: 実行

### 🎨 プレビューモード

**自動検出対象**:
- Matplotlib出力 → 画像プレビュー
- Flask/Streamlit → Webアプリプレビュー
- Jupyter Notebook → ノートブックビューア

**切り替え**:
- **💻 Terminal**: コマンド実行画面
- **📱 Preview**: 出力・結果表示画面

---

## 🔧 W&B統合 (AI/MLモデル追跡)

### セットアップ

1. **W&B APIキー取得**:
   - https://wandb.ai/settings から取得

2. **アプリ内設定**:
   ```
   🔧 Setup W&B ボタン → APIキー入力
   ```

3. **サンプルコード実行**:
   ```python
   import wandb

   # トレーニング開始
   run = wandb.init(project="my-ai-project")

   # メトリクス記録
   wandb.log({"accuracy": 0.95, "loss": 0.05})
   ```

### 自動生成コード

- **基本トレーニングループ**
- **Matplotlib統合**
- **ハイパーパラメータチューニング**
- **モデルアーティファクト管理**

---

## 📖 技術弱者向けガイド

### 🔰 初心者モード

**ヘルパーボタン**:
- 📂 List Files (`ls -la`)
- 📍 Current Dir (`pwd`)
- 🐍 Python (`python --version`)

**おすすめ最初のコマンド**:
```bash
ls              # 何があるか確認
pwd             # どこにいるか確認
python --version # Python使えるか確認
```

### 🎓 学習順序

1. **基本操作**: `ls`, `pwd`, `cd`
2. **ファイル操作**: `cat`, `mkdir`, `cp`
3. **Python実行**: 簡単なスクリプト
4. **プレビュー確認**: グラフ表示
5. **W&B統合**: ML実験管理

### 🆘 困った時は

- **エラーが出た**: エラーメッセージを確認 → 🤖 Claude統合を使用
- **複雑な作業**: 自然言語で説明 → AI支援を受ける
- **結果が見えない**: プレビューモードに切り替え

---

## 🛠️ 詳細設定

### サーバー設定

```bash
# ポート変更
./remoteclaude-server --port=9000

# 環境変数
export REMOTECLAUDE_PORT=9000
```

### アプリ設定

**接続設定**:
- 自動接続: QRコードスキャン
- 手動接続: URL直接入力
- 履歴: 過去の接続先保存

**プレビュー設定**:
- 自動更新間隔
- 画像品質設定
- ポート監視範囲

---

## 🔍 トラブルシューティング

### 接続問題

#### QRコード読み取れない
```bash
# URL手動入力
ws://[SERVER_IP]:8091/ws?key=[SESSION_KEY]

# 例:
ws://192.168.1.100:8091/ws?key=abc123def456
```

#### WebSocket接続エラー
1. **ファイアウォール確認**:
   ```bash
   # Linux
   sudo ufw allow 8091

   # macOS
   システム環境設定 → セキュリティ → ファイアウォール
   ```

2. **ポート使用状況確認**:
   ```bash
   lsof -i :8091
   netstat -an | grep 8091
   ```

### プレビュー表示されない

#### 権限確認
```bash
# プレビューディレクトリ作成
mkdir -p /tmp/remote_claude_previews
chmod 755 /tmp/remote_claude_previews
```

#### Python環境確認
```bash
python -c "import matplotlib; print('OK')"
pip install matplotlib seaborn plotly
```

### W&B統合エラー

#### APIキー確認
```bash
# コマンドラインで確認
wandb login
wandb whoami
```

#### 接続テスト
```python
import wandb
wandb.init(project="test")
print("W&B connection OK")
```

---

## 📊 システム要件・パフォーマンス

### 最小要件
- **CPU**: 1GB RAM, 1コア
- **ネットワーク**: 1Mbps以上
- **ストレージ**: 100MB以上

### 推奨環境
- **CPU**: 2GB RAM, 2コア+
- **ネットワーク**: 10Mbps以上
- **ストレージ**: 1GB以上

### パフォーマンス指標
| 操作 | 応答時間 | 備考 |
|-----|----------|------|
| 基本コマンド | 50-100ms | ls, pwd など |
| Python実行 | 200-500ms | 小規模スクリプト |
| プレビュー生成 | 1-2秒 | matplotlib出力 |
| W&B統合 | 1-3秒 | API通信含む |

---

## 🔧 開発・カスタマイズ

### 開発環境セットアップ

```bash
# 開発依存関係
go mod download
npm install --dev

# ホットリロード開発
npx expo start --dev-client
```

### カスタムコマンド追加

```go
// enhanced_execution_handler.go
func (h *EnhancedExecutionHandler) addCustomCommand(cmd string) {
    // カスタム処理を追加
}
```

### UI テーマカスタマイズ

```typescript
// EnhancedDevelopmentScreen.tsx
const customTheme = {
  terminal: '#000000',
  text: '#00ff00',
  accent: '#007AFF'
}
```

---

## 📈 ロードマップ

### Version 1.1 (近日リリース予定)
- [ ] Claude Code API直接統合
- [ ] 音声コマンド入力
- [ ] ダークモード・テーマ設定

### Version 1.2
- [ ] マルチユーザー対応
- [ ] リアルタイムコラボレーション
- [ ] プロジェクトテンプレート

### Version 2.0
- [ ] エンタープライズ機能
- [ ] カスタムAIモデル統合
- [ ] 高度なセキュリティ機能

---

## 🤝 コントリビューション

### 貢献方法

1. **Issue報告**: バグレポート・機能要望
2. **Pull Request**: コード改善・新機能
3. **ドキュメント**: 使い方ガイド・チュートリアル
4. **テスト**: 動作確認・品質向上

### 開発ガイドライン

```bash
# コード品質チェック
npm run lint
go fmt ./...

# テスト実行
npm test
go test ./...
```

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

---

## 🙏 謝辞

- **Claude Code**: AI開発支援プラットフォーム
- **Expo**: React Native開発フレームワーク
- **Weights & Biases**: ML実験管理プラットフォーム
- **Go Community**: 高性能サーバー開発支援

---

## 📞 サポート・お問い合わせ

- **GitHub Issues**: [Issues Page](https://github.com/your-org/remote-claude/issues)
- **Discord**: [Community Server](https://discord.gg/remote-claude)
- **Email**: support@remote-claude.com

---

**🚀 Remote Claudeで、誰もが使えるAI駆動開発を始めましょう！**

---

*最終更新: 2025-09-28*
*バージョン: 1.0.0*
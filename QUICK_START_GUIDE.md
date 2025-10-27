# RemoteClaude クイックスタートガイド

**バージョン**: v4.0
**最終更新**: 2025-10-21
**所要時間**: 1分

---

## 🚀 3ステップでセットアップ完了

### ステップ1: サーバー起動 (30秒)

```bash
# リポジトリをクローン (初回のみ)
git clone https://github.com/your-org/remoteclaude.git
cd remoteclaude/server

# セットアップスクリプト実行
./setup-remoteclaude.sh
```

**自動実行される内容**:
- ✅ Docker確認・起動
- ✅ Claude API キー設定
- ✅ プロジェクトディレクトリ作成
- ✅ サーバー起動

**出力例**:
```
🚀 RemoteClaude Server v4.0 セットアップ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking Docker...                  ✅ OK
Checking Claude API Key...          ✅ OK
Checking Project Directory...       ✅ OK
Checking Server Binary...           ✅ OK
Checking Port 8090...               ✅ OK

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ セットアップ完了!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 サーバーを起動しています...

📱 QRコードをスキャンしてください:

  ██████████████  ██  ██  ██████████████
  ██          ██  ██████  ██          ██
  ██  ██████  ██  ██  ██  ██  ██████  ██
  ██  ██████  ██  ██████  ██  ██████  ██
  ██  ██████  ██    ██    ██  ██████  ██
  ██          ██  ██  ██  ██          ██
  ██████████████  ██  ██  ██████████████

🌐 Server URL: ws://192.168.1.100:8090
🔑 Session Key: a1b2c3d4e5f6g7h8
🔥 Status: Ready - Waiting for connection...
```

---

### ステップ2: iPhone App起動 (15秒)

1. App Storeから **RemoteClaude** をダウンロード
2. アプリを起動
3. 「サーバーに接続」をタップ

---

### ステップ3: QRコードスキャン (15秒)

1. iPhoneのカメラでQRコードをスキャン
2. **自動的に接続完了！**
3. すぐに使用開始できます

---

## 💡 使い方

### 基本的なコマンド実行

```
1. プロジェクト一覧から使用したいプロジェクトを選択
2. コマンド入力欄にコマンドを入力
3. 送信ボタンをタップ

例:
- "ls -la" → ファイル一覧表示
- "Todoアプリ作って" → AI が自動生成
- "グラフを描画して" → Matplotlib でグラフ生成
```

### プレビュー機能

```
Web アプリやグラフを生成すると、自動的に
「プレビュー」ボタンが表示されます。

タップするとブラウザで結果を確認できます。
```

### プロジェクト管理

```
- 新規プロジェクト作成
- プロジェクト切り替え
- プロジェクト削除

各プロジェクトは独立したDocker環境で実行されます。
```

---

## 🔧 トラブルシューティング

### サーバーに接続できない

**症状**: QRコードをスキャンしても接続できない

**解決策**:
1. サーバーが起動しているか確認
   ```bash
   # サーバーが起動していることを確認
   lsof -Pi :8090 -sTCP:LISTEN
   ```

2. iPhoneとPCが同じネットワークにあるか確認
   - WiFi接続を確認
   - ファイアウォール設定を確認

3. ポート8090が開いているか確認
   ```bash
   # macOS
   sudo pfctl -d  # ファイアウォール一時停止

   # Linux
   sudo ufw allow 8090
   ```

---

### Docker が起動しない

**症状**: "Docker is not running" エラー

**解決策**:
1. Docker Desktop を手動起動
   ```bash
   # macOS
   open -a Docker

   # Linux
   sudo systemctl start docker
   ```

2. Docker Desktop の設定を確認
   - リソース割り当て (推奨: 4GB RAM以上)
   - ディスク容量 (推奨: 10GB以上)

---

### Claude API キーエラー

**症状**: "ANTHROPIC_API_KEY is not set" エラー

**解決策**:
1. API キーを取得
   - https://console.anthropic.com/settings/keys

2. API キーを設定
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."

   # 永続化 (zsh)
   echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc

   # 永続化 (bash)
   echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
   ```

3. セットアップスクリプト再実行
   ```bash
   ./setup-remoteclaude.sh
   ```

---

### ポート競合エラー

**症状**: "Port 8090 is in use" エラー

**解決策**:
1. 使用中のプロセスを確認
   ```bash
   lsof -Pi :8090 -sTCP:LISTEN
   ```

2. プロセスを終了
   ```bash
   # プロセスIDを確認して終了
   kill <PID>
   ```

3. または別のポートを使用
   ```bash
   ./remoteclaude-server-matplotlib-mgmt --port=8091
   ```

---

## 🎯 よくある質問 (FAQ)

### Q1: 2回目以降の起動方法は?

**A**: サーバーを起動するだけです。
```bash
cd remoteclaude/server
./remoteclaude-server-matplotlib-mgmt --port=8090
```

iPhoneアプリは前回の接続情報を記憶しているので、
自動的に再接続されます。

---

### Q2: 複数のPCで使用できますか?

**A**: はい、可能です。

各PCでサーバーを起動し、それぞれのQRコードを
スキャンすることで切り替えて使用できます。

---

### Q3: VPN経由で使用できますか?

**A**: はい、WireGuard VPN に対応しています。

VPN接続時は自動的にVPNアドレス (10.0.0.1) を使用します。
外出先からも安全に接続できます。

---

### Q4: どんなコマンドを実行できますか?

**A**: 以下のようなコマンドが実行できます:

**基本コマンド**:
- ls, cd, pwd, cat, echo など

**AI支援コマンド**:
- "Todoアプリ作って"
- "グラフを描画して"
- "データ分析して"
- "Web APIを作って"

**開発コマンド**:
- Python スクリプト実行
- Node.js アプリ実行
- Docker コンテナ管理

---

### Q5: 料金はかかりますか?

**A**: RemoteClaude本体は無料ですが、以下の料金が発生します:

- **Claude API**: 使用量に応じて課金
  - 詳細: https://www.anthropic.com/pricing

- **App Store**: 無料 (ベータ版)
  - 正式版リリース後は要確認

---

### Q6: オフラインで使用できますか?

**A**: 一部機能は可能です:

**オフライン可能**:
- 基本的なLinuxコマンド (ls, cd等)
- Dockerコンテナ管理
- ローカルファイル操作

**オンライン必須**:
- Claude AI を使ったコード生成
- W&B 統合機能
- プレビュー機能 (一部)

---

### Q7: セキュリティは大丈夫ですか?

**A**: はい、以下のセキュリティ対策を実施しています:

- ✅ WebSocket 暗号化通信 (wss://)
- ✅ セッションキー認証
- ✅ Docker コンテナ隔離
- ✅ APIキー暗号化保存
- ✅ ファイルアクセス制限

詳細: [SECURITY.md](SECURITY.md)

---

### Q8: データはどこに保存されますか?

**A**: すべてローカルに保存されます:

- **サーバー側**: `./projects/` ディレクトリ
- **iPhone側**: アプリ内サンドボックス
- **クラウド**: オプション (W&B統合時のみ)

個人情報は外部に送信されません。

---

### Q9: アップデート方法は?

**A**: 以下の手順で更新できます:

**サーバー側**:
```bash
cd remoteclaude
git pull origin main
cd server
go build -o remoteclaude-server-matplotlib-mgmt
```

**iPhone App**:
- App Store から自動更新
- または手動で「アップデート」をタップ

---

### Q10: バグを見つけた場合は?

**A**: GitHub Issues で報告してください:

https://github.com/your-org/remoteclaude/issues

以下の情報があると助かります:
- OS・バージョン
- 再現手順
- エラーメッセージ
- スクリーンショット

---

## 📚 詳細ドキュメント

- [システム全体フロー](SYSTEM_ANALYSIS_REPORT.md)
- [QRセットアップフロー](QR_SETUP_FLOW.md)
- [リリースチェックリスト](COMPREHENSIVE_RELEASE_CHECKLIST.md)
- [セキュリティガイド](SECURITY.md)
- [API仕様書](API_SPEC.md)

---

## 💬 サポート・コミュニティ

- **GitHub Discussions**: https://github.com/your-org/remoteclaude/discussions
- **Discord**: https://discord.gg/remoteclaude
- **Twitter**: @RemoteClaude
- **Email**: support@remoteclaude.com

---

## 🎉 RemoteClaude を楽しもう！

これで RemoteClaude のセットアップは完了です。

iPhoneから Claude AI を活用した開発を楽しんでください！

**Happy Coding! 🚀**

---

**作成日**: 2025-10-21
**最終更新**: 2025-10-21
**バージョン**: 1.0

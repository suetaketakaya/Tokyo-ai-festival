# RemoteClaude v3.7.1
**🌐 Enterprise Mobile-Driven Multi-Server Claude Development Platform with External VPN & Apple App Store Ready**

## 📱 Overview | 概要

iPhoneアプリから世界中のmacOS/Ubuntu/WSL2サーバ上のClaude Code CLIをリモート操作し、リアルタイムでプロジェクト開発・管理を実現する次世代モバイル開発プラットフォーム。v3.7.1では**外部VPN接続**、**Apple App Store対応**、**WSL2完全サポート**、**自動インストーラ**を新搭載。

### 🚀 Key Features | 主要機能

- 📱 **Apple App Store対応**: 日本語ローカライゼーション完全対応
- 🌐 **外部VPN接続**: WireGuard + IPv6 6to4トンネルで世界中からアクセス
- 💻 **Multi-Platform**: macOS/Ubuntu/WSL2完全サポート
- 🤖 **Claude AI統合**: リアルタイムAI開発支援
- 🐳 **Docker完全統合**: コンテナベース開発環境
- ⚡ **Web管理インターフェース**: ブラウザからサーバ管理
- 🔐 **セキュリティ**: 暗号化通信とVPN統合

## 🏗️ Architecture | システム構成

```
📱 iPhone App (React Native + Expo)
        ↕ Secure WebSocket Connection
🌐 External VPN Server (WireGuard + IPv6)
        ↕ Network Bridge
💻 Multiple Servers (macOS/Ubuntu/WSL2)
        ↕ Web Interface Management
🐳 Docker Containers (Claude CLI + Development Tools)
        ↕ Auto-Setup & Package Management
```

## 📂 Project Structure | プロジェクト構成

```
RemoteClaude/
├── 📱 RemoteClaudeApp/           # iPhone Expo app
│   ├── src/
│   │   ├── screens/              # アプリ画面
│   │   ├── components/           # UIコンポーネント
│   │   └── services/             # WebSocket通信
│   └── app.json                  # App Store設定
├── 🖥️ server/                    # Go WebSocket server
│   ├── main.go                   # メインサーバ
│   ├── scripts/                  # 自動セットアップ
│   ├── web-ui/                   # Web管理画面
│   └── external-vpn/             # 外部VPN設定
├── 🐳 docker/                    # Docker環境
├── 📦 installers/                # 自動インストーラ
├── 📋 configs/                   # 設定ファイル
├── 🚀 dist/                      # ビルド成果物
└── 📖 docs/                      # ドキュメント
```

---

## 🚀 Quick Start Guide | クイックスタートガイド

### 📥 自動インストーラ (推奨)

#### macOS用インストーラ
```bash
# macOS用ワンクリックインストーラ
curl -fsSL https://raw.githubusercontent.com/suetaketakaya/RemoteClaude/main/installers/install-macos.sh | bash

# または手動ダウンロード
wget https://github.com/suetaketakaya/RemoteClaude/releases/download/v3.7.1/remoteclaude-installer-macos.sh
chmod +x remoteclaude-installer-macos.sh
./remoteclaude-installer-macos.sh
```

#### Ubuntu/WSL2用インストーラ
```bash
# Ubuntu/WSL2用ワンクリックインストーラ
curl -fsSL https://raw.githubusercontent.com/suetaketakaya/RemoteClaude/main/installers/install-ubuntu.sh | bash

# または手動ダウンロード  
wget https://github.com/suetaketakaya/RemoteClaude/releases/download/v3.7.1/remoteclaude-installer-ubuntu.sh
chmod +x remoteclaude-installer-ubuntu.sh
./remoteclaude-installer-ubuntu.sh
```

### 📋 インストーラが自動実行する内容

#### ✅ システム要件チェック
- OS バージョン確認
- 必要な権限チェック  
- ネットワーク接続確認

#### ✅ 依存関係インストール
- **Go 1.21+**: サーバビルド用
- **Docker**: コンテナ実行環境
- **Node.js 18+**: Web UI用
- **WireGuard**: VPN機能用
- **Claude CLI**: AI開発支援用

#### ✅ 自動設定
- サーバ設定ファイル生成
- Docker環境構築
- VPN設定（オプション）
- 自動起動設定
- Web管理画面セットアップ

---

## 💻 Manual Installation | 手動インストール手順

### 🍎 macOS Server Setup | macOSサーバ設定

#### 1. 前提条件インストール
```bash
# Homebrewインストール（未インストールの場合）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 必要パッケージインストール
brew install go node npm docker qrencode wireguard-tools

# Docker Desktop起動
open /Applications/Docker.app
```

#### 2. Claude CLI インストール
```bash
# Claude CLI公式インストーラ
curl -fsSL https://claude.ai/install.sh | sh

# PATHに追加
echo 'export PATH=$PATH:~/.local/bin' >> ~/.zshrc
source ~/.zshrc

# インストール確認
claude --version
```

#### 3. RemoteClaude サーバインストール
```bash
# リポジトリクローン
git clone https://github.com/suetaketakaya/Tokyo-ai-festival.git
cd Tokyo-ai-festival/server

# 自動セットアップ実行
./scripts/auto-setup.sh

# セットアップ内容:
# ✅ Docker daemon 起動確認
# ✅ WireGuard VPN 設定
# ✅ サーバキー生成
# ✅ Web UI 初期化
# ✅ 外部VPN設定（オプション）
```

#### 4. サーバ起動
```bash
# 標準起動（ローカルネットワーク用）
./remoteclaude-server --port=8090

# VPN接続用起動
./remoteclaude-server --host=10.5.5.1 --port=8090 --external-vpn

# Web管理画面アクセス
open http://localhost:8080
```

### 🐧 Ubuntu/WSL2 Server Setup | Ubuntu/WSL2サーバ設定

#### 1. システム更新と前提条件
```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# 必要パッケージインストール
sudo apt install -y curl wget git build-essential software-properties-common

# Go インストール
wget https://golang.org/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

#### 2. Docker インストール
```bash
# Docker公式インストールスクリプト
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# ユーザをdockerグループに追加
sudo usermod -aG docker $USER
newgrp docker

# Docker起動と自動起動設定
sudo systemctl enable docker
sudo systemctl start docker
```

#### 3. Node.js とWireGuard
```bash
# Node.js インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# WireGuard インストール
sudo apt install -y wireguard qrencode

# WireGuard ツール確認
wg --version
```

#### 4. Claude CLI インストール
```bash
# Claude CLI インストール
curl -fsSL https://claude.ai/install.sh | sh

# PATH設定
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
source ~/.bashrc

# 動作確認
claude --version
```

#### 5. RemoteClaude ビルドと起動
```bash
# リポジトリクローン
git clone https://github.com/suetaketakaya/Tokyo-ai-festival.git
cd Tokyo-ai-festival/server

# サーバビルド
go build -o remoteclaude-server .

# 実行権限付与
chmod +x remoteclaude-server

# サーバ起動
./remoteclaude-server --port=8090

# ファイアウォール設定
sudo ufw allow 8090/tcp
sudo ufw allow 8080/tcp  # Web UI用
```

#### 6. WSL2固有設定
```bash
# WSL2のIP取得（Windows側からアクセス用）
hostname -I | awk '{print $1}'

# Windows側でWSL2にアクセスする場合
# PowerShellで以下実行:
# netsh interface portproxy add v4tov4 listenport=8090 listenaddress=0.0.0.0 connectport=8090 connectaddress=[WSL2_IP]
```

### 🔧 サービス自動起動設定

#### macOS用 (launchd)
```bash
# Launch Daemon作成
sudo tee /Library/LaunchDaemons/com.remoteclaude.server.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.remoteclaude.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(pwd)/remoteclaude-server</string>
        <string>--port=8090</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
</dict>
</plist>
EOF

# サービス有効化
sudo launchctl load /Library/LaunchDaemons/com.remoteclaude.server.plist
```

#### Ubuntu用 (systemd)
```bash
# Systemdサービス作成
sudo tee /etc/systemd/system/remoteclaude.service << EOF
[Unit]
Description=RemoteClaude Server v3.7.1
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/remoteclaude-server --port=8090
Restart=always
RestartSec=10
Environment=HOME=$HOME
Environment=PATH=$PATH

[Install]
WantedBy=multi-user.target
EOF

# サービス有効化と起動
sudo systemctl daemon-reload
sudo systemctl enable remoteclaude.service
sudo systemctl start remoteclaude.service

# 状態確認
sudo systemctl status remoteclaude.service
```

---

## 🌐 External VPN Setup | 外部VPN設定

### 🏠 TP-Linkルーター設定例

#### ルーター設定情報
| 項目 | 設定値 |
|------|--------|
| **WireGuard トンネルIP** | `10.5.5.1/24` |
| **リッスンポート** | `51820` |
| **IPv4 アドレス** | `192.168.11.108` |
| **6to4 トンネルアドレス** | `2002:c0a8:b6c::c0a8:b6c/48` |
| **外部IP** | `153.246.248.142` |

#### 1. IPv6 6to4 トンネル設定
```bash
# macOS版IPv6トンネルセットアップ
cd server/external-vpn
chmod +x setup-ipv6-tunnel-macos.sh
sudo ./setup-ipv6-tunnel-macos.sh

# Ubuntu版IPv6トンネルセットアップ  
sudo ./setup-ipv6-tunnel.sh
```

#### 2. 外部VPNサーバ起動
```bash
# macOS版外部VPNサーバ
chmod +x start-external-server-macos.sh
sudo ./start-external-server-macos.sh

# Ubuntu版外部VPNサーバ
sudo ./start-external-server.sh
```

#### 3. iPhone WireGuardクライアント設定
```bash
# QRコード生成確認
ls ~/.remoteclaude/external-vpn/clients/client-iphone-qr.png

# 設定ファイル確認
cat ~/.remoteclaude/external-vpn/clients/client-iphone.conf
```

### 📱 iPhone WireGuard設定手順
1. **App Store**から「WireGuard」アプリをインストール
2. アプリを開き「**+**」ボタンをタップ
3. 「**QRコードから作成**」を選択
4. 生成されたQRコードをスキャン
5. 接続名を「**RemoteClaude VPN**」に設定
6. 「**保存**」をタップ
7. VPN接続を**オン**に切り替え

### 🔗 VPN経由接続URL
```
ws://10.5.5.1:8090/ws?key=<session-key>
```

---

## 📱 iPhone App Setup | iPhoneアプリセットアップ

### 🏪 App Store版 (推奨)
1. **App Store**で「**ClaudeOps Remote**」を検索
2. インストールして起動
3. 「**サーバを追加**」をタップ
4. QRコードスキャンまたは手動入力でサーバ追加

### 🔧 開発版 (Expo)
```bash
# アプリディレクトリに移動
cd RemoteClaudeApp

# 依存関係インストール
npm install

# Expo CLI インストール
npm install -g @expo/cli

# 開発サーバ起動
npx expo start

# iPhone でExpo Goアプリをインストールして QRコードをスキャン
```

---

## 📱 Mobile App Usage Guide | モバイルアプリ操作ガイド

### 1. 🔗 サーバ接続管理

#### サーバ追加方法
1. **QRコードスキャン**
   - 📱 「**QRコードスキャン**」をタップ
   - カメラでサーバのQRコードを読み取り
   - 自動的に接続情報が入力されます

2. **手動入力**
   - ✏️ 「**手動追加**」をタップ  
   - サーバ名を入力（例: "本社サーバ"）
   - WebSocket URL を入力（例: `ws://192.168.1.100:8090/ws`）
   - 「**保存**」をタップ

#### サーバ管理操作
- 🔗 **接続**: サーバ名をタップして接続
- 📝 **編集**: サーバ名を長押しして名前変更
- 🗑️ **削除**: スワイプして削除ボタンをタップ
- 🔄 **再接続**: 接続エラー時に「再試行」をタップ

#### 接続状態インジケータ
- 🟢 **緑色**: 正常接続中
- 🟡 **黄色**: 接続処理中
- 🔴 **赤色**: 接続エラー
- ⚪ **灰色**: 未接続

### 2. 📋 プロジェクト管理

#### プロジェクト操作
1. **プロジェクト一覧表示**
   - 接続済みサーバから「**プロジェクト表示**」をタップ
   - 既存プロジェクト一覧が表示されます

2. **新規プロジェクト作成**
   - ➕ 「**新規プロジェクト作成**」をタップ
   - プロジェクト名を入力（例: "my-python-app"）
   - 「**作成**」をタップ
   - Docker環境が自動構築されます

3. **プロジェクト制御**
   - ▶️ **開始**: 停止中のコンテナを起動
   - ⏹️ **停止**: 実行中のコンテナを停止  
   - 🗑️ **削除**: プロジェクトを完全削除
   - 📁 **アクセス**: プロジェクトの開発環境に入る

### 3. 💻 開発環境操作

#### ⚡ QuickCommands (クイックコマンド)
開発でよく使うコマンドをワンタップで実行

##### 📂 基本コマンド
- `ls -la`: ファイル一覧表示
- `pwd`: 現在のディレクトリ表示
- `whoami`: 現在のユーザー名
- `date`: 現在の日時

##### 🐍 Python開発
- `python3 --version`: Pythonバージョン確認
- `pip list`: インストール済みパッケージ一覧
- `python3 -c "print('Hello World')"`: Hello World実行

##### 🔍 ファイル操作  
- `find . -name "*.py"`: Pythonファイル検索
- `find . -name "*.js"`: JavaScriptファイル検索
- `wc -l $(find . -name "*.py")`: Pythonファイル行数計算

##### 🤖 Claude AI機能
- **README作成**: プロジェクトのREADME.mdを自動生成
- **コード解析**: 既存コードの説明とドキュメント生成
- **Pythonスクリプト作成**: 指定した機能のPythonコード生成

#### 💬 リアルタイム端末
1. **コマンド入力**
   - 画面下部の入力欄にコマンドを入力
   - 「**実行**」ボタンまたは改行で実行

2. **出力表示**
   - 🟢 **標準出力**: 通常の結果（緑色）
   - 🔴 **エラー出力**: エラーメッセージ（赤色）  
   - 🔵 **システムメッセージ**: 接続状況など（青色）

3. **便利機能**
   - ⌨️ **自動大文字化修正**: モバイル入力の自動修正を補正
   - 📜 **コマンド履歴**: 過去のコマンドと結果を表示
   - 📋 **長押しコピー**: 出力結果を長押しでコピー

#### ⌨️ キーボードショートカット (v3.7.1 新機能)
- **TAB キー**: コマンド補完・予測検索
- **↑ 矢印キー**: コマンド履歴を前に戻る  
- **↓ 矢印キー**: コマンド履歴を次に進む
- **Ctrl+C**: 実行中のコマンドを中断

### 4. 🔧 高度な開発操作

#### Git操作例
```bash
# リポジトリ初期化
git init
git config user.name "Your Name"  
git config user.email "you@example.com"

# ファイル追加とコミット
git add .
git commit -m "Initial commit"

# リモートリポジトリ追加
git remote add origin https://github.com/username/repo.git
git push -u origin main
```

#### Python開発例
```bash
# 仮想環境作成
python3 -m venv myenv
source myenv/bin/activate

# パッケージインストール
pip install requests flask numpy

# Pythonスクリプト実行
python3 app.py

# パッケージ一覧出力
pip freeze > requirements.txt
```

#### Docker操作例
```bash  
# コンテナ内から他のコンテナ確認
docker ps

# ファイル転送（別端末から）
docker cp myfile.py <container-id>:/workspace/

# 新しいコンテナ起動
docker run -it python:3.9 bash
```

---

## 🌐 Web Management Interface | Web管理インターフェース

### 📊 ダッシュボード機能

#### アクセス方法
```bash
# ローカルアクセス
http://localhost:8080

# ネットワークアクセス  
http://<server-ip>:8080

# VPN経由アクセス
http://10.5.5.1:8080
```

#### 利用可能な機能
- 🚀 **サーバステータス**: リアルタイムサーバ監視
- 🔐 **接続モード切り替え**: ローカル ↔ VPN モード切り替え
- 📱 **QRコード管理**: 接続用QRコード生成・表示
- 🔄 **サーバ制御**: 再起動・キー再生成・ログ表示
- 📊 **WireGuard統合**: VPN状態確認とQRコード表示
- 📈 **リソース監視**: CPU・メモリ・Docker使用状況

#### API エンドポイント
```bash
# サーバ状態取得
curl http://localhost:8080/api/status

# 接続モード切り替え
curl -X POST http://localhost:8080/api/switch-mode

# QRコード再生成
curl -X POST http://localhost:8080/api/regenerate-qr

# QRコード画像取得
http://localhost:8080/qr-code.png
http://localhost:8080/wireguard-qr.png
```

---

## 💻 Direct Container Access | 直接コンテナアクセス

### 🐳 PC端末からのコンテナ操作

#### 1. 実行中コンテナの確認
```bash
# RemoteClaude コンテナ一覧
docker ps --filter "ancestor=remoteclaude-ubuntu-claude:latest"

# 全コンテナ詳細表示
docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"

# 特定コンテナ詳細
docker inspect <container-id>
```

#### 2. コンテナシェルアクセス
```bash
# コンテナIDでアクセス
docker exec -it <container-id> /bin/bash

# 例: コンテナ内での作業
docker exec -it a1b2c3d4e5f6 /bin/bash
cd /workspace
ls -la
```

#### 3. ファイル編集オプション

##### A. nano (シンプルエディタ)
```bash
# コンテナ内でnano使用
docker exec -it <container-id> nano /workspace/app.py

# 操作方法:
# Ctrl+O: 保存
# Ctrl+X: 終了
# Ctrl+W: 検索
```

##### B. vim (高機能エディタ)
```bash
# vim インストール (必要に応じて)
docker exec -it <container-id> apt-get update && apt-get install -y vim

# vim でファイル編集
docker exec -it <container-id> vim /workspace/main.py

# 基本操作:
# i: 挿入モード
# Esc: ノーマルモード  
# :w: 保存
# :q: 終了
# :wq: 保存して終了
```

##### C. VS Code Dev Containers (推奨)
```bash
# VS Code Extensions から「Dev Containers」をインストール
# コマンドパレット (Cmd+Shift+P) を開く
# 「Dev Containers: Attach to Running Container」を選択
# RemoteClaude コンテナを選択
# VS Code でコンテナ内を直接編集可能
```

#### 4. ファイル転送

##### ホスト → コンテナ
```bash
# 単一ファイル転送
docker cp ./local-file.py <container-id>:/workspace/

# ディレクトリ転送  
docker cp ./local-src/ <container-id>:/workspace/src/

# 実例
docker cp ./new-script.py a1b2c3d4e5f6:/workspace/scripts/
```

##### コンテナ → ホスト
```bash
# 単一ファイル取得
docker cp <container-id>:/workspace/result.py ./downloaded-result.py

# ディレクトリ取得
docker cp <container-id>:/workspace/output/ ./local-output/

# 実例
docker cp a1b2c3d4e5f6:/workspace/project/ ./backup/
```

#### 5. 開発ワークフロー例

##### リアルタイム開発
```bash
# 1. コンテナアクセス
docker exec -it <container-id> /bin/bash

# 2. プロジェクトディレクトリに移動
cd /workspace

# 3. 新規Pythonファイル作成
nano hello.py
# ファイル内容:
print("Hello, RemoteClaude!")
print(f"Python version: {sys.version}")

# 4. 実行テスト
python3 hello.py

# 5. Claude AI でコード改善
claude analyze hello.py
claude improve hello.py
```

##### Git 操作
```bash
# コンテナ内Git設定
docker exec -it <container-id> /bin/bash
cd /workspace

# Git初期設定
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# 標準Gitワークフロー
git init
git add .
git commit -m "Initial commit from container"
git remote add origin https://github.com/username/repo.git
git push -u origin main
```

### 6. 永続化とバックアップ

#### ボリュームマウント設定
```bash
# 既存コンテナ停止
docker stop <container-id>

# ボリュームマウント付き新規コンテナ
docker run -it -d \
  --name remoteclaude-persistent \
  -v $(pwd)/workspace:/workspace \
  remoteclaude-ubuntu-claude:latest

# これでホストとコンテナ間でファイル同期
```

#### コンテナバックアップ
```bash
# コンテナスナップショット作成
docker commit <container-id> remoteclaude-backup:$(date +%Y%m%d-%H%M)

# ファイルシステムエクスポート
docker export <container-id> > container-backup-$(date +%Y%m%d).tar

# バックアップファイルからインポート（復元時）
docker import container-backup-YYYYMMDD.tar remoteclaude-restored:latest
```

---

## 🔧 Advanced Configuration | 高度な設定

### ⚙️ サーバ設定オプション

```bash
# 基本起動
./remoteclaude-server

# カスタムポート
./remoteclaude-server --port=8090

# 特定IPバインド  
./remoteclaude-server --host=0.0.0.0 --port=8090

# デバッグモード
./remoteclaude-server --debug --verbose --port=8090

# 外部VPNモード
./remoteclaude-server --external-vpn --allowed-networks="10.5.5.0/24" --port=8090

# Web UI ポート指定
./remoteclaude-server --port=8090 --web-port=8080
```

### 🌍 環境変数設定

```bash
# デフォルトポート設定
export REMOTECLAUDE_PORT=8090
export REMOTECLAUDE_WEB_PORT=8080

# ホスト設定
export REMOTECLAUDE_HOST=0.0.0.0

# デバッグログ有効化
export REMOTECLAUDE_DEBUG=true
export REMOTECLAUDE_VERBOSE=true

# プロジェクトディレクトリ  
export REMOTECLAUDE_PROJECT_DIR=/custom/projects

# Docker設定
export DOCKER_HOST=unix:///var/run/docker.sock

# セッションキー設定
export REMOTECLAUDE_SESSION_KEY=$(openssl rand -hex 32)
```

### 🔐 セキュリティ設定

```bash
# セッションキー生成
openssl rand -hex 32

# SSL証明書設定（将来の機能）
export REMOTECLAUDE_SSL_CERT=/path/to/cert.pem
export REMOTECLAUDE_SSL_KEY=/path/to/key.pem

# IP制限設定
export REMOTECLAUDE_ALLOWED_IPS="192.168.1.0/24,10.5.5.0/24"

# 認証設定
export REMOTECLAUDE_AUTH_ENABLED=true
export REMOTECLAUDE_AUTH_TOKEN="your-secure-token"
```

---

## 🛠️ Troubleshooting | トラブルシューティング

### 🚨 一般的な問題と解決法

#### サーバが起動しない
```bash
# 1. ポート使用状況確認
lsof -i :8090
netstat -an | grep :8090

# 2. 使用中プロセス終了
kill -9 <PID>

# 3. 別ポートで起動
./remoteclaude-server --port=8091

# 4. 権限問題の場合
sudo ./remoteclaude-server --port=8090
```

#### モバイルアプリが接続できない
```bash
# 1. ネットワーク接続確認
ping <server-ip>
telnet <server-ip> 8090

# 2. ファイアウォール確認
# macOS
sudo pfctl -sr | grep 8090

# Ubuntu  
sudo ufw status
sudo ufw allow 8090/tcp

# 3. サーバログ確認
./remoteclaude-server --debug --port=8090
tail -f /var/log/remoteclaude.log
```

#### Docker関連エラー
```bash
# 1. Docker状態確認
docker --version
docker info
systemctl status docker  # Ubuntu

# 2. Docker再起動
sudo systemctl restart docker  # Ubuntu
# macOS: Docker Desktop を再起動

# 3. 権限問題解決
sudo usermod -aG docker $USER
newgrp docker

# 4. Docker デーモン確認
sudo dockerd --debug  # 手動起動でデバッグ
```

#### VPN接続問題
```bash
# 1. WireGuard状態確認
sudo wg show
sudo wg-quick down wg0 && sudo wg-quick up wg0

# 2. ポート確認
netstat -an | grep 51820
lsof -i UDP:51820

# 3. 自動修復ツール実行
cd server
./repair-wireguard.sh
```

### 🔍 デバッグモード

```bash
# サーバデバッグ起動
./remoteclaude-server --debug --verbose --port=8090

# ログレベル設定
export REMOTECLAUDE_LOG_LEVEL=DEBUG

# WebSocket接続テスト
wscat -c ws://localhost:8090/ws?key=test

# HTTP接続テスト
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:8090/ws?key=test
```

### 📊 パフォーマンス監視

```bash
# リソース使用量監視
docker stats

# ネットワーク接続監視
netstat -an | grep :8090
ss -tuln | grep :8090

# システムリソース監視
top
htop
iostat 1

# ログ監視
tail -f /var/log/remoteclaude.log
journalctl -u remoteclaude.service -f  # systemd
```

---

## 🏗️ System Architecture | システム構成詳細

### 🌐 Network Architecture | ネットワーク構成

```
Internet
    ↓
📡 Router (Port 51820 UDP / 8090 TCP)
    ↓
🏠 Local Network (192.168.1.0/24)
    ↓
💻 Server (macOS/Ubuntu/WSL2)
    ├── 🐳 Docker Engine
    │   └── 📦 Dev Containers
    ├── 🌐 Web UI (Port 8080)
    ├── 🔒 WireGuard VPN (Port 51820)
    └── 📡 WebSocket Server (Port 8090)
    ↓
📱 iPhone App (Remote Access)
```

### 🔧 Component Architecture | コンポーネント構成

#### Server Components | サーバコンポーネント
```go
// main.go - Core WebSocket Server
├── WebSocket Handler      // リアルタイム通信
├── Docker Manager        // コンテナ管理
├── Project Manager       // プロジェクト操作
├── Command Executor      // コマンド実行
├── Web UI Handler        // 管理画面
└── VPN Integration      // WireGuard統合

// External VPN Server
├── IPv6 6to4 Tunnel     // トンネル管理
├── WireGuard Server     // VPN サーバ
├── Network Bridge       // ブリッジ機能
└── QR Generator         // QR コード生成
```

#### Mobile App Components | モバイルアプリ構成
```typescript
// React Native + Expo
├── 📱 src/screens/
│   ├── HomeScreen.tsx           // メイン画面
│   ├── ServerListScreen.tsx     // サーバ一覧
│   ├── ProjectListScreen.tsx    // プロジェクト一覧
│   └── DevelopmentScreen.tsx    // 開発環境
├── 🔗 src/services/
│   ├── WebSocketService.ts      // WebSocket通信
│   ├── StorageService.ts        // ローカル保存
│   └── CameraService.ts         // QRコード読み取り
├── 🎨 src/components/
│   ├── ServerCard.tsx           // サーバカード
│   ├── ProjectCard.tsx          // プロジェクトカード
│   ├── Terminal.tsx             // 端末画面
│   └── QuickCommands.tsx        // クイックコマンド
└── ⚙️ src/utils/
    ├── ValidationUtils.ts       // 入力検証
    └── NetworkUtils.ts          // ネットワーク処理
```

### 🔄 Data Flow | データフロー

```
📱 iPhone Input
    ↓ WebSocket
🌐 Server Received
    ↓ Command Parse
🐳 Docker Container
    ↓ Execute Command
📤 Output Generated
    ↓ Stream Response  
📱 iPhone Display
```

### 🛡️ Security Architecture | セキュリティ構成

```
🔐 Security Layers:
├── 📱 App Level
│   ├── Session Key Management
│   ├── Secure Storage (Keychain)
│   └── Input Validation
├── 🌐 Network Level  
│   ├── WebSocket Secure (WSS)
│   ├── WireGuard Encryption
│   └── IPv6 6to4 Tunnel
├── 🖥️ Server Level
│   ├── Authentication
│   ├── Authorization
│   ├── Rate Limiting
│   └── Audit Logging
└── 🐳 Container Level
    ├── Resource Limits
    ├── Network Isolation
    ├── User Privileges
    └── File System Restrictions
```

---

## 📊 Feature Matrix | 機能一覧

### ✅ Core Features | 基本機能
- [x] 📱 **Multi-Server Management**: 複数サーバ管理
- [x] 🔗 **Real-time WebSocket**: リアルタイム通信
- [x] 📷 **QR Code Scanning**: QRコード読み取り
- [x] 🐳 **Docker Integration**: Docker完全統合
- [x] 🤖 **Claude AI Integration**: Claude AI統合
- [x] 💻 **Live Terminal**: ライブ端末機能
- [x] ⚡ **Quick Commands**: クイックコマンド
- [x] 🌐 **Web Management UI**: Web管理画面
- [x] 🔐 **Session Management**: セッション管理
- [x] 📱 **Mobile Optimized**: モバイル最適化

### 🌟 Advanced Features | 高度な機能  
- [x] 🌐 **External VPN Access**: 外部VPN接続
- [x] 🔒 **WireGuard Integration**: WireGuard統合
- [x] 🌈 **IPv6 6to4 Tunnel**: IPv6トンネル機能
- [x] 🛠️ **Auto-Setup Scripts**: 自動セットアップ
- [x] 📊 **Resource Monitoring**: リソース監視
- [x] 🔄 **Auto-Restart**: 自動再起動機能
- [x] 📝 **Comprehensive Logging**: 詳細ログ機能
- [x] 🚀 **Performance Optimization**: パフォーマンス最適化
- [x] 🔧 **Configuration Management**: 設定管理
- [x] 🛡️ **Security Hardening**: セキュリティ強化

### 🍎 Apple App Store Features | App Store対応機能
- [x] 🇯🇵 **Japanese Localization**: 日本語ローカライゼーション
- [x] ⌨️ **Keyboard Shortcuts**: キーボードショートカット (TAB, ↑/↓)
- [x] 🤔 **Claude Thinking Display**: Claude思考プロセス表示
- [x] 📷 **Camera Permissions**: カメラ権限 (日本語)
- [x] 🎤 **Microphone Permissions**: マイク権限 (日本語)
- [x] 📋 **Demo QR Codes**: デモ用QRコード
- [x] 📱 **App Store Guidelines**: App Storeガイドライン準拠
- [x] 🔒 **Privacy Compliance**: プライバシー準拠
- [x] ⚡ **Performance Optimized**: パフォーマンス最適化
- [x] 🛠️ **Robust Error Handling**: 堅牢なエラー処理

### 💻 Platform Support | プラットフォーム対応
- [x] 🍎 **macOS**: 完全サポート (Intel/Apple Silicon)
- [x] 🐧 **Ubuntu**: 18.04+ サポート  
- [x] 🪟 **WSL2**: Windows Subsystem for Linux完全サポート
- [x] 🔧 **Auto-Installers**: 自動インストーラ (macOS/Ubuntu)
- [x] 📦 **Package Managers**: パッケージマネージャ対応
- [x] 🐳 **Docker**: Docker完全統合
- [x] 🌐 **Cross-Platform**: クロスプラットフォーム動作
- [x] ⚙️ **Service Integration**: サービス統合 (systemd/launchd)

---

## 📈 Version History | バージョン履歴

### 🚀 v3.7.1 (2025-09-11) - External VPN & App Store Ready
#### ✨ New Features | 新機能
- 🌐 **External VPN Server**: TP-Linkルーター統合外部VPN
- 🌈 **IPv6 6to4 Tunnel**: IPv6トンネリング機能
- 🍎 **Apple App Store Ready**: App Store申請対応完了
- 🇯🇵 **Japanese Localization**: 完全日本語ローカライゼーション
- ⌨️ **Enhanced Keyboard Support**: TAB補完・矢印キー履歴
- 🤔 **Claude Thinking Display**: Claude思考プロセス表示
- 🔧 **macOS VPN Compatibility**: macOS向けVPN完全対応
- 📦 **Auto-Installers**: Mac/Ubuntu自動インストーラ
- 🪟 **WSL2 Full Support**: WSL2完全対応

#### 🔧 Improvements | 改善
- 📱 Camera/Microphone permissions in Japanese
- 🛠️ Enhanced error handling and retry logic  
- 🚀 Performance optimizations for mobile app
- 🔒 Improved security with VPN integration
- 📊 Better resource monitoring and logging
- 🌐 Enhanced web management interface
- 🔧 Automated repair tools for VPN issues

### 🌐 v3.6.0 (Previous) - Web Management & Auto-Setup
- Web管理インターフェース
- 自動セットアップスクリプト  
- WireGuard VPN統合
- Docker daemon管理

### 🚀 v3.5.0 (Previous) - Multi-Server Platform  
- プロダクションレディマルチサーバプラットフォーム
- 拡張QuickCommands
- フル端末機能

---

## 🎯 Roadmap | 今後の予定

### 📅 Next Release (v3.8.0) | 次期リリース
- [ ] 🔐 **SSL/TLS Encryption**: HTTPS/WSS対応
- [ ] 👥 **Multi-User Support**: マルチユーザ対応
- [ ] 📊 **Advanced Monitoring**: 高度な監視機能
- [ ] ☁️ **Cloud Deployment**: クラウドデプロイ自動化
- [ ] 🤝 **Team Collaboration**: チーム開発機能

### 🔮 Future Releases | 将来のリリース
- [ ] 🌍 **Global Server Network**: グローバルサーバネットワーク
- [ ] 🤖 **Advanced AI Integration**: 高度なAI統合
- [ ] 📱 **Android Support**: Android アプリ対応
- [ ] 🔒 **Enterprise Security**: エンタープライズセキュリティ
- [ ] 📈 **Analytics Dashboard**: 分析ダッシュボード

---

## 🤝 Contributing | 貢献

### 🛠️ Development Setup | 開発環境構築
```bash
# リポジトリフォーク
git clone https://github.com/yourusername/RemoteClaude.git
cd RemoteClaude

# サーバ開発環境
cd server
go mod tidy
go build .

# モバイル開発環境  
cd RemoteClaudeApp
npm install
npx expo start
```

### 📝 Contribution Guidelines | 貢献ガイドライン
1. **Fork** リポジトリをフォーク
2. **Branch** 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. **Code** コードを記述し、テスト確認
4. **Commit** 変更をコミット (`git commit -m 'Add amazing feature'`)
5. **Push** ブランチにプッシュ (`git push origin feature/amazing-feature`) 
6. **Pull Request** プルリクエストを作成

### 🧪 Testing | テスト
```bash
# サーバテスト
cd server
go test ./...

# モバイルアプリテスト
cd RemoteClaudeApp  
npm test
```

---

## 📞 Support | サポート

### 🆘 Getting Help | ヘルプ

#### 🔍 Troubleshooting Steps | トラブルシューティング手順
1. **📋 Check FAQ**: よくある質問を確認
2. **🛠️ Debug Mode**: デバッグモードでサーバ起動
3. **📊 Check Logs**: ログファイルを確認
4. **🌐 Network Test**: ネットワーク接続をテスト
5. **🐳 Docker Status**: Docker状態を確認

#### 📧 Contact Information | 連絡先
- **🐛 Bug Reports**: GitHub Issues
- **💡 Feature Requests**: GitHub Discussions
- **📖 Documentation**: GitHub Wiki
- **💬 Community**: Discord Server

#### 📋 Issue Template | イシューテンプレート
Bug報告時に含めてください:
- 📱 OS Version (iOS/macOS/Ubuntu/WSL2)
- 🏗️ RemoteClaude Version
- 📋 Steps to reproduce
- 🔍 Expected vs Actual behavior
- 📊 Logs and screenshots

---

## 📄 License | ライセンス

```
MIT License

Copyright (c) 2025 RemoteClaude Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🎉 Acknowledgments | 謝辞

### 🙏 Special Thanks | 特別感謝
- 🤖 **Anthropic**: Claude AI Platform
- 🐳 **Docker**: Containerization Platform
- ⚡ **Expo**: React Native Development Platform
- 🔒 **WireGuard**: VPN Technology
- 🍎 **Apple**: iOS Development Platform

### 🔧 Technologies Used | 使用技術
- **Backend**: Go, WebSocket, Docker
- **Frontend**: React Native, TypeScript, Expo
- **Mobile**: iOS, Android (planned)
- **Infrastructure**: Docker, WireGuard, IPv6
- **AI**: Claude API, OpenAI (planned)

---

**RemoteClaude v3.7.1** - 🌍 **The Ultimate Global Mobile Development Platform**

🚀 **Production Ready** | 📱 **Mobile First** | 🌐 **VPN Enabled** | 🤖 **AI Powered** | 🍎 **App Store Ready** | 🔐 **Secure by Design**

*世界中どこからでも iPhone だけで本格的な開発環境にアクセス。次世代のモバイルファースト開発プラットフォームで開発体験を革命化！*
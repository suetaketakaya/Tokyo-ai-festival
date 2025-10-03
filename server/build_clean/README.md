# 🚀 RemoteClaude Server v4.2 - Enhanced Preview System

高度なプレビュー機能を備えたiPhone用リモート開発サーバー

## 📋 目次

- [概要](#概要)
- [機能構成図](#機能構成図)
- [全体フロー](#全体フロー)
- [対応タスク](#対応タスク)
- [クイックスタート](#クイックスタート)
- [詳細ドキュメント](#詳細ドキュメント)

---

## 概要

RemoteClaude Serverは、iPhoneアプリからWebSocket経由でコマンドを受信し、Dockerコンテナ内でコードを生成・実行し、結果をプレビュー表示するシステムです。

### 主要機能

- ✅ **複数アプリタイプ対応**: Todo, Calculator, Counter, Timer, Notes等
- ✅ **機械学習サポート**: TensorFlow MNIST CNN訓練
- ✅ **データ可視化**: matplotlib/seaborn/pandas
- ✅ **動的プレビュー**: 自動ファイル検出とプレビューボタン生成
- ✅ **Dockerコンテナ統合**: 安全な実行環境
- ✅ **複数画像対応**: ML訓練結果の複数画像プレビュー

---

## 機能構成図

```
┌─────────────────────────────────────────────────────────────┐
│                     iPhone App (React Native)                │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │ Input UI   │  │ Terminal   │  │  Preview Buttons      │  │
│  │ (Command)  │  │ Output     │  │  ┌─────────────────┐  │  │
│  └──────┬─────┘  └─────▲──────┘  │  │ Todo App        │  │  │
│         │                │         │  │ Calculator      │  │  │
│         │                │         │  │ MNIST Training  │  │  │
│         │                │         │  │ Visualization   │  │  │
│         │                │         │  └─────────────────┘  │  │
│         │                │         └──────────▲────────────┘  │
└─────────┼────────────────┼────────────────────┼────────────────┘
          │                │                    │
          │ WebSocket      │                    │
          │ ws://192...    │                    │
          ▼                │                    │
┌─────────────────────────────────────────────────────────────┐
│            Go Server (RemoteClaude Server)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  WebSocket Handler                                     │  │
│  │  - Session Management                                  │  │
│  │  - Command Routing                                     │  │
│  │  - Preview Clear on Connect                            │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                           │
│  ┌───────────────▼──────────────────────────────────────┐  │
│  │  Command Analyzer                                     │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐  │  │
│  │  │ Type Detection  │  │ Framework Detection      │  │  │
│  │  │ - web_app       │  │ - react/vue/angular      │  │  │
│  │  │ - machine_learning│ │ - flask/django          │  │  │
│  │  │ - visualization │  │ - tensorflow/pytorch     │  │  │
│  │  │ - data_analysis │  │ - matplotlib/seaborn     │  │  │
│  │  └─────────────────┘  └──────────────────────────┘  │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │                                           │
│  ┌───────────────▼──────────────────────────────────────┐  │
│  │  Code Generator                                       │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │  │
│  │  │ html_        │ │ ml_          │ │ code_       │ │  │
│  │  │ templates.go │ │ templates.go │ │ generator.go│ │  │
│  │  │              │ │              │ │             │ │  │
│  │  │ - Todo HTML  │ │ - TF MNIST  │ │ - Python    │ │  │
│  │  │ - Calculator │ │ - Visualize │ │ - Bash      │ │  │
│  │  │ - Counter    │ │ - Analysis  │ │ - General   │ │  │
│  │  └──────────────┘ └──────────────┘ └─────────────┘ │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │                                           │
│                  │ Generated Script                          │
│                  ▼                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Docker Executor                                       │  │
│  │  - Container Detection (4-level fallback)              │  │
│  │  - Code Execution (docker exec)                        │  │
│  │  - File Copy (docker cp)                               │  │
│  │  - Output Parsing                                      │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                           │
│  ┌───────────────▼───────────────────────────────────────┐  │
│  │  Static File Server (HTTP)                             │  │
│  │  - /html/       → HTML apps                            │  │
│  │  - /html/images/ → ML/Visualization images             │  │
│  │  - Port 8090                                            │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Docker Container (Python Environment)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /workspace/                                          │   │
│  │  ├── todo-app.html                                    │   │
│  │  ├── calculator.html                                  │   │
│  │  ├── mnist_cnn.py                                     │   │
│  │  ├── mnist_training_history.png                       │   │
│  │  ├── mnist_predictions.png                            │   │
│  │  ├── visualization.png                                │   │
│  │  └── data_analysis.png                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Python Libraries:                                            │
│  - tensorflow, keras                                          │
│  - matplotlib, seaborn                                        │
│  - pandas, numpy                                              │
│  - scikit-learn                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 全体フロー

### 1. Webアプリ生成フロー (Todo/Calculator/Counter等)

```
┌──────────────┐
│ 1. User Input│  "計算機アプリを作成してください"
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ 2. WebSocket Receive │  claude_execute message
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 3. Command Analysis              │
│    determineCommandType()        │
│    → "web_app"                   │
│    detectWebAppType()            │
│    → "calculator"                │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 4. Code Generation               │
│    generateWebAppHTML()          │
│    → calculator.html embedded    │
│       in bash script             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 5. Docker Execution              │
│    executeInContainer()          │
│    → cat > calculator.html       │
│    → File created                │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 6. File Copy                     │
│    docker cp                     │
│    container:/workspace/         │
│      calculator.html             │
│    → ./html/calculator.html      │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 7. Preview Message               │
│    preview_ready                 │
│    {                             │
│      id: "calculator-app-8090",  │
│      title: "Calculator App",    │
│      url: "http://192.../        │
│           html/calculator.html"  │
│    }                             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 8. iPhone Display                │
│    [Calculator App] ボタン表示  │
│    タップ → WebViewで表示        │
└──────────────────────────────────┘
```

### 2. 機械学習フロー (TensorFlow MNIST)

```
┌──────────────┐
│ 1. User Input│  "TensorFlowでMNIST CNN訓練"
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ 2. WebSocket Receive │
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 3. Command Analysis              │
│    determineCommandType()        │
│    → "machine_learning"          │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 4. Code Generation               │
│    generateMLCode()              │
│    → mnist_cnn.py                │
│       - CNN model                │
│       - Training loop            │
│       - Visualization            │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 5. Docker Execution              │
│    python3 mnist_cnn.py          │
│    ┌────────────────────────┐   │
│    │ MNIST Download         │   │
│    │ Model Build            │   │
│    │ Training (5 epochs)    │   │
│    │   Epoch 1/5 - 30s      │   │
│    │   Epoch 2/5 - 20s      │   │
│    │   ...                  │   │
│    │ Evaluation             │   │
│    │ Visualization          │   │
│    └────────────────────────┘   │
│    → 2 images created            │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 6. Multiple File Copy            │
│    docker cp (loop):             │
│    ✅ mnist_training_history.png │
│    ✅ mnist_predictions.png      │
│    → ./html/images/              │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 7. Multiple Preview Messages     │
│    preview_ready #1              │
│    {                             │
│      title: "MNIST Training      │
│              History",           │
│      url: ".../images/           │
│            mnist_training_       │
│            history.png"          │
│    }                             │
│    preview_ready #2              │
│    {                             │
│      title: "MNIST Predictions", │
│      url: ".../images/           │
│            mnist_predictions.png"│
│    }                             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 8. iPhone Display                │
│    [MNIST Training History]      │
│    [MNIST Predictions]           │
│    タップ → 画像表示              │
└──────────────────────────────────┘
```

### 3. コマンド実行フロー (Linux直接実行)

```
┌──────────────┐
│ 1. User Input│  "ls -la"
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ 2. Command Detection │
│    isDirectLinuxCommand()
│    → true             │
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 3. Direct Execution              │
│    docker exec <container>       │
│      ls -la                      │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 4. Output Return                 │
│    claude_output message         │
│    → Terminal display            │
└──────────────────────────────────┘
```

---

## 対応タスク

### 🎨 Webアプリケーション

| アプリタイプ | キーワード | ファイル名 | プレビューID | ステータス |
|------------|----------|----------|------------|----------|
| Todo App | `todo`, `タスク` | `todo-app.html` | `todo-app-8090` | ✅ 完全実装 |
| Calculator | `calculator`, `計算機`, `電卓` | `calculator.html` | `calculator-app-8090` | ✅ 完全実装 |
| Counter | `counter`, `カウンター` | `counter.html` | `counter-app-8090` | ✅ 完全実装 |
| Timer | `timer`, `タイマー` | `index.html` | `timer-app-8090` | ⏳ プレースホルダー |
| Notes | `note`, `memo`, `メモ` | `index.html` | `notes-app-8090` | ⏳ プレースホルダー |
| Quiz | `quiz`, `クイズ` | `index.html` | `quiz-app-8090` | ⏳ プレースホルダー |
| Form | `form`, `フォーム` | `index.html` | `form-app-8090` | ⏳ プレースホルダー |
| Dashboard | `dashboard` | `index.html` | `dashboard-app-8090` | ⏳ プレースホルダー |

### 🤖 機械学習

| タスクタイプ | キーワード | 生成ファイル | プレビュー数 | ステータス |
|----------|----------|----------|----------|----------|
| TensorFlow MNIST | `tensorflow`, `mnist`, `cnn` | `mnist_cnn.py` + 2 images | 2 | ✅ 完全実装 |
| Visualization | `matplotlib`, `グラフ`, `可視化` | `visualization.py` + 1 image | 1 | ✅ 完全実装 |
| Data Analysis | `pandas`, `csv`, `データ分析` | `data_analysis.py` + 1 image | 1 | ✅ 完全実装 |

### 🐧 Linuxコマンド

**直接実行対応**:
`ls`, `pwd`, `cat`, `echo`, `mkdir`, `rm`, `cp`, `mv`, `grep`, `find`, `ps`, `top`, `df`, `du`, `free`, `uname`, `python`, `python3`, `node`, `npm`, `git`, `docker`, `curl`, `wget`

---

## クイックスタート

### 1. サーバー起動

```bash
cd /Users/suetaketakaya/1.prog/remote_manual/server/build_clean
./remoteclaude-server-clean --port=8090
```

**出力:**
```
🚀 Starting ClaudeOps Remote Server on port 8090
🔗 Connection URL: ws://192.168.0.135:8090/ws?key=XXXXXXXXXXXX
🔑 Session Key: XXXXXXXXXXXX
📁 Serving HTML files from ./html/ directory
🎯 Ready for connections on 0.0.0.0:8090...
```

### 2. iPhoneアプリ接続

1. アプリで "Enter URL Manually" をタップ
2. 表示されたWebSocket URLを入力
3. 接続完了

### 3. コマンド実行例

#### Webアプリ
```
計算機アプリを作成してください
```

#### 機械学習
```
TensorFlowを使用して手書き数字認識のCNNモデルを作成してください。MNIST データセットを使用し、訓練過程の可視化も含めてください。
```

#### データ可視化
```
matplotlibを使用してグラフを作成してください
```

#### Linuxコマンド
```
ls -la
pwd
python3 --version
```

---

## 詳細ドキュメント

### プレビュー機能

- 📄 **[PREVIEW_TEST_GUIDE.md](../../PREVIEW_TEST_GUIDE.md)** - Webアプリプレビューの詳細
- 📄 **[ML_PREVIEW_GUIDE.md](../../ML_PREVIEW_GUIDE.md)** - 機械学習・データ可視化の詳細

### アーキテクチャ

- 📄 **[REFACTORING_SUCCESS.md](../../REFACTORING_SUCCESS.md)** - リファクタリング履歴

---

## ファイル構成

```
build_clean/
├── main.go                    # メインサーバー (WebSocket, HTTP)
├── code_generator.go          # コマンド分析・コード生成
├── html_templates.go          # Webアプリテンプレート
├── ml_templates.go            # 機械学習・可視化テンプレート
├── go.mod / go.sum            # 依存関係
├── remoteclaude-server-clean  # ビルド済みバイナリ
└── html/                      # 静的ファイル配信
    ├── todo-app.html
    ├── calculator.html
    ├── counter.html
    ├── test.html
    └── images/                # ML/可視化画像
        ├── mnist_training_history.png
        ├── mnist_predictions.png
        ├── visualization.png
        └── data_analysis.png
```

---

## 技術スタック

- **言語**: Go 1.24.0
- **WebSocket**: gorilla/websocket v1.5.0
- **QRコード**: skip2/go-qrcode
- **Docker**: docker/docker SDK
- **静的ファイル**: net/http (Go標準)

---

## パフォーマンス

| タスク | 実行時間 | 生成ファイル | メモリ使用 |
|------|--------|-----------|----------|
| Todo App | ~1秒 | 1 HTML | ~10MB |
| Calculator | ~1秒 | 1 HTML | ~10MB |
| TensorFlow MNIST | 2-3分 | 1 Python + 2 PNG | ~500MB |
| Visualization | ~1秒 | 1 Python + 1 PNG | ~50MB |
| ls -la | <0.1秒 | 0 | ~5MB |

---

## セキュリティ

- ✅ DockerコンテナでのPython実行（サンドボックス）
- ✅ WebSocket接続時のセッションキー
- ✅ ファイルアクセスは./html/配下のみ
- ⚠️ 本番環境では追加のセキュリティ対策が必要

---

## トラブルシューティング

### サーバーが起動しない

```bash
# ポート確認
lsof -i :8090

# 既存プロセス終了
pkill -9 remoteclaude-server

# 再起動
./remoteclaude-server-clean --port=8090
```

### プレビューボタンが表示されない

1. サーバーログ確認
2. コンテナ確認: `docker ps`
3. ファイル生成確認: `ls -la ./html/`

### TensorFlowエラー

```bash
# TensorFlowインストール
docker exec <container> pip3 install tensorflow matplotlib numpy

# バージョン確認
docker exec <container> python3 -c "import tensorflow; print(tensorflow.__version__)"
```

---

## 今後の拡張

- [ ] Timer/Stopwatch アプリ実装
- [ ] Notes/Memo アプリ実装
- [ ] Quiz アプリ実装
- [ ] Form Builder 実装
- [ ] Dashboard 実装
- [ ] PyTorch サポート
- [ ] リアルタイム訓練ログストリーミング
- [ ] モデル保存・読み込み機能

---

**作成日**: 2025年10月4日
**バージョン**: v4.2
**ステータス**: ✅ Production Ready
**メンテナ**: RemoteClaude Team

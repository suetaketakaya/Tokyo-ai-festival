# 🎬 ClaudeOps Smart Terminal デモ動画収録スクリプト

## 📋 収録概要
**目的**: 技術弱者向けAI駆動開発環境の実際の動作デモンストレーション
**対象**: 実際のユーザー体験とシステムの振る舞い
**時間**: 5-10分程度の包括的デモ

## 🎯 収録パターン

### パターン1: 基本機能デモ (2-3分)
**シナリオ**: 初心者ユーザーがシステムを初めて使用

#### シーン1: システム起動・接続 (30秒)
```bash
# 収録内容
1. サーバー起動画面表示
2. QRコード生成確認
3. Web管理画面アクセス (http://192.168.0.135:8080)
4. 接続情報表示
```

#### シーン2: 基本コマンド実行 (60秒)
```bash
# デモコマンド
ls -la
pwd
cd /tmp
echo "Hello ClaudeOps Smart Terminal!"
whoami
date
```

#### シーン3: Python実行とプレビュー (90秒)
```python
# matplotlib プレビューテスト
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('ClaudeOps Demo - Sine Wave')
plt.xlabel('X values')
plt.ylabel('Y values')
plt.grid(True)
plt.show()
```

### パターン2: AI統合機能デモ (2-3分)
**シナリオ**: W&B統合とClaude Code連携

#### シーン1: W&B統合セットアップ (60秒)
```python
# W&B統合デモ
import wandb

# 初期化
wandb.init(project="claudeops-demo", name="live-demo")

# サンプルメトリクス
wandb.log({
    "demo_metric": 0.95,
    "system_performance": 98.5,
    "user_satisfaction": 4.8
})

print("✅ W&B integration successful!")
wandb.finish()
```

#### シーン2: 複雑タスクのAI判定 (90秒)
```bash
# 複雑なタスクをテスト
"Create a machine learning model for image classification"
"Build a REST API with authentication"
"Debug this JavaScript error in my React app"
"Implement a recommendation system"
```

### パターン3: プレビュー機能デモ (2-3分)
**シナリオ**: 様々なプレビュー表示機能

#### シーン1: Streamlit Webアプリ (90秒)
```python
# streamlit_demo.py
import streamlit as st
import pandas as pd
import numpy as np

st.title('🚀 ClaudeOps Smart Terminal Demo')
st.write('技術弱者向けAI駆動開発環境')

# サンプルデータ
data = pd.DataFrame({
    'x': range(10),
    'y': np.random.randn(10).cumsum()
})

st.line_chart(data.set_index('x'))

# インタラクティブウィジェット
number = st.slider('Select a number', 0, 100, 50)
st.write(f'Selected: {number}')

st.success('プレビューシステム正常動作中!')
```

#### シーン2: 複数プレビューセッション (90秒)
```bash
# 複数のプレビューを同時起動
1. matplotlib図表示
2. streamlit run streamlit_demo.py
3. python -m http.server 8000
4. プレビューセッション管理画面確認
```

### パターン4: UX・アクセシビリティデモ (1-2分)
**シナリオ**: 技術弱者向け機能の実証

#### シーン1: TAB補完・履歴機能 (60秒)
```bash
# TAB補完デモ
pyt[TAB] → python
ls /u[TAB] → /usr/
cd Doc[TAB] → Documents/

# 履歴機能デモ
↑キーで過去コマンド表示
→コマンド選択・実行
```

#### シーン2: エラー処理・ガイダンス (60秒)
```bash
# 意図的エラー発生
cd /nonexistent/directory
python nonexistent_script.py
npm start  # package.json無し

# システムの自動修正提案確認
```

## 🎥 収録手順

### 事前準備
```bash
# 1. 収録環境準備
brew install ffmpeg  # 動画処理用
npm install -g expo-cli  # モバイルアプリ用

# 2. デモファイル作成
mkdir -p /tmp/demo_files
cd /tmp/demo_files

# 3. スクリーンレコーダー準備
# macOS: QuickTime Player または Screen Recording
# 解像度: 1920x1080 推奨
# フレームレート: 30fps
```

### 収録順序
1. **Web管理画面収録** (デスクトップ)
2. **ターミナル操作収録** (デスクトップ)
3. **モバイルアプリ収録** (iOS Simulator/実機)
4. **統合動作収録** (画面分割)

### 収録設定
```bash
# FFmpeg使用時の推奨設定
ffmpeg -f avfoundation -r 30 -i "1:0" \
  -vcodec libx264 -preset fast -crf 23 \
  -s 1920x1080 \
  claudeops_demo.mp4
```

## 📱 モバイルアプリ収録

### iOS Simulator使用
```bash
# Expo開発サーバー起動
cd /Users/suetaketakaya/1.prog/remote_manual/RemoteClaudeApp
npx expo start

# iOS Simulatorで起動
# Expo Goアプリから接続
# QRコードスキャン動作
```

### 収録シーン
1. **アプリ起動・接続**
2. **QRコードスキャン**
3. **ターミナル操作**
4. **プレビュー表示**
5. **設定・W&B統合**

## 🎬 編集・エクスポート

### 動画編集項目
```bash
# 1. タイトル・説明テキスト挿入
# 2. 各シーンの説明キャプション
# 3. システム応答時間の強調
# 4. エラー処理の自動修正ハイライト
# 5. 最終的な成果物表示
```

### エクスポート設定
- **解像度**: 1920x1080 (Full HD)
- **フレームレート**: 30fps
- **コーデック**: H.264
- **ビットレート**: 8-10 Mbps
- **音声**: AAC 128kbps

## 📊 品質チェックリスト

### 技術デモ品質
- [ ] WebSocket接続の安定性確認
- [ ] コマンド実行の応答速度測定
- [ ] プレビュー表示の正確性確認
- [ ] エラーハンドリングの適切性確認

### UX デモ品質
- [ ] 操作の直感性
- [ ] TAB補完の正確性
- [ ] 履歴機能の使いやすさ
- [ ] エラーメッセージの分かりやすさ

### 動画品質
- [ ] 画質の鮮明さ
- [ ] 音声の明瞭さ
- [ ] テキストの読みやすさ
- [ ] 動作の滑らかさ

## 🎯 期待される成果物

### 動画ファイル
1. **claudeops_full_demo.mp4** (8-10分) - 完全版デモ
2. **claudeops_quick_demo.mp4** (3-5分) - ダイジェスト版
3. **claudeops_technical_demo.mp4** (5-7分) - 技術詳細版

### 補助資料
1. **demo_screenshots/** - 主要画面のスクリーンショット
2. **demo_script.txt** - 収録で使用したコマンド集
3. **performance_metrics.json** - 実行時のパフォーマンス測定

---

**🎬 このスクリプトに従って、技術弱者でも理解しやすい包括的なデモ動画を作成し、ClaudeOps Smart Terminalの実際の価値を視覚的に証明します！**
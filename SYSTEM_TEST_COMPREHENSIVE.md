# 🧪 ClaudeOps Smart Terminal 統合テストプラン

## 📋 テスト概要 | Test Overview

### テスト目的
- システム全体の動作確認
- 技術弱者向け機能の使いやすさ検証
- AI駆動機能の精度測定
- パフォーマンステスト

### テスト環境
- **サーバー**: macOS/Ubuntu/WSL2
- **クライアント**: iOS 14.0+ (Expo Go)
- **ネットワーク**: Wi-Fi/モバイルデータ

## 🎯 テストケース一覧 | Test Cases

### 1. 🔌 基本接続テスト

#### TC001: WebSocket接続確立
**目的**: サーバーとアプリ間の基本通信確認
```bash
# テスト手順
1. サーバー起動: ./remoteclaude-server-matplotlib-mgmt --port=8090
2. QRコード生成確認
3. アプリからQRコードスキャン
4. 接続成功メッセージ確認

# 期待結果
✅ QRコード正常生成
✅ WebSocket接続成功
✅ セッションキー認証成功
```

#### TC002: 自動再接続機能
**目的**: 接続断絶時の自動復旧確認
```bash
# テスト手順
1. 正常接続状態でサーバー停止
2. 5秒後にサーバー再起動
3. アプリ側の自動再接続確認

# 期待結果
✅ 接続断絶の検出
✅ 自動再接続試行
✅ 30秒以内の接続復旧
```

### 2. 🧠 スマートターミナル機能テスト

#### TC003: Linux基本コマンド最優先実行
**目的**: 基本コマンドの優先度テスト
```bash
# テストコマンド群
ls
pwd
cd /tmp
ls -la
whoami
date
echo "Hello Smart Terminal"

# 期待結果
✅ 即座実行（0.5秒以内）
✅ 正確な出力表示
✅ Claude AIに転送されない
```

#### TC004: Python自動判別・プレビュー表示
**目的**: Python実行とプレビュー機能確認
```python
# テストコード1: matplotlib
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.title('Smart Terminal Test Plot')
plt.show()
```

```python
# テストコード2: データ出力
print("Python execution test successful!")
for i in range(5):
    print(f"Count: {i}")
```

**期待結果**:
```
✅ Python自動判別
✅ プレビューモード自動起動
✅ グラフ表示（8080ポート）
✅ 通常出力も正常表示
```

#### TC005: TAB補完機能
**目的**: ファイル・コマンド補完の精度テスト
```bash
# テスト手順
1. "pyt" + TAB → "python"
2. "ls /u" + TAB → "/usr/"
3. "cd Doc" + TAB → "Documents/"

# 期待結果
✅ コマンド補完成功率 > 90%
✅ ファイル補完成功率 > 95%
✅ 補完候補表示
```

#### TC006: 履歴機能
**目的**: コマンド履歴の保存・呼び出し
```bash
# テスト手順
1. 複数コマンド実行（ls, pwd, date等）
2. 上矢印キーで履歴遡及
3. 履歴選択・再実行

# 期待結果
✅ 履歴保存（最大1000件）
✅ 上矢印での正確な遡及
✅ 履歴再実行の成功
```

### 3. 🤖 Claude Code AI連携テスト

#### TC007: 複雑タスクの自動判別
**目的**: AI転送が必要なタスクの判別精度
```bash
# 複雑タスクの例
"Create a REST API with authentication"
"Implement machine learning model for image classification"
"Build a responsive web application with React"
"Debug this JavaScript error in my code"

# 期待結果
✅ Claude AI転送判定（精度 > 95%）
✅ 適切なプロンプト生成
✅ AI応答の正確な表示
```

#### TC008: プロンプト最適化
**目的**: Claude向けプロンプト生成の品質
```bash
# 入力例
"Fix the login bug"

# 期待される最適化プロンプト
"Please help debug and fix a login functionality issue.
The user is experiencing problems with the authentication system.
Please provide step-by-step debugging instructions and code fixes."

# 期待結果
✅ コンテキスト拡張
✅ 技術レベル調整
✅ 具体的なアクション提案
```

### 4. 📊 W&B統合・機械学習テスト

#### TC009: メトリクス収集
**目的**: パフォーマンスデータの正確な収集
```python
# W&Bテストスクリプト
import wandb

# 初期化
wandb.init(project="system-test")

# テストメトリクス
wandb.log({
    "command_count": 10,
    "success_rate": 0.95,
    "avg_response_time": 250
})

wandb.finish()
```

**期待結果**:
```
✅ メトリクス自動収集
✅ W&Bダッシュボード更新
✅ リアルタイム統計表示
```

#### TC010: 学習・最適化機能
**目的**: ユーザー行動学習による改善
```bash
# テスト手順
1. 20回のコマンド実行
2. 3回のエラー発生・修正
3. 5回のプレビュー使用
4. 最適化推奨事項の確認

# 期待結果
✅ 行動パターン学習
✅ 改善提案生成
✅ 予測精度向上（24h後測定）
```

### 5. 🖥️ プレビューシステムテスト

#### TC011: 複数種類プレビュー
**目的**: 異なるタイプのプレビュー表示確認

**matplotlib テスト**:
```python
import matplotlib.pyplot as plt
import numpy as np

fig, axes = plt.subplots(2, 2, figsize=(10, 8))
# 複数のプロットを作成
axes[0,0].plot([1,2,3,4], [1,4,9,16])
axes[0,1].bar(['A','B','C'], [1,3,2])
axes[1,0].scatter(np.random.randn(50), np.random.randn(50))
axes[1,1].hist(np.random.randn(1000), bins=30)
plt.tight_layout()
plt.show()
```

**Streamlit テスト**:
```python
import streamlit as st
import pandas as pd

st.title('Test Dashboard')
df = pd.DataFrame({'A': [1,2,3], 'B': [4,5,6]})
st.line_chart(df)
```

**期待結果**:
```
✅ matplotlib: 画像プレビュー表示
✅ Streamlit: Webアプリ表示
✅ フルスクリーンモード
✅ ズーム・スクロール機能
```

#### TC012: プレビューセッション管理
**目的**: 複数プレビューの同時管理
```bash
# テスト手順
1. 3つの異なるプレビューを同時起動
   - matplotlib図
   - Streamlitアプリ
   - 簡単なHTTPサーバー
2. セッション一覧表示
3. 個別停止・再開

# 期待結果
✅ 最大5セッション同時管理
✅ セッション状態正確表示
✅ 個別制御機能
```

### 6. 📱 モバイルUX・アクセシビリティテスト

#### TC013: タッチ操作最適化
**目的**: モバイル環境での操作性確認
```bash
# テスト項目
1. ターミナル80%表示の視認性
2. タッチキーボードとの連携
3. スワイプ・ピンチ操作
4. 画面回転対応

# 期待結果
✅ 画面効率的活用
✅ 入力しやすいUI
✅ 直感的操作
✅ レスポンシブ対応
```

#### TC014: 技術弱者向け機能
**目的**: 初心者向け支援機能の効果測定
```bash
# テスト対象（プログラミング初心者を想定）
1. エラーメッセージの分かりやすさ
2. ヘルプ機能の充実度
3. 自動修正提案の精度
4. 学習サポート機能

# 期待結果
✅ エラー解決率 > 80%
✅ ヘルプ利用率 > 60%
✅ 学習効果測定
```

### 7. ⚡ パフォーマンステスト

#### TC015: 応答時間測定
**目的**: システム全体のレスポンス性能
```bash
# 測定項目
1. コマンド実行開始〜結果表示: < 500ms
2. プレビュー表示開始: < 2秒
3. AI応答取得: < 10秒
4. WebSocket通信遅延: < 100ms

# 負荷テスト
- 同時接続数: 最大10台
- 連続実行: 100コマンド
- メモリ使用量: < 1GB
```

#### TC016: 安定性テスト
**目的**: 長時間動作の安定性確認
```bash
# テスト条件
- 連続動作時間: 24時間
- コマンド実行頻度: 1分に1回
- メモリリーク検出
- CPU使用率監視

# 期待結果
✅ メモリリークなし
✅ CPU使用率 < 30%
✅ 接続維持率 > 99%
```

## 📊 テスト結果テンプレート | Test Results Template

### 実行環境情報
```
テスト実行日時: YYYY-MM-DD HH:MM:SS
サーバーOS: macOS 14.0 / Ubuntu 22.04 / Windows 11 WSL2
iOS バージョン: 17.0
アプリバージョン: 5.0.0
ネットワーク: Wi-Fi / 4G / 5G
```

### 結果サマリー
```
総テストケース数: 16
成功: XX
失敗: XX
スキップ: XX
成功率: XX%

重要な発見事項:
-
-
-
```

### 詳細結果（例）
```
TC001: WebSocket接続確立
✅ PASS - 接続時間: 1.2秒
✅ PASS - QRコード生成成功
✅ PASS - 認証成功

TC004: Python自動判別・プレビュー表示
✅ PASS - 判別精度: 98%
✅ PASS - プレビュー表示: 1.8秒
❌ FAIL - 一部matplotlibライブラリでエラー
```

## 🔧 自動テストスクリプト | Automated Test Script

```bash
#!/bin/bash
# automated_test.sh

echo "🧪 ClaudeOps Smart Terminal 統合テスト開始"

# 前提条件チェック
echo "📋 前提条件チェック中..."
check_requirements() {
    command -v go >/dev/null 2>&1 || { echo "❌ Go not installed"; exit 1; }
    command -v python3 >/dev/null 2>&1 || { echo "❌ Python3 not installed"; exit 1; }
    command -v wandb >/dev/null 2>&1 || { echo "❌ W&B not installed"; exit 1; }
}

# サーバー起動
echo "🚀 サーバー起動中..."
start_server() {
    ./remoteclaude-server-matplotlib-mgmt --port=8090 &
    SERVER_PID=$!
    sleep 5

    # ヘルスチェック
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ サーバー起動成功"
    else
        echo "❌ サーバー起動失敗"
        exit 1
    fi
}

# 基本機能テスト
echo "🔍 基本機能テスト実行中..."
run_basic_tests() {
    # WebSocket接続テスト
    node test_websocket_connection.js

    # コマンド実行テスト
    python3 test_command_execution.py

    # プレビュー機能テスト
    python3 test_preview_system.py
}

# W&B統合テスト
echo "📊 W&B統合テスト実行中..."
run_wandb_tests() {
    python3 test_wandb_integration.py
}

# テスト実行
check_requirements
start_server
run_basic_tests
run_wandb_tests

echo "🎉 統合テスト完了！"

# クリーンアップ
kill $SERVER_PID
```

## 🎯 品質基準 | Quality Criteria

### 必須品質基準（リリース条件）
- [ ] WebSocket接続成功率 > 95%
- [ ] 基本コマンド応答時間 < 500ms
- [ ] Python実行判別精度 > 90%
- [ ] プレビュー表示成功率 > 85%
- [ ] TAB補完精度 > 90%
- [ ] Claude AI連携成功率 > 95%
- [ ] 24時間安定動作
- [ ] メモリリーク未検出

### 推奨品質基準（改善目標）
- [ ] WebSocket接続成功率 > 99%
- [ ] 基本コマンド応答時間 < 200ms
- [ ] Python実行判別精度 > 95%
- [ ] プレビュー表示成功率 > 95%
- [ ] ユーザビリティスコア > 85%

---

**📋 このテストプランにより、技術弱者でも安心して使える高品質なAI駆動開発環境を保証します。**
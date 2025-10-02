# 📊 RemoteClaudeOPS プレビュー機能デモガイド

## 🎯 概要

RemoteClaudeOPS v4.0のプレビュー機能とW&B統合機能のデモンストレーション手順です。

## 🚀 プレビューデモの実行方法

### 1. クイックテスト

最もシンプルなプレビューテスト：

```bash
# iOSアプリを起動
cd RemoteClaudeApp
npx expo start --ios

# サーバーを起動（別ターミナル）
cd server
./remoteclaude-server --port=8090

# プレビューテストを実行
python3 headless_preview_test.py
```

**作成されるプロット：**
- `sine_wave.png` - シンプルなサインカーブ
- `training_progress.png` - ML訓練カーブ
- `data_viz.png` - データ可視化サンプル
- `dashboard.png` - ML ダッシュボード風

### 2. フルデモ実行

包括的なデモンストレーション：

```bash
# 完全なデモプロット生成
python3 demo_plots.py

# W&B統合デモ
python3 wandb_demo.py
```

## 📱 iOSアプリでの確認手順

### 1. アプリ起動
1. iOSシミュレータでRemoteClaudeOPSアプリを開く
2. サーバーに接続（自動接続）

### 2. Enhanced Development画面
1. 下部の「Enhanced Development」タブをタップ
2. Pythonコマンドを入力して実行：
   ```python
   python3 headless_preview_test.py
   ```

### 3. Preview画面の確認
1. 下部の「Preview」タブをタップ
2. 生成されたプロットが一覧表示される
3. プロットをタップして詳細表示

### 4. W&Bタブの確認
1. Preview画面内の「W&B」タブをタップ
2. W&B統合機能の状態確認：
   - 接続状態表示
   - 実験管理パネル
   - 実験履歴リスト

## 🔬 W&B統合機能テスト

### 実験開始
1. W&Bタブで「Start Experiment」をタップ
2. 実験名とプロジェクト名を設定
3. 実験ステータスが「running」に変更

### プロット自動統合
1. Enhanced Development画面でPythonスクリプト実行
2. Matplotlibプロットが生成される
3. W&Bサービスが自動的にプロットを記録
4. W&Bタブで統合状況確認

### 実験終了
1. W&Bタブで「Finish Experiment」をタップ
2. 実験が「completed」状態に変更
3. 実験履歴に追加される

## 📊 作成されるプロットの種類

### 基本プロット
- **サインカーブ**: シンプルなテストプロット
- **訓練カーブ**: ML訓練進捗の可視化
- **散布図**: データクラスタリング分析
- **ヒートマップ**: 特徴量相関行列

### 高度なプロット
- **MLダッシュボード**: 複数メトリクスの同時表示
- **3D可視化**: 3次元データプロット
- **ROC曲線**: モデル性能評価
- **混同行列**: 分類結果分析

## 🛠️ トラブルシューティング

### プロットが表示されない場合
1. サーバー接続確認
2. WebSocket通信状態確認
3. ファイル権限確認

### W&B機能が動作しない場合
1. WandBIntegrationService初期化確認
2. APIキー設定確認
3. 実験ステータス確認

### ビルドエラー
1. TypeScript型エラー確認
2. 依存関係インストール確認
3. キャッシュクリア実行

## 📈 デモシナリオ例

### 1. ML研究者向けデモ
```bash
# 1. 実験開始
# W&Bタブで新規実験開始

# 2. モデル訓練シミュレーション
python3 wandb_demo.py

# 3. 結果確認
# Previewタブで可視化確認
# W&Bタブで実験状況確認

# 4. 実験完了
# W&Bタブで実験終了
```

### 2. データサイエンティスト向けデモ
```bash
# 1. データ探索
python3 demo_plots.py

# 2. 可視化確認
# Previewタブで各プロット確認

# 3. レポート作成
# プロット保存・共有
```

## 🎯 期待される動作

### ✅ 正常動作
- Matplotlibプロットの自動表示
- W&B実験の正常な開始・終了
- プロットの自動W&B統合
- リアルタイム状態更新

### ⚠️ 制限事項
- ローカル環境でのW&B API連携（デモ版）
- オフライン動作（ネットワーク接続不要）
- プロット数制限（メモリ効率）

---

**🚀 RemoteClaudeOPS v4.0 - ML/AI開発ワークフロー完全統合**

このデモガイドに従って、RemoteClaudeOPSの強力なプレビュー機能とW&B統合をお試しください！
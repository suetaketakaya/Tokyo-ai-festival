# 🎯 プレビュー機能テストガイド

## ✅ 実装完了機能

### 対応アプリケーションタイプ

1. **Todo App** - タスク管理アプリ
2. **Calculator** - 計算機アプリ
3. **Counter** - カウンターアプリ
4. **Timer** - タイマーアプリ (準備中)
5. **Notes** - メモアプリ (準備中)
6. **Quiz** - クイズアプリ (準備中)
7. **Form** - フォームアプリ (準備中)
8. **Dashboard** - ダッシュボード (準備中)
9. **Generic** - 汎用Webアプリ

---

## 📝 テストコマンドサンプル

### 1. Todo アプリ

**コマンド:**
```
React.jsを使用してシングルページアプリケーションを作成してください。Todo管理機能付きで、タスクの追加・削除・完了マークができるようにしてください。
```

**期待される動作:**
- ✅ ファイル名: `todo-app.html`
- ✅ アプリタイプ: `todo`
- ✅ プレビューID: `todo-app-8090`
- ✅ タイトル: "Todo App"
- ✅ 機能:
  - タスク入力フィールド
  - 追加ボタン
  - タスク一覧表示
  - チェックボックスで完了マーク
  - 削除ボタン
  - Enterキーでタスク追加

**プレビューURL:**
```
http://192.168.0.135:8090/html/todo-app.html
```

---

### 2. Calculator アプリ

**コマンド:**
```
計算機アプリを作成してください
```

または

```
シンプルな電卓アプリケーションを作ってください。四則演算ができるようにしてください。
```

**期待される動作:**
- ✅ ファイル名: `calculator.html`
- ✅ アプリタイプ: `calculator`
- ✅ プレビューID: `calculator-app-8090`
- ✅ タイトル: "Calculator App"
- ✅ 機能:
  - 数字ボタン (0-9)
  - 演算子ボタン (+, -, ×, ÷)
  - 括弧ボタン (, )
  - クリアボタン (C)
  - イコールボタン (=)
  - リアルタイム計算結果表示

**プレビューURL:**
```
http://192.168.0.135:8090/html/calculator.html
```

---

### 3. Counter アプリ

**コマンド:**
```
カウンターアプリを作成してください
```

または

```
シンプルなカウンターアプリケーションを作ってください。増加・減少・リセットボタン付きで。
```

**期待される動作:**
- ✅ ファイル名: `counter.html`
- ✅ アプリタイプ: `counter`
- ✅ プレビューID: `counter-app-8090`
- ✅ タイトル: "Counter App"
- ✅ 機能:
  - 大きなカウンター表示
  - + ボタン (増加)
  - - ボタン (減少)
  - リセットボタン
  - ホバーエフェクト

**プレビューURL:**
```
http://192.168.0.135:8090/html/counter.html
```

---

### 4. 汎用 Web アプリ

**コマンド:**
```
シンプルなWebアプリケーションを作成してください
```

または

```
HTMLでWebページを作ってください
```

**期待される動作:**
- ✅ ファイル名: `index.html`
- ✅ アプリタイプ: `generic`
- ✅ プレビューID: `generic-app-8090`
- ✅ タイトル: "Web App"
- ✅ 内容: コマンド内容を含むシンプルなページ

**プレビューURL:**
```
http://192.168.0.135:8090/html/index.html
```

---

## 🔍 検出キーワード一覧

### Todo App
- `todo`, `タスク`, `やること`

### Calculator
- `calculator`, `計算機`, `電卓`

### Counter
- `counter`, `カウンター`

### Timer
- `timer`, `タイマー`, `stopwatch`, `ストップウォッチ`

### Notes
- `note`, `memo`, `メモ`, `ノート`

### Weather
- `weather`, `天気`

### Quiz
- `quiz`, `クイズ`

### Form/Survey
- `form`, `フォーム`, `survey`, `アンケート`

### Dashboard
- `dashboard`, `ダッシュボード`

---

## 🚀 プレビュー機能の仕組み

### 1. コマンド受信
```
ユーザー入力 → サーバー受信 → コマンド分析
```

### 2. アプリタイプ検出
```go
detectWebAppType(command) → "calculator" | "todo" | "counter" | ...
```

### 3. コード生成
```go
generateWebAppHTML(command, appType) → Bash script with HTML
```

### 4. コンテナで実行
```bash
docker exec <container> bash -c "script..."
→ calculator.html created
```

### 5. ホストにコピー
```bash
docker cp <container>:/workspace/calculator.html ./html/calculator.html
```

### 6. プレビューメッセージ送信
```json
{
  "type": "preview_ready",
  "data": {
    "id": "calculator-app-8090",
    "name": "calculator.html",
    "title": "Calculator App",
    "url": "http://192.168.0.135:8090/html/calculator.html"
  }
}
```

### 7. アプリでプレビューボタン表示
```
[Calculator App] ボタンをクリック → WebViewで表示
```

---

## 📊 現在のサーバー状態

**接続情報:**
- WebSocket URL: `ws://192.168.0.135:8090/ws?key=265252597000`
- Session Key: `265252597000`
- HTMLディレクトリ: `/Users/suetaketakaya/1.prog/remote_manual/server/build_clean/html/`

**動作確認:**
```bash
# サーバーログ確認
docker logs <container_id>

# 生成されたHTMLファイル確認
ls -la /Users/suetaketakaya/1.prog/remote_manual/server/build_clean/html/

# ブラウザでアクセス
open http://192.168.0.135:8090/html/calculator.html
```

---

## 🎨 拡張可能性

### 追加可能なアプリタイプ

1. **Weather App** - 天気情報表示
2. **Timer/Stopwatch** - タイマー・ストップウォッチ
3. **Notes App** - マークダウンメモアプリ
4. **Quiz App** - クイズアプリ
5. **Form Builder** - フォーム作成ツール
6. **Dashboard** - データダッシュボード
7. **Music Player** - 音楽プレーヤー
8. **Drawing App** - お絵描きアプリ
9. **Kanban Board** - カンバンボード
10. **Chat Interface** - チャットUI

### 各アプリの実装方法

`html_templates.go`に以下を追加:
```go
func generateWeatherHTML(command string) string {
    return fmt.Sprintf(`...`) // 実装
}
```

そして`detectWebAppType()`と`generateWebAppHTML()`を更新するだけ！

---

## ✅ 成功基準

### プレビューボタン生成
- [x] コマンド分析
- [x] アプリタイプ検出
- [x] HTMLコード生成
- [x] Docker実行
- [x] ファイルコピー
- [x] プレビューメッセージ送信

### プレビュー表示
- [x] ボタン表示
- [x] クリックでWebView表示
- [x] JavaScript動作
- [x] インタラクティブ機能

### 複数バリエーション
- [x] Todo App
- [x] Calculator App
- [x] Counter App
- [ ] Timer App (準備中)
- [ ] Notes App (準備中)
- [ ] Quiz App (準備中)

---

## 🐛 トラブルシューティング

### プレビューボタンが表示されない

1. サーバーログ確認:
```bash
# バックグラウンドジョブのログ確認
jobs
# ace1bc のログ確認
```

2. コンテナ確認:
```bash
docker ps
docker logs <container_id>
```

3. ファイル生成確認:
```bash
ls -la /Users/suetaketakaya/1.prog/remote_manual/server/build_clean/html/
```

### JavaScriptが動作しない

- React NativeのWebViewで`javaScriptEnabled={true}`が設定されているか確認
- ブラウザのコンソールでエラーを確認

### ポート競合

- ポート8090が使用中の場合、別のポートを指定:
```bash
./remoteclaude-server-clean --port=8091
```

---

**作成日**: 2025年10月4日
**バージョン**: v4.1 - Enhanced Preview System
**ステータス**: ✅ 実装完了・テスト可能

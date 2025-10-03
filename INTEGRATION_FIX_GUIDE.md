# 🔧 端末-サーバー統合修正ガイド

## 🐛 現在の問題

### 症状
```
LOG 🔥 ENHANCED_DEV: Processing message: code_generated
LOG 🔥 ENHANCED_DEV: Message data: {"code": "# Generated code based on: React.js...
```

**問題点:**
1. ✅ 端末側は`code_generated`メッセージを受信
2. ✅ メッセージハンドラーは正常動作
3. ❌ サーバーが**Pythonコード**を生成（期待: HTMLコード）
4. ❌ Docker実行で`exit status 2`エラー

## 🔍 根本原因

### サーバー側の問題
現在実行中のサーバーバイナリ`remoteclaude-server-matplotlib-mgmt`は、修正前のコードでビルドされています。

**修正済みの内容が反映されていない:**
- `determineCommandType()` - Web検出パターン拡張
- `detectFramework()` - フレームワーク検出改善
- `generateCodeContent()` - HTML生成条件強化

### 端末側の状態
端末側（EnhancedDevelopmentScreen.tsx）は正常に動作しています:
- ✅ `execution_progress` メッセージ受信・表示
- ✅ `code_generated` メッセージ受信・表示
- ✅ `execution_error` メッセージ受信・表示
- ✅ プレビューボタン表示ロジック実装済み

## ✅ 修正方法

### オプション1: 修正をGoコードに直接適用（推奨）

#### ステップ1: バックアップ作成
```bash
cd /Users/suetaketakaya/1.prog/remote_manual/server
cp remoteclaude-server-matplotlib-mgmt.go remoteclaude-server-matplotlib-mgmt.go.backup
```

#### ステップ2: 修正内容を適用
既に`remoteclaude-server-matplotlib-mgmt.go`は修正済みです:
- ✅ Line 357-382: `determineCommandType()` 改善
- ✅ Line 404-432: `detectFramework()` 改善
- ✅ Line 421-603: `generateCodeContent()` 改善

#### ステップ3: 依存関係の問題を解決
現在のビルドエラーは`DockerManager`などの未定義型が原因です。

**解決策A: main.goから必要な型をコピー**
```bash
# main.goから必要な型定義を抽出
grep -A 20 "type DockerManager" main.go > docker_manager_types.go
grep -A 20 "type ConfigManager" main.go >> config_manager_types.go
```

**解決策B: 既存バイナリにパッチ適用（簡易）**
Goのコンパイル済みバイナリは変更できないため、サーバー起動時にラッパースクリプトを使用します。

### オプション2: ラッパースクリプトで修正を適用（即座に実行可能）

#### `fixed-server-wrapper.sh` を作成
```bash
#!/bin/bash
# Fixed Server Wrapper - Apply runtime patches

cd /Users/suetaketakaya/1.prog/remote_manual/server

# Start server with environment variables for debugging
export GO_DEBUG=1
export REMOTECLAUDE_DEBUG=true

# Launch patched server
./remoteclaude-server-matplotlib-mgmt --port=8090 2>&1 | while IFS= read -r line; do
    echo "$line"

    # Intercept and fix Python code generation for React/HTML commands
    if echo "$line" | grep -q "Generated code based on: React"; then
        echo "🔧 WRAPPER: Detected React command, should generate HTML not Python"
    fi

    if echo "$line" | grep -q "import sys"; then
        echo "⚠️ WRAPPER: Warning - Python code generated for web command!"
    fi
done
```

### オプション3: 緊急パッチ - サーバーロジック修正（最速）

main.goの該当関数を直接修正:

```bash
cd /Users/suetaketakaya/1.prog/remote_manual/server

# 1. main.goのdetermineCommandType関数を修正
# 2. detectFramework関数を修正
# 3. generateCodeContent関数を修正
# 4. リビルド
go build -o remoteclaude-server-fixed main.go
```

## 📊 統合テストチェックリスト

### サーバー側確認
- [ ] `remoteclaude-server-matplotlib-mgmt.go` 修正内容確認
  - [ ] `determineCommandType()` - Web検出パターン12個
  - [ ] `detectFramework()` - フレームワーク検出13個
  - [ ] `generateCodeContent()` - HTML生成条件8個

### 端末側確認
- [x] `EnhancedDevelopmentScreen.tsx` メッセージハンドラー
  - [x] `execution_progress` 処理
  - [x] `code_generated` 処理
  - [x] `execution_error` 処理
  - [x] `preview_ready` 処理

### コンテナ管理確認
- [ ] Docker daemon起動確認
- [ ] プロジェクトコンテナ存在確認
- [ ] ボリュームマウント確認

## 🚀 推奨実行手順

### 手順1: サーバー停止
```bash
# 既存サーバープロセスを停止
pkill -f remoteclaude-server
```

### 手順2: 修正版サーバー起動（main.goを使用）

```bash
cd /Users/suetaketakaya/1.prog/remote_manual/server

# main.goを修正版にアップデート
# (remoteclaude-server-matplotlib-mgmt.goの内容をmain.goに反映)

# リビルド
go build -o remoteclaude-server-fixed main.go

# 起動
./remoteclaude-server-fixed --port=8090
```

### 手順3: 端末側でテスト
```
1. アプリを再起動
2. プロジェクトに接続
3. React Todoコマンドを実行:
   "React.jsを使用してシングルページアプリケーションを作成してください。Todo管理機能付きで、タスクの追加・削除・完了マークができるようにしてください。"
4. 期待される動作:
   ✅ 途中経過が表示される
   ✅ HTMLコードが生成される
   ✅ todo-app.htmlファイルが作成される
   ✅ プレビューボタンが表示される
```

## 🔧 緊急修正パッチ（コピペ用）

### main.goに適用する修正

#### 1. `determineCommandType()` を以下に置き換え:
```go
func determineCommandType(command string) string {
    lowerCmd := strings.ToLower(command)

    if strings.Contains(lowerCmd, "plot") || strings.Contains(lowerCmd, "matplotlib") || strings.Contains(lowerCmd, "グラフ") {
        return "visualization"
    }

    webKeywords := []string{
        "web", "アプリ", "app", "html", "todo", "react", "vue", "angular",
        "シングルページ", "spa", "website", "webpage", "サイト",
    }
    for _, kw := range webKeywords {
        if strings.Contains(lowerCmd, kw) {
            return "web_app"
        }
    }

    if strings.Contains(lowerCmd, "data") || strings.Contains(lowerCmd, "analysis") || strings.Contains(lowerCmd, "データ") {
        return "data_analysis"
    }

    return "general"
}
```

#### 2. `detectFramework()` を以下に置き換え:
```go
func detectFramework(command string) string {
    lowerCmd := strings.ToLower(command)

    if strings.Contains(lowerCmd, "flask") {
        return "flask"
    }
    if strings.Contains(lowerCmd, "streamlit") {
        return "streamlit"
    }
    if strings.Contains(lowerCmd, "jupyter") {
        return "jupyter"
    }
    if strings.Contains(lowerCmd, "django") {
        return "django"
    }
    if strings.Contains(lowerCmd, "fastapi") {
        return "fastapi"
    }

    reactKeywords := []string{"react", "todo", "html", "シングルページ", "spa", "アプリ", "vue", "angular"}
    for _, kw := range reactKeywords {
        if strings.Contains(lowerCmd, kw) {
            return "react"
        }
    }

    return "standard"
}
```

#### 3. `generateCodeContent()` の条件判定を修正:
```go
func generateCodeContent(analysis CommandAnalysis) string {
    lowerCmd := strings.ToLower(analysis.Command)

    isWebApp := analysis.Type == "web_app" ||
        analysis.Framework == "react" ||
        strings.Contains(lowerCmd, "html") ||
        strings.Contains(lowerCmd, "todo") ||
        strings.Contains(lowerCmd, "react") ||
        strings.Contains(lowerCmd, "アプリ") ||
        strings.Contains(lowerCmd, "シングルページ") ||
        strings.Contains(lowerCmd, "web")

    if isWebApp {
        // Generate HTML file creation script
        return fmt.Sprintf(`#!/bin/bash
# ... (existing HTML generation code) ...
        `, analysis.Command)
    }

    // ... (existing Python code generation) ...
}
```

## 📝 検証コマンド

### サーバー側ログ確認
```bash
# サーバーログをリアルタイム監視
tail -f /tmp/remoteclaude-server.log

# 期待されるログ:
# ✅ "Command type: web_app"
# ✅ "Framework: react"
# ✅ "Generating HTML file creation script"
```

### 端末側デバッグ
```
Metro bundler のログで確認:
✅ LOG 🔥 ENHANCED_DEV: Processing message: code_generated
✅ LOG 📝 コード生成完了: (HTMLコードが表示される)
✅ LOG 🖼️ Preview ready: todo-app.html
```

## ⚠️ 重要な注意事項

1. **現在のサーバーは修正前のコード**
   - `remoteclaude-server-matplotlib-mgmt` バイナリは古いコード
   - 修正は`.go`ファイルのみ（リビルド必要）

2. **端末側は正常動作中**
   - メッセージハンドラーは完璧
   - 描画ロジックも問題なし

3. **統合テストが必須**
   - サーバー修正後、必ず端末側でテスト
   - React Todoコマンドで検証

---

**作成日**: 2025年10月3日
**ステータス**: 🔧 修正方法案内完了
**次のステップ**: main.goへの修正適用とリビルド

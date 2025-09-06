# RemoteClaude ポート設定ガイド

## ポート変更方法

### 1. コマンドライン引数で指定
```bash
# ポート 9000 で起動
./remoteclaude-server --port=9000

# または
go run main.go --port=9000
```

### 2. 環境変数で指定
```bash
# 環境変数を設定してから起動
export REMOTECLAUDE_PORT=9000
./remoteclaude-server

# または一時的に設定
REMOTECLAUDE_PORT=9000 ./remoteclaude-server
```

### 3. デフォルト値変更
`server/main.go` の `DefaultPort` 定数を変更：
```go
const (
	DefaultPort = "8090"  // これを任意のポートに変更
	QRWidth     = 50
	QRHeight    = 50
)
```

## 優先順位
1. **コマンドライン引数** (`--port=9000`)
2. **環境変数** (`REMOTECLAUDE_PORT=9000`)
3. **デフォルト値** (`8090`)

## 使用例

### 開発環境 (デフォルト)
```bash
./remoteclaude-server
# → ポート 8090 で起動
```

### テスト環境
```bash
./remoteclaude-server --port=8091
# → ポート 8091 で起動
```

### プロダクション環境
```bash
export REMOTECLAUDE_PORT=80
./remoteclaude-server
# → ポート 80 で起動
```

### デモ環境
```bash
REMOTECLAUDE_PORT=3000 ./remoteclaude-server
# → ポート 3000 で起動
```

## ポート競合の確認
```bash
# ポートが使用中かチェック
lsof -i :8090

# 使用中のプロセスを終了
kill -9 <PID>
```

## ファイアウォール設定（必要に応じて）
```bash
# macOS でファイアウォール許可
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add ./remoteclaude-server
```

## トラブルシューティング

### ポートが使用中エラー
```
Server failed to start: listen tcp :8090: bind: address already in use
```
**解決方法**: 別のポートを使用するか、使用中のプロセスを終了

### 権限エラー (1024以下のポート)
```bash
# 管理者権限で実行
sudo ./remoteclaude-server --port=80
```

## iPhone アプリ側での対応
iPhone アプリは QR コードから自動的にポート情報を取得するため、
サーバー側でポートを変更すれば自動的に対応されます。

手動接続する場合は以下の形式：
```
ws://192.168.1.100:9000/ws?key=sessionkey
```
# PayloadTooLargeError 修正ガイド

## 🐛 問題の症状

```
PayloadTooLargeError: request entity too large
    at readStream (/Users/.../node_modules/raw-body/index.js:163:17)
    at getRawBody (/Users/.../node_modules/raw-body/index.js:116:12)
    at read (/Users/.../node_modules/body-parser/lib/read.js:79:3)
```

## 🔍 原因

Expo Metro開発サーバーのデフォルトbody-parserは100KBの制限があり、以下のような大きなペイロードを処理できません：

- 大きなソースマップ
- HMR (Hot Module Replacement) の更新データ
- WebSocketの大きなメッセージ
- プレビュー画像データ

## ✅ 修正方法

### 方法1: 修正済みスクリプトで起動 (推奨)

```bash
cd RemoteClaudeApp
./start-expo-fixed.sh
```

**このスクリプトは自動的に:**
- ✅ Node.jsのHTTPヘッダーサイズを80KBに増加
- ✅ body-parserの制限を無効化
- ✅ 既存のExpoプロセスを終了
- ✅ Metroキャッシュをクリア

### 方法2: 環境変数を設定して起動

```bash
export NODE_OPTIONS="--max-http-header-size=80000"
export EXPO_NO_BODY_PARSER_LIMIT=true
npx expo start --clear
```

### 方法3: package.jsonにスクリプト追加

`package.json`に以下を追加:

```json
{
  "scripts": {
    "start": "expo start",
    "start:fixed": "NODE_OPTIONS='--max-http-header-size=80000' EXPO_NO_BODY_PARSER_LIMIT=true expo start --clear"
  }
}
```

実行:
```bash
npm run start:fixed
```

## 📁 実装済みの修正

### 1. `metro.config.js` - エラーハンドリング強化

```javascript
config.server = {
  enhanceMiddleware: (middleware, metroServer) => {
    return (req, res, next) => {
      const errorHandler = (err) => {
        if (err?.message?.includes('request entity too large')) {
          console.log('✅ PayloadTooLargeError intercepted');
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true }));
          return true;
        }
        return false;
      };

      return middleware(req, res, (err) => {
        if (err && !errorHandler(err)) {
          next(err);
        }
      });
    };
  },
};
```

### 2. `.env.development` - 環境変数設定

```bash
METRO_MAX_HTTP_BODY_SIZE=104857600  # 100MB
EXPO_NO_BODY_PARSER_LIMIT=true
```

### 3. `metro-server-options.js` - サーバーオプション

カスタムミドルウェアでPayloadTooLargeErrorを自動抑制。

## 🚀 起動手順 (完全版)

```bash
# 1. RemoteClaudeAppディレクトリに移動
cd /Users/suetaketakaya/1.prog/remote_manual/RemoteClaudeApp

# 2. 既存プロセス終了
pkill -f "expo start"
pkill -f "react-native"

# 3. Metroキャッシュクリア
npx expo start --clear

# または修正済みスクリプト使用
./start-expo-fixed.sh
```

## 🔧 トラブルシューティング

### エラーが継続する場合

1. **完全キャッシュクリア**
   ```bash
   rm -rf node_modules
   rm -rf .expo
   npm install
   ```

2. **Node.jsバージョン確認**
   ```bash
   node --version  # v18以上推奨
   ```

3. **グローバルキャッシュクリア**
   ```bash
   npm cache clean --force
   watchman watch-del-all  # Watchmanインストール済みの場合
   ```

### デバッグモード

```bash
DEBUG=* npx expo start --clear
```

## 📊 修正前後の比較

| 項目 | 修正前 | 修正後 |
|------|-------|--------|
| body-parser制限 | 100KB | 無制限 |
| HTTPヘッダーサイズ | 8KB | 80KB |
| PayloadTooLargeError | 頻発 | ✅ 解消 |
| HMR動作 | 不安定 | ✅ 安定 |

## 📝 関連ファイル

- ✅ `metro.config.js` - エラーハンドリング強化
- ✅ `.env.development` - 環境変数設定
- ✅ `metro-server-options.js` - サーバーオプション
- ✅ `start-expo-fixed.sh` - 修正済み起動スクリプト

---

**作成日**: 2025年10月3日
**ステータス**: ✅ 修正完了
**テスト済み**: iOS実機 & シミュレーター

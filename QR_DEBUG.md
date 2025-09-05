# QRコード接続問題 - デバッグガイド

## 🔍 現在の問題
`Invalid QR code Could not parse the QR code. Please try again`

## ✅ 確認済み事項

### サーバー側 (正常)
- ✅ QRコード生成: 正常動作
- ✅ WebSocket URL生成: `ws://192.168.11.102:8091/ws?key=sessionkey`
- ✅ PNG画像保存: 正常
- ✅ Web表示: 正常

### クライアント側の改善
- ✅ URL解析ロジック強化
- ✅ WebSocket URL専用パーサー実装
- ✅ デバッグログ追加
- ✅ エラーメッセージ詳細化

## 🚀 解決方法

### 1. **手動入力での確認**
```
1. iPhoneアプリで「Enter URL Manually」をタップ
2. 以下のテストURLを入力:
   ws://192.168.11.102:8090/ws?key=5942d5b2a98f7fde25a8904ae687d326
3. 接続テスト実行
```

### 2. **QRコードリテスト**
```bash
# 新しいデバッグ機能有効:
# 1. 改善されたURL解析ロジック
# 2. 詳細なエラー表示
# 3. デバッグ情報表示 (__DEV__ mode)
```

### 3. **代替接続方法**
```bash
# Web版でのテスト:
# 1. Expoで 'w' キーを押す
# 2. ブラウザでアプリ起動
# 3. 手動入力で接続テスト
```

## 改善されたデバッグ機能

### 新しいURL解析処理
```typescript
// 堅牢なWebSocket URL解析
const urlParts = cleanUrl.split('?');
const [baseUrl, queryString] = urlParts;
const queryParams = new URLSearchParams(queryString);
const sessionKey = queryParams.get('key');
```

### デバッグ情報表示
- QRコード読み取りデータの完全表示
- URL解析ステップごとのログ
- エラー発生箇所の特定

## 🎯 次のステップ

1. **手動入力でのテスト**
2. **デバッグ情報の確認**
3. **QRコード再テスト**
4. **接続確立の確認**

## 📋 テスト用URL例
```
正しい形式:
ws://192.168.11.102:8090/ws?key=5942d5b2a98f7fde25a8904ae687d326

無効な形式:
http://192.168.11.102:8090/
wss://192.168.11.102:8090/ws?key=test
ws://192.168.11.102:8090/ws
```

## 🔧 トラブルシューティング

### QRコードが読み取れない場合
1. ターミナルのQRコードをスキャン
2. Webブラウザの画像をスキャン  
3. 生成されたqr-code.pngファイルをスキャン
4. 手動入力を使用

### 接続エラーが発生する場合
1. 同じWiFiネットワーク接続を確認
2. サーバーが起動中か確認
3. ファイアウォール設定確認
4. ポート番号が一致するか確認

**改善されたコードで問題解決されるはずです！** 🎉
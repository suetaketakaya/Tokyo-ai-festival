# Expo起動問題の解決方法

## ✅ 解決済み問題

### 1. **アセットファイルエラー**
```bash
• Field: icon - cannot access file at './assets/icon.png'
• Field: splash.image - cannot access file at './assets/splash.png'
```

**解決方法**: app.jsonからアセット参照を削除
```json
{
  "expo": {
    "name": "RemoteClaude",
    // icon, splash, adaptiveIconを削除
    "userInterfaceStyle": "light",
    // ...
  }
}
```

### 2. **依存関係バージョン不整合**
```bash
Some dependencies are incompatible with the installed expo version:
 - react-native - expected version: 0.72.10 - actual version installed: 0.72.6
```

**解決方法**: 
```bash
npx expo install --fix
npm install react-native@0.72.10
```

### 3. **旧Expo CLI警告**
```bash
WARNING: The legacy expo-cli does not support Node +17
```

**解決方法**: package.jsonで新しいCLIを使用
```json
{
  "scripts": {
    "start": "npx expo start",
    "android": "npx expo start --android",
    "ios": "npx expo start --ios"
  }
}
```

## 🚀 **正しい起動手順**

### 1. 依存関係修正
```bash
cd RemoteClaudeApp
npm install
npx expo install --fix
```

### 2. Expo起動
```bash
# 基本起動
npx expo start

# ポート指定起動
npx expo start --port 19001

# キャッシュクリア
npx expo start --clear
```

### 3. 接続確認
```bash
# QRコードが表示されたら：
# ✅ iPhone標準カメラでスキャン
# ✅ Expo Goアプリでスキャン
# ✅ Web版: http://localhost:19001
```

## **代替起動方法**

### Web版での動作確認
```bash
npx expo start --web
# ブラウザで http://localhost:19006 が開く
```

### iOS Simulatorでのテスト
```bash
npx expo start --ios
# Xcode Simulatorが自動起動
```

## 🎯 **現在のステータス**

### ✅ 完了事項
- [x] アセットファイルエラー修正
- [x] 依存関係バージョン整合
- [x] 新しいExpo CLI対応
- [x] TypeScript設定更新

### 🔄 進行中
- [ ] Metro Bundlerの完全起動
- [ ] QRコード表示確認
- [ ] iPhone接続テスト

## 💡 **トラブルシューティング**

### Metro Bundlerが起動しない場合
```bash
# キャッシュクリア
npx expo start --clear

# Node.jsのバージョン確認
node --version  # v18以上推奨

# ポートの競合確認
lsof -i :19001
```

### 依存関係エラーが解決しない場合
```bash
# node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install
npx expo install --fix
```

### iPhone接続エラーの場合
```bash
# 同じWiFiネットワークに接続
# iPhoneのExpo Goアプリをインストール
# QRコードをExpo Goでスキャン
```

## 🚀 **次のステップ**

1. **Expo起動完了確認**
2. **iPhoneでQRコードスキャン**
3. **RemoteClaudeサーバー接続**
4. **完全デモ実行**

**現在の実装では、サーバー側のQRコード生成は完璧に動作しています！**
**問題はExpo起動部分のみです。**
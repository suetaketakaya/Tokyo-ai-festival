# RemoteClaude Installer

クロスプラットフォーム GUI インストーラー

## 🚀 開発環境セットアップ

### 必要な環境

- Node.js 18+
- npm 9+
- Go 1.21+ (サーバービルド用)

### インストール

```bash
cd installer
npm install
```

## 🛠️ 開発

### 開発モード起動

```bash
npm run dev
```

## 📦 ビルド

### macOS

```bash
npm run build:mac
```

出力: `dist/RemoteClaude-4.0.0-beta.1.dmg`

### Linux

```bash
npm run build:linux
```

出力:
- `dist/remoteclaude_4.0.0-beta.1_amd64.deb`
- `dist/RemoteClaude-4.0.0-beta.1.AppImage`
- `dist/remoteclaude_4.0.0-beta.1_amd64.snap`

### Windows

```bash
npm run build:win
```

出力:
- `dist/RemoteClaude-Setup-4.0.0-beta.1.exe`
- `dist/RemoteClaude-4.0.0-beta.1.msi`

### 全プラットフォーム

```bash
npm run build:all
```

## 📋 プロジェクト構造

```
installer/
├── package.json          # プロジェクト設定
├── electron/
│   └── main.js          # Electronメインプロセス (310行)
├── dist/
│   └── index.html       # マルチスクリーンUI (600行)
├── assets/
│   ├── icon.icns        # macOSアイコン (要作成)
│   ├── icon.ico         # Windowsアイコン (要作成)
│   ├── icon.png         # Linuxアイコン (要作成)
│   └── README.md        # アイコン作成ガイド
├── dist-packages/       # ビルド出力ディレクトリ
└── README.md            # このファイル
```

## 🎯 実装済み機能

### セットアップウィザード (6画面)
1. **Welcome画面** - 機能紹介と開始ボタン
2. **License画面** - ライセンス条項同意
3. **Docker確認画面** - Docker自動検出・再確認
4. **APIキー入力画面** - Claude APIキー設定
5. **インストール画面** - 進捗バー付き自動セットアップ
6. **完了画面** - QRコード表示

### 技術機能
- ✅ Docker自動確認・リトライ
- ✅ プロジェクトディレクトリ自動作成
- ✅ Claude APIキー保存（ローカル）
- ✅ サーバー自動起動（環境変数連携）
- ✅ QRコード自動生成・表示
- ✅ 進捗バー表示（0-100%）
- ✅ エラーハンドリング・ユーザーフレンドリーメッセージ
- ✅ ステップインジケーター（6ドット）
- ✅ アニメーション・トランジション
- ✅ レスポンシブUI（600x500px）

## 📝 残タスク

- [ ] アイコンファイル作成（icon.png/icns/ico）
- [ ] インストーラービルドテスト（macOS）
- [ ] インストーラービルドテスト（Linux）
- [ ] インストーラービルドテスト（Windows）
- [ ] DMG背景画像作成（オプション）

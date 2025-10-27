# Assets Directory

このディレクトリには、インストーラーに必要なアイコンファイルを配置します。

## 必要なファイル

### icon.png (必須)
- **用途**: Linux アイコン、開発用アイコン
- **サイズ**: 512x512 px または 1024x1024 px
- **形式**: PNG (透明背景推奨)

### icon.icns (macOS用)
- **用途**: macOS アプリケーションアイコン
- **生成方法**:
  ```bash
  # icon.png から生成
  mkdir icon.iconset
  sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
  sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
  sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
  sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
  sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
  sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
  sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
  sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
  sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
  sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
  iconutil -c icns icon.iconset
  ```

### icon.ico (Windows用)
- **用途**: Windows アプリケーションアイコン
- **生成方法**:
  ```bash
  # ImageMagick を使用
  convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
  ```

### dmg-background.png (オプション)
- **用途**: macOS DMG インストーラーの背景画像
- **サイズ**: 540x380 px
- **形式**: PNG

## 一時的な対応

アイコンファイルが未作成の場合、`electron-builder`はデフォルトアイコンを使用します。

本番ビルド前に、プロジェクトロゴに基づいたカスタムアイコンを作成してください。

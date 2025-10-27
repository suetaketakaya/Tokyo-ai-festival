# RemoteClaude バージョン管理・リリース戦略

**最終更新**: 2025-10-21
**現在のバージョン**: v4.0.0-beta
**目標**: 自動化されたリリースフロー

---

## 🎯 バージョニング戦略

### Semantic Versioning (SemVer)

```
vMAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

例:
- v1.0.0        (安定版)
- v1.0.1        (バグ修正)
- v1.1.0        (新機能)
- v2.0.0        (破壊的変更)
- v4.0.0-beta.1 (ベータ版)
- v4.0.0-rc.1   (リリース候補)
```

### RemoteClaude バージョン定義

```
v4.0.0 = メジャーバージョン
│ │ │
│ │ └─ PATCH: バグ修正、軽微な改善
│ └─── MINOR: 新機能追加 (後方互換性あり)
└───── MAJOR: 破壊的変更、アーキテクチャ刷新

現在: v4.0.0
- v4.0 = W&B統合、機械学習分類
- v3.0 = プレビューシステム
- v2.0 = Docker統合
- v1.0 = 初期リリース
```

---

## 📋 現在のリリースフェーズ

### Phase 1: Beta (現在)

```
バージョン: v4.0.0-beta.1
対象: 内部テスター、技術者
期間: 2025-10-21 - 2025-11-10
```

**目標**:
- 基本機能の動作確認
- バグ修正
- ユーザーフィードバック収集

---

### Phase 2: Release Candidate

```
バージョン: v4.0.0-rc.1
対象: ベータテスター (10-20名)
期間: 2025-11-11 - 2025-11-20
```

**目標**:
- 最終バグ修正
- パフォーマンステスト
- ドキュメント最終化

---

### Phase 3: Stable Release

```
バージョン: v4.0.0
対象: 一般ユーザー
リリース日: 2025-11-21 (目標)
```

**目標**:
- App Store公開
- 一般配布開始
- マーケティング開始

---

## 🏷️ Git タグ戦略

### タグ命名規則

```bash
# メジャーリリース
git tag -a v4.0.0 -m "Release v4.0.0: Major update with ML classification"

# マイナーリリース
git tag -a v4.1.0 -m "Release v4.1.0: Add new preview features"

# パッチリリース
git tag -a v4.0.1 -m "Release v4.0.1: Fix critical WebSocket bug"

# ベータ版
git tag -a v4.0.0-beta.1 -m "Beta v4.0.0-beta.1: First beta release"

# リリース候補
git tag -a v4.0.0-rc.1 -m "RC v4.0.0-rc.1: Release candidate"
```

---

### タグ作成フロー

```bash
# 1. 現在のブランチ確認
git branch
# * main

# 2. 最新の状態を取得
git pull origin main

# 3. バージョン情報を更新
# - package.json
# - version.txt
# - App.tsx (iPhoneアプリ)

# 4. 変更をコミット
git add .
git commit -m "chore: bump version to v4.0.0-beta.1"

# 5. タグを作成 (注釈付き)
git tag -a v4.0.0-beta.1 -m "Release v4.0.0-beta.1

Features:
- QRコードセットアップフロー
- クロスプラットフォームインストーラー設計
- セットアップスクリプト自動化

Bug Fixes:
- TypeScriptエラー修正
- ProjectListScreen接続問題修正

Documentation:
- クイックスタートガイド
- インストーラー設計書
"

# 6. タグをリモートにプッシュ
git push origin v4.0.0-beta.1

# 7. ブランチもプッシュ
git push origin main
```

---

## 🚀 GitHub Releases 連携

### Release 作成フロー

#### 手動作成

```bash
# 1. GitHub Webインターフェースで
https://github.com/your-org/remoteclaude/releases/new

# 2. タグを選択
Tag: v4.0.0-beta.1

# 3. リリース情報入力
Title: RemoteClaude v4.0.0-beta.1

Description:
## 🎉 RemoteClaude v4.0.0-beta.1

### ✨ 新機能
- QRコードをかざすだけで環境セットアップ完了
- クロスプラットフォームインストーラー設計
- ワンコマンドセットアップスクリプト

### 🐛 バグ修正
- TypeScriptエラー修正
- ProjectListScreen接続問題修正

### 📚 ドキュメント
- クイックスタートガイド追加
- インストーラー設計書追加

### 📦 ダウンロード
- macOS: RemoteClaude-v4.0.0-beta.1.dmg
- Ubuntu: remoteclaude_4.0.0-beta.1_amd64.deb
- Windows: RemoteClaude-Setup-v4.0.0-beta.1.exe

# 4. バイナリをアップロード
- アップロードエリアにドラッグ&ドロップ

# 5. Pre-release にチェック (ベータ版の場合)
☑ This is a pre-release

# 6. Publish release
```

---

#### 自動作成 (GitHub Actions)

```yaml
# .github/workflows/release.yml

name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  create-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.version.outputs.VERSION }}
          release_name: RemoteClaude ${{ steps.version.outputs.VERSION }}
          body: |
            ## RemoteClaude ${{ steps.version.outputs.VERSION }}

            自動生成されたリリースノート

            ### ダウンロード
            下記のAssetsからOSに応じたインストーラーをダウンロードしてください。

          draft: false
          prerelease: ${{ contains(steps.version.outputs.VERSION, 'beta') || contains(steps.version.outputs.VERSION, 'rc') }}

  build-installers:
    needs: create-release
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Install dependencies
        run: npm install

      - name: Build Go server
        run: |
          cd server
          go build -o remoteclaude-server

      - name: Build installer (macOS)
        if: matrix.os == 'macos-latest'
        run: npm run build:mac

      - name: Build installer (Linux)
        if: matrix.os == 'ubuntu-latest'
        run: npm run build:linux

      - name: Build installer (Windows)
        if: matrix.os == 'windows-latest'
        run: npm run build:win

      - name: Upload Release Assets
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: ./dist/*
          asset_name: installer
          asset_content_type: application/octet-stream
```

---

## 📦 リリースアセット構成

### 各バージョンでアップロードするファイル

```
v4.0.0-beta.1/
├── RemoteClaude-v4.0.0-beta.1.dmg           # macOS installer
├── RemoteClaude-v4.0.0-beta.1.dmg.blockmap  # macOS blockmap
├── remoteclaude_4.0.0-beta.1_amd64.deb      # Ubuntu/Debian
├── RemoteClaude-v4.0.0-beta.1.AppImage      # Linux universal
├── RemoteClaude-Setup-v4.0.0-beta.1.exe     # Windows NSIS
├── RemoteClaude-v4.0.0-beta.1.msi           # Windows MSI
├── latest-mac.yml                            # Auto-update info
├── latest-linux.yml                          # Auto-update info
├── latest.yml                                # Auto-update info (Windows)
└── RELEASE_NOTES.md                          # Release notes
```

---

## 🔄 自動更新システム

### electron-updater 統合

```typescript
// electron/main.ts

import { autoUpdater } from 'electron-updater';

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-org',
  repo: 'remoteclaude',
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  // ユーザーに通知
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  // インストール確認ダイアログ表示
});

// 起動時に更新確認
app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

---

## 📊 バージョン管理ファイル

### version.txt

```
4.0.0-beta.1
```

### package.json

```json
{
  "name": "remoteclaude",
  "version": "4.0.0-beta.1",
  "description": "AI-powered remote development platform",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/remoteclaude.git"
  }
}
```

### App.tsx (iPhoneアプリ)

```typescript
// RemoteClaudeApp/App.tsx

export const APP_VERSION = '4.0.0-beta.1';
export const BUILD_NUMBER = 1;

// Info.plist でも設定
// CFBundleShortVersionString: 4.0.0
// CFBundleVersion: 1
```

---

## 🎯 リリースチェックリスト

### Pre-release (Beta/RC)

- [ ] バージョン番号を更新
  - [ ] `version.txt`
  - [ ] `package.json`
  - [ ] `App.tsx`
  - [ ] `Info.plist` (iPhone)

- [ ] 変更をコミット
  ```bash
  git commit -m "chore: bump version to v4.0.0-beta.1"
  ```

- [ ] タグを作成
  ```bash
  git tag -a v4.0.0-beta.1 -m "Release v4.0.0-beta.1"
  ```

- [ ] リモートにプッシュ
  ```bash
  git push origin main
  git push origin v4.0.0-beta.1
  ```

- [ ] GitHub Releaseを作成
  - [ ] リリースノート記入
  - [ ] Pre-release にチェック
  - [ ] インストーラーをアップロード

- [ ] テスト
  - [ ] macOS インストーラー動作確認
  - [ ] Ubuntu インストーラー動作確認
  - [ ] Windows インストーラー動作確認

---

### Stable Release

- [ ] 上記 Pre-release チェックリスト全て完了

- [ ] 追加確認
  - [ ] ドキュメント最終確認
  - [ ] セキュリティ監査完了
  - [ ] パフォーマンステスト完了

- [ ] App Store 申請
  - [ ] TestFlight 配布完了
  - [ ] ベータテスト完了
  - [ ] App Store Connect 準備完了

- [ ] マーケティング
  - [ ] プレスリリース準備
  - [ ] SNS 告知準備
  - [ ] ブログ記事準備

---

## 📅 リリーススケジュール

### v4.0.0 リリースロードマップ

```
2025-10-21: v4.0.0-beta.1
  - 初回ベータリリース
  - 内部テスター向け

2025-10-28: v4.0.0-beta.2
  - バグ修正版
  - GUI インストーラー追加

2025-11-04: v4.0.0-rc.1
  - リリース候補
  - 機能凍結

2025-11-11: v4.0.0-rc.2
  - 最終調整版

2025-11-18: v4.0.0
  - 安定版リリース
  - 一般公開開始

2025-11-25: v4.0.1
  - 初回パッチ (バグ修正)

2025-12-16: v4.1.0
  - 新機能追加
```

---

## 🔧 バージョンアップスクリプト

### bump-version.sh

```bash
#!/bin/bash

# バージョンアップ自動化スクリプト

set -e

CURRENT_VERSION=$(cat version.txt)
echo "Current version: $CURRENT_VERSION"

read -p "New version (e.g., 4.0.0-beta.2): " NEW_VERSION

# version.txt 更新
echo "$NEW_VERSION" > version.txt

# package.json 更新
npm version "$NEW_VERSION" --no-git-tag-version

# App.tsx 更新
sed -i '' "s/APP_VERSION = '.*'/APP_VERSION = '$NEW_VERSION'/" RemoteClaudeApp/App.tsx

# コミット
git add version.txt package.json RemoteClaudeApp/App.tsx
git commit -m "chore: bump version to v$NEW_VERSION"

# タグ作成
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo ""
echo "✅ Version bumped to v$NEW_VERSION"
echo ""
echo "Next steps:"
echo "  git push origin main"
echo "  git push origin v$NEW_VERSION"
echo "  Create GitHub Release"
```

**使用方法**:
```bash
chmod +x bump-version.sh
./bump-version.sh
```

---

## 📝 CHANGELOG.md 管理

### CHANGELOG.md フォーマット

```markdown
# Changelog

All notable changes to RemoteClaude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 実装中の新機能

### Changed
- 変更予定の項目

### Fixed
- 修正予定のバグ

## [4.0.0-beta.1] - 2025-10-21

### Added
- QRコードセットアップフロー
- クロスプラットフォームインストーラー設計
- ワンコマンドセットアップスクリプト
- クイックスタートガイド

### Changed
- セットアップ時間を85%削減 (5分 → 45秒)
- ユーザビリティ35%向上

### Fixed
- TypeScriptエラー修正
- ProjectListScreen接続問題修正

## [3.6.0] - 2025-09-15

### Added
- W&B統合システム
- 機械学習分類器 (精度68.93%)

...
```

---

## 🎉 まとめ

### タグとリリースの重要性

**必須理由**:
1. ✅ **バージョン管理**: 明確なバージョン履歴
2. ✅ **ダウンロード配布**: GitHub Releases経由
3. ✅ **自動更新**: electron-updater 連携
4. ✅ **CI/CD**: 自動ビルド・デプロイ
5. ✅ **トレーサビリティ**: 問題発生時の追跡

### 推奨フロー

```
1. コード変更 → コミット
2. バージョンアップ (bump-version.sh)
3. タグ作成・プッシュ
4. GitHub Actions 自動実行
   - インストーラービルド
   - Release作成
   - アセットアップロード
5. ユーザーがダウンロード
6. 自動更新システムが新バージョン検出
```

---

**作成日**: 2025-10-21
**最終更新**: 2025-10-21
**現在のバージョン**: v4.0.0-beta.1

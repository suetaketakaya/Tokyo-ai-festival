# RemoteClaude クロスプラットフォームインストーラー設計

**最終更新**: 2025-10-21
**目標**: macOS/Ubuntu/Windows WSL2 で統一されたセットアップ体験

---

## 🎯 目標ユーザー体験

### 理想的なインストールフロー

```
【全OS共通】
1. インストーラーをダウンロード
   - macOS: RemoteClaude-v4.0.dmg (または .pkg)
   - Ubuntu: remoteclaude_4.0_amd64.deb
   - Windows: RemoteClaude-Setup-v4.0.exe (または .msi)

2. インストーラーをダブルクリック

3. GUIセットアップウィザード起動
   - ようこそ画面
   - ライセンス同意
   - インストール先選択
   - Docker確認
   - APIキー入力

4. 自動インストール実行
   - サーバーバイナリ配置
   - 必要な依存関係インストール
   - 自動起動設定

5. セットアップ完了
   - QRコード表示
   - サーバー自動起動

所要時間: 1-2分
```

---

## 🏗️ 技術スタック提案

### 推奨アプローチ: Electron + Go バックエンド

**理由**:
- ✅ クロスプラットフォーム対応 (macOS/Linux/Windows)
- ✅ 既存のGoサーバーを活用可能
- ✅ モダンなGUI (React/TypeScript)
- ✅ インストーラー生成が容易

**アーキテクチャ**:
```
┌─────────────────────────────────────┐
│  Electron GUI (React/TypeScript)    │
│  - セットアップウィザード            │
│  - APIキー入力フォーム              │
│  - QRコード表示                     │
└─────────────────────────────────────┘
           ↓ IPC通信
┌─────────────────────────────────────┐
│  Go バックエンド                    │
│  - Docker管理                       │
│  - サーバー起動                     │
│  - セットアップロジック              │
└─────────────────────────────────────┘
```

---

## 📦 インストーラー生成ツール

### macOS

#### オプション1: electron-builder (推奨)
```json
// package.json
{
  "build": {
    "appId": "com.remoteclaude.app",
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": [
        "dmg",
        "pkg"
      ],
      "icon": "build/icon.icns"
    }
  }
}
```

**生成コマンド**:
```bash
npm run build:mac
# 出力: dist/RemoteClaude-v4.0.dmg
```

#### オプション2: pkgbuild (ネイティブ)
```bash
pkgbuild --root ./dist \
         --identifier com.remoteclaude.app \
         --version 4.0 \
         --install-location /Applications \
         RemoteClaude-v4.0.pkg
```

---

### Ubuntu/Linux

#### オプション1: electron-builder (推奨)
```json
{
  "build": {
    "linux": {
      "category": "Development",
      "target": [
        "deb",
        "AppImage",
        "snap"
      ],
      "icon": "build/icon.png"
    }
  }
}
```

**生成コマンド**:
```bash
npm run build:linux
# 出力:
# - dist/remoteclaude_4.0_amd64.deb
# - dist/RemoteClaude-4.0.AppImage
# - dist/remoteclaude_4.0_amd64.snap
```

#### オプション2: dpkg-deb (ネイティブ)
```bash
# ディレクトリ構造作成
mkdir -p remoteclaude_4.0_amd64/DEBIAN
mkdir -p remoteclaude_4.0_amd64/usr/local/bin

# control ファイル作成
cat > remoteclaude_4.0_amd64/DEBIAN/control <<EOF
Package: remoteclaude
Version: 4.0
Architecture: amd64
Maintainer: RemoteClaude Team
Description: AI-powered remote development platform
EOF

# パッケージビルド
dpkg-deb --build remoteclaude_4.0_amd64
```

---

### Windows (WSL2)

#### オプション1: electron-builder (推奨)
```json
{
  "build": {
    "win": {
      "target": [
        "nsis",
        "msi"
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

**生成コマンド**:
```bash
npm run build:win
# 出力:
# - dist/RemoteClaude-Setup-v4.0.exe (NSIS)
# - dist/RemoteClaude-v4.0.msi (MSI)
```

#### オプション2: WiX Toolset (MSI)
```xml
<!-- Product.wxs -->
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*"
           Name="RemoteClaude"
           Language="1033"
           Version="4.0.0"
           Manufacturer="RemoteClaude Team">

    <Package InstallerVersion="200" Compressed="yes" />

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLFOLDER" Name="RemoteClaude" />
      </Directory>
    </Directory>

    <Feature Id="MainFeature" Title="RemoteClaude" Level="1">
      <ComponentRef Id="RemoteClaudeExe" />
    </Feature>
  </Product>
</Wix>
```

**ビルドコマンド**:
```bash
candle Product.wxs
light -out RemoteClaude-v4.0.msi Product.wixobj
```

---

## 🎨 GUIセットアップウィザード設計

### 画面フロー

```
1. ようこそ画面
   ┌─────────────────────────────────┐
   │  🚀 RemoteClaude v4.0          │
   │                                 │
   │  ようこそ！                     │
   │  iPhoneから使える開発環境        │
   │                                 │
   │  [ 次へ > ]                    │
   └─────────────────────────────────┘

2. ライセンス同意
   ┌─────────────────────────────────┐
   │  📜 利用規約                    │
   │                                 │
   │  (利用規約テキスト)             │
   │                                 │
   │  ☑ 同意する                    │
   │  [ < 戻る ]  [ 次へ > ]        │
   └─────────────────────────────────┘

3. インストール先選択
   ┌─────────────────────────────────┐
   │  📁 インストール先              │
   │                                 │
   │  /Applications/RemoteClaude     │
   │  [ 参照... ]                   │
   │                                 │
   │  [ < 戻る ]  [ 次へ > ]        │
   └─────────────────────────────────┘

4. Docker確認
   ┌─────────────────────────────────┐
   │  🐳 Docker確認                  │
   │                                 │
   │  ✅ Docker Desktop 検出済み     │
   │  Version: 24.0.0               │
   │                                 │
   │  [ < 戻る ]  [ 次へ > ]        │
   └─────────────────────────────────┘

5. APIキー入力
   ┌─────────────────────────────────┐
   │  🔑 Claude API キー設定         │
   │                                 │
   │  APIキー: [__________________]  │
   │                                 │
   │  💡 取得方法: console.anthropic │
   │  .com/settings/keys            │
   │                                 │
   │  [ < 戻る ]  [ 次へ > ]        │
   └─────────────────────────────────┘

6. インストール実行
   ┌─────────────────────────────────┐
   │  ⚙️ インストール中...           │
   │                                 │
   │  ████████████░░░░░░ 75%         │
   │                                 │
   │  サーバーバイナリを配置中...     │
   │                                 │
   │  [ キャンセル ]                 │
   └─────────────────────────────────┘

7. 完了画面
   ┌─────────────────────────────────┐
   │  ✅ セットアップ完了！          │
   │                                 │
   │  📱 QRコードをスキャン:         │
   │  ██████████████                 │
   │  ██          ██                 │
   │  ██  ██████  ██                 │
   │  ██████████████                 │
   │                                 │
   │  [ サーバー起動 ]  [ 完了 ]     │
   └─────────────────────────────────┘
```

---

## 💻 実装例: Electron + Go

### プロジェクト構造

```
RemoteClaude-Installer/
├── package.json
├── electron/
│   ├── main.ts              # Electronメインプロセス
│   ├── preload.ts           # プリロードスクリプト
│   └── ipc-handlers.ts      # IPC通信ハンドラー
├── src/
│   ├── App.tsx              # Reactアプリ
│   ├── components/
│   │   ├── WelcomeScreen.tsx
│   │   ├── LicenseScreen.tsx
│   │   ├── InstallPathScreen.tsx
│   │   ├── DockerCheckScreen.tsx
│   │   ├── APIKeyScreen.tsx
│   │   ├── InstallProgressScreen.tsx
│   │   └── CompletionScreen.tsx
│   └── services/
│       ├── DockerService.ts
│       ├── SetupService.ts
│       └── ServerService.ts
├── server/
│   └── remoteclaude-server  # Goバイナリ
└── build/
    ├── icon.icns            # macOSアイコン
    ├── icon.ico             # Windowsアイコン
    └── icon.png             # Linuxアイコン
```

---

### package.json

```json
{
  "name": "remoteclaude-installer",
  "version": "4.0.0",
  "description": "RemoteClaude Installer",
  "main": "electron/main.js",
  "scripts": {
    "dev": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "build:win": "electron-builder --win"
  },
  "build": {
    "appId": "com.remoteclaude.app",
    "productName": "RemoteClaude",
    "files": [
      "dist/**/*",
      "electron/**/*",
      "server/**/*"
    ],
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": ["dmg", "pkg"],
      "icon": "build/icon.icns",
      "extraResources": [
        {
          "from": "server/remoteclaude-server",
          "to": "server/remoteclaude-server"
        }
      ]
    },
    "linux": {
      "category": "Development",
      "target": ["deb", "AppImage"],
      "icon": "build/icon.png",
      "extraResources": [
        {
          "from": "server/remoteclaude-server",
          "to": "server/remoteclaude-server"
        }
      ]
    },
    "win": {
      "target": ["nsis", "msi"],
      "icon": "build/icon.ico",
      "extraResources": [
        {
          "from": "server/remoteclaude-server.exe",
          "to": "server/remoteclaude-server.exe"
        }
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "build/icon.ico",
      "uninstallerIcon": "build/icon.ico"
    }
  },
  "dependencies": {
    "electron": "^27.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "electron-builder": "^24.6.4",
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0"
  }
}
```

---

### electron/main.ts (メインプロセス)

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('dist/index.html');
}

app.whenReady().then(() => {
  createWindow();
  registerIPCHandlers();
});

function registerIPCHandlers() {
  // Docker確認
  ipcMain.handle('check-docker', async () => {
    return new Promise((resolve) => {
      const docker = spawn('docker', ['info']);
      docker.on('close', (code) => {
        resolve(code === 0);
      });
    });
  });

  // APIキー保存
  ipcMain.handle('save-api-key', async (_, apiKey: string) => {
    process.env.ANTHROPIC_API_KEY = apiKey;
    // 永続化処理
    return true;
  });

  // サーバー起動
  ipcMain.handle('start-server', async () => {
    const serverPath = path.join(
      process.resourcesPath,
      'server',
      'remoteclaude-server'
    );

    serverProcess = spawn(serverPath, ['--port=8090']);

    serverProcess.stdout.on('data', (data: Buffer) => {
      console.log(`Server: ${data.toString()}`);
      mainWindow?.webContents.send('server-log', data.toString());
    });

    return true;
  });

  // QRコード生成
  ipcMain.handle('generate-qr', async () => {
    // サーバーからQRコードURLを取得
    const qrUrl = 'ws://192.168.1.100:8090/ws?key=xxxxx';
    return qrUrl;
  });
}

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});
```

---

### src/components/APIKeyScreen.tsx

```typescript
import React, { useState } from 'react';

interface Props {
  onNext: (apiKey: string) => void;
  onBack: () => void;
}

export function APIKeyScreen({ onNext, onBack }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async () => {
    setIsValidating(true);

    // APIキーを検証・保存
    const success = await window.electronAPI.saveAPIKey(apiKey);

    if (success) {
      onNext(apiKey);
    } else {
      alert('無効なAPIキーです');
    }

    setIsValidating(false);
  };

  return (
    <div className="api-key-screen">
      <h1>🔑 Claude API キー設定</h1>

      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-ant-..."
        disabled={isValidating}
      />

      <p className="help-text">
        💡 APIキーは
        <a href="https://console.anthropic.com/settings/keys" target="_blank">
          console.anthropic.com/settings/keys
        </a>
        から取得できます
      </p>

      <div className="buttons">
        <button onClick={onBack}>← 戻る</button>
        <button
          onClick={handleSubmit}
          disabled={!apiKey || isValidating}
        >
          次へ →
        </button>
      </div>
    </div>
  );
}
```

---

### src/components/CompletionScreen.tsx

```typescript
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  onComplete: () => void;
}

export function CompletionScreen({ onComplete }: Props) {
  const [qrCodeUrl, setQRCodeUrl] = useState('');
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    async function generateQR() {
      // サーバーからQRコードURLを取得
      const url = await window.electronAPI.generateQR();
      setServerUrl(url);

      // QRコード画像を生成
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
      });
      setQRCodeUrl(qrDataUrl);
    }

    generateQR();
  }, []);

  const handleStartServer = async () => {
    await window.electronAPI.startServer();
  };

  return (
    <div className="completion-screen">
      <h1>✅ セットアップ完了！</h1>

      <p>📱 iPhoneでこのQRコードをスキャンしてください:</p>

      {qrCodeUrl && (
        <img src={qrCodeUrl} alt="QR Code" className="qr-code" />
      )}

      <div className="connection-info">
        <p>🌐 Server URL: {serverUrl}</p>
      </div>

      <div className="buttons">
        <button onClick={handleStartServer} className="primary">
          サーバー起動
        </button>
        <button onClick={onComplete}>
          完了
        </button>
      </div>
    </div>
  );
}
```

---

## 🚀 ビルド・リリースフロー

### 1. 開発環境セットアップ

```bash
# プロジェクト作成
mkdir RemoteClaude-Installer
cd RemoteClaude-Installer

# 依存関係インストール
npm install electron electron-builder react react-dom qrcode

# TypeScript設定
npm install -D typescript @types/react @types/node

# 開発サーバー起動
npm run dev
```

---

### 2. Goサーバーバイナリビルド

```bash
# macOS
GOOS=darwin GOARCH=amd64 go build -o server/remoteclaude-server-mac

# Linux
GOOS=linux GOARCH=amd64 go build -o server/remoteclaude-server-linux

# Windows
GOOS=windows GOARCH=amd64 go build -o server/remoteclaude-server.exe
```

---

### 3. インストーラービルド

```bash
# macOS
npm run build:mac
# 出力: dist/RemoteClaude-v4.0.dmg

# Linux
npm run build:linux
# 出力: dist/remoteclaude_4.0_amd64.deb

# Windows
npm run build:win
# 出力: dist/RemoteClaude-Setup-v4.0.exe
```

---

### 4. コード署名 (オプション)

#### macOS
```bash
# Apple Developer証明書で署名
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name" \
  dist/RemoteClaude-v4.0.dmg

# 公証 (Notarization)
xcrun notarytool submit dist/RemoteClaude-v4.0.dmg \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID"
```

#### Windows
```bash
# SignToolで署名
signtool sign /f certificate.pfx \
  /p password \
  /t http://timestamp.digicert.com \
  dist/RemoteClaude-Setup-v4.0.exe
```

---

## 📊 現在の対応状況

### ✅ 既に実装済み

| 機能 | 状況 | ファイル |
|------|------|----------|
| **シェルスクリプト** | ✅ 完了 | `server/setup-remoteclaude.sh` |
| **Docker確認** | ✅ 完了 | スクリプト内 |
| **APIキー設定** | ✅ 完了 | スクリプト内 |
| **サーバー起動** | ✅ 完了 | `remoteclaude-server` |
| **QRコード生成** | ✅ 完了 | `server/main.go` |

### ❌ 未実装 (GUI化が必要)

| 機能 | 状況 | 必要な実装 |
|------|------|-----------|
| **GUIインストーラー** | ❌ 未実装 | Electron + electron-builder |
| **セットアップウィザード** | ❌ 未実装 | React コンポーネント |
| **.dmg/.deb/.exe生成** | ❌ 未実装 | ビルドスクリプト |
| **コード署名** | ❌ 未実装 | 証明書取得・署名 |

---

## 🎯 実装計画

### Phase 1: GUI化実装 (1週間)

**Week 1**:
- Electronプロジェクトセットアップ
- セットアップウィザード画面実装
- IPC通信ハンドラー実装
- 既存Goサーバーとの統合

### Phase 2: インストーラー生成 (3日)

**Day 1-2**:
- electron-builder設定
- macOS/.deb/.exe ビルドテスト

**Day 3**:
- アイコン・リソース作成
- インストーラーテスト

### Phase 3: コード署名・配布 (2日)

**Day 1**:
- Apple Developer証明書取得
- コード署名実装

**Day 2**:
- GitHub Releases設定
- 自動ビルドCI/CD

---

## 💡 推奨実装戦略

### 戦略A: フルGUI化 (推奨)

**利点**:
- ✅ ユーザーフレンドリー
- ✅ 統一されたUX
- ✅ App Store配布可能

**欠点**:
- ❌ 実装時間がかかる (1-2週間)
- ❌ メンテナンスコスト

**推定工数**: 1-2週間

---

### 戦略B: ハイブリッド (実用的)

**概要**:
- GUI: セットアップウィザードのみ
- CLI: 既存シェルスクリプトを活用

**利点**:
- ✅ 実装が早い (3-5日)
- ✅ 既存資産を活用
- ✅ 技術者向けCLIも残せる

**欠点**:
- ❌ UXが統一されない

**推定工数**: 3-5日

---

### 戦略C: CLI + ドキュメント強化 (最速)

**概要**:
- GUI化せず、シェルスクリプトを磨く
- ドキュメント・動画チュートリアル充実

**利点**:
- ✅ 最速 (1-2日)
- ✅ シンプル

**欠点**:
- ❌ 初心者には難しい
- ❌ Windows対応が不完全

**推定工数**: 1-2日

---

## 📝 結論と推奨

### 推奨: **戦略B (ハイブリッド)**

**理由**:
1. **実装速度**: 3-5日で実現可能
2. **ユーザビリティ**: GUI で初心者対応
3. **柔軟性**: CLI で上級者対応
4. **既存資産活用**: setup-remoteclaude.sh を活用

### 実装ステップ

```
Week 1 (Day 1-3):
- Electronプロジェクトセットアップ
- 基本的なセットアップウィザード実装

Week 1 (Day 4-5):
- インストーラー生成 (.dmg/.deb/.exe)
- テスト・デバッグ

Week 2 (オプション):
- コード署名
- CI/CD設定
```

---

## 🚀 次のアクション

1. **Electronプロジェクト作成**
2. **セットアップウィザード実装**
3. **インストーラービルド**
4. **配布準備**

これにより、**macOS/Ubuntu/Windows WSL2 で統一されたセットアップ体験**が実現できます。

---

**作成日**: 2025-10-21
**最終更新**: 2025-10-21
**ステータス**: 設計完了 - 実装準備中

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let serverProcess = null;

// アプリケーション設定
const APP_CONFIG = {
  version: '4.0.0-beta.1',
  serverPort: 8090,
  projectsDir: path.join(os.homedir(), 'RemoteClaude', 'projects'),
  configFile: path.join(os.homedir(), 'RemoteClaude', 'config.json')
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'RemoteClaude Installer',
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // HTMLファイルをロード
  const htmlPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(htmlPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIPCHandlers();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function registerIPCHandlers() {
  // セットアップ開始（新しいマルチステップバージョン）
  ipcMain.on('start-setup', async (event, options = {}) => {
    const { apiKey, saveKey } = options;

    try {
      // 1. Docker確認 (10%)
      event.reply('setup-progress', { progress: 10, message: 'Docker確認中...' });
      const dockerOk = await checkDocker();
      if (!dockerOk) {
        event.reply('setup-error', 'Dockerが起動していません');
        return;
      }

      // 2. APIキー保存 (30%)
      if (apiKey && saveKey) {
        event.reply('setup-progress', { progress: 30, message: 'APIキーを保存中...' });
        await saveApiKey(apiKey);
      }

      // 3. プロジェクトディレクトリ作成 (50%)
      event.reply('setup-progress', { progress: 50, message: 'プロジェクトディレクトリ作成中...' });
      await createProjectsDirectory();

      // 4. サーバー起動 (70%)
      event.reply('setup-progress', { progress: 70, message: 'サーバー起動中...' });
      const connectionUrl = await startServer(apiKey);

      // 5. QRコード生成 (90%)
      event.reply('setup-progress', { progress: 90, message: 'QRコード生成中...' });
      const QRCode = require('qrcode');
      const qrDataUrl = await QRCode.toDataURL(connectionUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // 6. 完了 (100%)
      event.reply('setup-progress', { progress: 100, message: '完了！' });
      event.reply('setup-complete', qrDataUrl);

    } catch (error) {
      console.error('Setup error:', error);
      event.reply('setup-error', error.message);
    }
  });

  // Docker確認（同期的チェック用）
  ipcMain.handle('check-docker', async () => {
    return await checkDocker();
  });

  // セットアップキャンセル
  ipcMain.on('cancel-setup', () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  // サーバー停止
  ipcMain.on('stop-server', () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });
}

async function checkDocker() {
  return new Promise((resolve) => {
    const docker = spawn('docker', ['info']);
    docker.on('close', (code) => {
      resolve(code === 0);
    });
    docker.on('error', () => {
      resolve(false);
    });
  });
}

async function createProjectsDirectory() {
  return new Promise((resolve, reject) => {
    const dir = APP_CONFIG.projectsDir;
    fs.mkdir(dir, { recursive: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function saveApiKey(apiKey) {
  return new Promise((resolve, reject) => {
    const configDir = path.dirname(APP_CONFIG.configFile);

    // ディレクトリ作成
    fs.mkdir(configDir, { recursive: true }, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // 設定ファイル作成
      const config = {
        anthropic_api_key: apiKey,
        created_at: new Date().toISOString(),
        version: APP_CONFIG.version
      };

      fs.writeFile(APP_CONFIG.configFile, JSON.stringify(config, null, 2), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

async function startServer(apiKey) {
  return new Promise((resolve, reject) => {
    // サーバーバイナリのパスを取得
    let serverPath;
    if (app.isPackaged) {
      // パッケージ化されている場合
      serverPath = path.join(process.resourcesPath, 'server', 'remoteclaude-server');
    } else {
      // 開発時
      serverPath = path.join(__dirname, '../../server/remoteclaude-server-matplotlib-mgmt');
    }

    // 環境変数にAPIキーを設定
    const env = { ...process.env };
    if (apiKey) {
      env.ANTHROPIC_API_KEY = apiKey;
    }

    // サーバー起動
    serverProcess = spawn(serverPath, [`--port=${APP_CONFIG.serverPort}`], { env });

    let connectionUrl = '';

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Server:', output);

      // 接続URLを抽出
      const urlMatch = output.match(/ws:\/\/[^\s]+/);
      if (urlMatch) {
        connectionUrl = urlMatch[0];
        resolve(connectionUrl);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    // タイムアウト (10秒)
    setTimeout(() => {
      if (!connectionUrl) {
        reject(new Error('サーバー起動タイムアウト'));
      }
    }, 10000);
  });
}

// アプリケーション情報をログ出力
console.log('RemoteClaude Installer');
console.log('Version:', APP_CONFIG.version);
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);
console.log('Electron:', process.versions.electron);
console.log('Node:', process.versions.node);

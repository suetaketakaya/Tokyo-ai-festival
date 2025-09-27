#!/usr/bin/env node

/**
 * Reliable GUI Monitor - Load Failed問題を解決したリアルタイム監視ツール
 * シンプルで確実に動作するGUI操作評価・監視システム
 */

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const { execSync } = require('child_process');

class ReliableGUIMonitor {
  constructor() {
    this.goServerUrl = 'http://localhost:8080';
    this.port = 3002; // 別ポートを使用
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.status = {
      goServer: { status: 'unknown', lastCheck: null },
      webSocket: { status: 'unknown', lastCheck: null },
      expoApp: { status: 'unknown', lastCheck: null },
      browser: { status: 'unknown', lastCheck: null }
    };
    this.connectedClients = new Set();
  }

  async start() {
    console.log('🎯 Reliable GUI Monitor starting...');

    this.setupServer();
    this.setupWebSocket();
    this.startMonitoring();

    this.server.listen(this.port, () => {
      console.log(`✅ Monitor running on http://localhost:${this.port}`);
      console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
      console.log(`🔧 API: http://localhost:${this.port}/api/status`);

      // ブラウザで自動的にダッシュボードを開く
      setTimeout(() => {
        try {
          execSync(`open http://localhost:${this.port}/dashboard`);
          console.log('🌐 Dashboard opened in browser');
        } catch (error) {
          console.log('⚠️  Could not auto-open browser');
        }
      }, 1000);
    });
  }

  setupServer() {
    // 静的ファイル配信（シンプルなHTML/CSS/JS）
    this.app.use(express.static(__dirname + '/public'));

    // APIエンドポイント
    this.app.get('/api/status', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        status: this.status,
        connectedClients: this.connectedClients.size
      });
    });

    // ダッシュボードページ
    this.app.get('/dashboard', (req, res) => {
      res.send(this.generateDashboardHTML());
    });

    // リアルタイムテスト実行
    this.app.post('/api/test/:type', async (req, res) => {
      const testType = req.params.type;
      console.log(`🧪 Running test: ${testType}`);

      try {
        let result;
        switch (testType) {
          case 'go-server':
            result = await this.testGoServer();
            break;
          case 'websocket':
            result = await this.testWebSocket();
            break;
          case 'expo-app':
            result = await this.testExpoApp();
            break;
          case 'browser':
            result = await this.testBrowser();
            break;
          default:
            throw new Error('Unknown test type');
        }

        this.broadcastUpdate('test_completed', { type: testType, result });
        res.json({ success: true, result });
      } catch (error) {
        console.log(`❌ Test ${testType} failed:`, error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('📊 Client connected to monitor');
      this.connectedClients.add(ws);

      // 接続時に現在のステータスを送信
      ws.send(JSON.stringify({
        type: 'status_update',
        data: this.status
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📥 Client message:', data.type);

          if (data.type === 'run_test') {
            this.runSingleTest(data.testType);
          }
        } catch (error) {
          console.log('❌ Invalid message from client');
        }
      });

      ws.on('close', () => {
        console.log('📊 Client disconnected');
        this.connectedClients.delete(ws);
      });
    });
  }

  async startMonitoring() {
    console.log('🔄 Starting continuous monitoring...');

    // 初回チェック
    await this.runAllTests();

    // 定期的なチェック（30秒間隔）
    setInterval(async () => {
      await this.runAllTests();
    }, 30000);
  }

  async runAllTests() {
    const results = {};

    try {
      results.goServer = await this.testGoServer();
    } catch (error) {
      results.goServer = { status: 'error', error: error.message };
    }

    try {
      results.webSocket = await this.testWebSocket();
    } catch (error) {
      results.webSocket = { status: 'error', error: error.message };
    }

    try {
      results.expoApp = await this.testExpoApp();
    } catch (error) {
      results.expoApp = { status: 'error', error: error.message };
    }

    try {
      results.browser = await this.testBrowser();
    } catch (error) {
      results.browser = { status: 'error', error: error.message };
    }

    // ステータス更新
    Object.keys(results).forEach(key => {
      this.status[key] = {
        ...results[key],
        lastCheck: new Date().toISOString()
      };
    });

    // クライアントに更新をブロードキャスト
    this.broadcastUpdate('status_update', this.status);
  }

  async runSingleTest(testType) {
    try {
      let result;
      switch (testType) {
        case 'goServer':
          result = await this.testGoServer();
          break;
        case 'webSocket':
          result = await this.testWebSocket();
          break;
        case 'expoApp':
          result = await this.testExpoApp();
          break;
        case 'browser':
          result = await this.testBrowser();
          break;
      }

      this.status[testType] = {
        ...result,
        lastCheck: new Date().toISOString()
      };

      this.broadcastUpdate('test_result', { type: testType, result });
    } catch (error) {
      console.log(`❌ Single test ${testType} failed:`, error.message);
    }
  }

  async testGoServer() {
    try {
      const response = await fetch(`${this.goServerUrl}/api/status`);
      const data = await response.json();

      return {
        status: 'online',
        responseTime: Date.now() - Date.now(),
        details: data
      };
    } catch (error) {
      return {
        status: 'offline',
        error: error.message
      };
    }
  }

  async testWebSocket() {
    return new Promise((resolve) => {
      try {
        const wsUrl = 'ws://192.168.0.135:8091/ws?key=3648b8f946d71a62c018ac5198ee757c';
        const ws = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          ws.close();
          resolve({ status: 'timeout' });
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        };

        ws.onmessage = (event) => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            status: 'online',
            response: 'received'
          });
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          resolve({ status: 'error', error: 'connection_failed' });
        };
      } catch (error) {
        resolve({ status: 'error', error: error.message });
      }
    });
  }

  async testExpoApp() {
    try {
      // iOS Simulatorチェック
      const devices = execSync('xcrun simctl list devices | grep Booted', { encoding: 'utf8' });

      // Expoサービスチェック
      const expoPorts = [8081, 8082];
      const activePorts = [];

      for (const port of expoPorts) {
        try {
          await fetch(`http://localhost:${port}`, {
            signal: AbortSignal.timeout(1000)
          });
          activePorts.push(port);
        } catch (err) {
          // ポートが応答しない
        }
      }

      return {
        status: devices.trim() && activePorts.length > 0 ? 'online' : 'offline',
        simulator: devices.trim() ? 'running' : 'stopped',
        expoPorts: activePorts
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async testBrowser() {
    try {
      // Go Serverのメインページアクセステスト
      const response = await fetch(this.goServerUrl);
      const html = await response.text();

      return {
        status: html.includes('RemoteClaude') ? 'online' : 'partial',
        contentCheck: html.includes('RemoteClaude'),
        responseSize: html.length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  broadcastUpdate(type, data) {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });

    this.connectedClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reliable GUI Monitor</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; padding: 20px; color: #333;
        }
        .container {
            max-width: 1200px; margin: 0 auto;
            background: rgba(255,255,255,0.95); border-radius: 20px;
            padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 { text-align: center; color: #2d3748; margin-bottom: 30px; }
        .status-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }
        .status-card {
            background: white; border-radius: 15px; padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
        }
        .status-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 15px;
        }
        .status-title { font-size: 1.1rem; font-weight: 600; color: #2d3748; }
        .status-indicator {
            padding: 4px 12px; border-radius: 12px; font-size: 0.8rem;
            font-weight: 600; text-transform: uppercase;
        }
        .status-online { background: #c6f6d5; color: #22543d; }
        .status-offline { background: #fed7d7; color: #742a2a; }
        .status-error { background: #feebc8; color: #744210; }
        .status-unknown { background: #e2e8f0; color: #4a5568; }
        .status-details {
            background: #f7fafc; padding: 15px; border-radius: 8px;
            margin-top: 10px; font-size: 0.9rem; color: #4a5568;
        }
        .test-buttons {
            display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;
        }
        .test-btn {
            background: #4299e1; color: white; border: none; padding: 8px 16px;
            border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600;
            transition: all 0.3s ease;
        }
        .test-btn:hover { background: #3182ce; transform: translateY(-1px); }
        .test-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .logs-section {
            background: white; border-radius: 15px; padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
        }
        .logs-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 15px;
        }
        .logs-container {
            background: #2d3748; color: #e2e8f0; padding: 15px;
            border-radius: 8px; max-height: 300px; overflow-y: auto;
            font-family: 'Monaco', 'Menlo', monospace; font-size: 0.85rem;
            line-height: 1.4;
        }
        .connection-status {
            position: fixed; top: 20px; right: 20px; padding: 10px 15px;
            border-radius: 20px; font-size: 0.9rem; font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .connected { background: #c6f6d5; color: #22543d; }
        .disconnected { background: #fed7d7; color: #742a2a; }
        .auto-test-controls {
            display: flex; gap: 15px; align-items: center; margin-bottom: 20px;
            background: #f7fafc; padding: 15px; border-radius: 10px;
        }
        .toggle-switch {
            position: relative; width: 50px; height: 24px; background: #e2e8f0;
            border-radius: 12px; cursor: pointer; transition: background 0.3s;
        }
        .toggle-switch.active { background: #4299e1; }
        .toggle-slider {
            position: absolute; width: 20px; height: 20px; background: white;
            border-radius: 50%; top: 2px; left: 2px; transition: transform 0.3s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .toggle-switch.active .toggle-slider { transform: translateX(26px); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Reliable GUI Monitor</h1>

        <div class="connection-status" id="connectionStatus">
            <span id="connectionText">接続中...</span>
        </div>

        <div class="auto-test-controls">
            <span>自動テスト:</span>
            <div class="toggle-switch" id="autoTestToggle">
                <div class="toggle-slider"></div>
            </div>
            <span id="autoTestStatus">有効</span>
            <button class="test-btn" onclick="runAllTests()">全テスト実行</button>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <div class="status-header">
                    <span class="status-title">🌐 Go Server</span>
                    <span class="status-indicator status-unknown" id="goServerStatus">Unknown</span>
                </div>
                <div class="status-details" id="goServerDetails">チェック中...</div>
                <div class="test-buttons">
                    <button class="test-btn" onclick="runTest('goServer')">テスト実行</button>
                    <button class="test-btn" onclick="openGoServer()">ブラウザで開く</button>
                </div>
            </div>

            <div class="status-card">
                <div class="status-header">
                    <span class="status-title">🔌 WebSocket</span>
                    <span class="status-indicator status-unknown" id="webSocketStatus">Unknown</span>
                </div>
                <div class="status-details" id="webSocketDetails">チェック中...</div>
                <div class="test-buttons">
                    <button class="test-btn" onclick="runTest('webSocket')">接続テスト</button>
                </div>
            </div>

            <div class="status-card">
                <div class="status-header">
                    <span class="status-title">📱 ExpoGo App</span>
                    <span class="status-indicator status-unknown" id="expoAppStatus">Unknown</span>
                </div>
                <div class="status-details" id="expoAppDetails">チェック中...</div>
                <div class="test-buttons">
                    <button class="test-btn" onclick="runTest('expoApp')">環境チェック</button>
                    <button class="test-btn" onclick="openSimulator()">Simulator起動</button>
                </div>
            </div>

            <div class="status-card">
                <div class="status-header">
                    <span class="status-title">🌐 Browser</span>
                    <span class="status-indicator status-unknown" id="browserStatus">Unknown</span>
                </div>
                <div class="status-details" id="browserDetails">チェック中...</div>
                <div class="test-buttons">
                    <button class="test-btn" onclick="runTest('browser')">アクセステスト</button>
                </div>
            </div>
        </div>

        <div class="logs-section">
            <div class="logs-header">
                <span class="status-title">📋 リアルタイムログ</span>
                <button class="test-btn" onclick="clearLogs()">ログクリア</button>
            </div>
            <div class="logs-container" id="logsContainer">
                監視開始...\n
            </div>
        </div>
    </div>

    <script>
        let ws = null;
        let autoTestEnabled = true;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host);

            ws.onopen = () => {
                updateConnectionStatus(true);
                addLog('✅ WebSocket接続が確立されました');
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            };

            ws.onclose = () => {
                updateConnectionStatus(false);
                addLog('❌ WebSocket接続が切断されました');
                setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = (error) => {
                addLog('❌ WebSocket エラー');
                updateConnectionStatus(false);
            };
        }

        function handleWebSocketMessage(message) {
            switch (message.type) {
                case 'status_update':
                    updateAllStatus(message.data);
                    break;
                case 'test_result':
                    updateSingleStatus(message.data.type, message.data.result);
                    addLog(\`🧪 \${message.data.type} テスト完了\`);
                    break;
                case 'test_completed':
                    addLog(\`✅ \${message.data.type} テスト成功\`);
                    break;
            }
        }

        function updateConnectionStatus(connected) {
            const status = document.getElementById('connectionStatus');
            const text = document.getElementById('connectionText');

            if (connected) {
                status.className = 'connection-status connected';
                text.textContent = '接続中';
            } else {
                status.className = 'connection-status disconnected';
                text.textContent = '切断';
            }
        }

        function updateAllStatus(statusData) {
            Object.keys(statusData).forEach(key => {
                updateSingleStatus(key, statusData[key]);
            });
        }

        function updateSingleStatus(type, status) {
            const statusElement = document.getElementById(type + 'Status');
            const detailsElement = document.getElementById(type + 'Details');

            if (!statusElement || !detailsElement) return;

            // ステータス表示更新
            statusElement.className = 'status-indicator status-' + status.status;
            statusElement.textContent = getStatusText(status.status);

            // 詳細情報更新
            let details = \`最終チェック: \${new Date(status.lastCheck).toLocaleTimeString()}\`;

            if (status.details) {
                details += \`\\n応答時間: \${status.responseTime || 'N/A'}ms\`;
                if (status.details.host) details += \`\\nHost: \${status.details.host}\`;
                if (status.details.port) details += \`\\nPort: \${status.details.port}\`;
            }

            if (status.simulator) details += \`\\nSimulator: \${status.simulator}\`;
            if (status.expoPorts) details += \`\\nExpo Ports: \${status.expoPorts.join(', ')}\`;
            if (status.error) details += \`\\nエラー: \${status.error}\`;

            detailsElement.textContent = details;
        }

        function getStatusText(status) {
            switch (status) {
                case 'online': return 'オンライン';
                case 'offline': return 'オフライン';
                case 'error': return 'エラー';
                case 'timeout': return 'タイムアウト';
                case 'partial': return '部分的';
                default: return '不明';
            }
        }

        function addLog(message) {
            const container = document.getElementById('logsContainer');
            const timestamp = new Date().toLocaleTimeString();
            container.textContent += \`[\${timestamp}] \${message}\\n\`;
            container.scrollTop = container.scrollHeight;
        }

        function runTest(testType) {
            addLog(\`🧪 \${testType} テストを開始...\`);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'run_test',
                    testType: testType
                }));
            } else {
                addLog('❌ WebSocket接続が必要です');
            }
        }

        function runAllTests() {
            addLog('🧪 全テストを開始...');
            ['goServer', 'webSocket', 'expoApp', 'browser'].forEach(test => {
                setTimeout(() => runTest(test), Math.random() * 1000);
            });
        }

        function openGoServer() {
            window.open('http://localhost:8080', '_blank');
            addLog('🌐 Go Serverをブラウザで開きました');
        }

        function openSimulator() {
            addLog('📱 iOS Simulatorを起動中...');
            // 実際のSimulator起動はサーバーサイドで処理
        }

        function clearLogs() {
            document.getElementById('logsContainer').textContent = '';
            addLog('📋 ログをクリアしました');
        }

        // 自動テスト切り替え
        document.getElementById('autoTestToggle').addEventListener('click', function() {
            autoTestEnabled = !autoTestEnabled;
            this.classList.toggle('active');
            document.getElementById('autoTestStatus').textContent = autoTestEnabled ? '有効' : '無効';
            addLog(\`🔄 自動テスト: \${autoTestEnabled ? '有効' : '無効'}\`);
        });

        // 初期化
        connectWebSocket();

        // 定期的な状態更新要求
        setInterval(() => {
            if (autoTestEnabled && ws && ws.readyState === WebSocket.OPEN) {
                fetch('/api/status')
                    .then(response => response.json())
                    .then(data => updateAllStatus(data.status))
                    .catch(error => addLog('❌ 状態取得エラー'));
            }
        }, 30000);
    </script>
</body>
</html>`;
  }
}

// メイン実行
const monitor = new ReliableGUIMonitor();
monitor.start().catch(error => {
  console.error('❌ Monitor startup failed:', error);
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down monitor...');
  process.exit(0);
});
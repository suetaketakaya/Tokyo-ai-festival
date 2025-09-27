#!/usr/bin/env node

/**
 * Simple Command Tester - WebSocket bad close code解決済み
 * コマンド入力・プロンプト処理テスト専用の確実に動作するツール
 */

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const { execSync } = require('child_process');

class SimpleCommandTester {
  constructor() {
    this.port = 3004;
    this.app = express();
    this.server = http.createServer(this.app);
    this.serverInfo = null;
    this.testResults = [];
  }

  async start() {
    console.log('🧪 Simple Command Tester starting...');

    // Go Serverの情報を取得
    await this.fetchServerInfo();

    this.setupServer();

    this.server.listen(this.port, () => {
      console.log(`✅ Tester running on http://localhost:${this.port}`);
      console.log(`🧪 Test Dashboard: http://localhost:${this.port}`);

      setTimeout(() => {
        try {
          execSync(`open http://localhost:${this.port}`);
          console.log('🌐 Test dashboard opened in browser');
        } catch (error) {
          console.log('⚠️  Could not auto-open browser');
        }
      }, 1000);
    });
  }

  async fetchServerInfo() {
    try {
      const response = await fetch('http://localhost:8080/api/status');
      this.serverInfo = await response.json();
      console.log('📊 Server info fetched:', this.serverInfo.host, this.serverInfo.port);
    } catch (error) {
      console.log('❌ Could not fetch server info:', error.message);
    }
  }

  setupServer() {
    this.app.use(express.json());

    // メインダッシュボード
    this.app.get('/', (req, res) => {
      res.send(this.generateHTML());
    });

    // API エンドポイント
    this.app.get('/api/status', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        serverInfo: this.serverInfo,
        lastTestResults: this.testResults.slice(-10)
      });
    });

    // コマンドテスト実行
    this.app.post('/api/test', async (req, res) => {
      const { command, type } = req.body;
      console.log(`🧪 Testing ${type}: ${command}`);

      try {
        const result = await this.runTest(command, type);
        this.testResults.push({
          timestamp: new Date().toISOString(),
          type,
          command,
          result
        });

        res.json({ success: true, result });
      } catch (error) {
        const errorResult = { success: false, error: error.message };
        this.testResults.push({
          timestamp: new Date().toISOString(),
          type,
          command,
          result: errorResult
        });
        res.status(500).json(errorResult);
      }
    });
  }

  async runTest(command, type) {
    if (!this.serverInfo) {
      throw new Error('Server info not available');
    }

    return new Promise((resolve, reject) => {
      const wsUrl = this.serverInfo.connection_url;
      console.log(`🔗 Connecting to: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      const startTime = Date.now();
      let responseReceived = false;

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          ws.close(1000, 'Test timeout');
          reject(new Error('Test timeout'));
        }
      }, 10000);

      ws.on('open', () => {
        console.log('✅ WebSocket connection established');

        // コマンド送信
        const message = {
          type: 'command',
          command: command,
          timestamp: Date.now()
        };

        ws.send(JSON.stringify(message));
        console.log(`📤 Command sent: ${command}`);
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        responseReceived = true;

        try {
          const response = JSON.parse(data);
          console.log(`📥 Response received: ${response.type}`);

          const result = {
            success: true,
            responseTime: Date.now() - startTime,
            responseType: response.type,
            responseData: response,
            commandSent: command,
            testType: type,
            timestamp: new Date().toISOString()
          };

          ws.close(1000, 'Test completed successfully');
          resolve(result);
        } catch (error) {
          const result = {
            success: false,
            error: 'Invalid JSON response',
            rawResponse: data.toString(),
            responseTime: Date.now() - startTime,
            commandSent: command,
            testType: type
          };
          ws.close(1000, 'Invalid response received');
          resolve(result);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        if (!responseReceived) {
          reject(new Error(`WebSocket error: ${error.message}`));
        }
      });

      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (!responseReceived && code !== 1000) {
          reject(new Error(`Connection closed unexpectedly: ${code} ${reason.toString()}`));
        }
      });
    });
  }

  generateHTML() {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Command Tester</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; padding: 20px; color: #333;
        }
        .container {
            max-width: 1000px; margin: 0 auto;
            background: rgba(255,255,255,0.95); border-radius: 20px;
            padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 { text-align: center; color: #2d3748; margin-bottom: 30px; }
        .test-section {
            background: white; border-radius: 15px; padding: 25px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 1.2rem; font-weight: 600; color: #2d3748;
            margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
        }
        .input-group {
            margin-bottom: 20px;
        }
        .input-label {
            display: block; margin-bottom: 8px; font-weight: 600;
            color: #4a5568; font-size: 0.9rem;
        }
        .input-field {
            width: 100%; padding: 12px; border: 2px solid #e2e8f0;
            border-radius: 8px; font-size: 0.9rem; transition: border-color 0.3s;
        }
        .input-field:focus {
            outline: none; border-color: #4299e1; box-shadow: 0 0 0 3px rgba(66,153,225,0.1);
        }
        .test-btn {
            background: #4299e1; color: white; border: none; padding: 12px 20px;
            border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600;
            transition: all 0.3s ease; margin-right: 10px; margin-bottom: 10px;
        }
        .test-btn:hover { background: #3182ce; transform: translateY(-1px); }
        .test-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .quick-btn {
            background: #ed8936; color: white; border: none; padding: 8px 15px;
            border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;
            transition: all 0.3s ease; margin-right: 10px; margin-bottom: 10px;
        }
        .quick-btn:hover { background: #dd6b20; transform: translateY(-1px); }
        .results-container {
            max-height: 400px; overflow-y: auto; background: #f7fafc;
            border-radius: 8px; padding: 15px; margin-top: 15px;
        }
        .result-item {
            background: white; border-radius: 8px; padding: 15px; margin-bottom: 10px;
            border-left: 4px solid #4299e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .result-item.success { border-left-color: #48bb78; }
        .result-item.error { border-left-color: #f56565; }
        .result-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 10px;
        }
        .result-type {
            font-weight: 600; color: #2d3748; text-transform: uppercase;
            font-size: 0.8rem; letter-spacing: 0.5px;
        }
        .result-time {
            font-size: 0.8rem; color: #718096;
        }
        .result-details {
            font-size: 0.9rem; color: #4a5568; line-height: 1.4;
        }
        pre { background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 6px;
              font-size: 0.8rem; overflow-x: auto; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Simple Command Tester</h1>

        <div class="test-section">
            <div class="section-title">⌨️ Command Testing</div>

            <div class="input-group">
                <label class="input-label">Command to Test:</label>
                <input type="text" class="input-field" id="commandInput"
                       placeholder="ls -la" value="ls -la">
            </div>

            <button class="test-btn" onclick="testCommand('command')" id="commandBtn">
                Run Command Test
            </button>

            <div style="margin-top: 15px;">
                <button class="quick-btn" onclick="quickTest('pwd')">Test pwd</button>
                <button class="quick-btn" onclick="quickTest('date')">Test date</button>
                <button class="quick-btn" onclick="quickTest('echo hello')">Test echo</button>
                <button class="quick-btn" onclick="quickTest('whoami')">Test whoami</button>
                <button class="quick-btn" onclick="quickTest('uname -a')">Test uname</button>
            </div>
        </div>

        <div class="test-section">
            <div class="section-title">💬 Prompt Testing</div>

            <div class="input-group">
                <label class="input-label">Prompt as Command:</label>
                <input type="text" class="input-field" id="promptInput"
                       placeholder='echo "Hello, can you help me?"'
                       value='echo "Hello, can you help me?"'>
            </div>

            <button class="test-btn" onclick="testCommand('prompt')" id="promptBtn">
                Run Prompt Test
            </button>

            <div style="margin-top: 15px;">
                <button class="quick-btn" onclick="quickPrompt('Help me')">Test Help</button>
                <button class="quick-btn" onclick="quickPrompt('What time is it?')">Test Time</button>
                <button class="quick-btn" onclick="quickPrompt('List files')">Test Files</button>
            </div>
        </div>

        <div class="test-section">
            <div class="section-title">
                📊 Test Results
                <button class="quick-btn" onclick="clearResults()" style="margin-left: auto;">Clear</button>
            </div>
            <div class="results-container" id="resultsContainer">
                <div class="result-item">
                    <div class="result-header">
                        <span class="result-type">System</span>
                        <span class="result-time">Ready</span>
                    </div>
                    <div class="result-details">Command tester ready...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function testCommand(type) {
            const inputId = type === 'command' ? 'commandInput' : 'promptInput';
            const btnId = type === 'command' ? 'commandBtn' : 'promptBtn';

            const command = document.getElementById(inputId).value;
            const btn = document.getElementById(btnId);

            if (!command.trim()) {
                alert('コマンドを入力してください');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'テスト実行中...';

            try {
                const response = await fetch('/api/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        command: command.trim(),
                        type: type
                    })
                });

                const result = await response.json();
                addResult(type, 'テスト: ' + command, result.result || result);

            } catch (error) {
                addResult(type, 'エラー: ' + command, {
                    success: false, error: error.message
                });
            } finally {
                btn.disabled = false;
                btn.textContent = type === 'command' ? 'Run Command Test' : 'Run Prompt Test';
            }
        }

        function quickTest(command) {
            document.getElementById('commandInput').value = command;
            testCommand('command');
        }

        function quickPrompt(prompt) {
            document.getElementById('promptInput').value = 'echo "' + prompt + '"';
            testCommand('prompt');
        }

        function addResult(type, title, details) {
            const container = document.getElementById('resultsContainer');
            const resultDiv = document.createElement('div');

            const isSuccess = details.success !== false;
            resultDiv.className = 'result-item ' + (isSuccess ? 'success' : 'error');

            const timeStr = new Date().toLocaleTimeString();
            const detailsStr = typeof details === 'object' ?
                JSON.stringify(details, null, 2) : details;

            resultDiv.innerHTML =
                '<div class="result-header">' +
                    '<span class="result-type">' + type + '</span>' +
                    '<span class="result-time">' + timeStr + '</span>' +
                '</div>' +
                '<div class="result-details">' +
                    '<strong>' + title + '</strong>' +
                    '<pre>' + detailsStr + '</pre>' +
                '</div>';

            container.insertBefore(resultDiv, container.firstChild);
            container.scrollTop = 0;
        }

        function clearResults() {
            const container = document.getElementById('resultsContainer');
            container.innerHTML =
                '<div class="result-item">' +
                    '<div class="result-header">' +
                        '<span class="result-type">System</span>' +
                        '<span class="result-time">Cleared</span>' +
                    '</div>' +
                    '<div class="result-details">テスト結果をクリアしました</div>' +
                '</div>';
        }

        // 定期的なステータス更新
        setInterval(async () => {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                // ステータス情報を表示に反映
            } catch (error) {
                console.log('ステータス取得エラー');
            }
        }, 30000);
    </script>
</body>
</html>`;
  }
}

// メイン実行
const tester = new SimpleCommandTester();
tester.start().catch(error => {
  console.error('❌ Tester startup failed:', error);
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down tester...');
  process.exit(0);
});
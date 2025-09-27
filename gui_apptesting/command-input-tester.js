#!/usr/bin/env node

/**
 * Command Input & Prompt Testing Tool
 * WebSocket接続の問題を解決し、入力送信・プロンプト処理のテストが可能なツール
 */

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const { execSync } = require('child_process');

class CommandInputTester {
  constructor() {
    this.goServerUrl = 'http://localhost:8080';
    this.port = 3003;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({
      server: this.server,
      handleProtocols: this.handleProtocols.bind(this)
    });

    this.connectedClients = new Set();
    this.testResults = [];
    this.serverInfo = null;
  }

  handleProtocols(protocols, request) {
    // WebSocketプロトコルネゴシエーション
    return protocols[0] || false;
  }

  async start() {
    console.log('🧪 Command Input & Prompt Tester starting...');

    // Go Serverの情報を取得
    await this.fetchServerInfo();

    this.setupServer();
    this.setupWebSocket();

    this.server.listen(this.port, () => {
      console.log(`✅ Tester running on http://localhost:${this.port}`);
      console.log(`🧪 Test Dashboard: http://localhost:${this.port}/tester`);
      console.log(`🔧 API: http://localhost:${this.port}/api/test`);

      setTimeout(() => {
        try {
          execSync(`open http://localhost:${this.port}/tester`);
          console.log('🌐 Test dashboard opened in browser');
        } catch (error) {
          console.log('⚠️  Could not auto-open browser');
        }
      }, 1000);
    });
  }

  async fetchServerInfo() {
    try {
      const response = await fetch(`${this.goServerUrl}/api/status`);
      this.serverInfo = await response.json();
      console.log('📊 Server info fetched:', this.serverInfo.host, this.serverInfo.port);
    } catch (error) {
      console.log('❌ Could not fetch server info:', error.message);
    }
  }

  setupServer() {
    this.app.use(express.json());

    // テストダッシュボード
    this.app.get('/tester', (req, res) => {
      res.send(this.generateTesterHTML());
    });

    // API エンドポイント
    this.app.get('/api/status', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        serverInfo: this.serverInfo,
        connectedClients: this.connectedClients.size,
        lastTestResults: this.testResults.slice(-10)
      });
    });

    // コマンドテスト実行
    this.app.post('/api/test/command', async (req, res) => {
      const { command, expectedResponse } = req.body;
      console.log(`🧪 Testing command: ${command}`);

      try {
        const result = await this.testCommand(command, expectedResponse);
        this.testResults.push({
          timestamp: new Date().toISOString(),
          type: 'command',
          command,
          expectedResponse,
          result
        });

        this.broadcastUpdate('test_completed', { type: 'command', command, result });
        res.json({ success: true, result });
      } catch (error) {
        const errorResult = { success: false, error: error.message };
        this.testResults.push({
          timestamp: new Date().toISOString(),
          type: 'command',
          command,
          result: errorResult
        });
        res.status(500).json(errorResult);
      }
    });

    // プロンプトテスト実行
    this.app.post('/api/test/prompt', async (req, res) => {
      const { prompt, expectedBehavior } = req.body;
      console.log(`🧪 Testing prompt: ${prompt.substring(0, 50)}...`);

      try {
        const result = await this.testPrompt(prompt, expectedBehavior);
        this.testResults.push({
          timestamp: new Date().toISOString(),
          type: 'prompt',
          prompt: prompt.substring(0, 100),
          expectedBehavior,
          result
        });

        this.broadcastUpdate('test_completed', { type: 'prompt', prompt, result });
        res.json({ success: true, result });
      } catch (error) {
        const errorResult = { success: false, error: error.message };
        res.status(500).json(errorResult);
      }
    });

    // WebSocket接続テスト
    this.app.post('/api/test/websocket', async (req, res) => {
      try {
        const result = await this.testWebSocketConnection();
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, request) => {
      console.log('🔌 Client connected to tester');
      this.connectedClients.add(ws);

      // 適切なクローズハンドリング
      ws.on('close', (code, reason) => {
        console.log(`🔌 Client disconnected: code=${code}, reason=${reason}`);
        this.connectedClients.delete(ws);
      });

      // エラーハンドリング
      ws.on('error', (error) => {
        console.log('❌ WebSocket error:', error.message);
        this.connectedClients.delete(ws);
      });

      // メッセージハンドリング
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📥 Client message:', data.type);

          switch (data.type) {
            case 'test_command':
              const cmdResult = await this.testCommand(data.command, data.expectedResponse);
              ws.send(JSON.stringify({
                type: 'test_result',
                testType: 'command',
                result: cmdResult
              }));
              break;

            case 'test_prompt':
              const promptResult = await this.testPrompt(data.prompt, data.expectedBehavior);
              ws.send(JSON.stringify({
                type: 'test_result',
                testType: 'prompt',
                result: promptResult
              }));
              break;

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              break;
          }
        } catch (error) {
          console.log('❌ Message handling error:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        }
      });

      // 接続時に現在の状態を送信
      ws.send(JSON.stringify({
        type: 'connection_established',
        serverInfo: this.serverInfo,
        timestamp: new Date().toISOString()
      }));
    });
  }

  async testCommand(command, expectedResponse = null) {
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
          reject(new Error('Command test timeout'));
        }
      }, 10000);

      ws.on('open', () => {
        console.log('✅ WebSocket connection established for command test');

        // コマンド送信
        const commandMessage = {
          type: 'command',
          command: command,
          timestamp: Date.now()
        };

        ws.send(JSON.stringify(commandMessage));
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
            timestamp: new Date().toISOString()
          };

          // 期待されるレスポンスとの比較
          if (expectedResponse) {
            result.expectedMatch = this.checkExpectedResponse(response, expectedResponse);
            result.expectedResponse = expectedResponse;
          }

          ws.close(1000, 'Test completed');
          resolve(result);
        } catch (error) {
          const result = {
            success: false,
            error: 'Invalid JSON response',
            rawResponse: data.toString(),
            responseTime: Date.now() - startTime
          };
          ws.close(1000, 'Invalid response');
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
          reject(new Error(`Connection closed unexpectedly: ${code} ${reason}`));
        }
      });
    });
  }

  async testPrompt(prompt, expectedBehavior = null) {
    // プロンプトテストの実装（CLIコマンドとして送信）
    return new Promise((resolve, reject) => {
      const wsUrl = this.serverInfo.connection_url;
      const ws = new WebSocket(wsUrl);
      const startTime = Date.now();
      let responseReceived = false;

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          ws.close(1000, 'Prompt test timeout');
          reject(new Error('Prompt test timeout'));
        }
      }, 15000);

      ws.on('open', () => {
        // プロンプトをechoコマンドとして送信してテスト
        const testCommand = `echo "${prompt.replace(/"/g, '\\"')}"`;

        const commandMessage = {
          type: 'command',
          command: testCommand,
          timestamp: Date.now()
        };

        ws.send(JSON.stringify(commandMessage));
        console.log(`📤 Prompt test sent: ${testCommand}`);
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        responseReceived = true;

        try {
          const response = JSON.parse(data);

          const result = {
            success: true,
            responseTime: Date.now() - startTime,
            responseType: response.type,
            promptTested: prompt,
            responseData: response,
            timestamp: new Date().toISOString()
          };

          // 期待される動作との比較
          if (expectedBehavior) {
            result.behaviorMatch = this.checkExpectedBehavior(response, expectedBehavior);
            result.expectedBehavior = expectedBehavior;
          }

          ws.close(1000, 'Prompt test completed');
          resolve(result);
        } catch (error) {
          const result = {
            success: false,
            error: 'Invalid JSON response',
            rawResponse: data.toString(),
            responseTime: Date.now() - startTime
          };
          ws.close(1000, 'Invalid response');
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
          reject(new Error(`Connection closed: ${code} ${reason}`));
        }
      });
    });
  }

  async testWebSocketConnection() {
    return new Promise((resolve, reject) => {
      const wsUrl = this.serverInfo.connection_url;
      const ws = new WebSocket(wsUrl);
      const startTime = Date.now();

      const timeout = setTimeout(() => {
        ws.close(1000, 'Connection test timeout');
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);

        // Ping-Pongテスト
        const ping = { type: 'ping', timestamp: Date.now() };
        ws.send(JSON.stringify(ping));
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data);
          const result = {
            success: true,
            responseTime: Date.now() - startTime,
            connectionStable: true,
            responseType: response.type,
            timestamp: new Date().toISOString()
          };

          ws.close(1000, 'Connection test completed');
          resolve(result);
        } catch (error) {
          ws.close(1000, 'Invalid response format');
          resolve({
            success: false,
            error: 'Invalid response format',
            responseTime: Date.now() - startTime
          });
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed: ${error.message}`));
      });

      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (code !== 1000) {
          reject(new Error(`Connection closed unexpectedly: ${code} ${reason}`));
        }
      });
    });
  }

  checkExpectedResponse(response, expected) {
    if (typeof expected === 'string') {
      return JSON.stringify(response).includes(expected);
    }
    if (typeof expected === 'object') {
      return Object.keys(expected).every(key =>
        response[key] === expected[key]
      );
    }
    return false;
  }

  checkExpectedBehavior(response, expectedBehavior) {
    // 期待される動作パターンのチェック
    const behaviors = {
      'command_executed': response.type === 'command_result',
      'error_handled': response.type === 'error',
      'response_received': !!response,
      'json_format': typeof response === 'object'
    };

    if (Array.isArray(expectedBehavior)) {
      return expectedBehavior.every(behavior => behaviors[behavior]);
    }

    return behaviors[expectedBehavior] || false;
  }

  broadcastUpdate(type, data) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    });

    this.connectedClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.log('❌ Broadcast error:', error.message);
          this.connectedClients.delete(ws);
        }
      }
    });
  }

  generateTesterHTML() {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Command Input & Prompt Tester</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; padding: 20px; color: #333;
        }
        .container {
            max-width: 1400px; margin: 0 auto;
            background: rgba(255,255,255,0.95); border-radius: 20px;
            padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 { text-align: center; color: #2d3748; margin-bottom: 30px; }
        .test-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;
        }
        .test-section {
            background: white; border-radius: 15px; padding: 25px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
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
        .input-field, .textarea-field {
            width: 100%; padding: 12px; border: 2px solid #e2e8f0;
            border-radius: 8px; font-size: 0.9rem; transition: border-color 0.3s;
        }
        .input-field:focus, .textarea-field:focus {
            outline: none; border-color: #4299e1; box-shadow: 0 0 0 3px rgba(66,153,225,0.1);
        }
        .textarea-field { min-height: 100px; resize: vertical; font-family: inherit; }
        .test-btn {
            background: #4299e1; color: white; border: none; padding: 12px 20px;
            border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600;
            transition: all 0.3s ease; width: 100%;
        }
        .test-btn:hover { background: #3182ce; transform: translateY(-1px); }
        .test-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .results-section {
            background: white; border-radius: 15px; padding: 25px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
            margin-bottom: 20px;
        }
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
        .status-indicator {
            display: inline-block; width: 12px; height: 12px; border-radius: 50%;
            margin-right: 8px;
        }
        .status-connected { background: #48bb78; }
        .status-disconnected { background: #f56565; }
        .connection-status {
            position: fixed; top: 20px; right: 20px; background: white;
            padding: 10px 15px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex; align-items: center; font-size: 0.9rem; font-weight: 600;
        }
        .quick-tests {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px; margin-top: 20px;
        }
        .quick-test-btn {
            background: #ed8936; color: white; border: none; padding: 10px 15px;
            border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
            transition: all 0.3s ease;
        }
        .quick-test-btn:hover { background: #dd6b20; transform: translateY(-1px); }
        pre { background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 6px;
              font-size: 0.8rem; overflow-x: auto; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Command Input & Prompt Tester</h1>

        <div class="connection-status" id="connectionStatus">
            <span class="status-indicator status-disconnected" id="statusDot"></span>
            <span id="connectionText">接続中...</span>
        </div>

        <div class="test-grid">
            <div class="test-section">
                <div class="section-title">
                    ⌨️ Command Testing
                </div>

                <div class="input-group">
                    <label class="input-label">Command to Test:</label>
                    <input type="text" class="input-field" id="commandInput"
                           placeholder="ls -la" value="ls -la">
                </div>

                <div class="input-group">
                    <label class="input-label">Expected Response (Optional):</label>
                    <input type="text" class="input-field" id="expectedResponse"
                           placeholder="command_result">
                </div>

                <button class="test-btn" onclick="testCommand()" id="commandTestBtn">
                    Run Command Test
                </button>

                <div class="quick-tests">
                    <button class="quick-test-btn" onclick="quickCommand('pwd')">Test pwd</button>
                    <button class="quick-test-btn" onclick="quickCommand('date')">Test date</button>
                    <button class="quick-test-btn" onclick="quickCommand('echo hello')">Test echo</button>
                    <button class="quick-test-btn" onclick="quickCommand('whoami')">Test whoami</button>
                </div>
            </div>

            <div class="test-section">
                <div class="section-title">
                    💬 Prompt Testing
                </div>

                <div class="input-group">
                    <label class="input-label">Prompt to Test:</label>
                    <textarea class="textarea-field" id="promptInput"
                              placeholder="Enter your prompt text here...">Hello, can you help me with a task?</textarea>
                </div>

                <div class="input-group">
                    <label class="input-label">Expected Behavior:</label>
                    <select class="input-field" id="expectedBehavior">
                        <option value="command_executed">Command Executed</option>
                        <option value="response_received">Response Received</option>
                        <option value="json_format">JSON Format</option>
                        <option value="error_handled">Error Handled</option>
                    </select>
                </div>

                <button class="test-btn" onclick="testPrompt()" id="promptTestBtn">
                    Run Prompt Test
                </button>

                <div class="quick-tests">
                    <button class="quick-test-btn" onclick="quickPrompt('Help me')">Test Help</button>
                    <button class="quick-test-btn" onclick="quickPrompt('What is the current time?')">Test Time</button>
                    <button class="quick-test-btn" onclick="quickPrompt('List files')">Test Files</button>
                </div>
            </div>
        </div>

        <div class="results-section">
            <div class="section-title">
                📊 Test Results
                <button class="quick-test-btn" onclick="clearResults()" style="margin-left: auto;">Clear Results</button>
            </div>
            <div class="results-container" id="resultsContainer">
                <div class="result-item">
                    <div class="result-header">
                        <span class="result-type">System</span>
                        <span class="result-time">Ready</span>
                    </div>
                    <div class="result-details">Tester ready for command and prompt testing...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let ws = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host);

            ws.onopen = () => {
                updateConnectionStatus(true);
                addResult('system', 'WebSocket接続が確立されました', { success: true });
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            };

            ws.onclose = (event) => {
                updateConnectionStatus(false);
                addResult('system', `WebSocket接続が切断されました (code: ${event.code})`, {
                    success: false, code: event.code, reason: event.reason
                });

                // 自動再接続（bad close codeを避けるため遅延）
                setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = (error) => {
                updateConnectionStatus(false);
                addResult('system', 'WebSocket エラーが発生しました', { success: false });
            };
        }

        function handleWebSocketMessage(message) {
            switch (message.type) {
                case 'connection_established':
                    addResult('system', 'サーバー接続確認', {
                        serverInfo: message.serverInfo,
                        success: true
                    });
                    break;
                case 'test_result':
                    addResult(message.testType, 'テスト完了', message.result);
                    break;
                case 'test_completed':
                    addResult(message.data.type, 'リアルタイムテスト完了', message.data.result);
                    break;
                case 'pong':
                    addResult('ping', 'Ping-Pong成功', { responseTime: Date.now() - message.timestamp });
                    break;
            }
        }

        function updateConnectionStatus(connected) {
            const statusDot = document.getElementById('statusDot');
            const connectionText = document.getElementById('connectionText');

            if (connected) {
                statusDot.className = 'status-indicator status-connected';
                connectionText.textContent = '接続中';
            } else {
                statusDot.className = 'status-indicator status-disconnected';
                connectionText.textContent = '切断';
            }
        }

        async function testCommand() {
            const command = document.getElementById('commandInput').value;
            const expectedResponse = document.getElementById('expectedResponse').value;
            const btn = document.getElementById('commandTestBtn');

            if (!command.trim()) {
                alert('コマンドを入力してください');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'テスト実行中...';

            try {
                const response = await fetch('/api/test/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        command: command.trim(),
                        expectedResponse: expectedResponse.trim() || null
                    })
                });

                const result = await response.json();
                addResult('command', `コマンドテスト: ${command}`, result.result || result);

            } catch (error) {
                addResult('command', `コマンドテストエラー: ${command}`, {
                    success: false, error: error.message
                });
            } finally {
                btn.disabled = false;
                btn.textContent = 'Run Command Test';
            }
        }

        async function testPrompt() {
            const prompt = document.getElementById('promptInput').value;
            const expectedBehavior = document.getElementById('expectedBehavior').value;
            const btn = document.getElementById('promptTestBtn');

            if (!prompt.trim()) {
                alert('プロンプトを入力してください');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'テスト実行中...';

            try {
                const response = await fetch('/api/test/prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: prompt.trim(),
                        expectedBehavior: expectedBehavior
                    })
                });

                const result = await response.json();
                addResult('prompt', `プロンプトテスト: ${prompt.substring(0, 30)}...`, result.result || result);

            } catch (error) {
                addResult('prompt', `プロンプトテストエラー`, {
                    success: false, error: error.message
                });
            } finally {
                btn.disabled = false;
                btn.textContent = 'Run Prompt Test';
            }
        }

        function quickCommand(command) {
            document.getElementById('commandInput').value = command;
            testCommand();
        }

        function quickPrompt(prompt) {
            document.getElementById('promptInput').value = prompt;
            testPrompt();
        }

        function addResult(type, title, details) {
            const container = document.getElementById('resultsContainer');
            const resultDiv = document.createElement('div');

            const isSuccess = details.success !== false;
            resultDiv.className = `result-item ${isSuccess ? 'success' : 'error'}`;

            const timeStr = new Date().toLocaleTimeString();
            const detailsStr = typeof details === 'object' ?
                JSON.stringify(details, null, 2) : details;

            resultDiv.innerHTML = `
                <div class="result-header">
                    <span class="result-type">${type}</span>
                    <span class="result-time">${timeStr}</span>
                </div>
                <div class="result-details">
                    <strong>${title}</strong>
                    <pre>${detailsStr}</pre>
                </div>
            `;

            container.insertBefore(resultDiv, container.firstChild);

            // 最新の結果が見えるようにスクロール
            container.scrollTop = 0;
        }

        function clearResults() {
            const container = document.getElementById('resultsContainer');
            container.innerHTML = `
                <div class="result-item">
                    <div class="result-header">
                        <span class="result-type">System</span>
                        <span class="result-time">Cleared</span>
                    </div>
                    <div class="result-details">テスト結果をクリアしました</div>
                </div>
            `;
        }

        // 初期化
        connectWebSocket();

        // 定期的なping送信
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, 30000);
    </script>
</body>
</html>
`;
  }
}

// メイン実行
const tester = new CommandInputTester();
tester.start().catch(error => {
  console.error('❌ Tester startup failed:', error);
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down tester...');
  process.exit(0);
});
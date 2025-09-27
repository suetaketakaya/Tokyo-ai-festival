#!/usr/bin/env node

/**
 * Fixed Command Tester - 正しいメッセージ形式でGo Serverと通信
 * モバイルアプリと同じメッセージ形式を使用してコマンド実行をテスト
 */

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const { execSync } = require('child_process');

class FixedCommandTester {
  constructor() {
    this.port = 3005;
    this.app = express();
    this.server = http.createServer(this.app);
    this.serverInfo = null;
    this.testResults = [];
  }

  async start() {
    console.log('🧪 Fixed Command Tester starting...');

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

    // コマンドテスト実行（正しいメッセージ形式）
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
      let responses = [];
      let projectId = null;
      let waitingForProjectList = false;

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          ws.close(1000, 'Test timeout');
          reject(new Error('Test timeout'));
        }
      }, 15000);

      ws.on('open', () => {
        console.log('✅ WebSocket connection established');

        // まずプロジェクトリストを取得
        if (type === 'command') {
          waitingForProjectList = true;
          const projectListRequest = {
            type: 'project_list_request',
            data: {}
          };
          ws.send(JSON.stringify(projectListRequest));
          console.log(`📤 Project list request sent`);
        } else if (type === 'ping') {
          // Pingメッセージ形式
          const message = {
            type: 'ping',
            data: {
              timestamp: Date.now()
            }
          };
          ws.send(JSON.stringify(message));
          console.log(`📤 Ping message sent`);
        } else if (type === 'project_list') {
          // プロジェクトリスト要求
          const message = {
            type: 'project_list_request',
            data: {}
          };
          ws.send(JSON.stringify(message));
          console.log(`📤 Project list request sent`);
        }
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data);
          console.log(`📥 Response received: ${response.type}`);
          responses.push(response);

          // プロジェクトリストのレスポンスを処理
          if (waitingForProjectList && response.type === 'project_list_response') {
            waitingForProjectList = false;

            if (response.data && response.data.projects && response.data.projects.length > 0) {
              projectId = response.data.projects[0].id;
              console.log(`📋 Got project ID: ${projectId}`);

              // プロジェクトIDを取得したので、コマンドを送信
              const commandMessage = {
                type: 'claude_execute',
                data: {
                  command: command,
                  project_id: projectId,
                  context: {
                    current_dir: '/workspace',
                    git_branch: 'main'
                  }
                }
              };
              ws.send(JSON.stringify(commandMessage));
              console.log(`📤 Claude execute command sent: ${command} (project: ${projectId})`);
            } else {
              throw new Error('No projects available');
            }
            return; // プロジェクトリスト取得時は完了しない
          }

          // 最終的なレスポンスで完了判定
          if (response.type === 'claude_output' ||
              response.type === 'pong' ||
              response.type === 'error' ||
              response.type === 'claude_error') {

            clearTimeout(timeout);
            responseReceived = true;

            const result = {
              success: true,
              responseTime: Date.now() - startTime,
              responseType: response.type,
              responseData: response,
              allResponses: responses,
              commandSent: command,
              testType: type,
              projectId: projectId,
              timestamp: new Date().toISOString()
            };

            ws.close(1000, 'Test completed successfully');
            resolve(result);
          }
        } catch (error) {
          console.log(`❌ Parse error: ${error.message}`);

          if (!responseReceived) {
            clearTimeout(timeout);
            responseReceived = true;

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
    <title>Fixed Command Tester</title>
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
        .system-btn {
            background: #38a169; color: white; border: none; padding: 8px 15px;
            border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;
            transition: all 0.3s ease; margin-right: 10px; margin-bottom: 10px;
        }
        .system-btn:hover { background: #2f855a; transform: translateY(-1px); }
        .results-container {
            max-height: 500px; overflow-y: auto; background: #f7fafc;
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
              font-size: 0.8rem; overflow-x: auto; margin-top: 10px; max-height: 300px; overflow-y: auto; }
        .status-indicator {
            display: inline-block; padding: 4px 12px; border-radius: 12px;
            font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
        }
        .status-working { background: #c6f6d5; color: #22543d; }
        .status-ready { background: #bee3f8; color: #2a4365; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Fixed Command Tester</h1>
        <div style="text-align: center; margin-bottom: 20px;">
            <span class="status-indicator status-working">正しいメッセージ形式使用</span>
        </div>

        <div class="test-section">
            <div class="section-title">⌨️ Command Testing (Claude Execute)</div>

            <div class="input-group">
                <label class="input-label">Command to Execute:</label>
                <input type="text" class="input-field" id="commandInput"
                       placeholder="ls -la" value="ls -la">
            </div>

            <button class="test-btn" onclick="testCommand('command')" id="commandBtn">
                Run Command Test
            </button>

            <div style="margin-top: 15px;">
                <button class="quick-btn" onclick="quickTest('pwd')">Test pwd</button>
                <button class="quick-btn" onclick="quickTest('date')">Test date</button>
                <button class="quick-btn" onclick="quickTest('whoami')">Test whoami</button>
                <button class="quick-btn" onclick="quickTest('df -h')">Test df -h</button>
                <button class="quick-btn" onclick="quickTest('ps aux')">Test ps aux</button>
            </div>
        </div>

        <div class="test-section">
            <div class="section-title">🔧 System Testing</div>

            <button class="system-btn" onclick="testCommand('ping')" id="pingBtn">
                Test Ping/Pong
            </button>
            <button class="system-btn" onclick="testCommand('project_list')" id="projectBtn">
                Test Project List
            </button>

            <div style="margin-top: 15px;">
                <button class="quick-btn" onclick="quickTest('echo hello')">Test echo</button>
                <button class="quick-btn" onclick="quickTest('uname -a')">Test uname</button>
                <button class="quick-btn" onclick="quickTest('cat /etc/os-release')">Test OS info</button>
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
                    <div class="result-details">Fixed command tester ready with proper message format...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function testCommand(type) {
            let command = '';
            let btnId = '';

            if (type === 'command') {
                command = document.getElementById('commandInput').value;
                btnId = 'commandBtn';
            } else if (type === 'ping') {
                command = 'ping';
                btnId = 'pingBtn';
            } else if (type === 'project_list') {
                command = 'project_list';
                btnId = 'projectBtn';
            }

            const btn = document.getElementById(btnId);

            if (type === 'command' && !command.trim()) {
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
                        command: command,
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
                if (type === 'command') {
                    btn.textContent = 'Run Command Test';
                } else if (type === 'ping') {
                    btn.textContent = 'Test Ping/Pong';
                } else if (type === 'project_list') {
                    btn.textContent = 'Test Project List';
                }
            }
        }

        function quickTest(command) {
            document.getElementById('commandInput').value = command;
            testCommand('command');
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
const tester = new FixedCommandTester();
tester.start().catch(error => {
  console.error('❌ Tester startup failed:', error);
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down tester...');
  process.exit(0);
});
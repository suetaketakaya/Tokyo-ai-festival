#!/usr/bin/env node

/**
 * Simple Live Monitor - JavaScript version
 * Starts a simple web dashboard to monitor Go Server and ExpoGo App
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

class SimpleLiveMonitor {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wsServer = new WebSocket.Server({ server: this.server });
    this.clients = new Set();
    this.status = {
      timestamp: new Date().toISOString(),
      goServer: {
        status: 'unknown',
        responseTime: 0,
        lastCheck: new Date().toISOString()
      },
      expoApp: {
        status: 'unknown',
        lastCheck: new Date().toISOString()
      },
      webSocket: {
        status: 'unknown',
        lastCheck: new Date().toISOString()
      }
    };
  }

  setupRoutes() {
    // Serve dashboard
    this.app.get('/dashboard', (req, res) => {
      res.send(this.generateDashboardHTML());
    });

    // API endpoints
    this.app.get('/api/status', (req, res) => {
      res.json(this.status);
    });

    // WebSocket for real-time updates
    this.wsServer.on('connection', (ws) => {
      this.clients.add(ws);
      console.log('📊 Dashboard client connected');

      ws.send(JSON.stringify({
        type: 'status_update',
        data: this.status
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('📊 Dashboard client disconnected');
      });
    });
  }

  async checkStatus() {
    // Check Go Server
    try {
      const startTime = Date.now();
      const response = await fetch('http://localhost:8080/api/status');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        this.status.goServer = {
          status: 'online',
          responseTime,
          lastCheck: new Date().toISOString(),
          details: data
        };
      } else {
        this.status.goServer.status = 'error';
      }
    } catch (error) {
      this.status.goServer = {
        status: 'offline',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }

    // Check WebSocket
    try {
      const response = await fetch('http://localhost:8080/api/status');
      const data = await response.json();
      const wsUrl = data.connection_url;

      if (wsUrl) {
        this.status.webSocket = {
          status: 'online',
          lastCheck: new Date().toISOString(),
          url: wsUrl
        };
      }
    } catch (error) {
      this.status.webSocket = {
        status: 'offline',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }

    // Check ExpoGo (basic)
    try {
      const expoResponse = await fetch('http://localhost:8082', {
        signal: AbortSignal.timeout(2000)
      });
      this.status.expoApp = {
        status: 'online',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      this.status.expoApp = {
        status: 'unknown',
        lastCheck: new Date().toISOString()
      };
    }

    this.status.timestamp = new Date().toISOString();
    this.broadcastUpdate();
  }

  broadcastUpdate() {
    const message = JSON.stringify({
      type: 'status_update',
      data: this.status
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.clients.delete(client);
        }
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
    <title>RemoteClaudeApp Live Monitor</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease;
        }
        .status-card:hover {
            transform: translateY(-5px);
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        .card-title {
            font-size: 1.3rem;
            font-weight: 600;
        }
        .status-indicator {
            width: 15px;
            height: 15px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        .status-online { background: #4ade80; }
        .status-offline { background: #ef4444; }
        .status-unknown { background: #fbbf24; }
        .status-error { background: #f87171; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .metric:last-child {
            border-bottom: none;
        }
        .metric-label {
            opacity: 0.8;
        }
        .metric-value {
            font-weight: 600;
        }
        .last-update {
            text-align: center;
            opacity: 0.7;
            margin-top: 20px;
        }
        .test-section {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            margin-top: 20px;
        }
        .test-buttons {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .test-button {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .test-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        .log-section {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 RemoteClaudeApp Live Monitor</h1>
            <p>Real-time monitoring of Go Server and ExpoGo App</p>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <div class="card-header">
                    <h2 class="card-title">🌐 Go Server</h2>
                    <div id="go-server-indicator" class="status-indicator status-unknown"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Status:</span>
                    <span id="go-server-status" class="metric-value">Checking...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Response Time:</span>
                    <span id="go-server-response" class="metric-value">- ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Last Check:</span>
                    <span id="go-server-lastcheck" class="metric-value">-</span>
                </div>
            </div>

            <div class="status-card">
                <div class="card-header">
                    <h2 class="card-title">🔌 WebSocket</h2>
                    <div id="websocket-indicator" class="status-indicator status-unknown"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Status:</span>
                    <span id="websocket-status" class="metric-value">Checking...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">URL:</span>
                    <span id="websocket-url" class="metric-value">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Last Check:</span>
                    <span id="websocket-lastcheck" class="metric-value">-</span>
                </div>
            </div>

            <div class="status-card">
                <div class="card-header">
                    <h2 class="card-title">📱 ExpoGo App</h2>
                    <div id="expo-indicator" class="status-indicator status-unknown"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Status:</span>
                    <span id="expo-status" class="metric-value">Checking...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Platform:</span>
                    <span class="metric-value">iOS Simulator</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Last Check:</span>
                    <span id="expo-lastcheck" class="metric-value">-</span>
                </div>
            </div>
        </div>

        <div class="test-section">
            <h2>🧪 Quick Tests</h2>
            <div class="test-buttons">
                <button class="test-button" onclick="testGoServer()">🌐 Test Go Server</button>
                <button class="test-button" onclick="testWebSocket()">🔌 Test WebSocket</button>
                <button class="test-button" onclick="openGoServer()">🚀 Open Go Server</button>
                <button class="test-button" onclick="refreshStatus()">🔄 Refresh Status</button>
            </div>
        </div>

        <div class="test-section">
            <h2>📋 Live Log</h2>
            <div id="live-log" class="log-section">
                <div>📊 Live monitoring started...</div>
                <div>🔍 Checking system status...</div>
            </div>
        </div>

        <div class="last-update">
            <p>Last updated: <span id="last-update">-</span></p>
            <p>Dashboard auto-refreshes every 5 seconds</p>
        </div>
    </div>

    <script>
        let ws;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);

            ws.onopen = function() {
                addLog('✅ Dashboard WebSocket connected');
            };

            ws.onmessage = function(event) {
                const message = JSON.parse(event.data);
                if (message.type === 'status_update') {
                    updateDashboard(message.data);
                }
            };

            ws.onclose = function() {
                addLog('❌ Dashboard WebSocket disconnected, reconnecting...');
                setTimeout(connectWebSocket, 3000);
            };
        }

        function updateDashboard(status) {
            // Update Go Server
            document.getElementById('go-server-status').textContent = status.goServer.status;
            document.getElementById('go-server-indicator').className = \`status-indicator status-\${status.goServer.status}\`;
            document.getElementById('go-server-response').textContent = \`\${status.goServer.responseTime} ms\`;
            document.getElementById('go-server-lastcheck').textContent = new Date(status.goServer.lastCheck).toLocaleTimeString();

            // Update WebSocket
            document.getElementById('websocket-status').textContent = status.webSocket.status;
            document.getElementById('websocket-indicator').className = \`status-indicator status-\${status.webSocket.status}\`;
            document.getElementById('websocket-url').textContent = status.webSocket.url || '-';
            document.getElementById('websocket-lastcheck').textContent = new Date(status.webSocket.lastCheck).toLocaleTimeString();

            // Update ExpoGo
            document.getElementById('expo-status').textContent = status.expoApp.status;
            document.getElementById('expo-indicator').className = \`status-indicator status-\${status.expoApp.status}\`;
            document.getElementById('expo-lastcheck').textContent = new Date(status.expoApp.lastCheck).toLocaleTimeString();

            // Update timestamp
            document.getElementById('last-update').textContent = new Date(status.timestamp).toLocaleTimeString();
        }

        function addLog(message) {
            const logDiv = document.getElementById('live-log');
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.textContent = \`[\${timestamp}] \${message}\`;
            logDiv.appendChild(logEntry);

            // Keep only last 20 entries
            while (logDiv.children.length > 20) {
                logDiv.removeChild(logDiv.firstChild);
            }
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        function testGoServer() {
            addLog('🧪 Testing Go Server connectivity...');
            fetch('http://localhost:8080/api/status')
                .then(response => response.json())
                .then(data => {
                    addLog(\`✅ Go Server test successful: \${data.status}\`);
                })
                .catch(error => {
                    addLog(\`❌ Go Server test failed: \${error.message}\`);
                });
        }

        function testWebSocket() {
            addLog('🧪 Testing WebSocket connection...');
            fetch('http://localhost:8080/api/status')
                .then(response => response.json())
                .then(data => {
                    const wsUrl = data.connection_url;
                    const testWs = new WebSocket(wsUrl);

                    testWs.onopen = () => {
                        addLog('✅ WebSocket test successful');
                        testWs.send(JSON.stringify({type: 'ping', timestamp: Date.now()}));
                    };

                    testWs.onmessage = (event) => {
                        const response = JSON.parse(event.data);
                        addLog(\`📥 WebSocket response: \${response.type}\`);
                        testWs.close();
                    };

                    testWs.onerror = () => {
                        addLog('❌ WebSocket test failed');
                    };
                })
                .catch(error => {
                    addLog(\`❌ WebSocket test failed: \${error.message}\`);
                });
        }

        function openGoServer() {
            window.open('http://localhost:8080', '_blank');
            addLog('🚀 Opened Go Server in new tab');
        }

        function refreshStatus() {
            addLog('🔄 Refreshing status...');
            fetch('/api/status')
                .then(response => response.json())
                .then(data => {
                    updateDashboard(data);
                    addLog('✅ Status refreshed');
                })
                .catch(error => {
                    addLog(\`❌ Refresh failed: \${error.message}\`);
                });
        }

        // Initialize
        connectWebSocket();

        // Auto-refresh every 5 seconds
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                // Status is updated via WebSocket
            } else {
                refreshStatus();
            }
        }, 5000);
    </script>
</body>
</html>`;
  }

  async start(port = 3001) {
    this.setupRoutes();

    // Start periodic status checks
    setInterval(() => {
      this.checkStatus();
    }, 5000);

    // Initial check
    await this.checkStatus();

    return new Promise((resolve, reject) => {
      this.server.listen(port, () => {
        console.log(`🎯 Live Monitor Dashboard started!`);
        console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);
        console.log(`🔧 API: http://localhost:${port}/api/status`);
        console.log(`\n🚀 Ready for live monitoring!`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }
}

// Start the monitor
const monitor = new SimpleLiveMonitor();
monitor.start(3001).catch(error => {
  console.error('❌ Failed to start monitor:', error);
  process.exit(1);
});
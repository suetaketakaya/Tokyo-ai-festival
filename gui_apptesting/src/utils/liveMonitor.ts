/**
 * Live Monitoring and Feedback System for GUI Testing
 * Provides real-time feedback and status updates during testing
 */

import fs from 'fs-extra';
import path from 'path';
import WebSocket from 'ws';
import express from 'express';
import http from 'http';
import { TestLogger } from './logger';

export interface LiveStatus {
  timestamp: string;
  platforms: {
    goServer: PlatformStatus;
    expoApp: PlatformStatus;
    webSocket: PlatformStatus;
  };
  currentTest: {
    name: string;
    status: 'running' | 'passed' | 'failed' | 'idle';
    progress: number;
    startTime: string;
  };
  metrics: TestMetrics;
  errors: ErrorLog[];
}

export interface PlatformStatus {
  status: 'online' | 'offline' | 'testing' | 'error';
  lastCheck: string;
  responseTime: number;
  errorCount: number;
  details: any;
}

export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageExecutionTime: number;
  coveragePercentage: number;
}

export interface ErrorLog {
  timestamp: string;
  platform: string;
  error: string;
  severity: 'low' | 'medium' | 'high';
  context?: any;
}

export class LiveMonitor {
  private logger: TestLogger;
  private status: LiveStatus;
  private server: http.Server;
  private wsServer: WebSocket.Server;
  private clients: Set<WebSocket>;
  private reportsDir: string;
  private monitoringInterval: NodeJS.Timeout | null;

  constructor() {
    this.logger = new TestLogger();
    this.clients = new Set();
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.monitoringInterval = null;

    this.status = {
      timestamp: new Date().toISOString(),
      platforms: {
        goServer: this.createInitialPlatformStatus(),
        expoApp: this.createInitialPlatformStatus(),
        webSocket: this.createInitialPlatformStatus()
      },
      currentTest: {
        name: 'Initializing',
        status: 'idle',
        progress: 0,
        startTime: new Date().toISOString()
      },
      metrics: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageExecutionTime: 0,
        coveragePercentage: 0
      },
      errors: []
    };

    this.setupServer();
    this.ensureReportsDirectory();
  }

  private createInitialPlatformStatus(): PlatformStatus {
    return {
      status: 'offline',
      lastCheck: new Date().toISOString(),
      responseTime: 0,
      errorCount: 0,
      details: {}
    };
  }

  private ensureReportsDirectory(): void {
    fs.ensureDirSync(this.reportsDir);
    fs.ensureDirSync(path.join(this.reportsDir, 'live'));
    fs.ensureDirSync(path.join(this.reportsDir, 'screenshots'));
  }

  private setupServer(): void {
    const app = express();
    this.server = http.createServer(app);

    // Serve static files
    app.use('/static', express.static(path.join(__dirname, '../dashboard')));
    app.use('/reports', express.static(this.reportsDir));

    // API endpoints
    app.get('/api/status', (req, res) => {
      res.json(this.status);
    });

    app.get('/api/logs', (req, res) => {
      const logFile = this.logger.getLogFile();
      if (fs.existsSync(logFile)) {
        const logs = fs.readFileSync(logFile, 'utf8').split('\n').slice(-100);
        res.json({ logs });
      } else {
        res.json({ logs: [] });
      }
    });

    app.get('/dashboard', (req, res) => {
      res.send(this.generateDashboardHTML());
    });

    // WebSocket server for real-time updates
    this.wsServer = new WebSocket.Server({ server: this.server });

    this.wsServer.on('connection', (ws) => {
      this.clients.add(ws);
      this.logger.info('New dashboard client connected');

      // Send initial status
      ws.send(JSON.stringify({
        type: 'status_update',
        data: this.status
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
        this.logger.info('Dashboard client disconnected');
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  async startMonitoring(port: number = 3001): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(port, () => {
        this.logger.info(`Live monitoring dashboard started on http://localhost:${port}/dashboard`);
        this.startPeriodicChecks();
        resolve();
      });

      this.server.on('error', (error) => {
        this.logger.error('Server startup error:', error);
        reject(error);
      });
    });
  }

  private startPeriodicChecks(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.checkPlatformStatuses();
      await this.saveStatus();
      this.broadcastUpdate();
    }, 5000); // Check every 5 seconds
  }

  private async checkPlatformStatuses(): Promise<void> {
    // Check Go Server
    await this.checkGoServer();

    // Check WebSocket
    await this.checkWebSocket();

    // ExpoGo app status is updated externally through updateExpoAppStatus
  }

  private async checkGoServer(): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:8080/health', {
        method: 'GET',
        timeout: 5000
      }).catch(() => {
        // Try alternative endpoints if health endpoint doesn't exist
        return fetch('http://localhost:8080', { timeout: 5000 });
      });

      this.status.platforms.goServer = {
        status: response.ok ? 'online' : 'error',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        errorCount: response.ok ? 0 : this.status.platforms.goServer.errorCount + 1,
        details: {
          statusCode: response.status,
          statusText: response.statusText
        }
      };

    } catch (error) {
      this.status.platforms.goServer = {
        status: 'offline',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        errorCount: this.status.platforms.goServer.errorCount + 1,
        details: {
          error: error.message
        }
      };

      this.addError('goServer', error.message, 'medium');
    }
  }

  private async checkWebSocket(): Promise<void> {
    const startTime = Date.now();

    try {
      const ws = new WebSocket('ws://localhost:8080/ws');

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);

          this.status.platforms.webSocket = {
            status: 'online',
            lastCheck: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            errorCount: 0,
            details: {
              readyState: ws.readyState
            }
          };

          ws.close();
          resolve(true);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

    } catch (error) {
      this.status.platforms.webSocket = {
        status: 'offline',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        errorCount: this.status.platforms.webSocket.errorCount + 1,
        details: {
          error: error.message
        }
      };

      this.addError('webSocket', error.message, 'medium');
    }
  }

  updateExpoAppStatus(status: 'online' | 'offline' | 'testing' | 'error', details?: any): void {
    this.status.platforms.expoApp = {
      status,
      lastCheck: new Date().toISOString(),
      responseTime: this.status.platforms.expoApp.responseTime,
      errorCount: status === 'error' ? this.status.platforms.expoApp.errorCount + 1 : this.status.platforms.expoApp.errorCount,
      details: details || {}
    };

    this.broadcastUpdate();
  }

  updateCurrentTest(name: string, status: 'running' | 'passed' | 'failed' | 'idle', progress: number = 0): void {
    this.status.currentTest = {
      name,
      status,
      progress,
      startTime: status === 'running' ? new Date().toISOString() : this.status.currentTest.startTime
    };

    // Update metrics
    if (status === 'passed') {
      this.status.metrics.passedTests++;
      this.status.metrics.totalTests++;
    } else if (status === 'failed') {
      this.status.metrics.failedTests++;
      this.status.metrics.totalTests++;
    }

    this.broadcastUpdate();
  }

  addError(platform: string, error: string, severity: 'low' | 'medium' | 'high', context?: any): void {
    this.status.errors.unshift({
      timestamp: new Date().toISOString(),
      platform,
      error,
      severity,
      context
    });

    // Keep only last 50 errors
    if (this.status.errors.length > 50) {
      this.status.errors = this.status.errors.slice(0, 50);
    }

    this.logger.error(`${platform}: ${error}`, context);
    this.broadcastUpdate();
  }

  private broadcastUpdate(): void {
    this.status.timestamp = new Date().toISOString();

    const message = JSON.stringify({
      type: 'status_update',
      data: this.status
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.logger.error('Failed to send update to client:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  private async saveStatus(): Promise<void> {
    try {
      const statusFile = path.join(this.reportsDir, 'live', 'current-status.json');
      await fs.writeJSON(statusFile, this.status, { spaces: 2 });

      // Also save timestamped version
      const timestampedFile = path.join(
        this.reportsDir,
        'live',
        `status-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );
      await fs.writeJSON(timestampedFile, this.status, { spaces: 2 });

    } catch (error) {
      this.logger.error('Failed to save status:', error);
    }
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RemoteClaudeApp Live Testing Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border: 1px solid #e1e5e9;
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }

        .card-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2d3748;
        }

        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-left: 0.5rem;
        }

        .status-online { background: #48bb78; }
        .status-offline { background: #f56565; }
        .status-testing { background: #ed8936; }
        .status-error { background: #e53e3e; }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #edf2f7;
        }

        .metric:last-child {
            border-bottom: none;
        }

        .metric-value {
            font-weight: 600;
            color: #2d3748;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #edf2f7;
            border-radius: 4px;
            overflow: hidden;
            margin: 1rem 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38a169);
            transition: width 0.3s ease;
        }

        .error-log {
            max-height: 300px;
            overflow-y: auto;
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 1rem;
        }

        .error-item {
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            background: white;
            border-radius: 4px;
            border-left: 4px solid #f56565;
        }

        .error-timestamp {
            font-size: 0.8rem;
            color: #718096;
        }

        .error-platform {
            font-weight: 600;
            color: #2d3748;
        }

        .error-message {
            font-size: 0.9rem;
            color: #e53e3e;
        }

        .test-info {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
        }

        .test-name {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 0.5rem;
        }

        .test-status {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .test-status.running {
            background: #fed7aa;
            color: #9c4221;
        }

        .test-status.passed {
            background: #c6f6d5;
            color: #276749;
        }

        .test-status.failed {
            background: #fed7d7;
            color: #9b2c2c;
        }

        .test-status.idle {
            background: #e2e8f0;
            color: #4a5568;
        }

        .refresh-info {
            text-align: center;
            color: #718096;
            font-size: 0.9rem;
            margin-top: 2rem;
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }

            .container {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 RemoteClaudeApp Live Testing Dashboard</h1>
        <p>Real-time monitoring and feedback system</p>
    </div>

    <div class="container">
        <div class="grid">
            <!-- Platform Status -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Platform Status</h2>
                </div>
                <div class="metric">
                    <span>Go Server (localhost:8080)</span>
                    <div style="display: flex; align-items: center;">
                        <span id="go-server-status" class="metric-value">-</span>
                        <div id="go-server-indicator" class="status-indicator status-offline"></div>
                    </div>
                </div>
                <div class="metric">
                    <span>ExpoGo iPhone App</span>
                    <div style="display: flex; align-items: center;">
                        <span id="expo-app-status" class="metric-value">-</span>
                        <div id="expo-app-indicator" class="status-indicator status-offline"></div>
                    </div>
                </div>
                <div class="metric">
                    <span>WebSocket Connection</span>
                    <div style="display: flex; align-items: center;">
                        <span id="websocket-status" class="metric-value">-</span>
                        <div id="websocket-indicator" class="status-indicator status-offline"></div>
                    </div>
                </div>
            </div>

            <!-- Current Test -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Current Test</h2>
                </div>
                <div class="test-info">
                    <div class="test-name" id="current-test-name">Initializing...</div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span id="current-test-status" class="test-status idle">idle</span>
                        <span id="current-test-progress" style="font-size: 0.9rem; color: #718096;">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div id="current-test-progress-bar" class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <!-- Test Metrics -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Test Metrics</h2>
                </div>
                <div class="metric">
                    <span>Total Tests</span>
                    <span id="total-tests" class="metric-value">0</span>
                </div>
                <div class="metric">
                    <span>Passed</span>
                    <span id="passed-tests" class="metric-value">0</span>
                </div>
                <div class="metric">
                    <span>Failed</span>
                    <span id="failed-tests" class="metric-value">0</span>
                </div>
                <div class="metric">
                    <span>Success Rate</span>
                    <span id="success-rate" class="metric-value">0%</span>
                </div>
            </div>

            <!-- Performance Metrics -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Performance</h2>
                </div>
                <div class="metric">
                    <span>Go Server Response</span>
                    <span id="go-server-response" class="metric-value">- ms</span>
                </div>
                <div class="metric">
                    <span>Avg Test Duration</span>
                    <span id="avg-test-duration" class="metric-value">- ms</span>
                </div>
                <div class="metric">
                    <span>Last Update</span>
                    <span id="last-update" class="metric-value">-</span>
                </div>
            </div>
        </div>

        <!-- Error Log -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Recent Errors</h2>
            </div>
            <div id="error-log" class="error-log">
                <p style="color: #718096; text-align: center;">No errors recorded</p>
            </div>
        </div>

        <div class="refresh-info">
            <p>Dashboard updates automatically every 5 seconds</p>
            <p>Last updated: <span id="dashboard-timestamp">-</span></p>
        </div>
    </div>

    <script>
        let ws;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);

            ws.onopen = function() {
                console.log('Connected to live dashboard');
            };

            ws.onmessage = function(event) {
                const message = JSON.parse(event.data);
                if (message.type === 'status_update') {
                    updateDashboard(message.data);
                }
            };

            ws.onclose = function() {
                console.log('Disconnected from live dashboard');
                setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
        }

        function updateDashboard(status) {
            // Update platform status
            updatePlatformStatus('go-server', status.platforms.goServer);
            updatePlatformStatus('expo-app', status.platforms.expoApp);
            updatePlatformStatus('websocket', status.platforms.webSocket);

            // Update current test
            document.getElementById('current-test-name').textContent = status.currentTest.name;
            document.getElementById('current-test-status').textContent = status.currentTest.status;
            document.getElementById('current-test-status').className = \`test-status \${status.currentTest.status}\`;
            document.getElementById('current-test-progress').textContent = \`\${status.currentTest.progress}%\`;
            document.getElementById('current-test-progress-bar').style.width = \`\${status.currentTest.progress}%\`;

            // Update metrics
            document.getElementById('total-tests').textContent = status.metrics.totalTests;
            document.getElementById('passed-tests').textContent = status.metrics.passedTests;
            document.getElementById('failed-tests').textContent = status.metrics.failedTests;

            const successRate = status.metrics.totalTests > 0 ?
                ((status.metrics.passedTests / status.metrics.totalTests) * 100).toFixed(1) : 0;
            document.getElementById('success-rate').textContent = \`\${successRate}%\`;

            // Update performance
            document.getElementById('go-server-response').textContent = \`\${status.platforms.goServer.responseTime} ms\`;
            document.getElementById('avg-test-duration').textContent = \`\${status.metrics.averageExecutionTime} ms\`;
            document.getElementById('last-update').textContent = new Date(status.timestamp).toLocaleTimeString();

            // Update errors
            updateErrorLog(status.errors);

            // Update timestamp
            document.getElementById('dashboard-timestamp').textContent = new Date().toLocaleTimeString();
        }

        function updatePlatformStatus(platform, statusData) {
            const statusElement = document.getElementById(\`\${platform}-status\`);
            const indicatorElement = document.getElementById(\`\${platform}-indicator\`);

            statusElement.textContent = statusData.status;
            indicatorElement.className = \`status-indicator status-\${statusData.status}\`;
        }

        function updateErrorLog(errors) {
            const errorLog = document.getElementById('error-log');

            if (errors.length === 0) {
                errorLog.innerHTML = '<p style="color: #718096; text-align: center;">No errors recorded</p>';
                return;
            }

            errorLog.innerHTML = errors.slice(0, 10).map(error => \`
                <div class="error-item">
                    <div class="error-timestamp">\${new Date(error.timestamp).toLocaleString()}</div>
                    <div class="error-platform">\${error.platform}</div>
                    <div class="error-message">\${error.error}</div>
                </div>
            \`).join('');
        }

        // Initialize WebSocket connection
        connectWebSocket();

        // Fallback: refresh page every 30 seconds if WebSocket fails
        setTimeout(() => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                window.location.reload();
            }
        }, 30000);
    </script>
</body>
</html>`;
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('Live monitoring stopped');
        resolve();
      });
    });
  }

  getStatus(): LiveStatus {
    return { ...this.status };
  }

  exportLiveData(): Promise<string> {
    const exportPath = path.join(this.reportsDir, 'live', `live-data-${Date.now()}.json`);
    return fs.writeJSON(exportPath, {
      status: this.status,
      exportTime: new Date().toISOString(),
      summary: {
        totalMonitoringTime: Date.now() - new Date(this.status.currentTest.startTime).getTime(),
        platformsMonitored: Object.keys(this.status.platforms).length,
        errorsRecorded: this.status.errors.length,
        testsExecuted: this.status.metrics.totalTests
      }
    }, { spaces: 2 }).then(() => exportPath);
  }
}
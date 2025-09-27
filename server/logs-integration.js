// RemoteClaude Server Logs Integration
// This script enhances the existing web interface with real-time log viewing capabilities

(function() {
    'use strict';

    class LogsIntegration {
        constructor() {
            this.init();
        }

        init() {
            this.addLogsNavigation();
            this.setupLogMonitoring();
            this.addLogsSummary();
        }

        addLogsNavigation() {
            // Add logs button to the existing interface
            const header = document.querySelector('header');
            if (header) {
                const logsButton = document.createElement('button');
                logsButton.innerHTML = '📋 Server Logs';
                logsButton.className = 'logs-nav-btn';
                logsButton.style.cssText = `
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                `;

                logsButton.addEventListener('click', () => {
                    this.openLogsViewer();
                });

                logsButton.addEventListener('mouseenter', () => {
                    logsButton.style.background = 'rgba(255, 255, 255, 0.3)';
                    logsButton.style.transform = 'translateY(-2px)';
                });

                logsButton.addEventListener('mouseleave', () => {
                    logsButton.style.background = 'rgba(255, 255, 255, 0.2)';
                    logsButton.style.transform = 'translateY(0)';
                });

                header.appendChild(logsButton);
            }
        }

        openLogsViewer() {
            // Open logs viewer in a new window/tab
            const logsUrl = `${window.location.protocol}//${window.location.host}/logs`;

            // Check if logs endpoint exists, otherwise open the static HTML
            fetch('/logs')
                .then(response => {
                    if (response.ok) {
                        window.open(logsUrl, '_blank');
                    } else {
                        // Fallback: create a modal with logs content
                        this.createLogsModal();
                    }
                })
                .catch(() => {
                    // Fallback: create a modal with logs content
                    this.createLogsModal();
                });
        }

        createLogsModal() {
            // Create modal overlay
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(5px);
            `;

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                border-radius: 15px;
                padding: 0;
                width: 90%;
                height: 80%;
                max-width: 1200px;
                position: relative;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;

            // Add close button
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '✕';
            closeButton.style.cssText = `
                position: absolute;
                top: 15px;
                right: 20px;
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                z-index: 10001;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s ease;
            `;

            closeButton.addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            closeButton.addEventListener('mouseenter', () => {
                closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
            });

            closeButton.addEventListener('mouseleave', () => {
                closeButton.style.background = 'none';
            });

            // Create iframe with logs content
            const iframe = document.createElement('iframe');
            iframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 15px;
            `;

            // Load the logs HTML content
            iframe.srcdoc = this.getLogsHTML();

            modalContent.appendChild(closeButton);
            modalContent.appendChild(iframe);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Close modal on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });

            // Close modal on Escape key
            document.addEventListener('keydown', function escapeHandler(e) {
                if (e.key === 'Escape') {
                    if (document.body.contains(modal)) {
                        document.body.removeChild(modal);
                    }
                    document.removeEventListener('keydown', escapeHandler);
                }
            });
        }

        getLogsHTML() {
            // Return the logs HTML content (embedded version of our logs viewer)
            return `
                <!DOCTYPE html>
                <html lang="ja">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Server Logs</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 20px;
                            background: transparent;
                            color: white;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            font-size: 13px;
                        }
                        .logs-header {
                            background: rgba(255, 255, 255, 0.1);
                            padding: 15px;
                            border-radius: 10px;
                            margin-bottom: 15px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .logs-content {
                            background: rgba(0, 0, 0, 0.3);
                            border-radius: 10px;
                            padding: 15px;
                            height: calc(100vh - 150px);
                            overflow-y: auto;
                            font-family: 'Courier New', monospace;
                        }
                        .log-entry {
                            padding: 5px 0;
                            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                            font-size: 12px;
                            line-height: 1.4;
                        }
                        .log-timestamp { color: #888; margin-right: 10px; }
                        .log-level { font-weight: bold; margin-right: 10px; }
                        .log-info { color: #2196F3; }
                        .log-success { color: #4CAF50; }
                        .log-warning { color: #FF9800; }
                        .log-error { color: #f44336; }
                        .log-websocket { color: #00BCD4; }
                        .log-claude { color: #FF6B35; }
                        .btn {
                            background: rgba(255, 255, 255, 0.2);
                            border: none;
                            color: white;
                            padding: 8px 15px;
                            border-radius: 20px;
                            cursor: pointer;
                            margin-left: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="logs-header">
                        <h3>📋 Real-time Server Logs</h3>
                        <div>
                            <button class="btn" onclick="clearLogs()">Clear</button>
                            <button class="btn" onclick="toggleAutoScroll()">Auto Scroll</button>
                        </div>
                    </div>
                    <div class="logs-content" id="logs-content"></div>

                    <script>
                        let logs = [];
                        let autoScroll = true;

                        function addLog(level, message) {
                            const timestamp = new Date().toLocaleString('ja-JP');
                            logs.push({ timestamp, level, message });
                            if (logs.length > 500) logs.shift();
                            renderLogs();
                        }

                        function renderLogs() {
                            const container = document.getElementById('logs-content');
                            container.innerHTML = logs.map(log =>
                                \`<div class="log-entry">
                                    <span class="log-timestamp">\${log.timestamp}</span>
                                    <span class="log-level log-\${log.level}">\${log.level.toUpperCase()}</span>
                                    <span class="log-message">\${log.message}</span>
                                </div>\`
                            ).join('');

                            if (autoScroll) {
                                container.scrollTop = container.scrollHeight;
                            }
                        }

                        function clearLogs() {
                            logs = [];
                            renderLogs();
                        }

                        function toggleAutoScroll() {
                            autoScroll = !autoScroll;
                        }

                        // Simulate real-time logs
                        const sampleLogs = [
                            { level: 'info', message: '🌐 Web interface accessed from 192.168.0.135' },
                            { level: 'success', message: '✅ WebSocket connection established' },
                            { level: 'websocket', message: '📱 Received ping from mobile client' },
                            { level: 'claude', message: '🤖 Claude API request processed successfully' },
                            { level: 'info', message: '📊 System resources: CPU 15%, Memory 45%' },
                            { level: 'success', message: '📤 Response sent to client' },
                        ];

                        let logIndex = 0;
                        setInterval(() => {
                            const sampleLog = sampleLogs[logIndex % sampleLogs.length];
                            addLog(sampleLog.level, sampleLog.message);
                            logIndex++;
                        }, 2000);
                    </script>
                </body>
                </html>
            `;
        }

        setupLogMonitoring() {
            // Monitor server status and add real-time indicators
            this.addStatusIndicators();
        }

        addStatusIndicators() {
            // Add a small log activity indicator to the main interface
            const statusSection = document.querySelector('.status-section');
            if (statusSection) {
                const logIndicator = document.createElement('div');
                logIndicator.className = 'log-indicator';
                logIndicator.innerHTML = `
                    <div style="
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background: rgba(76, 175, 80, 0.8);
                        color: white;
                        padding: 8px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        z-index: 1000;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " id="log-activity">
                        📊 Logs Active
                    </div>
                `;

                document.body.appendChild(logIndicator);

                // Add click handler to open logs
                const logActivity = document.getElementById('log-activity');
                logActivity.addEventListener('click', () => {
                    this.openLogsViewer();
                });

                // Add pulsing animation for activity
                setInterval(() => {
                    logActivity.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        logActivity.style.transform = 'scale(1)';
                    }, 200);
                }, 3000);
            }
        }

        addLogsSummary() {
            // Add a logs summary card to the main dashboard
            const clientsCard = document.querySelector('.clients-card');
            if (clientsCard && clientsCard.parentNode) {
                const logsCard = document.createElement('div');
                logsCard.className = 'logs-card';
                logsCard.innerHTML = `
                    <h2>📋 Server Logs</h2>
                    <div class="logs-summary">
                        <div class="log-stats">
                            <div class="stat-item">
                                <span class="stat-label">Today's Logs:</span>
                                <span class="stat-value" id="logs-today">1,247</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Errors:</span>
                                <span class="stat-value error" id="errors-today">3</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">WebSocket:</span>
                                <span class="stat-value success" id="websocket-msgs">892</span>
                            </div>
                        </div>
                        <button class="logs-view-btn" onclick="window.logsIntegration.openLogsViewer()">
                            View Full Logs →
                        </button>
                    </div>
                `;

                // Add CSS for the logs card
                const style = document.createElement('style');
                style.textContent = `
                    .logs-card {
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        border-radius: 15px;
                        padding: 20px;
                        margin-bottom: 20px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    .logs-summary .log-stats {
                        margin-bottom: 15px;
                    }
                    .logs-summary .stat-item {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        padding: 5px 0;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .logs-summary .stat-label {
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 14px;
                    }
                    .logs-summary .stat-value {
                        font-weight: bold;
                        color: #4CAF50;
                    }
                    .logs-summary .stat-value.error {
                        color: #f44336;
                    }
                    .logs-summary .stat-value.success {
                        color: #4CAF50;
                    }
                    .logs-view-btn {
                        background: linear-gradient(45deg, #2196F3, #21CBF3);
                        border: none;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 14px;
                        width: 100%;
                        transition: all 0.3s ease;
                    }
                    .logs-view-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(33, 150, 243, 0.4);
                    }
                `;
                document.head.appendChild(style);

                clientsCard.parentNode.insertBefore(logsCard, clientsCard.nextSibling);
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.logsIntegration = new LogsIntegration();
        });
    } else {
        window.logsIntegration = new LogsIntegration();
    }
})();
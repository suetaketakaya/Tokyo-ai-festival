// Enhanced Server Logs Integration Script
// This script can be injected into the existing web interface to add advanced logging functionality

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancedLogs);
    } else {
        initializeEnhancedLogs();
    }

    function initializeEnhancedLogs() {
        // Add enhanced CSS
        addEnhancedStyles();

        // Initialize enhanced logs functionality
        const enhancedLogs = new EnhancedServerLogs();
        window.enhancedLogs = enhancedLogs;

        // Add navigation button to header if it doesn't exist
        addLogsNavigation();

        // Enhance existing logs section
        enhanceExistingLogsSection();

        console.log('✅ Enhanced server logs functionality loaded successfully');
    }

    function addEnhancedStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Enhanced Logs Styles */
            .logs-section.enhanced {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 20px;
                margin-top: 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .enhanced-logs-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                flex-wrap: wrap;
                gap: 10px;
            }

            .enhanced-logs-stats {
                display: flex;
                gap: 15px;
                font-size: 0.9rem;
            }

            .enhanced-stat-item {
                background: rgba(255, 255, 255, 0.1);
                padding: 5px 12px;
                border-radius: 15px;
            }

            .enhanced-logs-controls {
                display: flex;
                gap: 10px;
                align-items: center;
                flex-wrap: wrap;
            }

            .enhanced-filter-select {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 0.9rem;
            }

            .enhanced-logs-container {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                overflow: hidden;
                margin-bottom: 15px;
                position: relative;
            }

            .enhanced-logs-content {
                height: 400px;
                overflow-y: auto;
                padding: 0;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.4;
            }

            .enhanced-log-entry {
                display: flex;
                padding: 8px 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                transition: background-color 0.2s ease;
            }

            .enhanced-log-entry:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            .enhanced-log-timestamp {
                min-width: 180px;
                color: #888;
                margin-right: 15px;
            }

            .enhanced-log-level {
                min-width: 80px;
                font-weight: bold;
                margin-right: 15px;
            }

            .enhanced-log-message {
                flex: 1;
                word-break: break-word;
            }

            .enhanced-log-info { color: #2196F3; }
            .enhanced-log-success { color: #4CAF50; }
            .enhanced-log-warning { color: #FF9800; }
            .enhanced-log-error { color: #f44336; }
            .enhanced-log-websocket { color: #00BCD4; }
            .enhanced-log-claude { color: #FF6B35; }

            .enhanced-control-button {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 8px 15px;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .enhanced-control-button:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }

            .enhanced-control-button.active {
                background: #4CAF50;
            }

            .enhanced-scroll-to-bottom {
                position: absolute;
                bottom: 20px;
                right: 20px;
                background: #2196F3;
                color: white;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 10;
            }

            .enhanced-scroll-to-bottom:hover {
                background: #1976D2;
                transform: scale(1.1);
            }

            .logs-nav-btn {
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
                z-index: 100;
            }

            .logs-nav-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }

            .log-activity-indicator {
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
            }

            .log-activity-indicator:hover {
                background: rgba(76, 175, 80, 1);
                transform: translateY(-2px);
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .enhanced-logs-header {
                    flex-direction: column;
                    align-items: stretch;
                }

                .enhanced-logs-controls {
                    justify-content: center;
                }

                .enhanced-log-entry {
                    flex-direction: column;
                    padding: 6px 15px;
                }

                .enhanced-log-timestamp,
                .enhanced-log-level {
                    min-width: auto;
                    margin-bottom: 5px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function addLogsNavigation() {
        const header = document.querySelector('header');
        if (header && !document.getElementById('logs-nav-btn')) {
            const logsNavBtn = document.createElement('button');
            logsNavBtn.id = 'logs-nav-btn';
            logsNavBtn.className = 'logs-nav-btn';
            logsNavBtn.innerHTML = '📋 Server Logs';

            logsNavBtn.addEventListener('click', () => {
                if (window.enhancedLogs) {
                    window.enhancedLogs.toggleLogsSection();
                }
            });

            header.appendChild(logsNavBtn);
        }
    }

    function enhanceExistingLogsSection() {
        const logsSection = document.getElementById('logs-section');
        if (logsSection) {
            logsSection.classList.add('enhanced');

            // Replace the existing logs container content
            const logsContainer = logsSection.querySelector('.logs-container');
            if (logsContainer) {
                logsContainer.innerHTML = `
                    <div class="enhanced-logs-header">
                        <h3>📋 Real-time Server Logs</h3>
                        <div class="enhanced-logs-stats">
                            <div class="enhanced-stat-item">
                                <span>Total: </span><span id="enhanced-total-logs">0</span>
                            </div>
                            <div class="enhanced-stat-item">
                                <span>Filtered: </span><span id="enhanced-filtered-logs">0</span>
                            </div>
                            <div class="enhanced-stat-item">
                                <span>Status: </span><span id="enhanced-log-status">🟢 Live</span>
                            </div>
                        </div>
                        <div class="enhanced-logs-controls">
                            <select class="enhanced-filter-select" id="enhanced-log-filter">
                                <option value="all">All Logs</option>
                                <option value="info">Info</option>
                                <option value="success">Success</option>
                                <option value="warning">Warning</option>
                                <option value="error">Error</option>
                                <option value="websocket">WebSocket</option>
                                <option value="claude">Claude</option>
                            </select>
                            <button class="enhanced-control-button" id="enhanced-auto-scroll-btn">📍 Auto Scroll</button>
                            <button class="enhanced-control-button" id="enhanced-pause-btn">⏸️ Pause</button>
                            <button class="enhanced-control-button" id="enhanced-clear-logs-btn">🗑️ Clear</button>
                            <button class="enhanced-control-button" id="enhanced-export-logs-btn">💾 Export</button>
                        </div>
                    </div>
                    <div class="enhanced-logs-container">
                        <div class="enhanced-logs-content" id="enhanced-logs-content">
                            <!-- Enhanced log entries will be inserted here -->
                        </div>
                        <button class="enhanced-scroll-to-bottom" id="enhanced-scroll-to-bottom">⬇️</button>
                    </div>
                `;
            }

            // Update existing logs controls
            const logsControls = logsSection.querySelector('.logs-controls');
            if (logsControls) {
                logsControls.style.display = 'none'; // Hide original controls
            }
        }
    }

    class EnhancedServerLogs {
        constructor() {
            this.logs = [];
            this.filteredLogs = [];
            this.currentFilter = 'all';
            this.autoScroll = true;
            this.isPaused = false;
            this.maxLogs = 1000;
            this.pollInterval = null;

            // Wait a bit for DOM modifications
            setTimeout(() => {
                this.initializeElements();
                this.setupEventListeners();
                this.startLogPolling();
                this.addActivityIndicator();
            }, 500);
        }

        initializeElements() {
            this.logsSection = document.getElementById('logs-section');
            this.logsContent = document.getElementById('enhanced-logs-content');
            this.logFilter = document.getElementById('enhanced-log-filter');
            this.autoScrollBtn = document.getElementById('enhanced-auto-scroll-btn');
            this.pauseBtn = document.getElementById('enhanced-pause-btn');
            this.clearBtn = document.getElementById('enhanced-clear-logs-btn');
            this.exportBtn = document.getElementById('enhanced-export-logs-btn');
            this.scrollToBottomBtn = document.getElementById('enhanced-scroll-to-bottom');
            this.totalLogsSpan = document.getElementById('enhanced-total-logs');
            this.filteredLogsSpan = document.getElementById('enhanced-filtered-logs');
            this.logStatus = document.getElementById('enhanced-log-status');
        }

        setupEventListeners() {
            if (!this.logFilter) return;

            // Filter change
            this.logFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterLogs();
            });

            // Auto scroll toggle
            this.autoScrollBtn?.addEventListener('click', () => {
                this.autoScroll = !this.autoScroll;
                this.autoScrollBtn.classList.toggle('active', this.autoScroll);
                this.autoScrollBtn.innerHTML = this.autoScroll ? '📍 Auto Scroll' : '📍 Manual';
            });

            // Pause/Resume
            this.pauseBtn?.addEventListener('click', () => {
                this.isPaused = !this.isPaused;
                this.pauseBtn.classList.toggle('active', this.isPaused);
                this.pauseBtn.innerHTML = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
                if (this.logStatus) {
                    this.logStatus.innerHTML = this.isPaused ? '⏸️ Paused' : '🟢 Live';
                }
            });

            // Clear logs
            this.clearBtn?.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all logs?')) {
                    this.clearLogs();
                }
            });

            // Export logs
            this.exportBtn?.addEventListener('click', () => {
                this.exportLogs();
            });

            // Scroll to bottom
            this.scrollToBottomBtn?.addEventListener('click', () => {
                this.scrollToBottom();
            });

            // Scroll detection
            this.logsContent?.addEventListener('scroll', () => {
                if (!this.scrollToBottomBtn) return;
                const { scrollTop, scrollHeight, clientHeight } = this.logsContent;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
                this.scrollToBottomBtn.style.display = isAtBottom ? 'none' : 'block';
            });
        }

        toggleLogsSection() {
            if (!this.logsSection) return;

            const isVisible = this.logsSection.style.display !== 'none';
            this.logsSection.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                this.loadRecentLogs();
            }
        }

        async startLogPolling() {
            // Load initial logs
            await this.loadRecentLogs();

            // Start polling every 2 seconds
            this.pollInterval = setInterval(() => {
                if (!this.isPaused) {
                    this.loadRecentLogs();
                }
            }, 2000);
        }

        async loadRecentLogs() {
            try {
                const response = await fetch('/api/logs');
                const data = await response.json();

                if (data.success && data.data?.logs) {
                    this.parseLogs(data.data.logs);
                }
            } catch (error) {
                console.error('Failed to load logs:', error);
                if (this.logStatus) {
                    this.logStatus.innerHTML = '❌ Error';
                }
            }
        }

        parseLogs(logString) {
            const lines = logString.split('\n').filter(line => line.trim());
            const newLogs = [];

            lines.forEach(line => {
                const match = line.match(/^\\[(.+?)\\] (.+)$/);
                if (match) {
                    const timestamp = match[1];
                    const message = match[2];
                    const level = this.detectLogLevel(message);

                    newLogs.push({
                        timestamp: timestamp,
                        level: level,
                        message: message,
                        color: `enhanced-log-${level}`
                    });
                }
            });

            // Only add new logs to avoid duplicates
            const lastLogTime = this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : '';
            const newLogsToAdd = newLogs.filter(log => log.timestamp > lastLogTime);

            this.logs.push(...newLogsToAdd);

            // Limit log count
            if (this.logs.length > this.maxLogs) {
                this.logs.splice(0, this.logs.length - this.maxLogs);
            }

            this.filterLogs();
        }

        detectLogLevel(message) {
            if (message.includes('🚀') || message.includes('✅') || message.includes('Ready')) return 'success';
            if (message.includes('❌') || message.includes('Error') || message.includes('Failed')) return 'error';
            if (message.includes('⚠️') || message.includes('Warning')) return 'warning';
            if (message.includes('📱') || message.includes('WebSocket')) return 'websocket';
            if (message.includes('🤖') || message.includes('Claude')) return 'claude';
            return 'info';
        }

        filterLogs() {
            if (this.currentFilter === 'all') {
                this.filteredLogs = [...this.logs];
            } else {
                this.filteredLogs = this.logs.filter(log => log.level === this.currentFilter);
            }

            this.renderLogs();
            this.updateStats();
        }

        renderLogs() {
            if (!this.logsContent) return;

            const html = this.filteredLogs.map(log => `
                <div class="enhanced-log-entry">
                    <div class="enhanced-log-timestamp">${log.timestamp}</div>
                    <div class="enhanced-log-level ${log.color}">${log.level.toUpperCase()}</div>
                    <div class="enhanced-log-message">${log.message}</div>
                </div>
            `).join('');

            this.logsContent.innerHTML = html;

            if (this.autoScroll) {
                setTimeout(() => this.scrollToBottom(), 100);
            }
        }

        scrollToBottom() {
            if (this.logsContent) {
                this.logsContent.scrollTop = this.logsContent.scrollHeight;
            }
        }

        clearLogs() {
            this.logs = [];
            this.filteredLogs = [];
            this.renderLogs();
            this.updateStats();
        }

        exportLogs() {
            const logText = this.filteredLogs.map(log =>
                `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
            ).join('\n');

            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `remoteclaude-logs-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        updateStats() {
            if (this.totalLogsSpan) {
                this.totalLogsSpan.textContent = this.logs.length;
            }
            if (this.filteredLogsSpan) {
                this.filteredLogsSpan.textContent = this.filteredLogs.length;
            }
        }

        addActivityIndicator() {
            // Remove existing indicator
            const existing = document.getElementById('log-activity-indicator');
            if (existing) {
                existing.remove();
            }

            // Add new activity indicator
            const indicator = document.createElement('div');
            indicator.id = 'log-activity-indicator';
            indicator.className = 'log-activity-indicator';
            indicator.innerHTML = '📊 Logs Active';
            indicator.style.display = 'block';

            indicator.addEventListener('click', () => {
                this.toggleLogsSection();
            });

            document.body.appendChild(indicator);

            // Animate indicator
            this.animateActivityIndicator(indicator);
        }

        animateActivityIndicator(indicator) {
            setInterval(() => {
                indicator.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    indicator.style.transform = 'scale(1)';
                }, 300);
            }, 3000);
        }
    }

    // Make the class globally available
    window.EnhancedServerLogs = EnhancedServerLogs;

    // Global function for logs toggle
    window.toggleEnhancedLogs = function() {
        if (window.enhancedLogs) {
            window.enhancedLogs.toggleLogsSection();
        }
    };

    console.log('📋 Enhanced Server Logs Integration Script Loaded');

})();
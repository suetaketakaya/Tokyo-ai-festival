class RemoteClaudeDashboard {
    constructor() {
        this.currentMode = 'local';
        this.serverStatus = 'running';
        this.sessionKey = '';
        this.currentHost = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadServerStatus();
        this.startStatusPolling();
    }

    bindEvents() {
        // Connection mode switching
        const modeRadios = document.querySelectorAll('input[name="connection-mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.currentMode = radio.value;
                this.toggleVpnSetup();
            });
        });

        // Switch mode button
        document.getElementById('switch-mode-btn').addEventListener('click', () => {
            this.switchConnectionMode();
        });

        // QR code regeneration
        document.getElementById('regenerate-qr-btn').addEventListener('click', () => {
            this.regenerateQRCode();
        });

        // Copy URL button
        document.getElementById('copy-url-btn').addEventListener('click', () => {
            this.copyConnectionURL();
        });

        // Server controls
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartServer();
        });

        document.getElementById('logs-btn').addEventListener('click', () => {
            this.toggleLogs();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });

        // WireGuard QR code
        document.getElementById('show-wireguard-qr').addEventListener('click', () => {
            this.showWireGuardQR();
        });

        // Logs controls
        document.getElementById('refresh-logs-btn').addEventListener('click', () => {
            this.refreshLogs();
        });

        document.getElementById('clear-logs-btn').addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('close-logs-btn').addEventListener('click', () => {
            this.closeLogs();
        });
    }

    async loadServerStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            this.updateServerStatus(data);
        } catch (error) {
            console.error('Failed to load server status:', error);
            this.showMessage('Failed to connect to server', 'error');
        }
    }

    updateServerStatus(data) {
        // Update server status
        document.getElementById('server-status').className = `status-dot ${data.status}`;
        document.getElementById('status-text').textContent = data.status === 'running' ? 'Running' : 'Stopped';
        
        // Update server info
        document.getElementById('current-host').textContent = data.host || 'Unknown';
        document.getElementById('current-port').textContent = data.port || '8090';
        document.getElementById('session-key').textContent = data.sessionKey || 'Loading...';
        
        // Update connection URL
        const connectionUrl = `ws://${data.host}:${data.port}/ws?key=${data.sessionKey}`;
        document.getElementById('connection-url').textContent = connectionUrl;
        
        // Update current mode
        if (data.mode) {
            this.currentMode = data.mode;
            document.getElementById(`mode-${data.mode}`).checked = true;
            this.toggleVpnSetup();
        }
        
        // Update QR code
        if (data.qrCodeUrl) {
            this.updateQRCode(data.qrCodeUrl);
        }
        
        // Update client list
        this.updateClientList(data.clients || []);
    }

    updateQRCode(qrCodeUrl) {
        const qrContainer = document.getElementById('qr-code');
        qrContainer.innerHTML = `<img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 10px;">`;
    }

    updateClientList(clients) {
        const clientList = document.getElementById('client-list');
        
        if (clients.length === 0) {
            clientList.innerHTML = '<div class="client-item">No clients connected</div>';
        } else {
            clientList.innerHTML = clients.map(client => 
                `<div class="client-item">
                    📱 ${client.name || 'Unknown'} (${client.ip}) - ${client.status}
                </div>`
            ).join('');
        }
    }

    toggleVpnSetup() {
        const vpnSetup = document.getElementById('vpn-setup');
        if (this.currentMode === 'vpn') {
            vpnSetup.style.display = 'block';
        } else {
            vpnSetup.style.display = 'none';
        }
    }

    async switchConnectionMode() {
        const button = document.getElementById('switch-mode-btn');
        const originalText = button.textContent;
        
        button.textContent = '🔄 Switching...';
        button.disabled = true;
        
        try {
            const response = await fetch('/api/switch-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: this.currentMode
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage(`Successfully switched to ${this.currentMode} mode`, 'success');
                // Reload status after mode switch
                setTimeout(() => this.loadServerStatus(), 2000);
            } else {
                this.showMessage(`Failed to switch mode: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Mode switch failed:', error);
            this.showMessage('Failed to switch connection mode', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async regenerateQRCode() {
        const button = document.getElementById('regenerate-qr-btn');
        const originalText = button.textContent;
        
        button.textContent = '🔄 Generating...';
        button.disabled = true;
        
        try {
            const response = await fetch('/api/regenerate-qr', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('QR Code regenerated successfully', 'success');
                this.loadServerStatus(); // Reload to get new QR code
            } else {
                this.showMessage('Failed to regenerate QR code', 'error');
            }
        } catch (error) {
            console.error('QR regeneration failed:', error);
            this.showMessage('Failed to regenerate QR code', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async copyConnectionURL() {
        const urlElement = document.getElementById('connection-url');
        const url = urlElement.textContent;
        
        try {
            await navigator.clipboard.writeText(url);
            this.showMessage('Connection URL copied to clipboard', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showMessage('Connection URL copied to clipboard', 'success');
        }
    }

    async restartServer() {
        if (!confirm('Are you sure you want to restart the server? All connections will be lost.')) {
            return;
        }
        
        const button = document.getElementById('restart-btn');
        const originalText = button.textContent;
        
        button.textContent = '🔄 Restarting...';
        button.disabled = true;
        
        try {
            const response = await fetch('/api/restart', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('Server is restarting...', 'info');
                // Poll for server to come back online
                setTimeout(() => this.waitForServerRestart(), 3000);
            } else {
                this.showMessage('Failed to restart server', 'error');
                button.textContent = originalText;
                button.disabled = false;
            }
        } catch (error) {
            console.error('Restart failed:', error);
            this.showMessage('Failed to restart server', 'error');
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async waitForServerRestart() {
        const maxAttempts = 20;
        let attempts = 0;
        
        const checkStatus = async () => {
            try {
                const response = await fetch('/api/status');
                if (response.ok) {
                    this.showMessage('Server restarted successfully', 'success');
                    this.loadServerStatus();
                    document.getElementById('restart-btn').textContent = '🔄 Restart Server';
                    document.getElementById('restart-btn').disabled = false;
                    return;
                }
            } catch (error) {
                // Server still restarting
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(checkStatus, 1000);
            } else {
                this.showMessage('Server restart may have failed. Please check manually.', 'error');
                document.getElementById('restart-btn').textContent = '🔄 Restart Server';
                document.getElementById('restart-btn').disabled = false;
            }
        };
        
        checkStatus();
    }

    toggleLogs() {
        const logsSection = document.getElementById('logs-section');
        if (logsSection.style.display === 'none' || !logsSection.style.display) {
            logsSection.style.display = 'block';
            this.refreshLogs();
        } else {
            logsSection.style.display = 'none';
        }
    }

    async refreshLogs() {
        try {
            const response = await fetch('/api/logs');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('server-logs').textContent = data.logs;
            } else {
                document.getElementById('server-logs').textContent = 'Failed to load logs';
            }
        } catch (error) {
            console.error('Failed to load logs:', error);
            document.getElementById('server-logs').textContent = 'Error loading logs';
        }
    }

    clearLogs() {
        if (confirm('Are you sure you want to clear the logs?')) {
            document.getElementById('server-logs').textContent = '';
            this.showMessage('Logs cleared', 'info');
        }
    }

    closeLogs() {
        document.getElementById('logs-section').style.display = 'none';
    }

    async showWireGuardQR() {
        const button = document.getElementById('show-wireguard-qr');
        const originalText = button.textContent;
        
        button.textContent = '🔄 Loading...';
        button.disabled = true;
        
        try {
            const response = await fetch('/api/wireguard-qr');
            const result = await response.json();
            
            if (result.success) {
                const qrContainer = document.getElementById('wireguard-qr-code');
                qrContainer.innerHTML = `<img src="${result.qrCodeUrl}" alt="WireGuard QR Code" style="width: 200px; height: 200px; border-radius: 10px;">`;
                this.showMessage('WireGuard QR code loaded', 'success');
            } else {
                this.showMessage('Failed to load WireGuard QR code', 'error');
            }
        } catch (error) {
            console.error('Failed to load WireGuard QR:', error);
            this.showMessage('Failed to load WireGuard QR code', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    openSettings() {
        this.showMessage('Settings panel coming soon...', 'info');
    }

    startStatusPolling() {
        // Poll server status every 5 seconds
        setInterval(() => {
            this.loadServerStatus();
        }, 5000);
    }

    showMessage(text, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        
        // Insert at top of container
        const container = document.querySelector('.container');
        container.insertBefore(message, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new RemoteClaudeDashboard();
});
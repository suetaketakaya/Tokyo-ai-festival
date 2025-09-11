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
        // Connection mode cards (improved interaction)
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                if (mode && mode !== this.currentMode) {
                    this.selectMode(mode);
                }
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
            this.restartServer('local'); // Default to local mode
        });

        // Restart dropdown functionality
        document.getElementById('restart-dropdown-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleRestartDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.hideRestartDropdown();
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

        // VPN Connection QR code
        const vpnConnectionQRBtn = document.getElementById('show-vpn-connection-qr');
        if (vpnConnectionQRBtn) {
            vpnConnectionQRBtn.addEventListener('click', () => {
                this.showVPNConnectionQR();
            });
        }

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
        
        // Update connection info section
        document.getElementById('info-host').textContent = data.host || 'Unknown';
        document.getElementById('info-port').textContent = data.port || '8090';
        document.getElementById('info-session').textContent = data.sessionKey || 'Loading...';
        
        // Update LAN IP for NAT configuration
        const lanIpAddress = document.getElementById('lan-ip-address');
        const lanIpDisplay = document.getElementById('lan-ip-display');
        if (lanIpAddress && data.host) {
            lanIpAddress.textContent = data.host;
        }
        if (lanIpDisplay && data.host) {
            lanIpDisplay.textContent = data.host;
        }
        
        // Update connection URL - prefer server-provided connection_url over constructed one
        const connectionUrl = data.connection_url || `ws://${data.host}:${data.port}/ws?key=${data.sessionKey}`;
        document.getElementById('connection-url').textContent = connectionUrl;
        
        // Update current mode
        if (data.mode) {
            this.currentMode = data.mode;
            this.updateModeDisplay(data.mode, true);
            this.toggleVpnSetup();
        }
        
        // Update QR code
        if (data.qrCodeUrl) {
            this.updateQRCode(data.qrCodeUrl);
        }
        
        // Update client list
        this.updateClientList(data.clients || []);
    }

    selectMode(mode) {
        if (mode === this.currentMode) return;
        
        // Store the selected mode temporarily for UI preview
        this.selectedMode = mode;
        
        // Update mode display to show selection
        this.updateModeDisplay(mode);
        
        // Update switch button to reflect what will happen
        const switchBtn = document.getElementById('switch-mode-btn');
        switchBtn.disabled = false;
        switchBtn.querySelector('.button-text').textContent = 
            mode === 'vpn' ? 'Switch to VPN Mode' : 'Switch to Local Mode';
        
        // Update the switch button click handler to use selected mode
        switchBtn.onclick = () => this.switchConnectionMode(mode);
        
        // Show/hide VPN setup based on selected mode
        const vpnSetup = document.getElementById('vpn-setup');
        if (mode === 'vpn') {
            vpnSetup.style.display = 'block';
        } else {
            vpnSetup.style.display = 'none';
        }
    }

    updateModeDisplay(mode, isCurrentMode = false) {
        // Update mode cards
        document.querySelectorAll('.mode-card').forEach(card => {
            card.classList.remove('active', 'selected');
            card.querySelector('.mode-indicator').classList.remove('active');
        });
        
        const activeCard = document.querySelector(`[data-mode="${mode}"]`);
        if (activeCard) {
            if (isCurrentMode || mode === this.currentMode) {
                activeCard.classList.add('active');
                activeCard.querySelector('.mode-indicator').classList.add('active');
            } else {
                activeCard.classList.add('selected');
            }
        }
        
        // Only update badge and status if this is the actual current mode
        if (isCurrentMode || mode === this.currentMode) {
            // Update current mode badge
            const modeBadge = document.getElementById('current-mode-badge');
            modeBadge.textContent = mode === 'vpn' ? 'WireGuard VPN' : 'Local Network';
            
            // Update mode status
            document.getElementById('mode-status-text').textContent = 'Ready';
            document.getElementById('mode-status-dot').textContent = '🟢';
            
            // Show/hide VPN port information
            const vpnPortInfo = document.getElementById('vpn-port-info');
            const infoVpnPort = document.getElementById('info-vpn-port');
            
            if (mode === 'vpn') {
                if (vpnPortInfo) vpnPortInfo.style.display = 'block';
                if (infoVpnPort) infoVpnPort.style.display = 'flex';
            } else {
                if (vpnPortInfo) vpnPortInfo.style.display = 'none';
                if (infoVpnPort) infoVpnPort.style.display = 'none';
            }
            
            // Update restart button text to reflect current mode
            const restartBtn = document.getElementById('restart-btn');
            const buttonText = restartBtn.querySelector('.button-text');
            if (buttonText) {
                buttonText.textContent = mode === 'vpn' 
                    ? 'Restart in VPN Mode' 
                    : 'Restart in Local Mode';
            }
        }
    }

    updateQRCode(qrCodeUrl) {
        const qrContainer = document.getElementById('qr-code');
        
        // Show loading state
        qrContainer.innerHTML = `
            <div class="qr-loading-state">
                <div class="qr-loading">⏳</div>
                <p>Updating QR Code...</p>
            </div>
        `;
        
        // Create new image with cache-busting
        const img = new Image();
        img.onload = () => {
            qrContainer.innerHTML = `<img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 10px;">`;
        };
        img.onerror = () => {
            qrContainer.innerHTML = `
                <div class="qr-placeholder">
                    <div class="qr-loading">📱</div>
                    <p>QR Code Loading Failed</p>
                </div>
            `;
        };
        
        // Load image with cache-busting timestamp
        img.src = qrCodeUrl + (qrCodeUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
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

    async switchConnectionMode(targetMode = null) {
        // Determine target mode: if not specified, switch to opposite of current mode
        const newMode = targetMode || (this.currentMode === 'vpn' ? 'local' : 'vpn');
        
        const button = document.getElementById('switch-mode-btn');
        const originalText = button.querySelector('.button-text').textContent;
        const originalIcon = button.querySelector('.button-icon').textContent;
        
        // Update button state
        button.disabled = true;
        button.querySelector('.button-icon').textContent = '⏳';
        button.querySelector('.button-icon').classList.add('loading-spinner');
        
        // Show progress indicator
        const progressTitle = newMode === 'vpn' 
            ? 'Starting WireGuard VPN' 
            : 'Switching to Local Network';
        const progressIcon = newMode === 'vpn' ? '🔐' : '🏠';
        
        this.showProgress(progressTitle, progressIcon);
        
        if (newMode === 'vpn') {
            button.querySelector('.button-text').textContent = 'Starting VPN...';
            this.updateProgress(20, 'Initializing WireGuard...');
        } else {
            button.querySelector('.button-text').textContent = 'Switching to Local...';
            this.updateProgress(30, 'Configuring local network...');
        }
        
        try {
            this.updateProgress(50, 'Sending configuration...');
            
            const response = await fetch('/api/switch-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: newMode
                })
            });
            
            this.updateProgress(70, 'Processing server response...');
            const result = await response.json();
            
            if (result.success) {
                this.updateProgress(90, 'Updating configuration...');
                
                // Update current mode immediately for UI consistency
                this.currentMode = newMode;
                this.updateModeDisplay(newMode, true);
                this.toggleVpnSetup();
                
                // Force immediate refresh of connection info with a small delay to ensure backend has processed
                setTimeout(() => {
                    this.forceRefreshConnectionInfo(newMode);
                }, 500);
                
                // Reload status multiple times to ensure we get the updated state
                setTimeout(() => this.loadServerStatus(), 1000);
                setTimeout(() => this.loadServerStatus(), 3000);
                setTimeout(() => this.loadServerStatus(), 6000);
                
                // Force QR code refresh and clear old QR if switching to local
                if (newMode === 'vpn') {
                    setTimeout(() => this.regenerateQRCode(), 5000);
                    this.updateProgress(100, 'VPN setup complete!');
                } else {
                    // Clear VPN QR codes when switching to local mode
                    this.clearVpnQRCodes();
                    this.updateProgress(100, 'Local network ready!');
                }
                
                setTimeout(() => {
                    this.hideProgress();
                    this.showMessage(`Successfully switched to ${newMode} mode`, 'success');
                }, 1000);
                
            } else {
                this.hideProgress();
                this.showMessage(`Failed to switch mode: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Mode switch failed:', error);
            this.hideProgress();
            this.showMessage('Failed to switch connection mode', 'error');
        } finally {
            button.querySelector('.button-text').textContent = originalText;
            button.querySelector('.button-icon').textContent = originalIcon;
            button.querySelector('.button-icon').classList.remove('loading-spinner');
            button.disabled = false;
            this.isModeSwitchInProgress = false;
        }
    }

    async regenerateQRCode(silent = false) {
        const button = document.getElementById('regenerate-qr-btn');
        const originalText = button.querySelector('.button-text').textContent;
        const originalIcon = button.querySelector('.button-icon').textContent;
        
        if (!silent) {
            button.querySelector('.button-icon').textContent = '⏳';
            button.querySelector('.button-icon').classList.add('loading-spinner');
            button.querySelector('.button-text').textContent = 'Generating...';
            button.disabled = true;
        }
        
        try {
            const response = await fetch('/api/regenerate-qr', {
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
                if (!silent) {
                    this.showMessage('QR Code regenerated successfully', 'success');
                }
                
                // Reload server status to get new QR code
                await this.loadServerStatus();
                
                // Force QR code update
                if (result.qrCodeUrl) {
                    this.updateQRCode(result.qrCodeUrl);
                }
                
                return true;
            } else {
                if (!silent) {
                    this.showMessage('Failed to regenerate QR code', 'error');
                }
                throw new Error(result.error || 'QR generation failed');
            }
        } catch (error) {
            console.error('QR regeneration failed:', error);
            if (!silent) {
                this.showMessage('Failed to regenerate QR code', 'error');
            }
            throw error;
        } finally {
            if (!silent) {
                button.querySelector('.button-text').textContent = originalText;
                button.querySelector('.button-icon').textContent = originalIcon;
                button.querySelector('.button-icon').classList.remove('loading-spinner');
                button.disabled = false;
            }
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

    async restartServer(mode = 'local') {
        // Enhanced confirmation dialog with mode selection
        const modeText = mode === 'local' ? 'Local Network' : 'VPN';
        const confirmMessage = `Restart server in ${modeText} mode?\n\nThis will:\n• Disconnect all current clients\n• Regenerate QR codes\n• Update connection settings`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const button = document.getElementById('restart-btn');
        const originalText = button.textContent;
        
        // Show progress indicator
        this.showProgress('Restarting Server', '🔄');
        button.textContent = '🔄 Restarting...';
        button.disabled = true;
        
        try {
            this.updateProgress(20, 'Stopping current server...');
            
            const response = await fetch('/api/restart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: mode,
                    regenerateQR: true
                })
            });
            
            this.updateProgress(40, 'Server stopping...');
            const result = await response.json();
            
            if (result.success) {
                this.updateProgress(60, 'Waiting for server restart...');
                this.showMessage(`Server restarting in ${modeText} mode...`, 'info');
                
                // Update current mode immediately
                this.currentMode = mode;
                this.updateModeDisplay(mode);
                
                // Poll for server to come back online
                setTimeout(() => this.waitForServerRestart(), 3000);
            } else {
                this.hideProgress();
                this.showMessage('Failed to restart server', 'error');
                button.textContent = originalText;
                button.disabled = false;
            }
        } catch (error) {
            console.error('Restart failed:', error);
            this.hideProgress();
            this.showMessage('Failed to restart server', 'error');
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async waitForServerRestart() {
        const maxAttempts = 20;
        let attempts = 0;
        
        const checkStatus = async () => {
            attempts++;
            const progress = Math.min(95, 60 + (attempts * 2));
            this.updateProgress(progress, `Checking server status (${attempts}/${maxAttempts})...`);
            
            try {
                const response = await fetch('/api/status');
                if (response.ok) {
                    this.updateProgress(100, 'Server online! Updating QR codes...');
                    
                    // Server is back online, load status and regenerate QR codes
                    await this.loadServerStatus();
                    
                    // Auto-regenerate QR code for better user experience
                    setTimeout(async () => {
                        try {
                            await this.regenerateQRCode(true); // Silent regeneration
                            this.hideProgress();
                            this.showMessage('Server restarted successfully with updated QR codes', 'success');
                        } catch (error) {
                            this.hideProgress();
                            this.showMessage('Server restarted but QR code update failed', 'warning');
                        }
                        
                        // Reset restart button
                        const button = document.getElementById('restart-btn');
                        button.textContent = '🔄 Restart Server';
                        button.disabled = false;
                    }, 1000);
                    
                    return;
                }
            } catch (error) {
                // Server still restarting
                console.log('Server still restarting, attempt:', attempts);
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkStatus, 1000);
            } else {
                this.hideProgress();
                this.showMessage('Server restart may have failed. Please check manually.', 'error');
                const button = document.getElementById('restart-btn');
                button.textContent = '🔄 Restart Server';
                button.disabled = false;
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
                // Build absolute URL for the QR code image
                const baseUrl = window.location.origin; // Gets http://192.168.11.106:8080
                const imageUrl = baseUrl + result.data.qrCodeUrl; // /wireguard-qr.png
                console.log('Loading WireGuard QR from:', imageUrl);
                console.log('API response:', result);
                
                qrContainer.innerHTML = `<img src="${imageUrl}" alt="WireGuard QR Code" style="width: 200px; height: 200px; border-radius: 10px; border: 1px solid #ddd;" 
                    onload="console.log('WireGuard QR image loaded successfully')" 
                    onerror="console.error('Failed to load WireGuard QR image:', this.src)">`;
                this.showMessage('WireGuard QR code loaded', 'success');
            } else {
                console.error('WireGuard QR API error:', result);
                this.showMessage(`Failed to load WireGuard QR code: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to load WireGuard QR:', error);
            this.showMessage(`Failed to load WireGuard QR code: ${error.message}`, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async showVPNConnectionQR() {
        const button = document.getElementById('show-vpn-connection-qr');
        const originalText = button.textContent;
        
        button.textContent = '🔄 Loading...';
        button.disabled = true;
        
        try {
            const response = await fetch('/api/vpn-connection-qr');
            const result = await response.json();
            
            if (result.success) {
                const qrContainer = document.getElementById('vpn-connection-qr-code');
                // Build absolute URL for the QR code image
                const baseUrl = window.location.origin; // Gets http://192.168.11.106:8080
                const imageUrl = baseUrl + result.data.qrCodeUrl; // /vpn-connection-qr.png
                console.log('Loading VPN connection QR from:', imageUrl);
                console.log('API response:', result);
                
                qrContainer.innerHTML = `<img src="${imageUrl}" alt="VPN Connection QR Code" style="width: 200px; height: 200px; border-radius: 10px; border: 1px solid #ddd;" 
                    onload="console.log('VPN Connection QR image loaded successfully')" 
                    onerror="console.error('Failed to load VPN Connection QR image:', this.src)">`;
                this.showMessage('VPN Connection QR code loaded (for RemoteClaude app)', 'success');
            } else {
                console.error('VPN Connection QR API error:', result);
                this.showMessage(`Failed to load VPN Connection QR code: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to load VPN Connection QR:', error);
            this.showMessage(`Failed to load VPN Connection QR code: ${error.message}`, 'error');
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

    showMessage(text, type = 'info', persistent = false) {
        // Remove existing messages of same type (optional)
        const existingMessages = document.querySelectorAll(`.message.${type}`);
        existingMessages.forEach(msg => this.removeMessage(msg));
        
        // Create new message
        const message = document.createElement('div');
        message.className = `message ${type}`;
        
        // Create message content
        const messageText = document.createElement('span');
        messageText.textContent = text;
        message.appendChild(messageText);
        
        // Add close button for persistent messages
        if (persistent) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'message-close';
            closeBtn.innerHTML = '×';
            closeBtn.onclick = () => this.removeMessage(message);
            message.appendChild(closeBtn);
        }
        
        // Insert at top of container
        const container = document.querySelector('.container');
        container.insertBefore(message, container.firstChild);
        
        // Auto-remove after delay (unless persistent)
        if (!persistent) {
            const delay = type === 'error' ? 8000 : 5000; // Errors stay longer
            setTimeout(() => {
                if (message.parentNode) {
                    this.removeMessage(message);
                }
            }, delay);
        }
        
        return message;
    }

    removeMessage(message) {
        if (message && message.parentNode) {
            message.classList.add('removing');
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 300); // Match animation duration
        }
    }

    showProgress(title, icon = '⏳') {
        // Remove existing progress
        this.hideProgress();
        
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.id = 'current-progress';
        
        progressContainer.innerHTML = `
            <div class="progress-header">
                <span class="progress-icon">${icon}</span>
                <h4 class="progress-title">${title}</h4>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
            </div>
            <p class="progress-text" id="progress-text">Starting...</p>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(progressContainer, container.children[1]); // After messages
        
        return progressContainer;
    }

    updateProgress(percent, text) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
        
        if (progressText && text) {
            progressText.textContent = text;
        }
    }

    hideProgress() {
        const existing = document.getElementById('current-progress');
        if (existing) {
            existing.remove();
        }
    }

    toggleRestartDropdown() {
        const dropdown = document.getElementById('restart-dropdown');
        const button = document.getElementById('restart-dropdown-btn');
        
        if (dropdown.classList.contains('show')) {
            this.hideRestartDropdown();
        } else {
            this.showRestartDropdown();
        }
    }

    showRestartDropdown() {
        const dropdown = document.getElementById('restart-dropdown');
        const button = document.getElementById('restart-dropdown-btn');
        
        dropdown.classList.add('show');
        button.classList.add('active');
    }

    hideRestartDropdown() {
        const dropdown = document.getElementById('restart-dropdown');
        const button = document.getElementById('restart-dropdown-btn');
        
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }

    clearVpnQRCodes() {
        // Clear WireGuard QR code
        const wireguardQR = document.getElementById('wireguard-qr-code');
        if (wireguardQR) {
            wireguardQR.innerHTML = '<div class="qr-placeholder">WireGuard QR Code</div>';
        }
        
        // Clear VPN connection QR code
        const vpnConnectionQR = document.getElementById('vpn-connection-qr-code');
        if (vpnConnectionQR) {
            vpnConnectionQR.innerHTML = '<div class="qr-placeholder">VPN Connection QR Code</div>';
        }
        
        console.log('VPN QR codes cleared for local mode');
    }

    async forceRefreshConnectionInfo(newMode) {
        console.log(`Force refreshing connection info for mode: ${newMode}`);
        
        try {
            // Fetch fresh server status
            const response = await fetch('/api/status');
            const status = await response.json();
            
            // Update the connection URL display
            const connectionUrlElement = document.getElementById('connection-url');
            if (connectionUrlElement && status.connection_url) {
                connectionUrlElement.textContent = status.connection_url;
            }
            
            // Update the ready status badge
            const statusBadge = document.querySelector('.status-badge.ready');
            if (statusBadge) {
                if (newMode === 'local') {
                    statusBadge.textContent = 'Ready to Connect (Local)';
                } else if (newMode === 'vpn') {
                    statusBadge.textContent = 'Ready to Connect (VPN)';
                } else {
                    statusBadge.textContent = 'Ready to Connect';
                }
            }
            
            // Force refresh QR codes
            await this.updateQRCode('connection', `/api/qr-connection?mode=${newMode}&t=${Date.now()}`);
            
            console.log('Connection info refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh connection info:', error);
            this.showNotification('Failed to refresh connection information', 'error');
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new RemoteClaudeDashboard();
});
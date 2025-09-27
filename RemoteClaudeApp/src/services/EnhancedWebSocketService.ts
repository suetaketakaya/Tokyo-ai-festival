/**
 * Enhanced WebSocket Service with improved timeout handling and performance optimizations
 * iOS アプリケーション用に最適化されたWebSocketサービス
 */

interface WebSocketCallbacks {
  onOpen?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

interface ConnectionMetrics {
  totalReconnects: number;
  lastDisconnectReason: string;
  avgLatency: number;
  connectionUptime: number;
  connectionStartTime: number;
  dataTransferred: number;
  messagesCount: number;
}

interface ConnectionConfig {
  heartbeatInterval: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  connectionTimeout: number;
  maxReconnectDelay: number;
  exponentialBackoff: boolean;
  enableCompression: boolean;
  enableKeepAlive: boolean;
}

type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'unstable' | 'offline';

interface ScreenCallbacks {
  screenId: string;
  callbacks: WebSocketCallbacks;
  priority: number;
  isActive: boolean;
  registeredAt: number;
}

class EnhancedWebSocketService {
  private ws: WebSocket | null = null;
  private connectionUrl: string = '';
  private isConnecting: boolean = false;
  private isManualDisconnect: boolean = false;

  // Enhanced screen management
  private screenCallbacks: Map<string, ScreenCallbacks> = new Map();
  private currentActiveScreen: string | null = null;

  // Adaptive configuration based on network conditions
  private config: ConnectionConfig = {
    heartbeatInterval: 30000, // 30秒に延長（iOS最適化）
    reconnectInterval: 3000,  // 3秒に延長
    maxReconnectAttempts: 15, // 15回に増加
    connectionTimeout: 30000, // 30秒に延長（iOS最適化）
    maxReconnectDelay: 60000, // 60秒に延長
    exponentialBackoff: true,
    enableCompression: true,
    enableKeepAlive: true,
  };

  // Enhanced connection monitoring
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private connectionQuality: ConnectionQuality = 'offline';
  private lastPongTime: number = 0;
  private lastPingTime: number = 0;

  // Enhanced metrics tracking
  private connectionMetrics: ConnectionMetrics = {
    totalReconnects: 0,
    lastDisconnectReason: '',
    avgLatency: 0,
    connectionUptime: 0,
    connectionStartTime: 0,
    dataTransferred: 0,
    messagesCount: 0,
  };

  // Performance optimizations
  private messageQueue: any[] = [];
  private maxQueueSize: number = 50; // iOS最適化のため削減
  private lastActivity: number = 0;
  private performanceMonitor: NodeJS.Timeout | null = null;

  // iOS specific optimizations
  private isAppInForeground: boolean = true;
  private backgroundTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializePerformanceMonitoring();
    this.setupAppStateHandling();
  }

  private initializePerformanceMonitoring(): void {
    this.performanceMonitor = setInterval(() => {
      this.cleanupInactiveScreens();
      this.optimizeConfiguration();
      this.updateConnectionMetrics();
    }, 60000); // 1分間隔でメンテナンス
  }

  private setupAppStateHandling(): void {
    // iOS アプリ状態変更の処理
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isAppInForeground = !document.hidden;
        this.handleAppStateChange();
      });
    }
  }

  private handleAppStateChange(): void {
    if (this.isAppInForeground) {
      console.log('📱 App returned to foreground - resuming connections');
      if (this.backgroundTimeout) {
        clearTimeout(this.backgroundTimeout);
        this.backgroundTimeout = null;
      }
      this.resumeConnection();
    } else {
      console.log('📱 App moved to background - optimizing connections');
      this.backgroundTimeout = setTimeout(() => {
        this.pauseConnection();
      }, 30000); // 30秒後にバックグラウンド最適化
    }
  }

  private pauseConnection(): void {
    console.log('🔄 Pausing connection for background optimization');
    this.stopHealthMonitoring();
    this.config.heartbeatInterval = 120000; // 2分に延長
  }

  private resumeConnection(): void {
    console.log('🔄 Resuming connection optimization');
    this.config.heartbeatInterval = 30000; // 30秒に戻す
    if (this.isConnected()) {
      this.startHealthMonitoring();
    } else if (!this.isConnecting) {
      this.attemptReconnection();
    }
  }

  private cleanupInactiveScreens(): void {
    const now = Date.now();
    const inactiveThreshold = 300000; // 5分

    for (const [screenId, screenData] of this.screenCallbacks) {
      if (!screenData.isActive && now - screenData.registeredAt > inactiveThreshold) {
        console.log(`🗑️ Cleaning up inactive screen: ${screenId}`);
        this.screenCallbacks.delete(screenId);
      }
    }
  }

  private optimizeConfiguration(): void {
    const now = Date.now();
    const connectionAge = this.connectionMetrics.connectionStartTime > 0 ?
      now - this.connectionMetrics.connectionStartTime : 0;

    // 接続が安定している場合の最適化
    if (connectionAge > 300000 && this.connectionQuality === 'excellent') { // 5分以上安定
      this.config.heartbeatInterval = Math.min(45000, this.config.heartbeatInterval + 5000);
    }

    // 不安定な接続の場合の調整
    if (this.connectionQuality === 'poor' || this.connectionQuality === 'unstable') {
      this.config.heartbeatInterval = Math.max(15000, this.config.heartbeatInterval - 5000);
    }
  }

  private updateConnectionMetrics(): void {
    if (this.connectionMetrics.connectionStartTime > 0) {
      const now = Date.now();
      this.connectionMetrics.connectionUptime = now - this.connectionMetrics.connectionStartTime;
    }
  }

  async connect(url: string, callbacks: WebSocketCallbacks, screenId?: string): Promise<boolean> {
    if (this.isConnecting) {
      console.log('🔄 Connection already in progress...');
      if (screenId) {
        this.registerScreenCallbacks(screenId, callbacks, 1);
      }
      return false;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected - registering screen callbacks');
      if (screenId) {
        this.registerScreenCallbacks(screenId, callbacks, 1);
        setTimeout(() => callbacks.onOpen?.(), 0);
      }
      return true;
    }

    return new Promise((resolve) => {
      this.isConnecting = true;
      this.isManualDisconnect = false;
      this.connectionUrl = url;
      this.reconnectAttempts = 0;

      if (screenId) {
        this.registerScreenCallbacks(screenId, callbacks, 1);
        this.setActiveScreen(screenId);
      }

      console.log(`🔌 Initiating connection to: ${url} (timeout: ${this.config.connectionTimeout}ms)`);

      try {
        this.validateUrl(url);
        this.createWebSocketConnection(url);

        // Connection success handler
        this.ws!.onopen = () => {
          console.log('✅ WebSocket connection established successfully');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionQuality = 'excellent';
          this.connectionMetrics.connectionStartTime = Date.now();

          this.clearReconnectTimer();
          this.startHealthMonitoring();
          this.processMessageQueue();
          this.notifyAllScreens('onOpen');
          resolve(true);
        };

        // Message handler
        this.ws!.onmessage = (event) => {
          this.handleIncomingMessage(event);
          this.lastActivity = Date.now();
        };

        // Error handler
        this.ws!.onerror = (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnecting = false;
          this.connectionQuality = 'unstable';
          this.connectionMetrics.lastDisconnectReason = `Connection error: ${error}`;
          this.notifyAllScreens('onError', error);
          resolve(false);
        };

        // Close handler
        this.ws!.onclose = (event) => {
          console.log(`🔌 WebSocket connection closed: ${event.code} - ${event.reason}`);
          this.handleConnectionClose(event);
          if (event.code !== 1000) {
            resolve(false);
          }
        };

        // Enhanced connection timeout with retry logic
        setTimeout(() => {
          if (this.isConnecting) {
            console.log(`⏰ Connection timeout after ${this.config.connectionTimeout}ms`);
            this.isConnecting = false;
            if (this.ws) {
              this.ws.close(1006, 'Connection timeout');
              this.ws = null;
            }

            // Auto-retry with exponential backoff
            if (this.reconnectAttempts < 3) {
              setTimeout(() => {
                console.log('🔄 Auto-retrying connection due to timeout...');
                this.connect(url, callbacks, screenId);
              }, Math.pow(2, this.reconnectAttempts) * 1000);
            }

            resolve(false);
          }
        }, this.config.connectionTimeout);

      } catch (error) {
        console.error('❌ Connection setup failed:', error);
        this.isConnecting = false;
        this.notifyAllScreens('onError', error as Event);
        resolve(false);
      }
    });
  }

  registerScreenCallbacks(screenId: string, callbacks: WebSocketCallbacks, priority: number = 1): void {
    console.log(`📱 Registering enhanced callbacks for screen: ${screenId}`);

    const screenCallbacks: ScreenCallbacks = {
      screenId,
      callbacks: this.wrapCallbacksWithErrorHandling(callbacks, screenId),
      priority,
      isActive: true,
      registeredAt: Date.now(),
    };

    this.screenCallbacks.set(screenId, screenCallbacks);

    if (!this.currentActiveScreen || priority > (this.screenCallbacks.get(this.currentActiveScreen)?.priority ?? 0)) {
      this.currentActiveScreen = screenId;
      console.log(`🎯 Active screen updated to: ${screenId}`);
    }
  }

  setActiveScreen(screenId: string): void {
    // Mark previous screen as inactive
    if (this.currentActiveScreen && this.screenCallbacks.has(this.currentActiveScreen)) {
      const prevScreen = this.screenCallbacks.get(this.currentActiveScreen)!;
      prevScreen.isActive = false;
      this.screenCallbacks.set(this.currentActiveScreen, prevScreen);
    }

    // Activate new screen
    if (this.screenCallbacks.has(screenId)) {
      const newScreen = this.screenCallbacks.get(screenId)!;
      newScreen.isActive = true;
      this.screenCallbacks.set(screenId, newScreen);
      this.currentActiveScreen = screenId;
      console.log(`🎯 Active screen changed to: ${screenId}`);
    }
  }

  private wrapCallbacksWithErrorHandling(callbacks: WebSocketCallbacks, screenId: string): WebSocketCallbacks {
    return {
      onOpen: callbacks.onOpen ? () => {
        try {
          callbacks.onOpen!();
        } catch (error) {
          console.error(`❌ Error in onOpen for ${screenId}:`, error);
        }
      } : undefined,

      onMessage: callbacks.onMessage ? (message) => {
        try {
          callbacks.onMessage!(message);
          this.connectionMetrics.messagesCount++;
        } catch (error) {
          console.error(`❌ Error in onMessage for ${screenId}:`, error);
        }
      } : undefined,

      onError: callbacks.onError ? (error) => {
        try {
          callbacks.onError!(error);
        } catch (callbackError) {
          console.error(`❌ Error in onError callback for ${screenId}:`, callbackError);
        }
      } : undefined,

      onClose: callbacks.onClose ? (event) => {
        try {
          callbacks.onClose!(event);
        } catch (error) {
          console.error(`❌ Error in onClose callback for ${screenId}:`, error);
        }
      } : undefined,
    };
  }

  private validateUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL: URL must be a non-empty string');
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('ws://') && !trimmedUrl.startsWith('wss://')) {
      throw new Error('Invalid protocol: URL must start with ws:// or wss://');
    }

    console.log('✅ URL validation passed:', trimmedUrl);
  }

  private createWebSocketConnection(url: string): void {
    const protocols: string[] = [];
    const options: any = {
      headers: {
        'User-Agent': 'RemoteClaudeApp/3.8.0 (React Native iOS)',
        'X-Client-Version': '3.8.0',
        'X-Platform': 'iOS'
      },
    };

    // iOS最適化のオプション
    if (this.config.enableCompression) {
      options.perMessageDeflate = true;
    }

    this.ws = new WebSocket(url, protocols, options);
    console.log('✅ Enhanced WebSocket instance created');
  }

  private handleIncomingMessage(event: MessageEvent): void {
    try {
      const rawData = event.data;
      this.connectionMetrics.dataTransferred += rawData.length || 0;

      if (typeof rawData !== 'string') {
        console.error('❌ Non-string message received:', typeof rawData);
        return;
      }

      const message = JSON.parse(rawData);
      console.log(`📨 Message received: ${message.type} (${rawData.length} bytes)`);

      // Handle pong responses for enhanced health monitoring
      if (message.type === 'pong') {
        const timestamp = message.data?.timestamp?.timestamp || message.data?.timestamp || message.timestamp;
        this.handlePongResponse(timestamp);
        return;
      }

      // Enhanced message routing to active screen first
      this.notifyAllScreens('onMessage', message);

    } catch (error) {
      console.error('❌ Message parsing failed:', error);
      console.error('❌ Raw data preview:', event.data?.substring(0, 200));
    }
  }

  private handleConnectionClose(event: CloseEvent): void {
    console.log('🔌 Connection closed:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    this.isConnecting = false;
    this.ws = null;
    this.updateConnectionMetrics();

    const reasonText = this.getCloseReasonText(event.code, event.reason);
    this.connectionMetrics.lastDisconnectReason = reasonText;

    this.stopHealthMonitoring();
    this.notifyAllScreens('onClose', event);

    // Enhanced auto-reconnect logic
    if (!this.isManualDisconnect && this.shouldAttemptReconnect(event.code)) {
      console.log(`🔄 Scheduling enhanced reconnect for code ${event.code}`);
      this.scheduleReconnect();
    } else {
      console.log(`ℹ️ No reconnect needed for code ${event.code}`);
      this.connectionQuality = 'offline';
    }
  }

  private getCloseReasonText(code: number, reason: string): string {
    const codeReasons: Record<number, string> = {
      1000: 'Normal closure',
      1001: 'Going away',
      1002: 'Protocol error',
      1003: 'Unsupported data',
      1006: 'Abnormal closure',
      1007: 'Invalid frame payload data',
      1008: 'Policy violation',
      1009: 'Message too big',
      1011: 'Internal server error',
      1012: 'Service restart',
      1013: 'Try again later',
      1014: 'Bad gateway',
      1015: 'TLS handshake'
    };

    return codeReasons[code] || `Code ${code}: ${reason || 'Unknown reason'}`;
  }

  private shouldAttemptReconnect(code: number): boolean {
    // Don't reconnect for normal closures or manual disconnects
    // Code 1001 (Going away) is allowed for auto-reconnect in development environments
    const noReconnectCodes = [1000];
    return !noReconnectCodes.includes(code) && !this.isManualDisconnect;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log(`❌ Max reconnect attempts (${this.config.maxReconnectAttempts}) exceeded`);
      this.connectionQuality = 'offline';
      return;
    }

    this.reconnectAttempts++;
    this.connectionMetrics.totalReconnects++;

    // Enhanced exponential backoff with adaptive delay
    let delay = this.config.reconnectInterval;
    if (this.config.exponentialBackoff) {
      delay = Math.min(
        this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1), // More gradual increase
        this.config.maxReconnectDelay
      );
      // Add adaptive jitter based on connection quality
      const jitter = Math.random() * 2000 * (this.reconnectAttempts / this.config.maxReconnectAttempts);
      delay += jitter;
    }

    // Update connection quality based on attempts
    this.updateConnectionQualityFromAttempts();

    console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${Math.round(delay)}ms (Quality: ${this.connectionQuality})`);

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnection();
    }, delay);
  }

  private updateConnectionQualityFromAttempts(): void {
    if (this.reconnectAttempts > 7) {
      this.connectionQuality = 'offline';
    } else if (this.reconnectAttempts > 4) {
      this.connectionQuality = 'unstable';
    } else if (this.reconnectAttempts > 2) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'good';
    }
  }

  private async attemptReconnection(): Promise<void> {
    if (!this.connectionUrl) {
      console.error('❌ No connection URL for reconnection');
      return;
    }

    const activeScreenId = this.currentActiveScreen || this.findHighestPriorityScreen();
    const callbacks = activeScreenId ? this.screenCallbacks.get(activeScreenId)?.callbacks : {};

    console.log(`🔄 Attempting reconnection to ${this.connectionUrl}`);
    const success = await this.connect(this.connectionUrl, callbacks || {}, activeScreenId || undefined);

    if (!success && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private findHighestPriorityScreen(): string | null {
    let highestPriority = -1;
    let highestPriorityScreen: string | null = null;

    for (const [screenId, screenData] of this.screenCallbacks) {
      if (screenData.isActive && screenData.priority > highestPriority) {
        highestPriority = screenData.priority;
        highestPriorityScreen = screenId;
      }
    }

    return highestPriorityScreen;
  }

  private startHealthMonitoring(): void {
    if (!this.isAppInForeground) {
      console.log('🔄 Skipping health monitoring - app in background');
      return;
    }

    console.log(`❤️ Starting enhanced health monitoring (interval: ${this.config.heartbeatInterval}ms)`);

    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.config.heartbeatInterval);
  }

  private stopHealthMonitoring(): void {
    console.log('💔 Stopping health monitoring');

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('⚠️ Cannot send ping - connection not open');
      return;
    }

    const pingTime = Date.now();
    this.lastPingTime = pingTime;

    console.log(`🏓 Sending enhanced ping (timestamp: ${pingTime})`);

    this.send({
      type: 'ping',
      data: {
        timestamp: pingTime,
        quality: this.connectionQuality,
        clientVersion: '3.8.0'
      }
    }, false);

    // Adaptive pong timeout based on connection quality
    const timeoutDuration = this.getAdaptivePongTimeout();

    this.pongTimeout = setTimeout(() => {
      console.log(`❌ Pong timeout after ${timeoutDuration}ms (Quality: ${this.connectionQuality})`);
      this.connectionQuality = 'unstable';
      this.connectionMetrics.lastDisconnectReason = 'Ping timeout';
      if (this.ws) {
        this.ws.close(1006, 'Ping timeout');
      }
    }, timeoutDuration);
  }

  private getAdaptivePongTimeout(): number {
    const qualityTimeouts: Record<ConnectionQuality, number> = {
      'excellent': 8000,  // 8秒
      'good': 12000,      // 12秒
      'poor': 18000,      // 18秒
      'unstable': 25000,  // 25秒
      'offline': 30000    // 30秒
    };

    return qualityTimeouts[this.connectionQuality] || 15000;
  }

  private handlePongResponse(pingTimestamp?: number): void {
    const currentTime = Date.now();
    let latency = 0;

    if (pingTimestamp && typeof pingTimestamp === 'number' && !isNaN(pingTimestamp)) {
      latency = currentTime - pingTimestamp;
      if (latency < 0 || latency > 60000) latency = 0;
    } else if (this.lastPingTime > 0) {
      latency = currentTime - this.lastPingTime;
      if (latency < 0 || latency > 60000) latency = 0;
    }

    console.log(`🏓 Pong received (latency: ${latency}ms, quality: ${this.connectionQuality})`);

    if (latency > 0 && latency < 30000) {
      this.updateConnectionMetricsFromLatency(latency);
      this.updateConnectionQualityFromLatency(latency);
    }

    this.lastPongTime = currentTime;

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private updateConnectionMetricsFromLatency(latency: number): void {
    this.connectionMetrics.avgLatency = this.connectionMetrics.avgLatency === 0 ?
      latency : (this.connectionMetrics.avgLatency * 0.7 + latency * 0.3); // 重み付き平均
  }

  private updateConnectionQualityFromLatency(latency: number): void {
    if (latency < 150) {
      this.connectionQuality = 'excellent';
    } else if (latency < 400) {
      this.connectionQuality = 'good';
    } else if (latency < 1000) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'unstable';
    }

    console.log(`📊 Connection quality updated: ${this.connectionQuality} (${Math.round(this.connectionMetrics.avgLatency)}ms avg)`);
  }

  private notifyAllScreens(callbackType: keyof WebSocketCallbacks, data?: any): void {
    // Prioritize active screen
    if (this.currentActiveScreen && this.screenCallbacks.has(this.currentActiveScreen)) {
      const activeScreen = this.screenCallbacks.get(this.currentActiveScreen)!;
      this.notifyScreen(activeScreen, callbackType, data);
    }

    // Notify other screens
    for (const [screenId, screenData] of this.screenCallbacks) {
      if (screenId !== this.currentActiveScreen && screenData.isActive) {
        this.notifyScreen(screenData, callbackType, data);
      }
    }
  }

  private notifyScreen(screenData: ScreenCallbacks, callbackType: keyof WebSocketCallbacks, data?: any): void {
    const callback = screenData.callbacks[callbackType];
    if (callback) {
      try {
        if (callbackType === 'onMessage' || callbackType === 'onError' || callbackType === 'onClose') {
          (callback as any)(data);
        } else {
          (callback as any)();
        }
      } catch (error) {
        console.error(`❌ Error notifying screen ${screenData.screenId}:`, error);
      }
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

    const processedMessages = [...this.messageQueue];
    this.messageQueue = [];

    processedMessages.forEach((message, index) => {
      setTimeout(() => {
        this.send(message, false);
      }, index * 100); // Throttle message sending
    });
  }

  send(message: any, shouldQueue: boolean = true): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected');

      if (shouldQueue && this.messageQueue.length < this.maxQueueSize) {
        console.log('📥 Queueing message for later delivery');
        this.messageQueue.push(message);
      }

      return false;
    }

    try {
      const jsonMessage = JSON.stringify(message);
      console.log('📤 Sending message:', message.type || 'unknown');
      this.ws.send(jsonMessage);
      this.connectionMetrics.dataTransferred += jsonMessage.length;
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  }

  disconnect(): void {
    console.log('🔌 Manual disconnect requested');
    this.isManualDisconnect = true;

    this.stopHealthMonitoring();
    this.clearReconnectTimer();

    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = null;
    }

    if (this.backgroundTimeout) {
      clearTimeout(this.backgroundTimeout);
      this.backgroundTimeout = null;
    }

    this.screenCallbacks.clear();
    this.currentActiveScreen = null;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.connectionQuality = 'offline';
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Public API methods
  getConnectionState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionQuality(): ConnectionQuality {
    return this.connectionQuality;
  }

  getConnectionMetrics(): ConnectionMetrics & { quality: ConnectionQuality; isConnected: boolean } {
    const currentTime = Date.now();
    const uptime = this.connectionMetrics.connectionStartTime > 0 ?
      currentTime - this.connectionMetrics.connectionStartTime : 0;

    return {
      ...this.connectionMetrics,
      connectionUptime: uptime,
      quality: this.connectionQuality,
      isConnected: this.isConnected(),
    };
  }

  updateConfiguration(newConfig: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 WebSocket configuration updated:', newConfig);
  }

  // Enhanced debugging
  getDetailedDebugInfo(): object {
    return {
      connection: {
        isConnected: this.isConnected(),
        state: this.getConnectionState(),
        quality: this.connectionQuality,
        url: this.connectionUrl,
        isConnecting: this.isConnecting,
        isManualDisconnect: this.isManualDisconnect,
      },
      screens: {
        active: this.currentActiveScreen,
        registered: Array.from(this.screenCallbacks.keys()),
        totalScreens: this.screenCallbacks.size,
      },
      performance: {
        reconnectAttempts: this.reconnectAttempts,
        queuedMessages: this.messageQueue.length,
        metrics: this.getConnectionMetrics(),
      },
      config: this.config,
      appState: {
        isInForeground: this.isAppInForeground,
        lastActivity: this.lastActivity,
      },
    };
  }

  // Health check with enhanced feedback
  async performHealthCheck(): Promise<{ healthy: boolean; latency?: number; details: string }> {
    if (!this.isConnected()) {
      return { healthy: false, details: 'Not connected' };
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = setTimeout(() => {
        resolve({ healthy: false, details: 'Health check timeout' });
      }, 10000);

      const originalHandler = this.ws?.onmessage;

      if (this.ws) {
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'pong') {
              const latency = Date.now() - startTime;
              clearTimeout(timeout);
              this.ws!.onmessage = originalHandler;
              resolve({
                healthy: true,
                latency,
                details: `Healthy (${latency}ms)`
              });
              return;
            }
          } catch (error) {
            // Ignore parsing errors
          }

          if (originalHandler) {
            originalHandler(event);
          }
        };
      }

      this.sendPing();
    });
  }

  unregisterScreenCallbacks(screenId: string): void {
    console.log(`🗑️ Unregistering callbacks for screen: ${screenId}`);

    if (this.screenCallbacks.has(screenId)) {
      this.screenCallbacks.delete(screenId);
      console.log(`✅ Screen callbacks removed for: ${screenId}`);
    }

    // If this was the active screen, find the next highest priority screen
    if (this.currentActiveScreen === screenId) {
      const nextScreen = this.findHighestPriorityScreen();
      if (nextScreen) {
        this.setActiveScreen(nextScreen);
        console.log(`🎯 Active screen switched to: ${nextScreen}`);
      } else {
        this.currentActiveScreen = null;
        console.log(`🎯 No active screen remaining`);
      }
    }
  }
}

// Export singleton instance
export default new EnhancedWebSocketService();
export { ConnectionQuality, ConnectionConfig, ConnectionMetrics };
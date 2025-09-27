interface WebSocketCallbacks {
  onOpen?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

interface ScreenCallbacks {
  screenId: string;
  callbacks: WebSocketCallbacks;
  priority: number; // Higher priority = more important
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private connectionUrl: string = '';
  private isConnecting: boolean = false;

  // Screen-based callback management
  private screenCallbacks: Map<string, ScreenCallbacks> = new Map();
  private currentActiveScreen: string | null = null;

  // Enhanced automatic reconnection
  private reconnectInterval: number = 2000;
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private exponentialBackoff: boolean = true;
  private maxReconnectDelay: number = 30000; // 30 seconds max

  // Enhanced connection health monitoring
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: number = 15000; // 15 seconds (more frequent)
  private connectionQuality: 'excellent' | 'good' | 'poor' | 'unstable' = 'excellent';
  private lastPongTime: number = 0;
  private lastPingTime: number = 0;
  private connectionMetrics: {
    totalReconnects: number;
    lastDisconnectReason: string;
    avgLatency: number;
    connectionUptime: number;
    connectionStartTime: number;
  } = {
    totalReconnects: 0,
    lastDisconnectReason: '',
    avgLatency: 0,
    connectionUptime: 0,
    connectionStartTime: 0,
  };

  // Message queue for offline scenarios
  private messageQueue: any[] = [];
  private maxQueueSize: number = 100;

  async connect(url: string, callbacks: WebSocketCallbacks, screenId?: string): Promise<boolean> {
    if (this.isConnecting) {
      console.log('🔄 Already connecting...');
      return false;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected');
      if (screenId) {
        this.registerScreenCallbacks(screenId, callbacks);
        // Call onOpen for the new screen since connection is already established
        if (callbacks.onOpen) {
          setTimeout(() => callbacks.onOpen!(), 0);
        }
      }
      return true;
    }

    return new Promise((resolve) => {
      try {
        this.isConnecting = true;
        this.connectionUrl = url;
        this.reconnectAttempts = 0;

        // Register screen callbacks if provided
        if (screenId) {
          this.registerScreenCallbacks(screenId, callbacks);
          this.currentActiveScreen = screenId;
        }

        console.log('🔌 Connecting to:', url);

        this.validateUrl(url);
        this.createWebSocketConnection(url);

        this.ws!.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionQuality = 'excellent';

          // Initialize connection metrics
          this.connectionMetrics.connectionStartTime = Date.now();
          this.connectionMetrics.connectionUptime = 0;

          // Clear reconnect timer
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          // Start enhanced health monitoring
          this.startHealthMonitoring();

          // Send queued messages
          this.processMessageQueue();

          // Notify all screens about connection
          this.notifyAllScreens('onOpen');
          resolve(true);
        };

        this.ws!.onmessage = (event) => {
          this.handleIncomingMessage(event);
        };

        this.ws!.onerror = (error) => {
          console.error('❌ WebSocket error occurred:', error);
          this.isConnecting = false;
          this.connectionQuality = 'unstable';
          this.connectionMetrics.lastDisconnectReason = `Error: ${error}`;
          this.notifyAllScreens('onError', error);
          resolve(false);
        };

        this.ws!.onclose = (event) => {
          console.log('🔌 WebSocket closed:', event.code, event.reason);
          this.handleConnectionClose(event);
          if (event.code !== 1000) {
            resolve(false);
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            console.log('⏰ Connection timeout after 15 seconds');
            this.isConnecting = false;
            if (this.ws) {
              this.ws.close(1006, 'Connection timeout');
              this.ws = null;
            }
            resolve(false);
          }
        }, 15000);

      } catch (error) {
        console.error('❌ Connection setup error:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  // Enhanced screen callback management
  registerScreenCallbacks(screenId: string, callbacks: WebSocketCallbacks, priority: number = 1): void {
    console.log(`📱 Registering callbacks for screen: ${screenId}`);

    const screenCallbacks: ScreenCallbacks = {
      screenId,
      callbacks: this.wrapCallbacksWithErrorHandling(callbacks, screenId),
      priority
    };

    this.screenCallbacks.set(screenId, screenCallbacks);

    // Update active screen if this has higher priority
    if (!this.currentActiveScreen || priority > (this.screenCallbacks.get(this.currentActiveScreen)?.priority ?? 0)) {
      this.currentActiveScreen = screenId;
      console.log(`🎯 Active screen changed to: ${screenId}`);
    }
  }

  unregisterScreenCallbacks(screenId: string): void {
    console.log(`📱 Unregistering callbacks for screen: ${screenId}`);
    this.screenCallbacks.delete(screenId);

    // If this was the active screen, find next highest priority screen
    if (this.currentActiveScreen === screenId) {
      this.currentActiveScreen = this.findHighestPriorityScreen();
      console.log(`🎯 Active screen changed to: ${this.currentActiveScreen || 'none'}`);
    }
  }

  setActiveScreen(screenId: string): void {
    if (this.screenCallbacks.has(screenId)) {
      this.currentActiveScreen = screenId;
      console.log(`🎯 Active screen manually set to: ${screenId}`);
    }
  }

  private wrapCallbacksWithErrorHandling(callbacks: WebSocketCallbacks, screenId: string): WebSocketCallbacks {
    return {
      onOpen: callbacks.onOpen ? () => {
        try {
          callbacks.onOpen!();
        } catch (error) {
          console.error(`❌ Error in onOpen callback for ${screenId}:`, error);
        }
      } : undefined,

      onMessage: callbacks.onMessage ? (message) => {
        try {
          callbacks.onMessage!(message);
        } catch (error) {
          console.error(`❌ Error in onMessage callback for ${screenId}:`, error);
        }
      } : undefined,

      onError: callbacks.onError ? (error) => {
        try {
          callbacks.onError!(error);
        } catch (error) {
          console.error(`❌ Error in onError callback for ${screenId}:`, error);
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

  private findHighestPriorityScreen(): string | null {
    let highestPriority = -1;
    let highestPriorityScreen: string | null = null;

    for (const [screenId, screenCallback] of this.screenCallbacks) {
      if (screenCallback.priority > highestPriority) {
        highestPriority = screenCallback.priority;
        highestPriorityScreen = screenId;
      }
    }

    return highestPriorityScreen;
  }

  private notifyAllScreens(callbackType: keyof WebSocketCallbacks, data?: any): void {
    // Prioritize active screen first
    if (this.currentActiveScreen && this.screenCallbacks.has(this.currentActiveScreen)) {
      const activeScreenCallbacks = this.screenCallbacks.get(this.currentActiveScreen)!;
      this.notifyScreen(activeScreenCallbacks, callbackType, data);
    }

    // Then notify other screens
    for (const [screenId, screenCallbacks] of this.screenCallbacks) {
      if (screenId !== this.currentActiveScreen) {
        this.notifyScreen(screenCallbacks, callbackType, data);
      }
    }
  }

  private notifyScreen(screenCallbacks: ScreenCallbacks, callbackType: keyof WebSocketCallbacks, data?: any): void {
    const callback = screenCallbacks.callbacks[callbackType];
    if (callback) {
      try {
        if (callbackType === 'onMessage' || callbackType === 'onError' || callbackType === 'onClose') {
          (callback as any)(data);
        } else {
          (callback as any)();
        }
      } catch (error) {
        console.error(`❌ Error notifying screen ${screenCallbacks.screenId}:`, error);
      }
    }
  }

  private validateUrl(url: string): void {
    if (typeof url !== 'string' || !url.trim()) {
      throw new Error('URL must be a non-empty string');
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('ws://') && !trimmedUrl.startsWith('wss://')) {
      throw new Error(`Invalid protocol: URL must start with ws:// or wss://`);
    }

    const urlPattern = /^wss?:\/\/[a-zA-Z0-9.-]+:[0-9]+\/.*$/;
    if (!urlPattern.test(trimmedUrl)) {
      const fallbackPattern = /^wss?:\/\/[a-zA-Z0-9.-]+\//;
      if (!fallbackPattern.test(trimmedUrl)) {
        throw new Error(`Invalid URL format: ${trimmedUrl}`);
      }
    }

    console.log('✅ URL validation passed:', trimmedUrl);
  }

  private createWebSocketConnection(url: string): void {
    try {
      this.ws = new WebSocket(url, [], {
        headers: {
          'User-Agent': 'RemoteClaudeApp/3.7.2 (React Native)',
        },
      });
      console.log('✅ WebSocket instance created successfully');
    } catch (wsError) {
      console.error('❌ Failed to create WebSocket instance:', wsError);
      this.isConnecting = false;
      throw wsError;
    }
  }

  private handleIncomingMessage(event: MessageEvent): void {
    try {
      console.log('📨 WebSocket RAW received:', event.data?.substring(0, 200) + '...');

      let message;
      if (typeof event.data === 'string') {
        message = JSON.parse(event.data);
      } else {
        console.error('❌ Non-string message received:', typeof event.data);
        return;
      }

      console.log('📨 WebSocket parsed message type:', message.type);

      // Handle pong responses for health monitoring
      if (message.type === 'pong') {
        // Handle nested timestamp structure from server
        const timestamp = message.data?.timestamp?.timestamp || message.data?.timestamp;
        this.handlePongResponse(timestamp);
        return;
      }

      // Notify all registered screens
      this.notifyAllScreens('onMessage', message);

    } catch (error) {
      console.error('❌ Failed to parse message:', error);
      console.error('❌ Raw data type:', typeof event.data);
      console.error('❌ Raw data preview:', event.data?.substring(0, 100));
    }
  }

  private handleConnectionClose(event: CloseEvent): void {
    console.log('🔌 WebSocket connection closed:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    this.isConnecting = false;
    this.ws = null;

    // Update connection metrics
    if (this.connectionMetrics.connectionStartTime > 0) {
      this.connectionMetrics.connectionUptime = Date.now() - this.connectionMetrics.connectionStartTime;
    }

    // Determine disconnection reason
    let reasonText = 'Unknown';
    switch (event.code) {
      case 1000:
        reasonText = 'Normal closure';
        break;
      case 1001:
        reasonText = 'Stream end encountered';
        break;
      case 1006:
        reasonText = 'Abnormal closure';
        break;
      case 1011:
        reasonText = 'Server error';
        break;
      case 1012:
        reasonText = 'Service restart';
        break;
      default:
        reasonText = `Code ${event.code}: ${event.reason || 'No reason provided'}`;
    }

    this.connectionMetrics.lastDisconnectReason = reasonText;
    console.log(`📊 Disconnect reason: ${reasonText}`);

    // Stop health monitoring
    this.stopHealthMonitoring();

    // Notify all screens
    this.notifyAllScreens('onClose', event);

    // Auto-reconnect for unexpected closures
    // Don't reconnect for normal closures (1000) or stream end (1001)
    if (event.code !== 1000 && event.code !== 1001) {
      console.log(`🔄 Scheduling reconnect due to unexpected closure (${event.code})`);
      this.scheduleReconnect();
    } else {
      console.log(`ℹ️ No reconnect scheduled for normal closure (${event.code})`);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.connectionQuality = 'unstable';
      return;
    }

    this.reconnectAttempts++;
    this.connectionMetrics.totalReconnects++;

    // Enhanced exponential backoff with jitter
    let delay = this.reconnectInterval;
    if (this.exponentialBackoff) {
      delay = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );
      // Add jitter to prevent thundering herd
      delay += Math.random() * 1000;
    }

    // Adjust connection quality based on reconnect attempts
    if (this.reconnectAttempts > 3) {
      this.connectionQuality = 'poor';
    } else if (this.reconnectAttempts > 1) {
      this.connectionQuality = 'good';
    }

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms (Quality: ${this.connectionQuality})`);

    this.reconnectTimer = setTimeout(() => {
      console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.attemptReconnection();
    }, delay);
  }

  private async attemptReconnection(): Promise<void> {
    if (!this.connectionUrl) {
      console.error('❌ No connection URL available for reconnection');
      return;
    }

    // Use the callbacks from the active screen or highest priority screen
    const activeScreenId = this.currentActiveScreen || this.findHighestPriorityScreen();
    const callbacks = activeScreenId ? this.screenCallbacks.get(activeScreenId)?.callbacks : {};

    const success = await this.connect(this.connectionUrl, callbacks || {}, activeScreenId || undefined);

    if (!success) {
      this.scheduleReconnect();
    }
  }

  private startHealthMonitoring(): void {
    console.log('❤️ Starting WebSocket health monitoring');

    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.heartbeatInterval);
  }

  private stopHealthMonitoring(): void {
    console.log('💔 Stopping WebSocket health monitoring');

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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const pingTime = Date.now();
      console.log(`🏓 Sending ping (timestamp: ${pingTime})`);

      // Store the ping time for later latency calculation
      this.lastPingTime = pingTime;

      this.send({
        type: 'ping',
        data: { timestamp: pingTime }
      });

      // Set timeout for pong response (adaptive based on connection quality)
      const timeoutDuration = this.connectionQuality === 'excellent' ? 5000 :
                             this.connectionQuality === 'good' ? 8000 :
                             this.connectionQuality === 'poor' ? 12000 : 15000;

      this.pongTimeout = setTimeout(() => {
        console.log(`❌ Pong timeout after ${timeoutDuration}ms - connection may be dead (Quality: ${this.connectionQuality})`);
        this.connectionQuality = 'unstable';
        this.connectionMetrics.lastDisconnectReason = 'Ping timeout';
        if (this.ws) {
          this.ws.close(1006, 'Ping timeout');
        }
      }, timeoutDuration);
    }
  }

  private handlePongResponse(pingTimestamp?: number): void {
    const currentTime = Date.now();
    let latency = 0;

    // Calculate latency with better error handling and fallback
    if (pingTimestamp && typeof pingTimestamp === 'number' && !isNaN(pingTimestamp)) {
      latency = currentTime - pingTimestamp;
      // Ensure latency is positive and reasonable
      if (latency < 0 || latency > 60000) { // Max 60 seconds
        latency = 0;
      }
    } else if (this.lastPingTime > 0) {
      // Fallback to last ping time if timestamp is invalid
      latency = currentTime - this.lastPingTime;
      if (latency < 0 || latency > 60000) {
        latency = 0;
      }
      console.log(`⚠️ Using fallback ping time for latency calculation`);
    }

    console.log(`🏓 Received pong (latency: ${latency}ms, pingTimestamp: ${pingTimestamp}, lastPingTime: ${this.lastPingTime})`);

    // Update connection metrics only if latency is valid
    if (latency > 0 && latency < 30000) { // Max 30 seconds for valid measurements
      this.connectionMetrics.avgLatency = this.connectionMetrics.avgLatency === 0 ?
        latency : (this.connectionMetrics.avgLatency + latency) / 2;

      // Update connection quality based on latency
      if (latency < 100) {
        this.connectionQuality = 'excellent';
      } else if (latency < 300) {
        this.connectionQuality = 'good';
      } else if (latency < 1000) {
        this.connectionQuality = 'poor';
      } else {
        this.connectionQuality = 'unstable';
      }

      console.log(`📊 Connection quality: ${this.connectionQuality} (avg: ${Math.round(this.connectionMetrics.avgLatency)}ms)`);
    } else {
      console.log(`⚠️ Invalid latency measurement: ${latency}ms - skipping quality update`);
    }

    this.lastPongTime = currentTime;

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message, false); // Don't queue again
      }
    }
  }

  send(message: any, shouldQueue: boolean = true): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected');

      // Queue message for later if enabled
      if (shouldQueue && this.messageQueue.length < this.maxQueueSize) {
        console.log('📥 Queueing message for later delivery');
        this.messageQueue.push(message);
      }

      return false;
    }

    try {
      const jsonMessage = JSON.stringify(message);
      console.log('📤 Sending:', message);
      this.ws.send(jsonMessage);
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket');

    // Stop all timers
    this.stopHealthMonitoring();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear callbacks
    this.screenCallbacks.clear();
    this.currentActiveScreen = null;

    // Close connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  getConnectionState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Backward compatibility method
  updateCallbacks(newCallbacks: Partial<WebSocketCallbacks>): void {
    console.log('🔄 Legacy updateCallbacks called - consider using registerScreenCallbacks');

    if (this.currentActiveScreen) {
      const currentCallbacks = this.screenCallbacks.get(this.currentActiveScreen)?.callbacks || {};
      const mergedCallbacks = { ...currentCallbacks, ...newCallbacks };
      this.registerScreenCallbacks(this.currentActiveScreen, mergedCallbacks);
    }
  }

  // Enhanced debugging methods
  getDebugInfo(): object {
    const currentTime = Date.now();
    const uptime = this.connectionMetrics.connectionStartTime > 0 ?
      currentTime - this.connectionMetrics.connectionStartTime : 0;

    return {
      isConnected: this.isConnected(),
      connectionState: this.getConnectionState(),
      connectionQuality: this.connectionQuality,
      reconnectAttempts: this.reconnectAttempts,
      activeScreen: this.currentActiveScreen,
      registeredScreens: Array.from(this.screenCallbacks.keys()),
      queuedMessages: this.messageQueue.length,
      isReconnecting: this.reconnectTimer !== null,
      healthMonitoring: this.pingInterval !== null,
      metrics: {
        ...this.connectionMetrics,
        connectionUptime: Math.round(uptime / 1000), // seconds
        avgLatency: Math.round(this.connectionMetrics.avgLatency),
        lastPongAgo: this.lastPongTime > 0 ? Math.round((currentTime - this.lastPongTime) / 1000) : null,
      },
    };
  }

  // Health check method
  async performHealthCheck(): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      const originalHandler = this.ws?.onmessage;

      if (this.ws) {
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'pong') {
              clearTimeout(timeout);
              this.ws!.onmessage = originalHandler;
              resolve(true);
              return;
            }
          } catch (error) {
            // Ignore parsing errors for health check
          }

          // Pass through to original handler
          if (originalHandler) {
            originalHandler(event);
          }
        };
      }

      this.sendPing();
    });
  }
}

// Export singleton instance
export default new WebSocketService();
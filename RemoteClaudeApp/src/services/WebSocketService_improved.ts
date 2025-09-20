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

  // Automatic reconnection
  private reconnectInterval: number = 3000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Connection health monitoring
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: number = 30000; // 30 seconds

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

          // Clear reconnect timer
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          // Start health monitoring
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
        this.handlePongResponse();
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

    // Stop health monitoring
    this.stopHealthMonitoring();

    // Notify all screens
    this.notifyAllScreens('onClose', event);

    // Auto-reconnect for unexpected closures
    if (event.code !== 1000 && event.code !== 1001) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

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
      console.log('🏓 Sending ping');
      this.send({
        type: 'ping',
        data: { timestamp: Date.now() }
      });

      // Set timeout for pong response
      this.pongTimeout = setTimeout(() => {
        console.log('❌ Pong timeout - connection may be dead');
        if (this.ws) {
          this.ws.close(1006, 'Ping timeout');
        }
      }, 10000); // 10 second timeout
    }
  }

  private handlePongResponse(): void {
    console.log('🏓 Received pong');
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
    return {
      isConnected: this.isConnected(),
      connectionState: this.getConnectionState(),
      reconnectAttempts: this.reconnectAttempts,
      activeScreen: this.currentActiveScreen,
      registeredScreens: Array.from(this.screenCallbacks.keys()),
      queuedMessages: this.messageQueue.length,
      isReconnecting: this.reconnectTimer !== null,
      healthMonitoring: this.pingInterval !== null,
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
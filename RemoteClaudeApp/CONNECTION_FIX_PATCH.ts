/**
 * Connection Stability Patch for RemoteClaude App
 * Fixes WebSocket disconnection during long-running Claude API operations
 */

// Add this to EnhancedWebSocketService.ts

// Enhanced shouldAttemptReconnect method with better code handling
private shouldAttemptReconnect(code: number): boolean {
  // Normal close codes that should trigger reconnection for better stability
  const reconnectCodes = [1001, 1006, 1011, 1012, 1013, 1014];

  // Codes that should NOT trigger reconnection
  const noReconnectCodes = [1000]; // Normal closure only

  // For code 1001 (Going Away), always try to reconnect unless manual disconnect
  if (code === 1001 && !this.isManualDisconnect) {
    console.log('🔄 Code 1001: Server ended stream, will reconnect');
    return true;
  }

  // For code 1006 (Abnormal Closure), always reconnect
  if (code === 1006) {
    console.log('🔄 Code 1006: Abnormal closure, will reconnect');
    return true;
  }

  return reconnectCodes.includes(code) && !this.isManualDisconnect;
}

// Enhanced connection method with better timeout handling
public async connect(url: string, timeoutMs: number = 30000): Promise<boolean> {
  // Store original URL for reconnection attempts
  this.connectionUrl = url;

  // If already connecting, return the existing promise
  if (this.isConnecting) {
    console.log('🔄 Connection already in progress...');
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (!this.isConnecting) {
          resolve(this.isConnected());
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  this.isConnecting = true;
  this.isManualDisconnect = false;

  try {
    console.log(`🔌 Initiating connection to: ${url} (timeout: ${timeoutMs}ms)`);

    // Validate URL format
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      throw new Error(`Invalid WebSocket URL format: ${url}`);
    }
    console.log(`✅ URL validation passed: ${url}`);

    // Close existing connection if any
    if (this.ws) {
      console.log('🔌 Closing existing connection...');
      this.ws.close(1000, 'New connection requested');
      this.ws = null;
    }

    // Clear any existing timers
    this.clearTimers();

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      try {
        // Create WebSocket with enhanced configuration
        const wsOptions = {
          handshakeTimeout: timeoutMs,
          perMessageDeflate: this.config.enableCompression,
          // Add headers for better compatibility
          headers: {
            'User-Agent': 'RemoteClaude-iOS/1.0',
            'Cache-Control': 'no-cache',
          }
        };

        console.log('✅ Enhanced WebSocket instance created');
        this.ws = new WebSocket(url, undefined, wsOptions);

        // Enhanced timeout handling
        const timeout = setTimeout(() => {
          if (this.isConnecting) {
            console.log('⏰ Connection timeout reached');
            if (this.ws) {
              this.ws.terminate();
            }
            this.isConnecting = false;
            reject(new Error(`Connection timeout after ${timeoutMs}ms`));
          }
        }, timeoutMs);

        // Enhanced connection handlers
        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Update connection metrics
          this.connectionMetrics.connectionStartTime = Date.now();
          this.connectionMetrics.connectionUptime = 0;

          console.log('✅ WebSocket connection established successfully');
          this.startHealthMonitoring();

          // Notify all screen callbacks
          this.screenCallbacks.forEach((screenCallback) => {
            try {
              screenCallback.callbacks.onOpen?.();
            } catch (error) {
              console.error(`❌ Error in onOpen callback for ${screenCallback.screenId}:`, error);
            }
          });

          resolve(true);
        };

        // Enhanced message handling with better error recovery
        this.ws.onmessage = (event) => {
          try {
            this.lastActivity = Date.now();
            this.connectionMetrics.messagesCount++;
            this.connectionMetrics.dataTransferred += event.data.length;

            // Handle different message types
            if (typeof event.data === 'string') {
              let parsedMessage;
              try {
                // Try to parse as JSON first
                parsedMessage = JSON.parse(event.data);
                console.log(`📨 WebSocket parsed message type: ${parsedMessage.type || 'unknown'}`);
              } catch (parseError) {
                // Handle as raw string if JSON parsing fails
                console.log(`📨 WebSocket raw message: ${event.data.substring(0, 100)}...`);
                parsedMessage = { type: 'raw_message', data: event.data };
              }

              // Handle ping-pong messages
              if (parsedMessage.type === 'pong') {
                this.handlePongMessage(parsedMessage);
                return;
              }

              // Distribute message to active screen callback
              const activeCallback = this.getActiveScreenCallback();
              if (activeCallback?.callbacks.onMessage) {
                try {
                  activeCallback.callbacks.onMessage(parsedMessage);
                } catch (error) {
                  console.error(`❌ Error in message handler for ${activeCallback.screenId}:`, error);
                }
              } else {
                console.warn('⚠️ No active screen callback for message:', parsedMessage.type);
              }
            }
          } catch (error) {
            console.error('❌ Error processing WebSocket message:', error);
          }
        };

        // Enhanced error handling
        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket error occurred:', error);

          this.connectionMetrics.lastDisconnectReason = `Error: ${error.message || 'Unknown error'}`;

          // Notify screen callbacks
          this.screenCallbacks.forEach((screenCallback) => {
            try {
              screenCallback.callbacks.onError?.(error);
            } catch (callbackError) {
              console.error(`❌ Error in onError callback for ${screenCallback.screenId}:`, callbackError);
            }
          });

          if (this.isConnecting) {
            this.isConnecting = false;
            reject(error);
          }
        };

        // Enhanced close handling with better reconnection logic
        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.isConnecting = false;

          const endTime = Date.now();
          const connectionDuration = endTime - startTime;

          console.log(`🔌 Connection closed: {"code": ${event.code}, "reason": "${event.reason}", "wasClean": ${event.wasClean}}`);
          console.log(`⏱️ Connection duration: ${connectionDuration}ms`);

          // Update metrics
          this.connectionMetrics.lastDisconnectReason = `Code ${event.code}: ${event.reason}`;
          this.connectionMetrics.connectionUptime += connectionDuration;

          // Stop health monitoring
          this.stopHealthMonitoring();

          // Notify screen callbacks
          this.screenCallbacks.forEach((screenCallback) => {
            try {
              screenCallback.callbacks.onClose?.(event);
            } catch (error) {
              console.error(`❌ Error in onClose callback for ${screenCallback.screenId}:`, error);
            }
          });

          // Enhanced reconnection logic
          if (this.shouldAttemptReconnect(event.code)) {
            // Special handling for code 1001 (Stream end encountered)
            if (event.code === 1001) {
              console.log('ℹ️ Stream end detected - will reconnect with extended timeout');
              this.scheduleReconnect(5000); // Longer delay for stream end
            } else {
              console.log(`🔄 Scheduling reconnect for code ${event.code}`);
              this.scheduleReconnect();
            }
          } else {
            console.log(`ℹ️ No reconnect scheduled for close code: ${event.code}`);
          }

          // If this was during initial connection, reject the promise
          if (timeout) {
            reject(new Error(`Connection closed during setup: ${event.code} ${event.reason}`));
          }
        };

      } catch (error) {
        clearTimeout(timeout);
        this.isConnecting = false;
        console.error('❌ Failed to create WebSocket connection:', error);
        reject(error);
      }
    });

  } catch (error) {
    this.isConnecting = false;
    console.error('❌ Connection setup failed:', error);
    throw error;
  }
}

// Enhanced reconnection with better timing
private scheduleReconnect(customDelay?: number): void {
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
  }

  // Calculate delay with exponential backoff
  let delay = customDelay || this.calculateReconnectDelay();

  console.log(`🔄 Reconnect attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts} in ${delay}ms (Quality: ${this.connectionQuality})`);

  this.reconnectTimer = setTimeout(() => {
    this.attemptReconnect();
  }, delay);
}

// Enhanced reconnection attempt
private async attemptReconnect(): Promise<void> {
  if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
    console.log('❌ Maximum reconnection attempts reached');
    this.connectionQuality = 'offline';
    return;
  }

  if (this.isManualDisconnect) {
    console.log('🛑 Manual disconnect detected, stopping reconnection');
    return;
  }

  this.reconnectAttempts++;
  this.connectionMetrics.totalReconnects++;

  console.log(`🔄 Attempting reconnection to: ${this.connectionUrl}`);

  try {
    const connected = await this.connect(this.connectionUrl, this.config.connectionTimeout);

    if (connected) {
      console.log('✅ Reconnection successful');
      this.connectionQuality = this.assessConnectionQuality();
    } else {
      console.log('❌ Reconnection failed, scheduling retry');
      this.scheduleReconnect();
    }
  } catch (error) {
    console.error('❌ Reconnection attempt failed:', error);
    this.scheduleReconnect();
  }
}

// Add enhanced message sending with retry logic
public sendMessage(message: any): boolean {
  if (!this.isConnected()) {
    console.log('📤 Not connected, queuing message for later delivery');
    if (this.messageQueue.length < this.maxQueueSize) {
      this.messageQueue.push(message);
      return true;
    } else {
      console.error('❌ Message queue is full, dropping message');
      return false;
    }
  }

  try {
    const messageStr = JSON.stringify(message);
    console.log(`📤 Sending: ${messageStr.substring(0, 100)}...`);

    this.ws!.send(messageStr);
    this.lastActivity = Date.now();
    this.connectionMetrics.messagesCount++;
    this.connectionMetrics.dataTransferred += messageStr.length;

    return true;
  } catch (error) {
    console.error('❌ Failed to send message:', error);

    // Queue message for retry if connection is unstable
    if (this.messageQueue.length < this.maxQueueSize) {
      this.messageQueue.push(message);
    }

    return false;
  }
}

// Enhanced health monitoring with better ping-pong handling
private startHealthMonitoring(): void {
  this.stopHealthMonitoring();
  console.log(`❤️ Starting enhanced health monitoring (interval: ${this.config.heartbeatInterval}ms)`);

  this.pingInterval = setInterval(() => {
    if (this.isConnected()) {
      this.sendPing();
    }
  }, this.config.heartbeatInterval);
}

private sendPing(): void {
  const pingTimestamp = Date.now();
  this.lastPingTime = pingTimestamp;

  console.log(`🏓 Sending ping (timestamp: ${pingTimestamp})`);

  const pingMessage = {
    type: 'ping',
    data: { timestamp: pingTimestamp }
  };

  if (this.sendMessage(pingMessage)) {
    // Set pong timeout - if no pong received, consider connection unstable
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
    }

    this.pongTimeout = setTimeout(() => {
      console.warn('⚠️ Pong timeout - connection may be unstable');
      this.connectionQuality = 'unstable';
    }, 10000); // 10 second pong timeout
  }
}
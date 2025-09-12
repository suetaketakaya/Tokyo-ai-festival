interface WebSocketCallbacks {
  onOpen?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: WebSocketCallbacks = {};
  private connectionUrl: string = '';
  private isConnecting: boolean = false;

  async connect(url: string, callbacks: WebSocketCallbacks): Promise<boolean> {
    if (this.isConnecting) {
      console.log('🔄 Already connecting...');
      return false;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected');
      return true;
    }

    return new Promise((resolve) => {
      try {
        this.isConnecting = true;
        this.connectionUrl = url;
        this.callbacks = callbacks;

        console.log('🔌 Connecting to:', url);
        
        // Enhanced URL validation for iPad compatibility
        try {
          const urlObj = new URL(url);
          if (urlObj.protocol !== 'ws:' && urlObj.protocol !== 'wss:') {
            throw new Error(`Invalid protocol: ${urlObj.protocol}`);
          }
          console.log('✅ URL validation passed:', urlObj.href);
        } catch (urlError) {
          console.error('❌ Invalid WebSocket URL:', url, urlError);
          this.isConnecting = false;
          resolve(false);
          return;
        }

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnecting = false;
          if (this.callbacks.onOpen) {
            this.callbacks.onOpen();
          }
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            console.log('📨 WebSocket RAW received:', event.data?.substring(0, 200) + '...');
            
            // Handle different data types
            let message;
            if (typeof event.data === 'string') {
              message = JSON.parse(event.data);
            } else {
              console.error('❌ Non-string message received:', typeof event.data);
              return;
            }
            
            console.log('📨 WebSocket parsed message type:', message.type);
            if (this.callbacks.onMessage) {
              console.log('✅ Calling onMessage callback');
              this.callbacks.onMessage(message);
            } else {
              console.error('❌ No message callback available!');
            }
          } catch (error) {
            console.error('❌ Failed to parse message:', error);
            console.error('❌ Raw data type:', typeof event.data);
            console.error('❌ Raw data preview:', event.data?.substring(0, 100));
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error occurred:', error);
          console.error('❌ WebSocket readyState:', this.ws?.readyState);
          console.error('❌ Connection URL:', url);
          this.isConnecting = false;
          if (this.callbacks.onError) {
            this.callbacks.onError(error);
          }
          resolve(false);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket closed:', event.code, event.reason);
          console.log('🔌 Close event details:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.isConnecting = false;
          this.ws = null;
          if (this.callbacks.onClose) {
            this.callbacks.onClose(event);
          }
          if (event.code !== 1000) { // Not a normal closure
            resolve(false);
          }
        };

        // Extended timeout for iPad compatibility
        setTimeout(() => {
          if (this.isConnecting) {
            console.log('⏰ Connection timeout after 15 seconds');
            console.log('⏰ WebSocket state:', this.ws?.readyState);
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
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack
        });
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  send(message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected');
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
    if (this.ws) {
      console.log('🔌 Disconnecting WebSocket');
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.isConnecting = false;
  }

  getConnectionState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Ping to keep connection alive
  ping(): void {
    this.send({
      type: 'ping',
      data: { timestamp: Date.now() }
    });
  }

  // Update callbacks (useful when switching between screens)
  updateCallbacks(newCallbacks: Partial<WebSocketCallbacks>): void {
    console.log('🔥 WEBSOCKET_UPDATE: Updating callbacks');
    this.callbacks = { ...this.callbacks, ...newCallbacks };
  }
}

// Export singleton instance
export default new WebSocketService();
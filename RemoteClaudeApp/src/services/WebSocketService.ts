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
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          if (this.callbacks.onOpen) {
            this.callbacks.onOpen();
          }
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket received:', message.type);
            if (this.callbacks.onMessage) {
              this.callbacks.onMessage(message);
            } else {
              console.error('❌ No message callback available!');
            }
          } catch (error) {
            console.error('❌ Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          if (this.callbacks.onError) {
            this.callbacks.onError(error);
          }
          resolve(false);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;
          if (this.callbacks.onClose) {
            this.callbacks.onClose(event);
          }
          if (event.code !== 1000) { // Not a normal closure
            resolve(false);
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            console.log('⏰ Connection timeout');
            this.isConnecting = false;
            if (this.ws) {
              this.ws.close();
            }
            resolve(false);
          }
        }, 10000);

      } catch (error) {
        console.error('❌ Connection error:', error);
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
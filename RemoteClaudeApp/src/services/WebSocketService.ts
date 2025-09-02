interface Message {
  type: string;
  data?: any;
  status?: string;
  timestamp: string;
  session_id?: string;
}

interface AuthRequest {
  type: 'auth';
  token?: string;
  client_info: {
    platform: 'ios' | 'android';
    version: string;
  };
}

interface ClaudeExecuteRequest {
  type: 'claude_execute';
  data: {
    command: string;
    options: {
      mode: 'interactive' | 'batch';
      timeout: number;
    };
  };
}

interface GitOperationRequest {
  type: 'git_operation';
  data: {
    operation: 'status' | 'diff' | 'commit' | 'log' | 'branch';
    options?: Record<string, string>;
  };
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private sessionId: string = '';
  private token: string = '';
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  constructor() {
    this.listeners.set('connection', []);
    this.listeners.set('claude_output', []);
    this.listeners.set('git_response', []);
    this.listeners.set('auth_result', []);
    this.listeners.set('error', []);
  }

  connect(serverUrl: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.serverUrl = serverUrl;
      const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/api/ws';
      
      this.connectionStatus = 'connecting';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected to:', wsUrl);
        this.authenticate()
          .then((success) => {
            if (success) {
              this.connectionStatus = 'connected';
              this.emit('connection', { status: 'connected' });
              resolve(true);
            } else {
              this.connectionStatus = 'disconnected';
              reject(new Error('Authentication failed'));
            }
          })
          .catch(reject);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          console.log('Received message:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          this.emit('error', { message: 'Failed to parse message', error });
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus = 'disconnected';
        this.emit('error', { message: 'WebSocket error', error });
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.connectionStatus = 'disconnected';
        this.emit('connection', { status: 'disconnected' });
      };
    });
  }

  private async authenticate(): Promise<boolean> {
    return new Promise((resolve) => {
      const authRequest: AuthRequest = {
        type: 'auth',
        client_info: {
          platform: 'ios', // You might want to detect this dynamically
          version: '1.0.0',
        },
      };

      // Listen for auth result
      const authListener = (data: any) => {
        if (data.status === 'success') {
          this.sessionId = data.session_id;
          this.token = data.token;
          resolve(true);
        } else {
          resolve(false);
        }
        this.off('auth_result', authListener);
      };

      this.on('auth_result', authListener);
      this.send(authRequest);
    });
  }

  private handleMessage(message: Message) {
    switch (message.type) {
      case 'auth_result':
        this.emit('auth_result', message.data || message);
        break;
      case 'claude_output':
        this.emit('claude_output', message.data);
        break;
      case 'git_response':
        this.emit('git_response', message.data);
        break;
      case 'pong':
        // Handle ping/pong if needed
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  executeClaudeCommand(command: string, options: { mode?: 'interactive' | 'batch'; timeout?: number } = {}) {
    const request: ClaudeExecuteRequest = {
      type: 'claude_execute',
      data: {
        command,
        options: {
          mode: options.mode || 'interactive',
          timeout: options.timeout || 300,
        },
      },
    };
    
    this.send(request);
  }

  executeGitOperation(operation: 'status' | 'diff' | 'commit' | 'log' | 'branch', options: Record<string, string> = {}) {
    const request: GitOperationRequest = {
      type: 'git_operation',
      data: {
        operation,
        options,
      },
    };
    
    this.send(request);
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
      this.emit('error', { message: 'WebSocket is not connected' });
    }
  }

  on(event: string, listener: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionStatus = 'disconnected';
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  getSessionId() {
    return this.sessionId;
  }
}

export default new WebSocketService();
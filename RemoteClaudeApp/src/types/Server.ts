export interface ServerConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  sessionKey: string;
  connectionUrl: string;
  isConnected: boolean;
  lastConnected?: Date;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  serverVersion?: string;
  capabilities?: string[];
}

export interface Project {
  id: string;
  name: string;
  serverId: string;
  type: string;
  status: 'running' | 'stopped' | 'error';
  lastActivity?: Date;
  createdAt: Date;
}

export interface ServerConnectionHistory {
  id: string;
  serverId: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  duration?: number;
}
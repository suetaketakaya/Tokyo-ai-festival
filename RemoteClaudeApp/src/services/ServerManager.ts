import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServerConnection, Project } from '../types/Server';
import WebSocketService from './WebSocketService';

export class ServerManager {
  private static instance: ServerManager;
  private servers: Map<string, ServerConnection> = new Map();
  private projects: Map<string, Project[]> = new Map();
  private activeConnectionId: string | null = null;

  static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  // Storage keys
  private static STORAGE_KEYS = {
    SERVERS: '@RemoteClaude:servers',
    PROJECTS: '@RemoteClaude:projects',
    ACTIVE_CONNECTION: '@RemoteClaude:active_connection',
  };

  // Initialize and load stored data
  async initialize(): Promise<void> {
    try {
      await this.loadStoredData();
      console.log('📋 ServerManager initialized with', this.servers.size, 'servers');
    } catch (error) {
      console.error('❌ Failed to initialize ServerManager:', error);
    }
  }

  // Load data from AsyncStorage
  private async loadStoredData(): Promise<void> {
    try {
      const [serversData, projectsData, activeConnectionData] = await Promise.all([
        AsyncStorage.getItem(ServerManager.STORAGE_KEYS.SERVERS),
        AsyncStorage.getItem(ServerManager.STORAGE_KEYS.PROJECTS),
        AsyncStorage.getItem(ServerManager.STORAGE_KEYS.ACTIVE_CONNECTION),
      ]);

      // Load servers
      if (serversData) {
        const servers: ServerConnection[] = JSON.parse(serversData);
        servers.forEach(server => {
          // Mark all servers as disconnected on app start
          server.isConnected = false;
          server.status = 'disconnected';
          
          // Ensure all required fields exist
          if (!server.connectionUrl) {
            console.warn('⚠️ Server missing connectionUrl:', server.name);
            server.connectionUrl = `ws://${server.host}:${server.port}/ws?key=${server.sessionKey}`;
          }
          
          // Convert lastConnected to Date object if it exists
          if (server.lastConnected && typeof server.lastConnected === 'string') {
            server.lastConnected = new Date(server.lastConnected);
          }
          
          this.servers.set(server.id, server);
        });
      }

      // Load projects
      if (projectsData) {
        const projects: { [serverId: string]: Project[] } = JSON.parse(projectsData);
        Object.entries(projects).forEach(([serverId, serverProjects]) => {
          this.projects.set(serverId, serverProjects);
        });
      }

      // Load active connection
      if (activeConnectionData) {
        this.activeConnectionId = activeConnectionData;
      }
    } catch (error) {
      console.error('❌ Failed to load stored data:', error);
    }
  }

  // Save data to AsyncStorage
  private async saveData(): Promise<void> {
    try {
      const serversArray = Array.from(this.servers.values());
      const projectsObject = Object.fromEntries(this.projects.entries());

      await Promise.all([
        AsyncStorage.setItem(ServerManager.STORAGE_KEYS.SERVERS, JSON.stringify(serversArray)),
        AsyncStorage.setItem(ServerManager.STORAGE_KEYS.PROJECTS, JSON.stringify(projectsObject)),
        AsyncStorage.setItem(ServerManager.STORAGE_KEYS.ACTIVE_CONNECTION, this.activeConnectionId || ''),
      ]);
    } catch (error) {
      console.error('❌ Failed to save data:', error);
    }
  }

  // Add a new server connection
  async addServer(connectionUrl: string, customName?: string): Promise<ServerConnection> {
    try {
      // Manual URL parsing for React Native compatibility
      const cleanUrl = connectionUrl.trim();
      
      // Check if it's a WebSocket URL
      if (!cleanUrl.startsWith('ws://')) {
        throw new Error('URL must start with ws://');
      }

      // Parse URL manually since URL() is not fully supported in React Native
      const urlParts = cleanUrl.split('?');
      if (urlParts.length !== 2) {
        throw new Error('Missing query parameters in URL');
      }

      const [baseUrl, queryString] = urlParts;
      
      // Extract host and port from base URL
      const hostMatch = baseUrl.match(/ws:\/\/([^\/]+)/);
      if (!hostMatch) {
        throw new Error('Invalid WebSocket URL format');
      }

      const hostPort = hostMatch[1];
      const [hostname, portStr] = hostPort.split(':');
      const port = parseInt(portStr || '8090');

      // Parse session key from query string
      const sessionKey = queryString
        .split('&')
        .find(param => param.startsWith('key='))
        ?.split('=')[1];

      if (!sessionKey) {
        throw new Error('Session key not found in URL');
      }

      const serverId = `${hostname}:${port}-${Date.now()}`;
      const serverName = customName || `${hostname}:${port}`;

      const server: ServerConnection = {
        id: serverId,
        name: serverName,
        host: hostname,
        port: port,
        sessionKey,
        connectionUrl,
        isConnected: false,
        status: 'disconnected',
        lastConnected: undefined,
      };

      this.servers.set(serverId, server);
      await this.saveData();

      console.log('🔗 Added server:', serverName);
      return server;
    } catch (error) {
      console.error('❌ Failed to add server:', error);
      throw new Error('Invalid connection URL');
    }
  }

  // Remove a server connection
  async removeServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (server?.isConnected) {
      await this.disconnectFromServer(serverId);
    }

    this.servers.delete(serverId);
    this.projects.delete(serverId);

    if (this.activeConnectionId === serverId) {
      this.activeConnectionId = null;
    }

    await this.saveData();
    console.log('🗑️ Removed server:', serverId);
  }

  // Connect to a server
  async connectToServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    console.log('🔍 Connecting to server:', {
      id: server.id,
      name: server.name,
      connectionUrl: server.connectionUrl,
      hasConnectionUrl: !!server.connectionUrl
    });

    if (!server.connectionUrl) {
      throw new Error('Server connectionUrl is undefined');
    }

    try {
      server.status = 'connecting';
      this.servers.set(serverId, server);

      const success = await WebSocketService.connect(server.connectionUrl, {
        onOpen: () => {
          server.isConnected = true;
          server.status = 'connected';
          server.lastConnected = new Date();
          this.servers.set(serverId, server);
          this.activeConnectionId = serverId;
          this.saveData();
          console.log('✅ Connected to server:', server.name);
        },
        onMessage: (message) => {
          this.handleServerMessage(serverId, message);
        },
        onError: (error) => {
          server.status = 'error';
          server.isConnected = false;
          this.servers.set(serverId, server);
          console.error('❌ Server connection error:', error);
        },
        onClose: () => {
          server.isConnected = false;
          server.status = 'disconnected';
          this.servers.set(serverId, server);
          if (this.activeConnectionId === serverId) {
            this.activeConnectionId = null;
          }
          console.log('🔌 Disconnected from server:', server.name);
        },
      });

      return success;
    } catch (error) {
      server.status = 'error';
      server.isConnected = false;
      this.servers.set(serverId, server);
      console.error('❌ Failed to connect to server:', error);
      return false;
    }
  }

  // Disconnect from a server
  async disconnectFromServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    WebSocketService.disconnect();
    server.isConnected = false;
    server.status = 'disconnected';
    this.servers.set(serverId, server);

    if (this.activeConnectionId === serverId) {
      this.activeConnectionId = null;
    }

    await this.saveData();
    console.log('🔌 Disconnected from server:', server.name);
  }

  // Handle messages from a specific server
  private handleServerMessage(serverId: string, message: any): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    switch (message.type) {
      case 'connection_established':
        server.serverVersion = message.data?.server_version;
        server.capabilities = message.data?.capabilities || [];
        this.servers.set(serverId, server);
        break;

      case 'project_list_response':
        if (message.data?.projects) {
          const projects = message.data.projects.map((p: any) => ({
            id: p.id || p.container_id,
            name: p.name,
            serverId: serverId,
            type: p.type || 'docker',
            status: p.status || 'unknown',
            lastActivity: p.last_activity ? new Date(p.last_activity) : undefined,
            createdAt: p.created_at ? new Date(p.created_at) : new Date(),
          }));
          this.projects.set(serverId, projects);
        }
        break;
    }
  }

  // Get all servers
  getAllServers(): ServerConnection[] {
    return Array.from(this.servers.values());
  }

  // Get connected servers
  getConnectedServers(): ServerConnection[] {
    return this.getAllServers().filter(server => server.isConnected);
  }

  // Get server by ID
  getServer(serverId: string): ServerConnection | undefined {
    return this.servers.get(serverId);
  }

  // Get active connection
  getActiveConnection(): ServerConnection | null {
    if (!this.activeConnectionId) return null;
    return this.servers.get(this.activeConnectionId) || null;
  }

  // Switch active connection
  async switchActiveConnection(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server || !server.isConnected) {
      return false;
    }

    this.activeConnectionId = serverId;
    await this.saveData();
    console.log('🔄 Switched active connection to:', server.name);
    return true;
  }

  // Get projects for a server
  getProjectsForServer(serverId: string): Project[] {
    return this.projects.get(serverId) || [];
  }

  // Get all projects across all servers
  getAllProjects(): { server: ServerConnection; projects: Project[] }[] {
    return Array.from(this.servers.values()).map(server => ({
      server,
      projects: this.getProjectsForServer(server.id),
    }));
  }

  // Update server name
  async updateServerName(serverId: string, newName: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (server) {
      server.name = newName;
      this.servers.set(serverId, server);
      await this.saveData();
    }
  }

  // Check if there are any connected servers
  hasConnectedServers(): boolean {
    return this.getConnectedServers().length > 0;
  }

  // Get connection statistics
  getStats() {
    const servers = this.getAllServers();
    const connected = this.getConnectedServers();
    const totalProjects = Array.from(this.projects.values()).reduce((sum, projects) => sum + projects.length, 0);

    return {
      totalServers: servers.length,
      connectedServers: connected.length,
      totalProjects,
      activeConnection: this.getActiveConnection(),
    };
  }
}
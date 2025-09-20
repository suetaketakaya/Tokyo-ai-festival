import AsyncStorage from '@react-native-async-storage/async-storage';

interface Command {
  id: string;
  name: string;
  command: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  isFavorite?: boolean;
  isCustom?: boolean;
  lastUsed?: Date;
  usageCount?: number;
}

interface GitConfig {
  username: string;
  email: string;
  defaultBranch: string;
  autoCommit: boolean;
  signCommits: boolean;
}

interface ServerConfig {
  host: string;
  port: string;
  lastUsed: Date;
  name: string;
}

interface UserSettings {
  gitConfig: GitConfig;
  favoriteServers: ServerConfig[];
  quickExecuteMode: boolean;
  showCommandDetails: boolean;
  autoSyncSettings: boolean;
  theme: 'light' | 'dark' | 'auto';
  terminalFont: 'default' | 'monospace';
  terminalFontSize: number;
}

const STORAGE_KEYS = {
  CUSTOM_COMMANDS: '@custom_commands',
  USER_SETTINGS: '@user_settings',
  COMMAND_USAGE: '@command_usage',
  SERVER_HISTORY: '@server_history',
};

class StorageService {
  // Custom Commands Management
  async getCustomCommands(): Promise<Command[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_COMMANDS);
      if (stored) {
        const commands = JSON.parse(stored);
        // Convert lastUsed strings back to Date objects
        return commands.map((cmd: any) => ({
          ...cmd,
          lastUsed: cmd.lastUsed ? new Date(cmd.lastUsed) : undefined,
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to load custom commands:', error);
      return [];
    }
  }

  async saveCustomCommands(commands: Command[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_COMMANDS, JSON.stringify(commands));
      return true;
    } catch (error) {
      console.error('Failed to save custom commands:', error);
      return false;
    }
  }

  async addCustomCommand(command: Command): Promise<boolean> {
    try {
      const commands = await this.getCustomCommands();
      const existingIndex = commands.findIndex(cmd => cmd.id === command.id);

      if (existingIndex >= 0) {
        commands[existingIndex] = command;
      } else {
        commands.push(command);
      }

      return await this.saveCustomCommands(commands);
    } catch (error) {
      console.error('Failed to add custom command:', error);
      return false;
    }
  }

  async deleteCustomCommand(commandId: string): Promise<boolean> {
    try {
      const commands = await this.getCustomCommands();
      const filtered = commands.filter(cmd => cmd.id !== commandId);
      return await this.saveCustomCommands(filtered);
    } catch (error) {
      console.error('Failed to delete custom command:', error);
      return false;
    }
  }

  // Command Usage Tracking
  async updateCommandUsage(commandId: string): Promise<void> {
    try {
      const usage = await this.getCommandUsage();
      const now = new Date();

      if (usage[commandId]) {
        usage[commandId].count += 1;
        usage[commandId].lastUsed = now;
      } else {
        usage[commandId] = {
          count: 1,
          lastUsed: now,
        };
      }

      await AsyncStorage.setItem(STORAGE_KEYS.COMMAND_USAGE, JSON.stringify(usage));
    } catch (error) {
      console.error('Failed to update command usage:', error);
    }
  }

  async getCommandUsage(): Promise<{ [commandId: string]: { count: number; lastUsed: Date } }> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.COMMAND_USAGE);
      if (stored) {
        const usage = JSON.parse(stored);
        // Convert lastUsed strings back to Date objects
        Object.keys(usage).forEach(key => {
          usage[key].lastUsed = new Date(usage[key].lastUsed);
        });
        return usage;
      }
      return {};
    } catch (error) {
      console.error('Failed to load command usage:', error);
      return {};
    }
  }

  // User Settings Management
  async getUserSettings(): Promise<UserSettings> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      if (stored) {
        const settings = JSON.parse(stored);
        return {
          gitConfig: {
            username: '',
            email: '',
            defaultBranch: 'main',
            autoCommit: false,
            signCommits: false,
            ...settings.gitConfig,
          },
          favoriteServers: settings.favoriteServers || [],
          quickExecuteMode: settings.quickExecuteMode || false,
          showCommandDetails: settings.showCommandDetails !== undefined ? settings.showCommandDetails : true,
          autoSyncSettings: settings.autoSyncSettings !== undefined ? settings.autoSyncSettings : true,
          theme: settings.theme || 'auto',
          terminalFont: settings.terminalFont || 'default',
          terminalFontSize: settings.terminalFontSize || 14,
        };
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return this.getDefaultSettings();
    }
  }

  async saveUserSettings(settings: UserSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save user settings:', error);
      return false;
    }
  }

  async updateGitConfig(gitConfig: Partial<GitConfig>): Promise<boolean> {
    try {
      const settings = await this.getUserSettings();
      settings.gitConfig = { ...settings.gitConfig, ...gitConfig };
      return await this.saveUserSettings(settings);
    } catch (error) {
      console.error('Failed to update git config:', error);
      return false;
    }
  }

  getDefaultSettings(): UserSettings {
    return {
      gitConfig: {
        username: '',
        email: '',
        defaultBranch: 'main',
        autoCommit: false,
        signCommits: false,
      },
      favoriteServers: [],
      quickExecuteMode: false,
      showCommandDetails: true,
      autoSyncSettings: true,
      theme: 'auto',
      terminalFont: 'default',
      terminalFontSize: 14,
    };
  }

  // Server History Management
  async addServerToHistory(server: Omit<ServerConfig, 'lastUsed'>): Promise<boolean> {
    try {
      const history = await this.getServerHistory();
      const existing = history.find(s => s.host === server.host && s.port === server.port);

      if (existing) {
        existing.lastUsed = new Date();
        existing.name = server.name;
      } else {
        history.unshift({
          ...server,
          lastUsed: new Date(),
        });

        // Keep only last 10 servers
        if (history.length > 10) {
          history.splice(10);
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.SERVER_HISTORY, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error('Failed to add server to history:', error);
      return false;
    }
  }

  async getServerHistory(): Promise<ServerConfig[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_HISTORY);
      if (stored) {
        const servers = JSON.parse(stored);
        return servers.map((server: any) => ({
          ...server,
          lastUsed: new Date(server.lastUsed),
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to load server history:', error);
      return [];
    }
  }

  // Data Export/Import
  async exportAllData(): Promise<string> {
    try {
      const customCommands = await this.getCustomCommands();
      const userSettings = await this.getUserSettings();
      const commandUsage = await this.getCommandUsage();
      const serverHistory = await this.getServerHistory();

      const exportData = {
        customCommands,
        userSettings,
        commandUsage,
        serverHistory,
        exportDate: new Date(),
        version: '1.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  async importAllData(data: string): Promise<boolean> {
    try {
      const importData = JSON.parse(data);

      if (importData.customCommands) {
        await this.saveCustomCommands(importData.customCommands);
      }

      if (importData.userSettings) {
        await this.saveUserSettings(importData.userSettings);
      }

      if (importData.commandUsage) {
        await AsyncStorage.setItem(STORAGE_KEYS.COMMAND_USAGE, JSON.stringify(importData.commandUsage));
      }

      if (importData.serverHistory) {
        await AsyncStorage.setItem(STORAGE_KEYS.SERVER_HISTORY, JSON.stringify(importData.serverHistory));
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Clear all data
  async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }
}

export default new StorageService();
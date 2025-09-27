/**
 * Test Environment Management for RemoteClaudeApp System Integration Tests
 */

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import WebSocket from 'ws';
import { config, getServerUrl, getWebSocketUrl } from '../config/testConfig';
import { TestLogger } from './logger';

export interface ServerProcess {
  process: ChildProcess;
  port: number;
  pid?: number;
  isReady: boolean;
}

export class TestEnvironment {
  private static logger = new TestLogger();
  private static servers: Map<string, ServerProcess> = new Map();
  private static isInitialized = false;

  static async setup(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Test environment already initialized');
      return;
    }

    this.logger.info('🏗️ Setting up test environment');

    try {
      // Create necessary directories
      await this.createDirectories();

      // Start test servers
      await this.startTestServers();

      // Wait for servers to be ready
      await this.waitForServersReady();

      // Initialize test data
      await this.initializeTestData();

      this.isInitialized = true;
      this.logger.info('✅ Test environment setup completed');
    } catch (error) {
      this.logger.error('❌ Failed to setup test environment', error);
      await this.cleanup();
      throw error;
    }
  }

  static async cleanup(): Promise<void> {
    this.logger.info('🧹 Cleaning up test environment');

    try {
      // Stop all servers
      await this.stopAllServers();

      // Clean up test data
      await this.cleanupTestData();

      this.isInitialized = false;
      this.logger.info('✅ Test environment cleanup completed');
    } catch (error) {
      this.logger.error('❌ Failed to cleanup test environment', error);
    }
  }

  private static async createDirectories(): Promise<void> {
    const directories = [
      path.join(process.cwd(), 'reports'),
      path.join(process.cwd(), 'screenshots'),
      path.join(process.cwd(), 'test-data'),
      path.join(process.cwd(), 'logs')
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
      this.logger.debug(`Created directory: ${dir}`);
    }
  }

  private static async startTestServers(): Promise<void> {
    this.logger.info('🚀 Starting test servers');

    // Start primary server (port 8090)
    await this.startServer('primary', 8090);

    // Start secondary server (port 8091)
    await this.startServer('secondary', 8091);
  }

  private static async startServer(name: string, port: number): Promise<void> {
    const serverPath = path.join(process.cwd(), '..', 'server', 'remoteclaude-server');

    // Check if server executable exists
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server executable not found at: ${serverPath}`);
    }

    return new Promise((resolve, reject) => {
      const process = spawn(serverPath, ['--port', port.toString()], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      const serverProcess: ServerProcess = {
        process,
        port,
        pid: process.pid,
        isReady: false
      };

      this.servers.set(name, serverProcess);

      // Handle server output
      process.stdout?.on('data', (data) => {
        const output = data.toString();
        this.logger.debug(`Server ${name} stdout: ${output.trim()}`);

        // Check if server is ready
        if (output.includes('Server listening') || output.includes(`listening on port ${port}`)) {
          serverProcess.isReady = true;
          this.logger.info(`✅ Server ${name} started on port ${port}`);
          resolve();
        }
      });

      process.stderr?.on('data', (data) => {
        const error = data.toString();
        this.logger.warn(`Server ${name} stderr: ${error.trim()}`);
      });

      process.on('error', (error) => {
        this.logger.error(`Server ${name} error:`, error);
        reject(error);
      });

      process.on('exit', (code, signal) => {
        this.logger.info(`Server ${name} exited with code ${code}, signal ${signal}`);
        serverProcess.isReady = false;
      });

      // Timeout for server start
      setTimeout(() => {
        if (!serverProcess.isReady) {
          reject(new Error(`Server ${name} failed to start within timeout`));
        }
      }, 10000);
    });
  }

  private static async waitForServersReady(): Promise<void> {
    this.logger.info('⏳ Waiting for servers to be ready');

    const checkServer = async (serverType: 'primary' | 'secondary'): Promise<boolean> => {
      try {
        const url = getServerUrl(serverType);
        await axios.get(`${url}/health`, { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    };

    // Wait for both servers to be ready
    const maxAttempts = 30;
    const delay = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.logger.debug(`Health check attempt ${attempt}/${maxAttempts}`);

      const primaryReady = await checkServer('primary');
      const secondaryReady = await checkServer('secondary');

      if (primaryReady && secondaryReady) {
        this.logger.info('✅ All servers are ready');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Servers failed to become ready within timeout');
  }

  private static async stopAllServers(): Promise<void> {
    this.logger.info('🛑 Stopping all test servers');

    for (const [name, serverProcess] of this.servers) {
      try {
        if (serverProcess.process && !serverProcess.process.killed) {
          this.logger.debug(`Stopping server ${name} (PID: ${serverProcess.pid})`);

          // Try graceful shutdown first
          serverProcess.process.kill('SIGTERM');

          // Wait for graceful shutdown
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Force kill if still running
          if (!serverProcess.process.killed) {
            serverProcess.process.kill('SIGKILL');
          }

          this.logger.info(`✅ Server ${name} stopped`);
        }
      } catch (error) {
        this.logger.error(`Failed to stop server ${name}:`, error);
      }
    }

    this.servers.clear();
  }

  private static async initializeTestData(): Promise<void> {
    this.logger.info('📊 Initializing test data');

    const testDataDir = path.join(process.cwd(), 'test-data');

    // Create mock project data
    const mockProjects = [
      {
        id: 'test-project-1',
        name: 'Test Project 1',
        description: 'Mock project for testing',
        created: new Date().toISOString()
      },
      {
        id: 'test-project-2',
        name: 'Test Project 2',
        description: 'Another mock project for testing',
        created: new Date().toISOString()
      }
    ];

    await fs.writeJSON(path.join(testDataDir, 'projects.json'), mockProjects, { spaces: 2 });

    // Create mock server list
    const mockServers = [
      {
        id: 'test-server-1',
        name: 'Test Server 1',
        host: 'localhost',
        port: 8090,
        status: 'online'
      },
      {
        id: 'test-server-2',
        name: 'Test Server 2',
        host: 'localhost',
        port: 8091,
        status: 'online'
      }
    ];

    await fs.writeJSON(path.join(testDataDir, 'servers.json'), mockServers, { spaces: 2 });

    this.logger.info('✅ Test data initialized');
  }

  private static async cleanupTestData(): Promise<void> {
    this.logger.info('🧹 Cleaning up test data');

    const testDataDir = path.join(process.cwd(), 'test-data');

    try {
      await fs.remove(testDataDir);
      await fs.ensureDir(testDataDir);
      this.logger.info('✅ Test data cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup test data:', error);
    }
  }

  static async testWebSocketConnection(serverType: 'primary' | 'secondary' = 'primary'): Promise<boolean> {
    return new Promise((resolve) => {
      const url = getWebSocketUrl(serverType);
      this.logger.debug(`Testing WebSocket connection to: ${url}`);

      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  static async takeScreenshot(name: string): Promise<string> {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(screenshotDir, filename);

    // This is a placeholder - actual screenshot implementation would depend on the testing framework
    this.logger.screenshot(filename);

    return filepath;
  }

  static getServerInfo(name: string): ServerProcess | undefined {
    return this.servers.get(name);
  }

  static isReady(): boolean {
    return this.isInitialized;
  }
}
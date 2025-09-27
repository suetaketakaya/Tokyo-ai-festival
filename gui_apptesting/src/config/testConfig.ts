/**
 * Test Configuration for RemoteClaudeApp System Integration Tests
 */

export interface TestConfig {
  servers: {
    primary: {
      host: string;
      port: number;
      websocketPath: string;
      baseUrl: string;
    };
    secondary: {
      host: string;
      port: number;
      websocketPath: string;
      baseUrl: string;
    };
  };
  app: {
    packageName: string;
    bundleId: string;
    deepLinkScheme: string;
  };
  timeouts: {
    default: number;
    websocket: number;
    navigation: number;
    api: number;
    longRunning: number;
  };
  retry: {
    attempts: number;
    delay: number;
  };
  github: {
    email: string;
    username: string;
    token: string;
  };
  testing: {
    parallel: boolean;
    coverage: boolean;
    screenshots: boolean;
    videoRecording: boolean;
  };
  devices: {
    ios: {
      deviceName: string;
      platformVersion: string;
    };
    android: {
      deviceName: string;
      platformVersion: string;
    };
  };
  webBrowser: {
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
  };
}

export const config: TestConfig = {
  servers: {
    primary: {
      host: 'localhost',
      port: 8080,
      websocketPath: '/ws',
      baseUrl: 'http://localhost:8080'
    },
    secondary: {
      host: 'localhost',
      port: 8091,
      websocketPath: '/ws',
      baseUrl: 'http://localhost:8091'
    }
  },
  app: {
    packageName: 'com.remoteclaude.app',
    bundleId: 'com.remoteclaude.app',
    deepLinkScheme: 'remoteclaude'
  },
  timeouts: {
    default: 30000,      // 30 seconds
    websocket: 15000,    // 15 seconds
    navigation: 10000,   // 10 seconds
    api: 5000,          // 5 seconds
    longRunning: 60000  // 60 seconds
  },
  retry: {
    attempts: 3,
    delay: 1000
  },
  github: {
    email: 'Takaya.suetake16c1050@gmail.com',
    username: 'suetaketakaya',
    token: process.env.GITHUB_TOKEN || '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'
  },
  testing: {
    parallel: false,
    coverage: true,
    screenshots: true,
    videoRecording: false
  },
  devices: {
    ios: {
      deviceName: 'iPhone 14',
      platformVersion: '17.0'
    },
    android: {
      deviceName: 'Pixel 5',
      platformVersion: '31'
    }
  },
  webBrowser: {
    headless: process.env.CI === 'true',
    viewport: {
      width: 1920,
      height: 1080
    }
  }
};

export const getWebSocketUrl = (serverType: 'primary' | 'secondary' = 'primary', sessionKey?: string): string => {
  const server = config.servers[serverType];
  const baseUrl = `ws://${server.host}:${server.port}${server.websocketPath}`;
  return sessionKey ? `${baseUrl}?key=${sessionKey}` : baseUrl;
};

export const getServerUrl = (serverType: 'primary' | 'secondary' = 'primary'): string => {
  return config.servers[serverType].baseUrl;
};

export const getTestProjectId = (): string => {
  return `test_project_${Date.now()}`;
};

export const getTestSessionKey = (): string => {
  return `test_session_${Math.random().toString(36).substr(2, 9)}`;
};
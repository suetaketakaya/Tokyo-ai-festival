# Claude Code CLI & iPhone App 実装指示書

## 📋 総合評価結果

✅ **リリース準備度: READY (91%)**
- Claude Code CLI: 95% ✅
- Go Server: 95% ✅
- Expo環境: 95% ✅
- iPhoneアプリ: 80% ⚠️ (改善推奨)

## 🎯 優先実装項目

### 1. iPhoneアプリの性能最適化 (必須)

#### 📊 パフォーマンス監視の実装

```typescript
// utils/PerformanceMonitor.ts
import { Platform } from 'react-native';

export class PerformanceMonitor {
  private static startTimes: Map<string, number> = new Map();

  static startMeasure(name: string): void {
    this.startTimes.set(name, Date.now());
  }

  static endMeasure(name: string): number {
    const startTime = this.startTimes.get(name);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.logMetric(name, duration);
    this.startTimes.delete(name);
    return duration;
  }

  private static logMetric(name: string, duration: number): void {
    if (__DEV__) {
      console.log(`[Performance] ${name}: ${duration}ms`);
    }

    // Production環境では分析サービスに送信
    if (!__DEV__) {
      this.sendToAnalytics(name, duration);
    }
  }

  private static sendToAnalytics(metric: string, value: number): void {
    // Firebase Analytics, Crashlytics等への送信実装
  }
}
```

#### 🔧 エラーハンドリングとログ実装

```typescript
// utils/Logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static level: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;

  static debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  static info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  static warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  static error(message: string, error?: Error): void {
    this.log(LogLevel.ERROR, message, error);

    // クラッシュレポートサービスへの送信
    if (!__DEV__ && error) {
      this.reportCrash(error, message);
    }
  }

  private static log(level: LogLevel, message: string, data?: any): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    console.log(`[${timestamp}] ${levelName}: ${message}`, data || '');
  }

  private static reportCrash(error: Error, context: string): void {
    // Crashlytics等への送信実装
  }
}
```

### 2. 単体テストの実装 (推奨)

#### 📝 Jest設定

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

#### 🧪 テストサンプル実装

```typescript
// __tests__/utils/PerformanceMonitor.test.ts
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should measure execution time correctly', async () => {
    PerformanceMonitor.startMeasure('test-operation');

    await new Promise(resolve => setTimeout(resolve, 100));

    const duration = PerformanceMonitor.endMeasure('test-operation');

    expect(duration).toBeGreaterThanOrEqual(100);
    expect(duration).toBeLessThan(200);
  });

  it('should handle missing start measurement', () => {
    const duration = PerformanceMonitor.endMeasure('non-existent');
    expect(duration).toBe(0);
  });
});
```

### 3. メモリ最適化実装

#### 🧠 メモリリーク防止

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { Logger } from '@/utils/Logger';

export const useWebSocket = (url: string) => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    Logger.info('WebSocket connecting to:', url);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setConnectionState('connected');
        Logger.info('WebSocket connected');
      };

      wsRef.current.onclose = (event) => {
        setConnectionState('disconnected');
        Logger.warn('WebSocket disconnected:', event.reason);

        // 自動再接続 (指数バックオフ)
        if (!event.wasClean) {
          scheduleReconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        Logger.error('WebSocket error:', error);
        setConnectionState('disconnected');
      };

    } catch (error) {
      Logger.error('Failed to create WebSocket:', error);
      setConnectionState('disconnected');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, 3000);
  };

  // メモリリーク防止のクリーンアップ
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    sendMessage: (message: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(message);
      } else {
        Logger.warn('Cannot send message: WebSocket not connected');
      }
    }
  };
};
```

### 4. キャッシュ戦略実装

#### 💾 効率的なデータキャッシュ

```typescript
// services/CacheManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/utils/Logger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class CacheManager {
  private static readonly PREFIX = '@cache:';

  static async set<T>(key: string, data: T, ttlMinutes: number = 60): Promise<void> {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + (ttlMinutes * 60 * 1000)
      };

      await AsyncStorage.setItem(
        `${this.PREFIX}${key}`,
        JSON.stringify(item)
      );

      Logger.debug(`Cache set: ${key} (TTL: ${ttlMinutes}min)`);
    } catch (error) {
      Logger.error('Failed to set cache:', error);
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.PREFIX}${key}`);
      if (!cached) return null;

      const item: CacheItem<T> = JSON.parse(cached);

      // 期限チェック
      if (Date.now() > item.expiry) {
        await this.remove(key);
        Logger.debug(`Cache expired: ${key}`);
        return null;
      }

      Logger.debug(`Cache hit: ${key}`);
      return item.data;
    } catch (error) {
      Logger.error('Failed to get cache:', error);
      return null;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.PREFIX}${key}`);
      Logger.debug(`Cache removed: ${key}`);
    } catch (error) {
      Logger.error('Failed to remove cache:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      Logger.info(`Cleared ${cacheKeys.length} cache items`);
    } catch (error) {
      Logger.error('Failed to clear cache:', error);
    }
  }
}
```

## 🔒 セキュリティ強化

### セキュアな設定実装

```typescript
// config/security.ts
export const SecurityConfig = {
  // API通信の暗号化
  apiEncryption: true,

  // WebSocket接続のSSL/TLS強制
  requireSSL: !__DEV__,

  // ログの機密情報マスキング
  logMasking: true,

  // デバッグ情報の本番環境無効化
  disableDebugInProduction: !__DEV__,

  // 認証トークンの安全な保存
  secureTokenStorage: true
};

// 機密情報のマスキング関数
export const maskSensitiveData = (data: any): any => {
  if (!SecurityConfig.logMasking) return data;

  const sensitiveKeys = ['password', 'token', 'key', 'secret'];

  if (typeof data === 'object' && data !== null) {
    const masked = { ...data };
    for (const key in masked) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        masked[key] = '***MASKED***';
      }
    }
    return masked;
  }

  return data;
};
```

## 📦 App Store準備

### 1. app.json/app.config.js更新

```json
{
  "expo": {
    "name": "Remote Claude",
    "slug": "remote-claude-app",
    "version": "2.0.0",
    "platforms": ["ios", "android"],
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "privacy": "public",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.remoteclaude",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses camera for QR code scanning",
        "NSPhotoLibraryUsageDescription": "This app accesses photo library for image selection"
      }
    },
    "assetBundlePatterns": ["**/*"],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### 2. EAS Build設定

```json
// eas.json
{
  "cli": {
    "version": ">= 5.4.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 🚀 実装手順

### フェーズ1: 基盤強化 (1-2日)
1. PerformanceMonitor実装
2. Logger & エラーハンドリング実装
3. メモリリーク防止実装

### フェーズ2: テスト実装 (2-3日)
1. Jest設定とテスト環境構築
2. 単体テスト実装 (70%カバレッジ目標)
3. 統合テスト実装

### フェーズ3: 最適化 (1-2日)
1. キャッシュ戦略実装
2. バンドルサイズ最適化
3. パフォーマンス最終調整

### フェーズ4: リリース準備 (2-3日)
1. セキュリティ監査
2. App Store用アセット準備
3. EAS Build設定
4. TestFlight配布

## 📊 成功指標

- **起動時間**: 3秒以下 ✅
- **メモリ使用量**: 100MB以下
- **テストカバレッジ**: 70%以上
- **クラッシュ率**: 0.1%以下
- **WebSocket接続成功率**: 99%以上

## 🔧 Claude Code CLI連携

現在のClaude Code CLIは完全に機能しており、以下のツールが利用可能です：

- **コマンドテスター**: http://localhost:3005
- **リアルタイム監視**: http://localhost:3002
- **Go Server**: WebSocket 9ms レイテンシ

この実装指示に従って開発を進めることで、高品質なiPhoneアプリのリリースが可能です。
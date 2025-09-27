/**
 * Firebase設定のローカル情報参照サービス
 * 端末のローカル情報を参照してFirebase設定を動的に管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

interface LocalDeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
}

interface FirebaseEnvironmentConfig {
  development: FirebaseConfig;
  staging: FirebaseConfig;
  production: FirebaseConfig;
}

interface AdSenseConfig {
  clientId: string;
  autoAds: boolean;
  adUnits: Array<{
    name: string;
    slotId: string;
    size: string;
    position: string;
  }>;
}

interface AnalyticsConfig {
  measurementId: string;
  gtmContainerId?: string;
  enableDebugMode: boolean;
  customEvents: string[];
}

interface AppConfigData {
  firebase: FirebaseEnvironmentConfig;
  adsense: AdSenseConfig;
  analytics: AnalyticsConfig;
  features: {
    enableAnalytics: boolean;
    enableCrashlytics: boolean;
    enablePerformanceMonitoring: boolean;
    enableRemoteConfig: boolean;
  };
  serverConfig: {
    defaultPort: number;
    allowedHosts: string[];
    timeoutSettings: {
      connection: number;
      heartbeat: number;
      reconnect: number;
    };
  };
}

class FirebaseConfigService {
  private static instance: FirebaseConfigService;
  private deviceInfo: LocalDeviceInfo | null = null;
  private appConfig: AppConfigData | null = null;
  private configCache: Map<string, any> = new Map();
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): FirebaseConfigService {
    if (!FirebaseConfigService.instance) {
      FirebaseConfigService.instance = new FirebaseConfigService();
    }
    return FirebaseConfigService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔥 Firebase Config Service already initialized');
      return;
    }

    console.log('🔥 Initializing Firebase Config Service...');

    try {
      // 1. デバイス情報の取得
      await this.loadDeviceInfo();

      // 2. ローカル設定の読み込み
      await this.loadLocalConfig();

      // 3. 環境別設定の決定
      await this.determineEnvironmentConfig();

      // 4. 設定の検証
      this.validateConfiguration();

      this.initialized = true;
      console.log('✅ Firebase Config Service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Firebase Config Service:', error);
      throw error;
    }
  }

  private async loadDeviceInfo(): Promise<void> {
    try {
      // デバイス固有情報の取得
      const deviceId = await this.getOrCreateDeviceId();
      const platform = this.detectPlatform();
      const appInfo = await this.getAppInfo();

      this.deviceInfo = {
        deviceId,
        platform,
        appVersion: appInfo.version,
        buildNumber: appInfo.buildNumber,
        environment: this.determineEnvironment(),
        region: this.detectRegion(),
      };

      console.log('📱 Device info loaded:', {
        deviceId: deviceId.substring(0, 8) + '...',
        platform,
        environment: this.deviceInfo.environment,
        region: this.deviceInfo.region,
      });

    } catch (error) {
      console.error('❌ Failed to load device info:', error);
      throw error;
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const DEVICE_ID_KEY = 'firebase_device_id';

    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

      if (!deviceId) {
        // 新しいデバイスIDを生成
        deviceId = this.generateDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
        console.log('🆕 New device ID created and stored');
      } else {
        console.log('📱 Existing device ID loaded');
      }

      return deviceId;
    } catch (error) {
      console.error('❌ Error managing device ID:', error);
      return this.generateDeviceId(); // フォールバック
    }
  }

  private generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `device_${timestamp}_${random}`;
  }

  private detectPlatform(): 'ios' | 'android' | 'web' {
    if (typeof window !== 'undefined') {
      return 'web';
    }

    // React Native環境での判定
    const { Platform } = require('react-native');
    return Platform.OS as 'ios' | 'android';
  }

  private async getAppInfo(): Promise<{ version: string; buildNumber: string }> {
    try {
      // React Native環境での取得
      const { Constants } = require('expo-constants');

      return {
        version: Constants.manifest?.version || '1.0.0',
        buildNumber: Constants.manifest?.ios?.buildNumber ||
                     Constants.manifest?.android?.versionCode?.toString() || '1',
      };
    } catch (error) {
      console.warn('⚠️ Could not get app info, using defaults');
      return { version: '1.0.0', buildNumber: '1' };
    }
  }

  private determineEnvironment(): 'development' | 'staging' | 'production' {
    try {
      if (__DEV__) {
        return 'development';
      }

      // ビルド設定やバンドルIDに基づく判定
      const { Constants } = require('expo-constants');
      const appId = Constants.manifest?.ios?.bundleIdentifier ||
                    Constants.manifest?.android?.package || '';

      if (appId.includes('.dev') || appId.includes('.debug')) {
        return 'development';
      } else if (appId.includes('.staging') || appId.includes('.beta')) {
        return 'staging';
      } else {
        return 'production';
      }
    } catch (error) {
      console.warn('⚠️ Could not determine environment, defaulting to development');
      return 'development';
    }
  }

  private detectRegion(): string {
    try {
      // タイムゾーンやロケールから地域を推定
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timeZone.includes('Asia/Tokyo')) return 'asia-northeast1';
      if (timeZone.includes('America/')) return 'us-central1';
      if (timeZone.includes('Europe/')) return 'europe-west1';

      return 'asia-northeast1'; // デフォルト
    } catch (error) {
      console.warn('⚠️ Could not detect region, using default');
      return 'asia-northeast1';
    }
  }

  private async loadLocalConfig(): Promise<void> {
    try {
      // ローカルストレージから設定を読み込み
      const configJson = await AsyncStorage.getItem('app_config');

      if (configJson) {
        this.appConfig = JSON.parse(configJson);
        console.log('📋 Local config loaded from storage');
      } else {
        // デフォルト設定を作成
        this.appConfig = this.createDefaultConfig();
        await this.saveLocalConfig();
        console.log('📋 Default config created and saved');
      }

    } catch (error) {
      console.error('❌ Failed to load local config:', error);
      this.appConfig = this.createDefaultConfig();
    }
  }

  private createDefaultConfig(): AppConfigData {
    return {
      firebase: {
        development: {
          apiKey: 'AIzaSyC_dev_key_here',
          authDomain: 'remote-claude-dev.firebaseapp.com',
          projectId: 'remote-claude-dev',
          storageBucket: 'remote-claude-dev.appspot.com',
          messagingSenderId: '123456789',
          appId: '1:123456789:web:dev_app_id',
          measurementId: 'G-DEV_MEASUREMENT_ID',
        },
        staging: {
          apiKey: 'AIzaSyC_staging_key_here',
          authDomain: 'remote-claude-staging.firebaseapp.com',
          projectId: 'remote-claude-staging',
          storageBucket: 'remote-claude-staging.appspot.com',
          messagingSenderId: '123456790',
          appId: '1:123456790:web:staging_app_id',
          measurementId: 'G-STAGING_MEASUREMENT_ID',
        },
        production: {
          apiKey: 'AIzaSyC_prod_key_here',
          authDomain: 'remote-claude-prod.firebaseapp.com',
          projectId: 'remote-claude-prod',
          storageBucket: 'remote-claude-prod.appspot.com',
          messagingSenderId: '123456791',
          appId: '1:123456791:web:prod_app_id',
          measurementId: 'G-PROD_MEASUREMENT_ID',
        },
      },
      adsense: {
        clientId: 'ca-pub-0000000000000000',
        autoAds: true,
        adUnits: [
          {
            name: 'header-banner',
            slotId: '0000000000',
            size: '728x90',
            position: 'header',
          },
          {
            name: 'sidebar-rectangle',
            slotId: '1111111111',
            size: '300x250',
            position: 'sidebar',
          },
        ],
      },
      analytics: {
        measurementId: 'G-XXXXXXXXXX',
        gtmContainerId: 'GTM-XXXXXXX',
        enableDebugMode: true,
        customEvents: ['app_launch', 'server_connect', 'command_execute'],
      },
      features: {
        enableAnalytics: true,
        enableCrashlytics: true,
        enablePerformanceMonitoring: true,
        enableRemoteConfig: true,
      },
      serverConfig: {
        defaultPort: 8090,
        allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0'],
        timeoutSettings: {
          connection: 30000, // 30秒
          heartbeat: 30000,  // 30秒
          reconnect: 3000,   // 3秒
        },
      },
    };
  }

  private async saveLocalConfig(): Promise<void> {
    try {
      if (this.appConfig) {
        await AsyncStorage.setItem('app_config', JSON.stringify(this.appConfig));
        console.log('💾 Local config saved to storage');
      }
    } catch (error) {
      console.error('❌ Failed to save local config:', error);
    }
  }

  private async determineEnvironmentConfig(): Promise<void> {
    if (!this.deviceInfo || !this.appConfig) {
      throw new Error('Device info or app config not loaded');
    }

    const environment = this.deviceInfo.environment;
    console.log(`🔧 Configuring for ${environment} environment`);

    // 環境固有の設定を適用
    this.applyEnvironmentSpecificSettings(environment);
  }

  private applyEnvironmentSpecificSettings(environment: string): void {
    if (!this.appConfig) return;

    switch (environment) {
      case 'development':
        this.appConfig.analytics.enableDebugMode = true;
        this.appConfig.features.enableCrashlytics = false;
        this.appConfig.serverConfig.timeoutSettings.connection = 15000; // 開発時は短縮
        break;

      case 'staging':
        this.appConfig.analytics.enableDebugMode = true;
        this.appConfig.features.enableCrashlytics = true;
        break;

      case 'production':
        this.appConfig.analytics.enableDebugMode = false;
        this.appConfig.features.enableCrashlytics = true;
        this.appConfig.features.enablePerformanceMonitoring = true;
        break;
    }

    console.log(`✅ Applied ${environment} specific settings`);
  }

  private validateConfiguration(): void {
    if (!this.deviceInfo || !this.appConfig) {
      throw new Error('Configuration validation failed: missing required data');
    }

    // 必須設定の検証
    const firebaseConfig = this.getFirebaseConfig();
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Invalid Firebase configuration: missing required fields');
    }

    console.log('✅ Configuration validation passed');
  }

  // 公開API

  getFirebaseConfig(): FirebaseConfig {
    if (!this.deviceInfo || !this.appConfig) {
      throw new Error('Service not initialized');
    }

    const environment = this.deviceInfo.environment;
    return this.appConfig.firebase[environment];
  }

  getAdSenseConfig(): AdSenseConfig {
    if (!this.appConfig) {
      throw new Error('Service not initialized');
    }

    return this.appConfig.adsense;
  }

  getAnalyticsConfig(): AnalyticsConfig {
    if (!this.appConfig) {
      throw new Error('Service not initialized');
    }

    return this.appConfig.analytics;
  }

  getServerConfig(): AppConfigData['serverConfig'] {
    if (!this.appConfig) {
      throw new Error('Service not initialized');
    }

    return this.appConfig.serverConfig;
  }

  getDeviceInfo(): LocalDeviceInfo {
    if (!this.deviceInfo) {
      throw new Error('Device info not loaded');
    }

    return { ...this.deviceInfo };
  }

  isFeatureEnabled(feature: keyof AppConfigData['features']): boolean {
    if (!this.appConfig) {
      return false;
    }

    return this.appConfig.features[feature];
  }

  async updateConfig(updates: Partial<AppConfigData>): Promise<void> {
    if (!this.appConfig) {
      throw new Error('Service not initialized');
    }

    this.appConfig = { ...this.appConfig, ...updates };
    await this.saveLocalConfig();
    console.log('🔄 Configuration updated and saved');
  }

  async updateFirebaseConfig(environment: keyof FirebaseEnvironmentConfig, config: Partial<FirebaseConfig>): Promise<void> {
    if (!this.appConfig) {
      throw new Error('Service not initialized');
    }

    this.appConfig.firebase[environment] = {
      ...this.appConfig.firebase[environment],
      ...config
    };

    await this.saveLocalConfig();
    console.log(`🔥 Firebase ${environment} config updated`);
  }

  async updateAdSenseConfig(config: Partial<AdSenseConfig>): Promise<void> {
    if (!this.appConfig) {
      throw new Error('Service not initialized');
    }

    this.appConfig.adsense = {
      ...this.appConfig.adsense,
      ...config
    };

    await this.saveLocalConfig();
    console.log('💰 AdSense config updated');
  }

  getConfigForKey<T>(key: string): T | null {
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }

    return null;
  }

  setConfigForKey<T>(key: string, value: T): void {
    this.configCache.set(key, value);
  }

  clearCache(): void {
    this.configCache.clear();
    console.log('🗑️ Configuration cache cleared');
  }

  async resetToDefaults(): Promise<void> {
    console.log('🔄 Resetting configuration to defaults...');

    this.appConfig = this.createDefaultConfig();
    await this.saveLocalConfig();
    this.clearCache();

    console.log('✅ Configuration reset to defaults');
  }

  getDebugInfo(): object {
    return {
      initialized: this.initialized,
      deviceInfo: this.deviceInfo,
      environment: this.deviceInfo?.environment,
      cacheSize: this.configCache.size,
      configKeys: this.appConfig ? Object.keys(this.appConfig) : [],
    };
  }

  async exportConfig(): Promise<string> {
    if (!this.appConfig || !this.deviceInfo) {
      throw new Error('Service not initialized');
    }

    const exportData = {
      deviceInfo: this.deviceInfo,
      appConfig: this.appConfig,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importConfig(configJson: string): Promise<void> {
    try {
      const importData = JSON.parse(configJson);

      if (importData.version && importData.appConfig) {
        this.appConfig = importData.appConfig;
        await this.saveLocalConfig();
        console.log('📥 Configuration imported successfully');
      } else {
        throw new Error('Invalid config format');
      }
    } catch (error) {
      console.error('❌ Failed to import config:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default FirebaseConfigService.getInstance();
export { FirebaseConfig, LocalDeviceInfo, AppConfigData, AdSenseConfig, AnalyticsConfig };
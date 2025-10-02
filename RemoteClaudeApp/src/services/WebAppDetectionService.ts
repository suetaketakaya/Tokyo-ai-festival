// WebAppDetectionService.ts - Webアプリケーション自動検出・アクセス
export interface WebAppInfo {
  port: number;
  url: string;
  type: 'flask' | 'express' | 'fastapi' | 'streamlit' | 'django' | 'react' | 'vue' | 'general';
  status: 'running' | 'starting' | 'stopped' | 'error';
  detectedAt: Date;
  pid?: number;
  logs?: string[];
}

export class WebAppDetectionService {
  private static detectedApps: Map<number, WebAppInfo> = new Map();
  private static portScanInterval: any = null;

  // Webアプリケーション起動パターンの検出
  static detectWebAppFromOutput(output: string, command: string): WebAppInfo | null {
    const lines = output.split('\n');

    for (const line of lines) {
      // Flask アプリケーション検出
      const flaskMatch = line.match(/Running on (http:\/\/[^:\s]+):(\d+)/i) ||
                        line.match(/\* Running on (http:\/\/[^:\s]+):(\d+)/i);
      if (flaskMatch) {
        const port = parseInt(flaskMatch[2]);
        return {
          port,
          url: `http://localhost:${port}`,
          type: 'flask',
          status: 'running',
          detectedAt: new Date(),
          logs: [line]
        };
      }

      // FastAPI アプリケーション検出 (Uvicornパターンを優先)
      const fastapiMatch = line.match(/Uvicorn running on (http:\/\/[^:\s]+):(\d+)/i) ||
                          line.match(/INFO:\s+Uvicorn running on (http:\/\/[^:\s]+):(\d+)/i) ||
                          line.match(/Application startup complete\.\s*Uvicorn running on (http:\/\/[^:\s]+):(\d+)/i);
      if (fastapiMatch && !line.includes('Running on')) {
        const port = parseInt(fastapiMatch[2]);
        return {
          port,
          url: `http://localhost:${port}`,
          type: 'fastapi',
          status: 'running',
          detectedAt: new Date(),
          logs: [line]
        };
      }

      // Express.js アプリケーション検出
      const expressMatch = line.match(/Server running (?:on|at) (?:port )?(\d+)/i) ||
                          line.match(/Express server listening on port (\d+)/i) ||
                          line.match(/App listening (?:on|at) port (\d+)/i);
      if (expressMatch) {
        const port = parseInt(expressMatch[1]);
        return {
          port,
          url: `http://localhost:${port}`,
          type: 'express',
          status: 'running',
          detectedAt: new Date(),
          logs: [line]
        };
      }

      // React 開発サーバー検出
      const reactMatch = line.match(/Local:\s+(http:\/\/localhost:(\d+))/i) ||
                        line.match(/On Your Network:\s+(http:\/\/[^:]+:(\d+))/i);
      if (reactMatch) {
        const port = parseInt(reactMatch[2]);
        return {
          port,
          url: `http://localhost:${port}`,
          type: 'react',
          status: 'running',
          detectedAt: new Date(),
          logs: [line]
        };
      }

      // Vue.js 開発サーバー検出
      const vueMatch = line.match(/Local:\s+(http:\/\/localhost:(\d+))/i) ||
                      line.match(/Network:\s+(http:\/\/[^:]+:(\d+))/i);
      if (vueMatch && (command.includes('vue') || command.includes('@vue'))) {
        const port = parseInt(vueMatch[2]);
        return {
          port,
          url: `http://localhost:${port}`,
          type: 'vue',
          status: 'running',
          detectedAt: new Date(),
          logs: [line]
        };
      }

      // Streamlit アプリケーション検出
      const streamlitMatch = line.match(/Local URL: (http:\/\/localhost:(\d+))/i) ||
                            line.match(/Network URL: (http:\/\/[^:]+:(\d+))/i);
      if (streamlitMatch) {
        const port = parseInt(streamlitMatch[2]);
        return {
          port,
          url: `http://localhost:${port}`,
          type: 'streamlit',
          status: 'running',
          detectedAt: new Date(),
          logs: [line]
        };
      }

      // Django 開発サーバー検出
      const djangoMatch = line.match(/Starting development server at (http:\/\/[^:]+:(\d+))/i) ||
                         line.match(/Django version .+, using settings .+\nStarting development server at (http:\/\/[^:]+:(\d+))/i);
      if (djangoMatch) {
        const port = parseInt(djangoMatch[2]);
        return {
          port,
          url: `http://localhost:${port}`,
          type: 'django',
          status: 'running',
          detectedAt: new Date(),
          logs: [line]
        };
      }

      // 汎用HTTPサーバー検出
      const httpMatch = line.match(/Serving HTTP on .+ port (\d+)/i) ||
                       line.match(/HTTP server running on port (\d+)/i) ||
                       line.match(/Server started on port (\d+)/i);
      if (httpMatch) {
        const port = parseInt(httpMatch[1]);
        return {
          port,
          url: `http://localhost:${port}`,
          type: 'general',
          status: 'running',
          detectedAt: new Date(),
          logs: [line]
        };
      }
    }

    return null;
  }

  // ポート使用状況をチェック
  static async checkPortStatus(port: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`http://localhost:${port}`, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  // 検出されたWebアプリを登録
  static registerWebApp(webApp: WebAppInfo): void {
    this.detectedApps.set(webApp.port, webApp);
    console.log(`🌐 Web app detected: ${webApp.type} on port ${webApp.port}`);
  }

  // 検出されたWebアプリ一覧を取得
  static getDetectedApps(): WebAppInfo[] {
    return Array.from(this.detectedApps.values())
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  // 特定ポートのWebアプリ情報を取得
  static getWebApp(port: number): WebAppInfo | undefined {
    return this.detectedApps.get(port);
  }

  // WebアプリのURLを生成
  static generateWebAppUrl(port: number, path: string = ''): string {
    const baseUrl = `http://localhost:${port}`;
    return path ? `${baseUrl}${path.startsWith('/') ? path : '/' + path}` : baseUrl;
  }

  // Webアプリのプレビュー用URLを生成（プロキシ経由）
  static generateProxyUrl(port: number, proxyPort: number = 8000): string {
    return `http://localhost:${proxyPort}/proxy/${port}`;
  }

  // 定期的なポート監視を開始
  static startPortMonitoring(interval: number = 5000): void {
    if (this.portScanInterval) {
      clearInterval(this.portScanInterval);
    }

    this.portScanInterval = setInterval(async () => {
      const apps = Array.from(this.detectedApps.values());

      for (const app of apps) {
        const isRunning = await this.checkPortStatus(app.port);

        if (isRunning && app.status !== 'running') {
          app.status = 'running';
          console.log(`🟢 Web app resumed: ${app.type} on port ${app.port}`);
        } else if (!isRunning && app.status === 'running') {
          app.status = 'stopped';
          console.log(`🔴 Web app stopped: ${app.type} on port ${app.port}`);
        }
      }
    }, interval);
  }

  // ポート監視を停止
  static stopPortMonitoring(): void {
    if (this.portScanInterval) {
      clearInterval(this.portScanInterval);
      this.portScanInterval = null;
    }
  }

  // 古いWebアプリ情報をクリーンアップ
  static cleanupOldApps(maxAge: number = 3600000): void { // 1時間
    const now = new Date().getTime();
    const toRemove: number[] = [];

    for (const [port, app] of Array.from(this.detectedApps.entries())) {
      if (now - app.detectedAt.getTime() > maxAge && app.status === 'stopped') {
        toRemove.push(port);
      }
    }

    toRemove.forEach(port => {
      this.detectedApps.delete(port);
      console.log(`🧹 Cleaned up old web app on port ${port}`);
    });
  }

  // WebアプリのヘルスチェックとMetadata取得
  static async getWebAppMetadata(port: number): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://localhost:${port}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const html = await response.text();

      // HTMLタイトル抽出
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
      const title = titleMatch ? titleMatch[1].trim() : 'Web Application';

      // フレームワーク検出
      let framework = 'unknown';
      if (html.includes('react') || html.includes('React')) framework = 'React';
      else if (html.includes('vue') || html.includes('Vue')) framework = 'Vue.js';
      else if (html.includes('angular') || html.includes('Angular')) framework = 'Angular';
      else if (contentType.includes('application/json')) framework = 'API';

      return {
        title,
        framework,
        contentType,
        status: 'healthy',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        title: 'Web Application',
        framework: 'unknown',
        status: 'error',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // 利用可能なポート範囲を検索
  static async findAvailablePorts(startPort: number = 8000, count: number = 10): Promise<number[]> {
    const availablePorts: number[] = [];

    for (let port = startPort; port < startPort + 100 && availablePorts.length < count; port++) {
      const isAvailable = !(await this.checkPortStatus(port));
      if (isAvailable) {
        availablePorts.push(port);
      }
    }

    return availablePorts;
  }
}

// 使用例とヘルパー関数
export const WebAppHelpers = {
  // コマンド出力からWebアプリを自動検出して登録
  detectAndRegister: (output: string, command: string): WebAppInfo | null => {
    const webApp = WebAppDetectionService.detectWebAppFromOutput(output, command);
    if (webApp) {
      WebAppDetectionService.registerWebApp(webApp);
    }
    return webApp;
  },

  // プレビュー用のWebアプリ情報を整形
  formatForPreview: (webApp: WebAppInfo) => ({
    id: `webapp_${webApp.port}`,
    type: 'webapp' as const,
    name: `${webApp.type.toUpperCase()} App`,
    description: `${webApp.type} application running on port ${webApp.port}`,
    status: webApp.status,
    port: webApp.port,
    url: webApp.url,
    timestamp: webApp.detectedAt.toISOString()
  }),

  // Webアプリの起動状態チェック
  isWebAppRunning: async (port: number): Promise<boolean> => {
    return await WebAppDetectionService.checkPortStatus(port);
  }
};
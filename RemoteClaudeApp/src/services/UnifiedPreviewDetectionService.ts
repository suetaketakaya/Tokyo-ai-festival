/**
 * Unified Preview Detection Service v2.0
 * GUI/CUI/Matplotlib/Jupyter統合プレビュー検出システム
 */

import EnhancedPreviewAccuracyService from './EnhancedPreviewAccuracyService';
import ClaudeCodeAgentService from './ClaudeCodeAgentService';
import LocalMetricsService from './LocalMetricsService';
import { WebAppDetectionService } from './WebAppDetectionService';

export interface UnifiedPreviewItem {
  id: string;
  type: 'gui' | 'cui' | 'matplotlib' | 'jupyter' | 'html' | 'json' | 'binary';
  title: string;
  description: string;
  content: string | object;
  metadata: PreviewMetadata;
  previewUrl?: string;
  thumbnailUrl?: string;
  isInteractive: boolean;
  accessMethods: AccessMethod[];
  dependencies: string[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface PreviewMetadata {
  framework?: string;
  port?: number;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
  executionTime?: number;
  confidenceScore: number;
  tags: string[];
  source: 'command_output' | 'file_generation' | 'server_detection' | 'manual';
}

export interface AccessMethod {
  type: 'browser' | 'terminal' | 'image_viewer' | 'jupyter_notebook' | 'api_endpoint';
  url?: string;
  command?: string;
  description: string;
  isRecommended: boolean;
}

export interface DetectionConfig {
  enableWebAppDetection: boolean;
  enableMatplotlibDetection: boolean;
  enableJupyterDetection: boolean;
  enableFileSystemMonitoring: boolean;
  autoPreviewGeneration: boolean;
  confidenceThreshold: number;
  maxPreviewItems: number;
}

export class UnifiedPreviewDetectionService {
  private static instance: UnifiedPreviewDetectionService;
  private previewItems: Map<string, UnifiedPreviewItem> = new Map();
  private accuracyService: EnhancedPreviewAccuracyService;
  private agentService: ClaudeCodeAgentService;
  private localMetricsService: LocalMetricsService;
  private config: DetectionConfig;
  private isMonitoring = false;
  private detectionInterval?: NodeJS.Timeout;

  private constructor() {
    this.accuracyService = EnhancedPreviewAccuracyService.getInstance();
    this.agentService = ClaudeCodeAgentService.getInstance();
    this.localMetricsService = LocalMetricsService.getInstance();
    this.config = {
      enableWebAppDetection: true,
      enableMatplotlibDetection: true,
      enableJupyterDetection: true,
      enableFileSystemMonitoring: true,
      autoPreviewGeneration: true,
      confidenceThreshold: 0.7,
      maxPreviewItems: 50
    };
  }

  static getInstance(): UnifiedPreviewDetectionService {
    if (!UnifiedPreviewDetectionService.instance) {
      UnifiedPreviewDetectionService.instance = new UnifiedPreviewDetectionService();
    }
    return UnifiedPreviewDetectionService.instance;
  }

  /**
   * 統合プレビュー検出開始
   */
  async startUnifiedDetection(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Preview detection already running');
      return;
    }

    console.log('🚀 Starting Unified Preview Detection System...');
    this.isMonitoring = true;

    // 定期検出開始
    this.detectionInterval = setInterval(async () => {
      await this.performDetectionCycle();
    }, 3000);

    // 初回検出実行
    await this.performDetectionCycle();

    console.log('✅ Unified Preview Detection System started');
  }

  /**
   * 統合プレビュー検出停止
   */
  stopUnifiedDetection(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = undefined;
    }

    this.isMonitoring = false;
    console.log('⏹️ Unified Preview Detection System stopped');
  }

  /**
   * 検出サイクル実行
   */
  private async performDetectionCycle(): Promise<void> {
    try {
      const detectionTasks = [];

      // GUI/Webアプリ検出
      if (this.config.enableWebAppDetection) {
        detectionTasks.push(this.detectWebApplications());
      }

      // Matplotlib画像検出
      if (this.config.enableMatplotlibDetection) {
        detectionTasks.push(this.detectMatplotlibOutputs());
      }

      // Jupyter Notebook検出
      if (this.config.enableJupyterDetection) {
        detectionTasks.push(this.detectJupyterOutputs());
      }

      // ファイルシステム監視
      if (this.config.enableFileSystemMonitoring) {
        detectionTasks.push(this.monitorFileSystemChanges());
      }

      // 並列実行
      const results = await Promise.allSettled(detectionTasks);

      // 結果処理
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Detection task ${index} failed:`, result.reason);
        }
      });

      // ローカルメトリクス記録
      await this.recordDetectionMetrics();

    } catch (error) {
      console.error('Detection cycle error:', error);
    }
  }

  /**
   * Webアプリケーション検出
   */
  private async detectWebApplications(): Promise<void> {
    const commonPorts = [3000, 5000, 5001, 8000, 8080, 8090];

    for (const port of commonPorts) {
      try {
        const isRunning = await this.checkPortStatus(port);
        if (isRunning) {
          const previewItem = await this.createWebAppPreviewItem(port);
          if (previewItem && previewItem.metadata.confidenceScore >= this.config.confidenceThreshold) {
            this.addPreviewItem(previewItem);
          }
        }
      } catch (error) {
        // ポート検査エラーは無視
      }
    }
  }

  /**
   * Matplotlib出力検出
   */
  private async detectMatplotlibOutputs(): Promise<void> {
    try {
      // 一時ディレクトリ内のPNG/SVG/PDFファイルを検索
      const imageFiles = await this.findImageFiles();

      for (const filePath of imageFiles) {
        const previewItem = await this.createMatplotlibPreviewItem(filePath);
        if (previewItem && previewItem.metadata.confidenceScore >= this.config.confidenceThreshold) {
          this.addPreviewItem(previewItem);
        }
      }
    } catch (error) {
      console.error('Matplotlib detection error:', error);
    }
  }

  /**
   * Jupyter Notebook検出
   */
  private async detectJupyterOutputs(): Promise<void> {
    try {
      // Jupyter Notebook ファイル検索
      const notebookFiles = await this.findNotebookFiles();

      for (const filePath of notebookFiles) {
        const previewItem = await this.createJupyterPreviewItem(filePath);
        if (previewItem && previewItem.metadata.confidenceScore >= this.config.confidenceThreshold) {
          this.addPreviewItem(previewItem);
        }
      }
    } catch (error) {
      console.error('Jupyter detection error:', error);
    }
  }

  /**
   * ファイルシステム変更監視
   */
  private async monitorFileSystemChanges(): Promise<void> {
    // HTML、JSON、その他の生成ファイル検出
    try {
      const outputFiles = await this.findOutputFiles();

      for (const filePath of outputFiles) {
        const previewItem = await this.createFilePreviewItem(filePath);
        if (previewItem && previewItem.metadata.confidenceScore >= this.config.confidenceThreshold) {
          this.addPreviewItem(previewItem);
        }
      }
    } catch (error) {
      console.error('File system monitoring error:', error);
    }
  }

  /**
   * Webアプリプレビューアイテム作成
   */
  private async createWebAppPreviewItem(port: number): Promise<UnifiedPreviewItem | null> {
    try {
      const url = `http://localhost:${port}`;
      const framework = await this.detectFramework(port);

      // フレームワーク検出による信頼度計算
      const confidenceScore = framework ? 0.9 : 0.7;

      const previewItem: UnifiedPreviewItem = {
        id: `webapp_${port}_${Date.now()}`,
        type: 'gui',
        title: `🌐 Web App (Port ${port})`,
        description: framework ? `${framework} application running on port ${port}` : `Web application running on port ${port}`,
        content: url,
        metadata: {
          framework,
          port,
          confidenceScore,
          tags: ['web', 'gui', framework || 'unknown'].filter(Boolean),
          source: 'server_detection'
        },
        previewUrl: url,
        isInteractive: true,
        accessMethods: [
          {
            type: 'browser',
            url,
            description: 'ブラウザでWebアプリケーションを開く',
            isRecommended: true
          }
        ],
        dependencies: framework ? [framework] : [],
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      return previewItem;
    } catch (error) {
      console.error(`Error creating web app preview for port ${port}:`, error);
      return null;
    }
  }

  /**
   * Matplotlibプレビューアイテム作成
   */
  private async createMatplotlibPreviewItem(filePath: string): Promise<UnifiedPreviewItem | null> {
    try {
      const fileName = filePath.split('/').pop() || 'unknown';
      const fileSize = await this.getFileSize(filePath);
      const dimensions = await this.getImageDimensions(filePath);

      const previewItem: UnifiedPreviewItem = {
        id: `matplotlib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'matplotlib',
        title: `📊 Matplotlib Plot: ${fileName}`,
        description: `Generated matplotlib visualization: ${fileName}`,
        content: `file://${filePath}`,
        metadata: {
          filePath,
          fileSize,
          mimeType: this.getMimeType(filePath),
          dimensions,
          confidenceScore: 0.95,
          tags: ['matplotlib', 'visualization', 'plot', 'image'],
          source: 'file_generation'
        },
        previewUrl: `file://${filePath}`,
        isInteractive: false,
        accessMethods: [
          {
            type: 'image_viewer',
            command: `open "${filePath}"`,
            description: '画像ビューワーで開く',
            isRecommended: true
          }
        ],
        dependencies: ['matplotlib'],
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      return previewItem;
    } catch (error) {
      console.error(`Error creating matplotlib preview for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Jupyterプレビューアイテム作成
   */
  private async createJupyterPreviewItem(filePath: string): Promise<UnifiedPreviewItem | null> {
    try {
      const fileName = filePath.split('/').pop() || 'unknown';
      const fileSize = await this.getFileSize(filePath);

      const previewItem: UnifiedPreviewItem = {
        id: `jupyter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'jupyter',
        title: `📓 Jupyter Notebook: ${fileName}`,
        description: `Jupyter notebook file: ${fileName}`,
        content: filePath,
        metadata: {
          filePath,
          fileSize,
          mimeType: 'application/x-ipynb+json',
          confidenceScore: 0.9,
          tags: ['jupyter', 'notebook', 'ipynb'],
          source: 'file_generation'
        },
        isInteractive: true,
        accessMethods: [
          {
            type: 'jupyter_notebook',
            command: `jupyter notebook "${filePath}"`,
            description: 'Jupyter Notebookで開く',
            isRecommended: true
          }
        ],
        dependencies: ['jupyter'],
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      return previewItem;
    } catch (error) {
      console.error(`Error creating jupyter preview for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * ファイルプレビューアイテム作成
   */
  private async createFilePreviewItem(filePath: string): Promise<UnifiedPreviewItem | null> {
    try {
      const fileName = filePath.split('/').pop() || 'unknown';
      const fileSize = await this.getFileSize(filePath);
      const mimeType = this.getMimeType(filePath);

      let type: UnifiedPreviewItem['type'] = 'cui';
      if (mimeType.includes('html')) type = 'html';
      else if (mimeType.includes('json')) type = 'json';
      else if (mimeType.includes('image')) type = 'matplotlib';

      const previewItem: UnifiedPreviewItem = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: `📄 Generated File: ${fileName}`,
        description: `Generated output file: ${fileName}`,
        content: type === 'html' ? `file://${filePath}` : filePath,
        metadata: {
          filePath,
          fileSize,
          mimeType,
          confidenceScore: 0.8,
          tags: ['file', 'output', type],
          source: 'file_generation'
        },
        previewUrl: type === 'html' ? `file://${filePath}` : undefined,
        isInteractive: type === 'html',
        accessMethods: this.generateAccessMethods(filePath, type),
        dependencies: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      return previewItem;
    } catch (error) {
      console.error(`Error creating file preview for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * プレビューアイテム追加
   */
  private addPreviewItem(item: UnifiedPreviewItem): void {
    // 重複チェック
    const existingItem = Array.from(this.previewItems.values()).find(existing =>
      existing.type === item.type &&
      existing.metadata.port === item.metadata.port &&
      existing.metadata.filePath === item.metadata.filePath
    );

    if (existingItem) {
      existingItem.lastUpdated = new Date();
      return;
    }

    // 最大数制限
    if (this.previewItems.size >= this.config.maxPreviewItems) {
      const oldestId = this.getOldestPreviewItemId();
      if (oldestId) {
        this.previewItems.delete(oldestId);
      }
    }

    this.previewItems.set(item.id, item);
    console.log(`➕ Added preview item: ${item.title}`);
  }

  /**
   * 自然言語からの指向性プレビュー生成
   */
  async generateDirectedPreview(inputText: string): Promise<UnifiedPreviewItem[]> {
    console.log('🎯 Generating directed preview for:', inputText.substring(0, 50) + '...');

    // 高精度分析実行
    const context = await this.accuracyService.analyzePreviewContext(inputText);

    // Claude Agent最適化
    const taskId = await this.agentService.queuePreviewOptimizationTask(inputText, context, 0.9);

    // 生成されたプレビューアイテム
    const generatedItems: UnifiedPreviewItem[] = [];

    // コンテキストに基づく特化型検出
    for (const visualReq of context.visualRequirements) {
      switch (visualReq.type) {
        case 'gui':
          const webItems = await this.generateGUIPreviewItems(context);
          generatedItems.push(...webItems);
          break;
        case 'matplotlib':
          const plotItems = await this.generateMatplotlibPreviewItems(context);
          generatedItems.push(...plotItems);
          break;
        case 'jupyter':
          const notebookItems = await this.generateJupyterPreviewItems(context);
          generatedItems.push(...notebookItems);
          break;
        case 'cui':
          const terminalItems = await this.generateCUIPreviewItems(context);
          generatedItems.push(...terminalItems);
          break;
      }
    }

    // ローカルメトリクス記録
    await this.localMetricsService.logMetrics({
      directed_preview_generation: 1,
      input_analysis_confidence: context.confidenceScore,
      generated_items_count: generatedItems.length,
      visual_requirements_detected: context.visualRequirements.length
    });

    return generatedItems;
  }

  /**
   * GUIプレビューアイテム生成
   */
  private async generateGUIPreviewItems(context: any): Promise<UnifiedPreviewItem[]> {
    const items: UnifiedPreviewItem[] = [];

    // 検出されたフレームワークに基づくポート推定
    const estimatedPorts = this.estimatePortsFromFrameworks(context.detectedFrameworks);

    for (const port of estimatedPorts) {
      const item = await this.createWebAppPreviewItem(port);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Matplotlibプレビューアイテム生成
   */
  private async generateMatplotlibPreviewItems(context: any): Promise<UnifiedPreviewItem[]> {
    const items: UnifiedPreviewItem[] = [];

    // 最近生成された画像ファイルを検索
    const recentImages = await this.findRecentImageFiles();

    for (const imagePath of recentImages) {
      const item = await this.createMatplotlibPreviewItem(imagePath);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Jupyterプレビューアイテム生成
   */
  private async generateJupyterPreviewItems(context: any): Promise<UnifiedPreviewItem[]> {
    const items: UnifiedPreviewItem[] = [];

    const recentNotebooks = await this.findRecentNotebookFiles();

    for (const notebookPath of recentNotebooks) {
      const item = await this.createJupyterPreviewItem(notebookPath);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * CUIプレビューアイテム生成
   */
  private async generateCUIPreviewItems(context: any): Promise<UnifiedPreviewItem[]> {
    return [];
  }

  // ユーティリティメソッド
  private async checkPortStatus(port: number): Promise<boolean> {
    // ポート状態確認の実装（実際の環境では net モジュール等を使用）
    return Math.random() > 0.7; // デモ用
  }

  private async detectFramework(port: number): Promise<string | null> {
    // フレームワーク検出実装
    const frameworks = ['Flask', 'React', 'FastAPI', 'Express'];
    return Math.random() > 0.5 ? frameworks[Math.floor(Math.random() * frameworks.length)] : null;
  }

  private async findImageFiles(): Promise<string[]> {
    // 画像ファイル検索実装
    return ['/tmp/claude/sample_plot.png', '/tmp/claude/visualization.png'];
  }

  private async findNotebookFiles(): Promise<string[]> {
    // Notebook ファイル検索実装
    return ['/tmp/claude/analysis.ipynb'];
  }

  private async findOutputFiles(): Promise<string[]> {
    // 出力ファイル検索実装
    return ['/tmp/claude/output.html', '/tmp/claude/data.json'];
  }

  private async findRecentImageFiles(): Promise<string[]> {
    return this.findImageFiles();
  }

  private async findRecentNotebookFiles(): Promise<string[]> {
    return this.findNotebookFiles();
  }

  private async getFileSize(filePath: string): Promise<number> {
    return Math.floor(Math.random() * 1000000);
  }

  private async getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
    return { width: 800, height: 600 };
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      svg: 'image/svg+xml',
      html: 'text/html',
      json: 'application/json',
      ipynb: 'application/x-ipynb+json'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private generateAccessMethods(filePath: string, type: string): AccessMethod[] {
    const methods: AccessMethod[] = [];

    if (type === 'html') {
      methods.push({
        type: 'browser',
        url: `file://${filePath}`,
        description: 'ブラウザで開く',
        isRecommended: true
      });
    } else if (type === 'matplotlib') {
      methods.push({
        type: 'image_viewer',
        command: `open "${filePath}"`,
        description: '画像ビューワーで開く',
        isRecommended: true
      });
    } else {
      methods.push({
        type: 'terminal',
        command: `cat "${filePath}"`,
        description: 'ターミナルで表示',
        isRecommended: true
      });
    }

    return methods;
  }

  private estimatePortsFromFrameworks(frameworks: string[]): number[] {
    const frameworkPorts: Record<string, number> = {
      flask: 5000,
      react: 3000,
      fastapi: 8000,
      express: 3000,
      django: 8000,
      streamlit: 8501
    };

    return frameworks
      .map(fw => frameworkPorts[fw.toLowerCase()])
      .filter(Boolean);
  }

  private getOldestPreviewItemId(): string | null {
    let oldest: UnifiedPreviewItem | null = null;

    for (const item of this.previewItems.values()) {
      if (!oldest || item.createdAt < oldest.createdAt) {
        oldest = item;
      }
    }

    return oldest?.id || null;
  }

  private async recordDetectionMetrics(): Promise<void> {
    const metrics = {
      total_preview_items: this.previewItems.size,
      gui_items: Array.from(this.previewItems.values()).filter(item => item.type === 'gui').length,
      matplotlib_items: Array.from(this.previewItems.values()).filter(item => item.type === 'matplotlib').length,
      jupyter_items: Array.from(this.previewItems.values()).filter(item => item.type === 'jupyter').length,
      detection_cycle_timestamp: Date.now()
    };

    // ローカルメトリクスサービスは常に利用可能
    await this.localMetricsService.logMetrics(metrics);
  }

  /**
   * 公開メソッド
   */
  getAllPreviewItems(): UnifiedPreviewItem[] {
    return Array.from(this.previewItems.values())
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }

  getPreviewItemsByType(type: UnifiedPreviewItem['type']): UnifiedPreviewItem[] {
    return this.getAllPreviewItems().filter(item => item.type === type);
  }

  getPreviewItem(id: string): UnifiedPreviewItem | null {
    return this.previewItems.get(id) || null;
  }

  removePreviewItem(id: string): boolean {
    return this.previewItems.delete(id);
  }

  updateConfig(newConfig: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): DetectionConfig {
    return { ...this.config };
  }

  clearAllPreviewItems(): void {
    this.previewItems.clear();
  }
}

export default UnifiedPreviewDetectionService;
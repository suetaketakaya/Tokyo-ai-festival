/**
 * W&B (Weights & Biases) Integration Service
 * プレビュー機能とW&Bの統合を管理するサービス
 */

export interface WandBExperiment {
  id: string;
  name: string;
  project: string;
  status: 'running' | 'completed' | 'failed' | 'crashed';
  config: Record<string, any>;
  metrics: Record<string, number>;
  artifacts: WandBArtifact[];
  plots: WandBPlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WandBArtifact {
  id: string;
  name: string;
  type: 'model' | 'dataset' | 'image' | 'plot';
  path: string;
  size: number;
  metadata: Record<string, any>;
}

export interface WandBPlot {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'scatter' | 'histogram' | 'heatmap';
  data: any;
  imageUrl?: string;
  metadata: Record<string, any>;
}

export interface WandBMetrics {
  epoch: number;
  loss: number;
  accuracy?: number;
  val_loss?: number;
  val_accuracy?: number;
  learning_rate?: number;
  [key: string]: number | undefined;
}

class WandBIntegrationService {
  private static instance: WandBIntegrationService;
  private experiments: Map<string, WandBExperiment> = new Map();
  private currentExperiment: WandBExperiment | null = null;
  private isConnected: boolean = false;
  private apiKey: string | null = null;
  private baseUrl: string = 'https://api.wandb.ai/v1';

  private constructor() {}

  static getInstance(): WandBIntegrationService {
    if (!WandBIntegrationService.instance) {
      WandBIntegrationService.instance = new WandBIntegrationService();
    }
    return WandBIntegrationService.instance;
  }

  /**
   * W&B API接続を初期化
   */
  async initialize(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      this.apiKey = apiKey;
      if (baseUrl) {
        this.baseUrl = baseUrl;
      }

      // API接続テスト
      const isValid = await this.validateApiKey();
      this.isConnected = isValid;

      return isValid;
    } catch (error) {
      console.error('W&B initialization failed:', error);
      return false;
    }
  }

  /**
   * APIキーの有効性を検証
   */
  private async validateApiKey(): Promise<boolean> {
    try {
      // 実際のW&B APIを呼び出す代わりに、
      // ローカル環境での検証ロジックを実装
      return this.apiKey !== null && this.apiKey.length > 0;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  /**
   * 新しい実験を開始
   */
  async startExperiment(
    name: string,
    project: string,
    config: Record<string, any> = {}
  ): Promise<WandBExperiment | null> {
    try {
      const experiment: WandBExperiment = {
        id: this.generateExperimentId(),
        name,
        project,
        status: 'running',
        config,
        metrics: {},
        artifacts: [],
        plots: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.experiments.set(experiment.id, experiment);
      this.currentExperiment = experiment;

      console.log(`W&B Experiment started: ${name} (${experiment.id})`);
      return experiment;
    } catch (error) {
      console.error('Failed to start experiment:', error);
      return null;
    }
  }

  /**
   * 実験を終了
   */
  async finishExperiment(experimentId?: string): Promise<boolean> {
    try {
      const expId = experimentId || this.currentExperiment?.id;
      if (!expId) {
        throw new Error('No experiment to finish');
      }

      const experiment = this.experiments.get(expId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      experiment.status = 'completed';
      experiment.updatedAt = new Date();

      if (this.currentExperiment?.id === expId) {
        this.currentExperiment = null;
      }

      console.log(`W&B Experiment finished: ${experiment.name}`);
      return true;
    } catch (error) {
      console.error('Failed to finish experiment:', error);
      return false;
    }
  }

  /**
   * メトリクスをログ
   */
  async logMetrics(metrics: WandBMetrics, step?: number): Promise<boolean> {
    try {
      if (!this.currentExperiment) {
        throw new Error('No active experiment');
      }

      // 現在の実験にメトリクスを追加
      Object.assign(this.currentExperiment.metrics, metrics);
      this.currentExperiment.updatedAt = new Date();

      console.log('Metrics logged:', metrics);
      return true;
    } catch (error) {
      console.error('Failed to log metrics:', error);
      return false;
    }
  }

  /**
   * プロットをログ（Matplotlibとの統合）
   */
  async logPlot(
    title: string,
    plotData: any,
    imageBase64?: string
  ): Promise<boolean> {
    try {
      if (!this.currentExperiment) {
        throw new Error('No active experiment');
      }

      const plot: WandBPlot = {
        id: this.generatePlotId(),
        title,
        type: 'line', // デフォルト
        data: plotData,
        imageUrl: imageBase64 ? `data:image/png;base64,${imageBase64}` : undefined,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };

      this.currentExperiment.plots.push(plot);
      this.currentExperiment.updatedAt = new Date();

      console.log(`Plot logged: ${title}`);
      return true;
    } catch (error) {
      console.error('Failed to log plot:', error);
      return false;
    }
  }

  /**
   * アーティファクト（モデル、データセットなど）をログ
   */
  async logArtifact(
    name: string,
    type: 'model' | 'dataset' | 'image' | 'plot',
    path: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      if (!this.currentExperiment) {
        throw new Error('No active experiment');
      }

      const artifact: WandBArtifact = {
        id: this.generateArtifactId(),
        name,
        type,
        path,
        size: 0, // 実際の実装では、ファイルサイズを取得
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      this.currentExperiment.artifacts.push(artifact);
      this.currentExperiment.updatedAt = new Date();

      console.log(`Artifact logged: ${name}`);
      return true;
    } catch (error) {
      console.error('Failed to log artifact:', error);
      return false;
    }
  }

  /**
   * 実験一覧を取得
   */
  getExperiments(): WandBExperiment[] {
    return Array.from(this.experiments.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * 特定の実験を取得
   */
  getExperiment(experimentId: string): WandBExperiment | null {
    return this.experiments.get(experimentId) || null;
  }

  /**
   * 現在アクティブな実験を取得
   */
  getCurrentExperiment(): WandBExperiment | null {
    return this.currentExperiment;
  }

  /**
   * W&B接続状態を取得
   */
  isWandBConnected(): boolean {
    return this.isConnected;
  }

  /**
   * プロジェクトごとの実験を取得
   */
  getExperimentsByProject(project: string): WandBExperiment[] {
    return this.getExperiments().filter(exp => exp.project === project);
  }

  /**
   * 実験のメトリクス履歴を取得
   */
  getMetricsHistory(experimentId: string): WandBMetrics[] {
    // 実際の実装では、時系列のメトリクスデータを返す
    const experiment = this.getExperiment(experimentId);
    if (!experiment) return [];

    // デモ用の履歴データ
    return [experiment.metrics as WandBMetrics];
  }

  /**
   * Matplotlibプロット統合
   */
  async integrateMatplotlibPlot(
    title: string,
    base64Image: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // W&Bプロットとしてログ
      await this.logPlot(title, metadata, base64Image);

      // アーティファクトとしても保存
      await this.logArtifact(
        `${title}_plot`,
        'plot',
        `plots/${title.replace(/\s+/g, '_')}.png`,
        {
          ...metadata,
          type: 'matplotlib_plot',
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to integrate matplotlib plot:', error);
      return false;
    }
  }

  /**
   * プレビューデータをW&B形式に変換
   */
  convertPreviewToWandB(previewItem: any): WandBPlot | null {
    try {
      if (previewItem.type === 'matplotlib') {
        return {
          id: this.generatePlotId(),
          title: previewItem.title || 'Matplotlib Plot',
          type: 'line',
          data: {},
          imageUrl: previewItem.content,
          metadata: {
            filename: previewItem.metadata?.filename,
            timestamp: previewItem.metadata?.timestamp,
            source: 'preview_integration',
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to convert preview to W&B format:', error);
      return null;
    }
  }

  // ユーティリティメソッド
  private generateExperimentId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePlotId(): string {
    return `plot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateArtifactId(): string {
    return `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * サービスのリセット（テスト用）
   */
  reset(): void {
    this.experiments.clear();
    this.currentExperiment = null;
    this.isConnected = false;
    this.apiKey = null;
  }
}

export default WandBIntegrationService;
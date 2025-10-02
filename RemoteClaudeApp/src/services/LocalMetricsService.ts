/**
 * Local Metrics Service - 完全ローカル保存専用の精度追跡システム
 * W&Bクラウドサービスの代替として、すべてのメトリクスをローカルに保存
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalExperiment {
  id: string;
  name: string;
  project: string;
  status: 'running' | 'completed' | 'failed' | 'crashed';
  config: Record<string, any>;
  metrics: LocalMetrics[];
  artifacts: LocalArtifact[];
  plots: LocalPlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalMetrics {
  timestamp: number;
  step?: number;
  accuracy_score?: number;
  processing_time_ms?: number;
  confidence_score?: number;
  frameworks_detected?: number;
  visual_requirements_count?: number;
  button_generation_success?: number;
  framework_detection_accuracy?: number;
  user_satisfaction_score?: number;
  execution_success_rate?: number;
  [key: string]: number | undefined;
}

export interface LocalArtifact {
  id: string;
  name: string;
  type: 'model' | 'dataset' | 'image' | 'plot' | 'log';
  localPath: string;
  size: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface LocalPlot {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'scatter' | 'histogram' | 'heatmap';
  data: any;
  imageBase64?: string;
  localImagePath?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface AccuracyReport {
  overall_accuracy: number;
  framework_detection: number;
  preview_generation: number;
  user_satisfaction: number;
  improvement_trend: number;
  last_updated: Date;
  total_experiments: number;
  total_metrics_recorded: number;
}

export class LocalMetricsService {
  private static instance: LocalMetricsService;
  private experiments: Map<string, LocalExperiment> = new Map();
  private currentExperiment: LocalExperiment | null = null;
  private isInitialized = false;

  private readonly STORAGE_KEYS = {
    EXPERIMENTS: '@RemoteClaudeOPS:experiments',
    CURRENT_EXPERIMENT: '@RemoteClaudeOPS:current_experiment',
    METRICS_HISTORY: '@RemoteClaudeOPS:metrics_history',
    ACCURACY_REPORT: '@RemoteClaudeOPS:accuracy_report'
  };

  private constructor() {}

  static getInstance(): LocalMetricsService {
    if (!LocalMetricsService.instance) {
      LocalMetricsService.instance = new LocalMetricsService();
    }
    return LocalMetricsService.instance;
  }

  /**
   * ローカルメトリクスシステムの初期化
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Initializing Local Metrics Service...');

      // 保存された実験データを読み込み
      await this.loadExperimentsFromStorage();

      // 進行中の実験があれば復元
      await this.restoreCurrentExperiment();

      this.isInitialized = true;
      console.log('✅ Local Metrics Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Local Metrics Service:', error);
      return false;
    }
  }

  /**
   * 新しい実験を開始（完全ローカル）
   */
  async startExperiment(
    name: string,
    project: string,
    config: Record<string, any> = {}
  ): Promise<LocalExperiment | null> {
    try {
      const experiment: LocalExperiment = {
        id: this.generateExperimentId(),
        name,
        project,
        status: 'running',
        config: {
          ...config,
          local_storage: true,
          cloud_disabled: true,
          storage_location: 'AsyncStorage'
        },
        metrics: [],
        artifacts: [],
        plots: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.experiments.set(experiment.id, experiment);
      this.currentExperiment = experiment;

      // ローカルストレージに保存
      await this.saveExperimentsToStorage();
      await this.saveCurrentExperiment();

      console.log(`📊 Local Experiment started: ${name} (${experiment.id})`);
      return experiment;
    } catch (error) {
      console.error('❌ Failed to start local experiment:', error);
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

      // ローカルストレージに保存
      await this.saveExperimentsToStorage();
      await this.saveCurrentExperiment();

      console.log(`📊 Local Experiment finished: ${experiment.name}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to finish local experiment:', error);
      return false;
    }
  }

  /**
   * メトリクスをローカルに記録
   */
  async logMetrics(metrics: Partial<LocalMetrics>, step?: number): Promise<boolean> {
    try {
      if (!this.currentExperiment) {
        // アクティブな実験がない場合は自動作成
        await this.startExperiment('Auto-Generated', 'Preview-Accuracy', {});
      }

      if (!this.currentExperiment) {
        throw new Error('No active experiment and failed to create one');
      }

      const metricsEntry: LocalMetrics = {
        timestamp: Date.now(),
        step,
        ...metrics
      };

      this.currentExperiment.metrics.push(metricsEntry);
      this.currentExperiment.updatedAt = new Date();

      // ローカルストレージに保存
      await this.saveExperimentsToStorage();

      console.log('📈 Local Metrics logged:', metricsEntry);
      return true;
    } catch (error) {
      console.error('❌ Failed to log local metrics:', error);
      return false;
    }
  }

  /**
   * プロット画像をローカルに保存
   */
  async logPlot(
    title: string,
    plotData: any,
    imageBase64?: string
  ): Promise<boolean> {
    try {
      if (!this.currentExperiment) {
        await this.startExperiment('Auto-Generated', 'Preview-Accuracy', {});
      }

      if (!this.currentExperiment) {
        throw new Error('No active experiment');
      }

      const plot: LocalPlot = {
        id: this.generatePlotId(),
        title,
        type: 'line',
        data: plotData,
        imageBase64,
        metadata: {
          timestamp: new Date().toISOString(),
          storage_type: 'local',
        },
        createdAt: new Date()
      };

      // Base64画像をローカルファイルとして保存（オプション）
      if (imageBase64) {
        const localPath = await this.saveImageToLocal(plot.id, imageBase64);
        plot.localImagePath = localPath;
      }

      this.currentExperiment.plots.push(plot);
      this.currentExperiment.updatedAt = new Date();

      await this.saveExperimentsToStorage();

      console.log(`📊 Local Plot logged: ${title}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to log local plot:', error);
      return false;
    }
  }

  /**
   * アーティファクトをローカルに保存
   */
  async logArtifact(
    name: string,
    type: LocalArtifact['type'],
    content: string | object,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      if (!this.currentExperiment) {
        await this.startExperiment('Auto-Generated', 'Preview-Accuracy', {});
      }

      if (!this.currentExperiment) {
        throw new Error('No active experiment');
      }

      const artifact: LocalArtifact = {
        id: this.generateArtifactId(),
        name,
        type,
        localPath: await this.saveArtifactToLocal(name, content),
        size: JSON.stringify(content).length,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          storage_type: 'local',
        },
        createdAt: new Date()
      };

      this.currentExperiment.artifacts.push(artifact);
      this.currentExperiment.updatedAt = new Date();

      await this.saveExperimentsToStorage();

      console.log(`📦 Local Artifact logged: ${name}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to log local artifact:', error);
      return false;
    }
  }

  /**
   * 精度レポートの生成
   */
  async generateAccuracyReport(): Promise<AccuracyReport> {
    try {
      const allMetrics = this.getAllMetrics();

      if (allMetrics.length === 0) {
        return {
          overall_accuracy: 0,
          framework_detection: 0,
          preview_generation: 0,
          user_satisfaction: 0,
          improvement_trend: 0,
          last_updated: new Date(),
          total_experiments: 0,
          total_metrics_recorded: 0
        };
      }

      // 最新50件のメトリクスで計算
      const recentMetrics = allMetrics.slice(-50);

      const avgAccuracy = this.calculateAverage(recentMetrics, 'accuracy_score') || 0;
      const avgFrameworkDetection = this.calculateAverage(recentMetrics, 'framework_detection_accuracy') || 0;
      const avgPreviewGeneration = this.calculateAverage(recentMetrics, 'button_generation_success') || 0;
      const avgUserSatisfaction = this.calculateAverage(recentMetrics, 'user_satisfaction_score') || 0;

      // 改善トレンド（最近25件 vs 前25件）
      const recent25 = recentMetrics.slice(-25);
      const previous25 = recentMetrics.slice(-50, -25);
      const recentAvg = this.calculateAverage(recent25, 'accuracy_score') || 0;
      const previousAvg = this.calculateAverage(previous25, 'accuracy_score') || 0;
      const improvementTrend = recentAvg - previousAvg;

      const report: AccuracyReport = {
        overall_accuracy: avgAccuracy,
        framework_detection: avgFrameworkDetection,
        preview_generation: avgPreviewGeneration,
        user_satisfaction: avgUserSatisfaction,
        improvement_trend: improvementTrend,
        last_updated: new Date(),
        total_experiments: this.experiments.size,
        total_metrics_recorded: allMetrics.length
      };

      // レポートをローカルに保存
      await AsyncStorage.setItem(this.STORAGE_KEYS.ACCURACY_REPORT, JSON.stringify(report));

      return report;
    } catch (error) {
      console.error('❌ Failed to generate accuracy report:', error);
      throw error;
    }
  }

  /**
   * すべての実験を取得
   */
  getExperiments(): LocalExperiment[] {
    return Array.from(this.experiments.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * 特定の実験を取得
   */
  getExperiment(experimentId: string): LocalExperiment | null {
    return this.experiments.get(experimentId) || null;
  }

  /**
   * 現在アクティブな実験を取得
   */
  getCurrentExperiment(): LocalExperiment | null {
    return this.currentExperiment;
  }

  /**
   * プロジェクトごとの実験を取得
   */
  getExperimentsByProject(project: string): LocalExperiment[] {
    return this.getExperiments().filter(exp => exp.project === project);
  }

  /**
   * 全メトリクス履歴を取得
   */
  getAllMetrics(): LocalMetrics[] {
    const allMetrics: LocalMetrics[] = [];
    for (const experiment of this.experiments.values()) {
      allMetrics.push(...experiment.metrics);
    }
    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 接続状態（常にtrue - ローカル専用）
   */
  isConnected(): boolean {
    return this.isInitialized;
  }

  /**
   * データエクスポート
   */
  async exportAllData(): Promise<string> {
    try {
      const exportData = {
        experiments: Array.from(this.experiments.values()),
        accuracy_report: await this.generateAccuracyReport(),
        export_timestamp: new Date().toISOString(),
        version: '2.0.0',
        type: 'RemoteClaudeOPS_LocalMetrics'
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      throw error;
    }
  }

  /**
   * データインポート
   */
  async importData(jsonData: string): Promise<boolean> {
    try {
      const importData = JSON.parse(jsonData);

      if (importData.type !== 'RemoteClaudeOPS_LocalMetrics') {
        throw new Error('Invalid data format');
      }

      // 実験データの復元
      for (const expData of importData.experiments) {
        const experiment: LocalExperiment = {
          ...expData,
          createdAt: new Date(expData.createdAt),
          updatedAt: new Date(expData.updatedAt)
        };
        this.experiments.set(experiment.id, experiment);
      }

      await this.saveExperimentsToStorage();

      console.log('✅ Data imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      return false;
    }
  }

  /**
   * ストレージクリア
   */
  async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.EXPERIMENTS,
        this.STORAGE_KEYS.CURRENT_EXPERIMENT,
        this.STORAGE_KEYS.METRICS_HISTORY,
        this.STORAGE_KEYS.ACCURACY_REPORT
      ]);

      this.experiments.clear();
      this.currentExperiment = null;

      console.log('🗑️ All local data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      return false;
    }
  }

  // プライベートメソッド
  private async loadExperimentsFromStorage(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEYS.EXPERIMENTS);
      if (storedData) {
        const experimentsArray: LocalExperiment[] = JSON.parse(storedData);
        for (const exp of experimentsArray) {
          exp.createdAt = new Date(exp.createdAt);
          exp.updatedAt = new Date(exp.updatedAt);
          this.experiments.set(exp.id, exp);
        }
      }
    } catch (error) {
      console.error('Failed to load experiments from storage:', error);
    }
  }

  private async saveExperimentsToStorage(): Promise<void> {
    try {
      const experimentsArray = Array.from(this.experiments.values());
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.EXPERIMENTS,
        JSON.stringify(experimentsArray)
      );
    } catch (error) {
      console.error('Failed to save experiments to storage:', error);
    }
  }

  private async restoreCurrentExperiment(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEYS.CURRENT_EXPERIMENT);
      if (storedData) {
        const currentExpId = JSON.parse(storedData);
        this.currentExperiment = this.experiments.get(currentExpId) || null;
      }
    } catch (error) {
      console.error('Failed to restore current experiment:', error);
    }
  }

  private async saveCurrentExperiment(): Promise<void> {
    try {
      const currentExpId = this.currentExperiment?.id || null;
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CURRENT_EXPERIMENT,
        JSON.stringify(currentExpId)
      );
    } catch (error) {
      console.error('Failed to save current experiment:', error);
    }
  }

  private async saveImageToLocal(plotId: string, base64Image: string): Promise<string> {
    // React Nativeでは実際のファイルシステムへの保存は制限があるため、
    // AsyncStorageを使用するか、将来的にreact-native-fsライブラリを使用
    const imagePath = `plots/${plotId}.png`;
    await AsyncStorage.setItem(`@RemoteClaudeOPS:image:${plotId}`, base64Image);
    return imagePath;
  }

  private async saveArtifactToLocal(name: string, content: string | object): Promise<string> {
    const artifactId = this.generateArtifactId();
    const artifactPath = `artifacts/${artifactId}_${name}`;
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    await AsyncStorage.setItem(`@RemoteClaudeOPS:artifact:${artifactId}`, contentString);
    return artifactPath;
  }

  private calculateAverage(metrics: LocalMetrics[], field: keyof LocalMetrics): number | null {
    const values = metrics
      .map(m => m[field])
      .filter((value): value is number => typeof value === 'number');

    if (values.length === 0) return null;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private generateExperimentId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePlotId(): string {
    return `plot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateArtifactId(): string {
    return `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default LocalMetricsService;
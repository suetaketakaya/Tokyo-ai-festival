# W&B統合機能 技術仕様書

## 📊 概要

RemoteClaudeOPS v4.0 で実装されたWeights & Biases (W&B) 統合機能の詳細技術仕様書です。

## 🏗️ アーキテクチャ

### システム構成
```
iPhone App (React Native)
├── EnhancedPreviewScreen.tsx
│   └── W&B Tab UI
├── WandBIntegrationService.ts
│   ├── 実験管理
│   ├── メトリクス記録
│   └── プロット統合
└── WebSocket Connection
    └── Matplotlib Data Flow
```

## 🔧 技術実装

### 1. WandBIntegrationService.ts

#### 核心インターフェース
```typescript
interface WandBExperiment {
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

interface WandBPlot {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'scatter' | 'histogram' | 'heatmap';
  data: any;
  imageUrl?: string;
  metadata: Record<string, any>;
}

interface WandBArtifact {
  id: string;
  name: string;
  type: 'model' | 'dataset' | 'image' | 'plot';
  path: string;
  size: number;
  metadata: Record<string, any>;
}
```

#### 主要メソッド

##### 実験管理
```typescript
// 実験開始
async startExperiment(
  name: string,
  project: string,
  config: Record<string, any> = {}
): Promise<WandBExperiment | null>

// 実験終了
async finishExperiment(experimentId?: string): Promise<boolean>

// 現在の実験取得
getCurrentExperiment(): WandBExperiment | null
```

##### データログ
```typescript
// メトリクス記録
async logMetrics(metrics: WandBMetrics, step?: number): Promise<boolean>

// プロットログ
async logPlot(
  title: string,
  plotData: any,
  imageBase64?: string
): Promise<boolean>

// アーティファクトログ
async logArtifact(
  name: string,
  type: 'model' | 'dataset' | 'image' | 'plot',
  path: string,
  metadata: Record<string, any> = {}
): Promise<boolean>
```

##### Matplotlib統合
```typescript
// Matplotlibプロット統合
async integrateMatplotlibPlot(
  title: string,
  base64Image: string,
  metadata: Record<string, any> = {}
): Promise<boolean>

// プレビューデータ変換
convertPreviewToWandB(previewItem: any): WandBPlot | null
```

### 2. EnhancedPreviewScreen.tsx 統合

#### 状態管理
```typescript
// W&B関連状態
const [wandbService] = useState(() => WandBIntegrationService.getInstance());
const [wandbExperiments, setWandBExperiments] = useState<WandBExperiment[]>([]);
const [currentExperiment, setCurrentExperiment] = useState<WandBExperiment | null>(null);
const [wandbConnected, setWandBConnected] = useState<boolean>(false);
```

#### UI コンポーネント

##### W&Bタブ
- 実験管理パネル
- 実験履歴リスト
- 統合情報表示

##### 実験管理UI
```typescript
// 実験開始
const startWandBExperiment = async () => {
  const experiment = await wandbService.startExperiment(
    `Preview_Experiment_${Date.now()}`,
    projectId || 'remote_claude_preview',
    {
      project_id: projectId,
      timestamp: new Date().toISOString(),
    }
  );
};

// 実験終了
const finishWandBExperiment = async () => {
  if (currentExperiment) {
    await wandbService.finishExperiment(currentExperiment.id);
  }
};
```

##### 自動統合フロー
```typescript
// Matplotlibプロットの自動W&B統合
const integrateWithWandB = async (previewItem: PreviewItem) => {
  if (previewItem.type === 'matplotlib' && currentExperiment) {
    const plotData = wandbService.convertPreviewToWandB({
      title: previewItem.name,
      content: imageData,
      type: 'matplotlib',
      metadata: {
        timestamp: new Date().toISOString(),
        projectId: projectId,
      },
    });

    if (plotData) {
      await wandbService.logPlot(
        previewItem.name,
        plotData.data,
        imageData
      );
    }
  }
};
```

## 📱 ユーザーインターフェース

### W&Bタブ レイアウト

#### 1. 接続状態カード
```
🔬 W&B Integration Status
                    [Connected/Disconnected]
```

#### 2. 現在の実験カード
```
📊 Current Experiment
実験名: Preview_Experiment_1695...
プロジェクト: remote_claude_preview
ステータス: running
開始時刻: 2025/09/28 18:00:00
                    [✓ Finish Experiment]
```

#### 3. 実験履歴カード
```
📜 Experiment History
┌─────────────────────────────────┐
│ Preview_Experiment_123 [completed] │
│ remote_claude_preview           │
│ 2025/09/28 17:45:12            │
│ Metrics: loss: 0.1234, acc: 0.89 │
│ 📈 3 plot(s) logged            │
└─────────────────────────────────┘
```

#### 4. 統合情報カード
```
ℹ️ Integration Info
• Matplotlib plots are automatically logged to W&B
• Experiments track model metrics, plots, and artifacts
• View detailed experiment data in the W&B dashboard
```

## 🔄 データフロー

### 実験ライフサイクル
```
1. [Start Experiment] → WandBIntegrationService.startExperiment()
2. [Generate Plot] → Matplotlib in Container
3. [Auto Integration] → integrateWithWandB()
4. [Log to W&B] → logPlot() + logArtifact()
5. [Finish Experiment] → finishExperiment()
```

### 自動統合フロー
```
Preview Item (matplotlib) → convertPreviewToWandB() → WandBPlot
                                 ↓
W&B Service → logPlot() → Local Storage → Future W&B API Sync
```

## 🎛️ 設定管理

### 初期化
```typescript
// W&B サービス初期化
const initializeWandB = async () => {
  await wandbService.initialize('demo_api_key_' + Date.now());
};
```

### 実験設定
```typescript
// 実験設定例
const experimentConfig = {
  project_id: projectId,
  timestamp: new Date().toISOString(),
  learning_rate: 0.001,
  batch_size: 32,
  model_type: 'CNN',
};
```

## 📊 メトリクス仕様

### WandBMetrics インターフェース
```typescript
interface WandBMetrics {
  epoch: number;
  loss: number;
  accuracy?: number;
  val_loss?: number;
  val_accuracy?: number;
  learning_rate?: number;
  [key: string]: number | undefined;
}
```

### メトリクス例
```typescript
const metrics = {
  epoch: 10,
  loss: 0.1234,
  accuracy: 0.8945,
  val_loss: 0.1567,
  val_accuracy: 0.8723,
  learning_rate: 0.001,
};
```

## 🗄️ データ永続化

### ローカルストレージ
- 実験データ: Map<string, WandBExperiment>
- 現在の実験: WandBExperiment | null
- 接続状態: boolean

### 将来のAPI統合準備
```typescript
// W&B API エンドポイント (準備済み)
private baseUrl: string = 'https://api.wandb.ai/v1';

// API認証 (実装済み)
async validateApiKey(): Promise<boolean>
```

## 🔧 エラーハンドリング

### 実験管理エラー
```typescript
try {
  const experiment = await wandbService.startExperiment(name, project, config);
} catch (error) {
  console.error('Failed to start experiment:', error);
  // UI フィードバック
}
```

### プロットログエラー
```typescript
try {
  await wandbService.logPlot(title, plotData, imageBase64);
} catch (error) {
  console.error('Failed to log plot:', error);
  // 再試行ロジック
}
```

## 🧪 テストシナリオ

### 基本フロー
1. W&Bタブアクセス
2. 実験開始
3. Matplotlibプロット生成
4. 自動W&B統合確認
5. 実験終了
6. 履歴確認

### エラーケース
1. 接続失敗時の処理
2. 実験データ競合
3. プロット保存失敗
4. メモリ不足対応

## 📈 パフォーマンス

### 目標指標
- 実験開始時間: <1秒
- プロットログ時間: <3秒
- 履歴表示時間: <2秒
- メモリ使用量: <50MB

### 最適化方針
- 非同期処理の活用
- 画像データの効率的な処理
- キャッシュ機能の実装
- バックグラウンド同期

## 🚀 将来の拡張

### v5.0 計画
- **リアルタイムW&B API連携**
- **チーム共有機能**
- **高度なメトリクス可視化**
- **カスタムダッシュボード**

### 技術的改善点
- **ストリーミングメトリクス**
- **オフライン同期**
- **圧縮アルゴリズム**
- **マルチプロジェクト対応**

---

**Document Version**: v1.0
**Implementation Status**: ✅ Complete
**Last Updated**: 2025年9月28日
**Maintainer**: RemoteClaudeOPS Development Team
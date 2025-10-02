/**
 * Enhanced Pattern Detection Service
 * 多様な自然言語入力からプレビューボタンを生成する拡張パターン検出システム
 */

export interface Framework {
  id: string;
  name: string;
  category: 'web' | 'mobile' | 'ai_ml' | 'data' | 'cloud' | 'devops' | 'gui';
  language: string[];
  commands: FrameworkCommand[];
}

export interface FrameworkCommand {
  id: string;
  title: string;
  command: string;
  category: 'setup' | 'create' | 'run' | 'test' | 'deploy' | 'debug';
  description: string;
  prerequisites?: string[];
  expectedOutput?: string;
}

export interface PatternAnalysis {
  detectedFrameworks: Framework[];
  inferredArchitecture: Architecture;
  extractedRequirements: Requirement[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: number;
}

export interface Architecture {
  type: 'monolith' | 'microservices' | 'serverless' | 'desktop' | 'mobile' | 'hybrid';
  components: string[];
  dataFlow: string[];
}

export interface Requirement {
  type: 'functional' | 'technical' | 'ui_ux' | 'performance' | 'security';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface GeneratedButton {
  id: string;
  title: string;
  command: string;
  category: string;
  framework: string;
  color: string;
  priority: number;
  description: string;
  expectedOutput: string;
  previewType: 'web' | 'matplotlib' | 'jupyter' | 'gui' | 'terminal';
}

class EnhancedPatternDetectionService {
  private frameworks: Framework[] = [
    // Web フレームワーク
    {
      id: 'react',
      name: 'React',
      category: 'web',
      language: ['javascript', 'typescript'],
      commands: [
        {
          id: 'react_setup',
          title: '⚛️ React アプリ作成',
          command: 'npx create-react-app my-app',
          category: 'create',
          description: 'Create React App で新しいアプリを作成',
          expectedOutput: 'React development server URL'
        },
        {
          id: 'react_start',
          title: '🚀 React 開発サーバー起動',
          command: 'npm start',
          category: 'run',
          description: '開発サーバーをポート3000で起動',
          expectedOutput: 'Running on http://localhost:3000'
        },
        {
          id: 'react_build',
          title: '📦 React プロダクションビルド',
          command: 'npm run build',
          category: 'deploy',
          description: '本番環境用にアプリをビルド',
          expectedOutput: 'Build folder created'
        }
      ]
    },
    {
      id: 'vue',
      name: 'Vue.js',
      category: 'web',
      language: ['javascript', 'typescript'],
      commands: [
        {
          id: 'vue_setup',
          title: '💚 Vue.js アプリ作成',
          command: 'npm create vue@latest my-vue-app',
          category: 'create',
          description: 'Vue.js アプリケーションを作成',
          expectedOutput: 'Vue project structure'
        },
        {
          id: 'vue_dev',
          title: '🔥 Vue.js 開発サーバー',
          command: 'npm run dev',
          category: 'run',
          description: 'Vite 開発サーバーを起動',
          expectedOutput: 'Local dev server running'
        }
      ]
    },
    {
      id: 'fastapi',
      name: 'FastAPI',
      category: 'web',
      language: ['python'],
      commands: [
        {
          id: 'fastapi_install',
          title: '⚡ FastAPI インストール',
          command: 'pip install fastapi uvicorn',
          category: 'setup',
          description: 'FastAPIとUvicornをインストール',
          expectedOutput: 'Successfully installed fastapi uvicorn'
        },
        {
          id: 'fastapi_create',
          title: '📝 FastAPI アプリ作成',
          command: 'echo "from fastapi import FastAPI\napp = FastAPI()\n\n@app.get(\"/\")\ndef read_root():\n    return {\"Hello\": \"World\"}" > main.py',
          category: 'create',
          description: 'FastAPIアプリケーションファイルを作成',
          expectedOutput: 'main.py created'
        },
        {
          id: 'fastapi_run',
          title: '🚀 FastAPI サーバー起動',
          command: 'uvicorn main:app --reload',
          category: 'run',
          description: 'FastAPIサーバーを起動',
          expectedOutput: 'Uvicorn running on http://127.0.0.1:8000'
        }
      ]
    },
    // AI/ML フレームワーク
    {
      id: 'pytorch',
      name: 'PyTorch',
      category: 'ai_ml',
      language: ['python'],
      commands: [
        {
          id: 'pytorch_install',
          title: '🔥 PyTorch インストール',
          command: 'pip install torch torchvision torchaudio',
          category: 'setup',
          description: 'PyTorchと関連ライブラリをインストール',
          expectedOutput: 'Successfully installed torch'
        },
        {
          id: 'pytorch_sample',
          title: '🧠 PyTorch サンプルモデル',
          command: 'python pytorch_sample.py',
          category: 'create',
          description: 'シンプルなニューラルネットワークを作成',
          expectedOutput: 'Model training started'
        },
        {
          id: 'pytorch_train',
          title: '🎯 モデル訓練実行',
          command: 'python train.py',
          category: 'run',
          description: 'モデルの訓練を開始',
          expectedOutput: 'Training progress logs'
        }
      ]
    },
    {
      id: 'transformers',
      name: 'Hugging Face Transformers',
      category: 'ai_ml',
      language: ['python'],
      commands: [
        {
          id: 'transformers_install',
          title: '🤗 Transformers インストール',
          command: 'pip install transformers datasets',
          category: 'setup',
          description: 'Hugging Face Transformersをインストール',
          expectedOutput: 'Successfully installed transformers'
        },
        {
          id: 'transformers_demo',
          title: '🤖 言語モデルデモ',
          command: 'python transformers_demo.py',
          category: 'run',
          description: '事前訓練済みモデルのデモ実行',
          expectedOutput: 'Model output generated'
        }
      ]
    },
    // モバイル フレームワーク
    {
      id: 'reactnative',
      name: 'React Native',
      category: 'mobile',
      language: ['javascript', 'typescript'],
      commands: [
        {
          id: 'rn_init',
          title: '📱 React Native プロジェクト作成',
          command: 'npx react-native init MyApp',
          category: 'create',
          description: 'React Nativeプロジェクトを初期化',
          expectedOutput: 'React Native project created'
        },
        {
          id: 'rn_ios',
          title: '🍎 iOS シミュレーター起動',
          command: 'npx react-native run-ios',
          category: 'run',
          description: 'iOSシミュレーターでアプリを起動',
          expectedOutput: 'iOS app running'
        },
        {
          id: 'rn_android',
          title: '🤖 Android エミュレーター起動',
          command: 'npx react-native run-android',
          category: 'run',
          description: 'Androidエミュレーターでアプリを起動',
          expectedOutput: 'Android app running'
        }
      ]
    },
    {
      id: 'flutter',
      name: 'Flutter',
      category: 'mobile',
      language: ['dart'],
      commands: [
        {
          id: 'flutter_create',
          title: '🦋 Flutter プロジェクト作成',
          command: 'flutter create my_flutter_app',
          category: 'create',
          description: 'Flutterプロジェクトを作成',
          expectedOutput: 'Flutter project structure'
        },
        {
          id: 'flutter_run',
          title: '📱 Flutter アプリ実行',
          command: 'flutter run',
          category: 'run',
          description: 'Flutterアプリを実行',
          expectedOutput: 'Flutter app running on device'
        }
      ]
    },
    // クラウド・DevOps
    {
      id: 'docker',
      name: 'Docker',
      category: 'devops',
      language: ['dockerfile'],
      commands: [
        {
          id: 'docker_build',
          title: '🐳 Docker イメージ構築',
          command: 'docker build -t my-app .',
          category: 'deploy',
          description: 'Dockerイメージを構築',
          expectedOutput: 'Docker image built successfully'
        },
        {
          id: 'docker_run',
          title: '🚀 Docker コンテナ起動',
          command: 'docker run -p 8080:8080 my-app',
          category: 'run',
          description: 'Dockerコンテナを起動',
          expectedOutput: 'Container running on port 8080'
        }
      ]
    },
    {
      id: 'kubernetes',
      name: 'Kubernetes',
      category: 'devops',
      language: ['yaml'],
      commands: [
        {
          id: 'k8s_deploy',
          title: '☸️ Kubernetes デプロイ',
          command: 'kubectl apply -f deployment.yaml',
          category: 'deploy',
          description: 'Kubernetesにデプロイ',
          expectedOutput: 'Deployment created'
        },
        {
          id: 'k8s_status',
          title: '📊 Pod ステータス確認',
          command: 'kubectl get pods',
          category: 'test',
          description: 'Podの状態を確認',
          expectedOutput: 'Pod status list'
        }
      ]
    },
    // データサイエンス
    {
      id: 'pandas',
      name: 'Pandas',
      category: 'data',
      language: ['python'],
      commands: [
        {
          id: 'pandas_install',
          title: '🐼 Pandas インストール',
          command: 'pip install pandas numpy',
          category: 'setup',
          description: 'Pandasとnumpyをインストール',
          expectedOutput: 'Successfully installed pandas'
        },
        {
          id: 'pandas_analysis',
          title: '📊 データ分析実行',
          command: 'python data_analysis.py',
          category: 'run',
          description: 'データ分析スクリプトを実行',
          expectedOutput: 'Data analysis results'
        }
      ]
    },
    // デスクトップGUI
    {
      id: 'electron',
      name: 'Electron',
      category: 'gui',
      language: ['javascript', 'typescript'],
      commands: [
        {
          id: 'electron_init',
          title: '⚡ Electron アプリ作成',
          command: 'npm init electron-app my-electron-app',
          category: 'create',
          description: 'Electronアプリケーションを作成',
          expectedOutput: 'Electron app structure created'
        },
        {
          id: 'electron_dev',
          title: '🖥️ Electron アプリ起動',
          command: 'npm run start',
          category: 'run',
          description: 'Electronアプリを開発モードで起動',
          expectedOutput: 'Electron window opened'
        }
      ]
    }
  ];

  /**
   * 自然言語入力からパターンを分析
   */
  public analyzePattern(input: string): PatternAnalysis {
    const normalizedInput = input.toLowerCase();

    // フレームワーク検出
    const detectedFrameworks = this.detectFrameworks(normalizedInput);

    // アーキテクチャ推論
    const inferredArchitecture = this.inferArchitecture(normalizedInput, detectedFrameworks);

    // 要件抽出
    const extractedRequirements = this.extractRequirements(normalizedInput);

    // 複雑度評価
    const complexity = this.evaluateComplexity(detectedFrameworks, extractedRequirements);

    // 推定時間計算
    const estimatedTime = this.estimateTime(complexity, detectedFrameworks.length);

    return {
      detectedFrameworks,
      inferredArchitecture,
      extractedRequirements,
      complexity,
      estimatedTime
    };
  }

  /**
   * フレームワーク検出
   */
  private detectFrameworks(input: string): Framework[] {
    const detected: Framework[] = [];

    // 直接的なフレームワーク名の検出
    for (const framework of this.frameworks) {
      const patterns = [
        framework.name.toLowerCase(),
        framework.id,
        ...this.getFrameworkAliases(framework.id)
      ];

      if (patterns.some(pattern => input.includes(pattern))) {
        detected.push(framework);
      }
    }

    // パターンベースの検出
    const patternMatches = this.detectByPatterns(input);
    detected.push(...patternMatches);

    // 重複除去
    return Array.from(new Set(detected.map(f => f.id)))
      .map(id => this.frameworks.find(f => f.id === id)!)
      .filter(Boolean);
  }

  /**
   * パターンベースのフレームワーク検出
   */
  private detectByPatterns(input: string): Framework[] {
    const patterns = [
      // Webアプリケーション
      {
        patterns: ['webアプリ', 'ウェブアプリ', 'spa', 'フロントエンド'],
        frameworks: ['react', 'vue']
      },
      // モバイルアプリ
      {
        patterns: ['モバイルアプリ', 'スマホアプリ', 'ios', 'android', 'アプリ開発'],
        frameworks: ['reactnative', 'flutter']
      },
      // API
      {
        patterns: ['api', 'rest api', 'バックエンド', 'サーバー'],
        frameworks: ['fastapi', 'flask', 'django']
      },
      // 機械学習
      {
        patterns: ['機械学習', '深層学習', 'ai', 'ニューラルネットワーク', '自然言語処理'],
        frameworks: ['pytorch', 'transformers', 'tensorflow']
      },
      // データ分析
      {
        patterns: ['データ分析', 'データサイエンス', 'グラフ', 'チャート'],
        frameworks: ['pandas', 'matplotlib']
      },
      // デスクトップアプリ
      {
        patterns: ['デスクトップアプリ', 'gui', 'ウィンドウ', 'デスクトップ'],
        frameworks: ['electron']
      },
      // コンテナ・デプロイ
      {
        patterns: ['コンテナ', 'デプロイ', 'クラウド', 'docker', 'kubernetes'],
        frameworks: ['docker', 'kubernetes']
      }
    ];

    const detected: Framework[] = [];

    for (const pattern of patterns) {
      if (pattern.patterns.some(p => input.includes(p))) {
        const frameworks = pattern.frameworks
          .map(id => this.frameworks.find(f => f.id === id))
          .filter(Boolean) as Framework[];
        detected.push(...frameworks);
      }
    }

    return detected;
  }

  /**
   * フレームワークエイリアス取得
   */
  private getFrameworkAliases(frameworkId: string): string[] {
    const aliases: Record<string, string[]> = {
      react: ['リアクト', 'react.js'],
      vue: ['ビュー', 'vue.js', 'vuejs'],
      fastapi: ['ファストapi'],
      pytorch: ['パイトーチ'],
      transformers: ['トランスフォーマー', 'huggingface'],
      reactnative: ['react native', 'rn'],
      flutter: ['フラッター'],
      docker: ['ドッカー'],
      kubernetes: ['k8s', 'クーベネティス'],
      pandas: ['パンダス'],
      electron: ['エレクトロン']
    };

    return aliases[frameworkId] || [];
  }

  /**
   * アーキテクチャ推論
   */
  private inferArchitecture(input: string, frameworks: Framework[]): Architecture {
    // マイクロサービス関連キーワード
    if (input.includes('マイクロサービス') || input.includes('api') || frameworks.some(f => f.id === 'kubernetes')) {
      return {
        type: 'microservices',
        components: ['api-gateway', 'services', 'database'],
        dataFlow: ['client -> api-gateway -> services -> database']
      };
    }

    // サーバーレス関連
    if (input.includes('サーバーレス') || input.includes('lambda') || input.includes('functions')) {
      return {
        type: 'serverless',
        components: ['functions', 'storage', 'api-gateway'],
        dataFlow: ['client -> api-gateway -> functions -> storage']
      };
    }

    // モバイルアプリ
    if (frameworks.some(f => f.category === 'mobile')) {
      return {
        type: 'mobile',
        components: ['mobile-app', 'backend-api', 'database'],
        dataFlow: ['mobile-app -> backend-api -> database']
      };
    }

    // デスクトップアプリ
    if (frameworks.some(f => f.category === 'gui')) {
      return {
        type: 'desktop',
        components: ['desktop-app', 'local-storage'],
        dataFlow: ['user -> desktop-app -> local-storage']
      };
    }

    // デフォルト: モノリス
    return {
      type: 'monolith',
      components: ['frontend', 'backend', 'database'],
      dataFlow: ['frontend -> backend -> database']
    };
  }

  /**
   * 要件抽出
   */
  private extractRequirements(input: string): Requirement[] {
    const requirements: Requirement[] = [];

    // 機能要件
    if (input.includes('ログイン') || input.includes('認証')) {
      requirements.push({
        type: 'functional',
        description: 'ユーザー認証機能',
        priority: 'high'
      });
    }

    if (input.includes('データベース') || input.includes('保存')) {
      requirements.push({
        type: 'functional',
        description: 'データ永続化機能',
        priority: 'high'
      });
    }

    // UI/UX要件
    if (input.includes('レスポンシブ') || input.includes('スマホ対応')) {
      requirements.push({
        type: 'ui_ux',
        description: 'レスポンシブデザイン対応',
        priority: 'medium'
      });
    }

    // パフォーマンス要件
    if (input.includes('高速') || input.includes('パフォーマンス')) {
      requirements.push({
        type: 'performance',
        description: '高速レスポンス',
        priority: 'medium'
      });
    }

    // セキュリティ要件
    if (input.includes('セキュリティ') || input.includes('暗号化')) {
      requirements.push({
        type: 'security',
        description: 'セキュリティ対策',
        priority: 'high'
      });
    }

    return requirements;
  }

  /**
   * 複雑度評価
   */
  private evaluateComplexity(frameworks: Framework[], requirements: Requirement[]): 'simple' | 'moderate' | 'complex' {
    const frameworkCount = frameworks.length;
    const highPriorityReqs = requirements.filter(r => r.priority === 'high').length;

    if (frameworkCount <= 1 && highPriorityReqs <= 2) {
      return 'simple';
    } else if (frameworkCount <= 2 && highPriorityReqs <= 4) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  /**
   * 推定時間計算（分）
   */
  private estimateTime(complexity: string, frameworkCount: number): number {
    const baseTime = {
      simple: 30,
      moderate: 60,
      complex: 120
    };

    return baseTime[complexity as keyof typeof baseTime] + (frameworkCount * 15);
  }

  /**
   * コマンドシーケンス生成
   */
  public generateCommandSequence(analysis: PatternAnalysis): GeneratedButton[] {
    const buttons: GeneratedButton[] = [];
    let priority = 1;

    for (const framework of analysis.detectedFrameworks) {
      for (const command of framework.commands) {
        buttons.push({
          id: `${framework.id}_${command.id}_${Date.now()}_${priority}`,
          title: command.title,
          command: command.command,
          category: command.category,
          framework: framework.id,
          color: this.getCategoryColor(command.category),
          priority: priority++,
          description: command.description,
          expectedOutput: command.expectedOutput || '',
          previewType: this.getPreviewType(framework.category, command.category)
        });
      }
    }

    return buttons.sort((a, b) => {
      // カテゴリー順でソート: setup -> create -> run -> test -> deploy -> debug
      const categoryOrder = ['setup', 'create', 'run', 'test', 'deploy', 'debug'];
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);

      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      return a.priority - b.priority;
    });
  }

  /**
   * カテゴリー色取得
   */
  private getCategoryColor(category: string): string {
    const colors = {
      setup: '#2196F3',    // Blue
      create: '#4CAF50',   // Green
      run: '#FF9800',      // Orange
      test: '#9C27B0',     // Purple
      deploy: '#FF5722',   // Deep Orange
      debug: '#607D8B'     // Blue Grey
    };
    return colors[category as keyof typeof colors] || '#666666';
  }

  /**
   * プレビュータイプ取得
   */
  private getPreviewType(frameworkCategory: string, commandCategory: string): 'web' | 'matplotlib' | 'jupyter' | 'gui' | 'terminal' {
    if (frameworkCategory === 'web' && commandCategory === 'run') {
      return 'web';
    }

    if (frameworkCategory === 'data' || frameworkCategory === 'ai_ml') {
      return 'matplotlib';
    }

    if (frameworkCategory === 'gui') {
      return 'gui';
    }

    return 'terminal';
  }

  /**
   * 利用可能なフレームワーク一覧取得
   */
  public getAvailableFrameworks(): Framework[] {
    return this.frameworks;
  }

  /**
   * フレームワーク統計取得
   */
  public getFrameworkStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const framework of this.frameworks) {
      const category = framework.category;
      stats[category] = (stats[category] || 0) + 1;
    }

    return stats;
  }
}

export default new EnhancedPatternDetectionService();
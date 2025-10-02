/**
 * Japanese Natural Language Pattern Test Suite
 * 日本語自然言語パターンの包括的テストスイート
 */

import { DynamicCommandGenerator } from './DynamicCommandGenerator';

export interface TestCase {
  input: string;
  expected: {
    frameworks: string[];
    technologies: string[];
    actions: string[];
    features: string[];
    complexity: 'beginner' | 'intermediate' | 'advanced';
    category: string;
  };
  description: string;
}

export interface PatternCoverage {
  category: string;
  patterns: string[];
  coverage: number;
  missing: string[];
  suggestions: string[];
}

export class JapanesePatternTestSuite {

  // 🧪 テストケース定義
  static getTestCases(): TestCase[] {
    return [
      // Flask関連のテストケース
      {
        input: "シンプルなFlaskアプリケーションを作成してください。ホームページに'Hello World'を表示し、/aboutページに会社情報を表示する機能を含めてください。",
        expected: {
          frameworks: ['flask'],
          technologies: [],
          actions: ['create'],
          features: ['homepage', 'about'],
          complexity: 'beginner',
          category: 'web_app'
        },
        description: "Flask基本アプリケーション作成"
      },
      {
        input: "フラスクでAPIサーバーを構築したい。ユーザー認証とデータベース接続も必要です。",
        expected: {
          frameworks: ['flask'],
          technologies: [],
          actions: [],
          features: ['api', 'auth', 'database'],
          complexity: 'intermediate',
          category: 'web_app'
        },
        description: "Flask API + 認証 + DB"
      },
      {
        input: "Webアプリを作って欲しいです。Pythonで簡単なサイトを立ち上げたい。",
        expected: {
          frameworks: ['flask'],
          technologies: ['python'],
          actions: ['create'],
          features: [],
          complexity: 'beginner',
          category: 'web_app'
        },
        description: "Python Web アプリケーション要求"
      },

      // React関連
      {
        input: "Reactアプリケーションを立ち上げてください。モダンなSPAを作成したいです。",
        expected: {
          frameworks: ['react'],
          technologies: ['javascript'],
          actions: ['create', 'start'],
          features: [],
          complexity: 'intermediate',
          category: 'web_app'
        },
        description: "React SPA作成"
      },

      // データ可視化
      {
        input: "Pythonでデータの可視化をしたいです。グラフを生成してください。",
        expected: {
          frameworks: [],
          technologies: ['python', 'visualization'],
          actions: ['create'],
          features: [],
          complexity: 'beginner',
          category: 'data_visualization'
        },
        description: "Python データ可視化"
      },
      {
        input: "Matplotlibを使って統計グラフを描画したい。",
        expected: {
          frameworks: [],
          technologies: ['matplotlib'],
          actions: [],
          features: [],
          complexity: 'beginner',
          category: 'data_visualization'
        },
        description: "Matplotlib統計グラフ"
      },

      // 複雑な要求
      {
        input: "機械学習プロジェクトを始めたい。Pythonでデータ分析とモデル訓練をしたいです。",
        expected: {
          frameworks: [],
          technologies: ['python'],
          actions: ['start'],
          features: [],
          complexity: 'advanced',
          category: 'machine_learning'
        },
        description: "機械学習プロジェクト"
      },

      // エッジケース
      {
        input: "何か簡単なWebサイトを作りたい",
        expected: {
          frameworks: ['flask'],
          technologies: [],
          actions: ['create'],
          features: [],
          complexity: 'beginner',
          category: 'web_app'
        },
        description: "曖昧なWebサイト要求"
      },
      {
        input: "サーバーを起動してテストを実行したい",
        expected: {
          frameworks: [],
          technologies: [],
          actions: ['start', 'test'],
          features: [],
          complexity: 'beginner',
          category: 'web_app'
        },
        description: "サーバー起動とテスト"
      }
    ];
  }

  // 🧪 パターンカバレッジ分析
  static analyzePatternCoverage(): PatternCoverage[] {
    return [
      {
        category: "フレームワーク検出",
        patterns: ["flask", "フラスク", "react", "vue", "django", "express", "streamlit"],
        coverage: 60,
        missing: ["laravel", "spring", "rails", "angular", "svelte", "next.js", "nuxt"],
        suggestions: [
          "ララベル", "ラベル", // Laravel
          "スプリング", "スプリングブート", // Spring
          "レイルズ", "レール", // Rails
          "アンギュラー", "アングラー", // Angular
          "スベルト", // Svelte
          "ネクスト", "ナクスト", // Next.js
          "ナクスト" // Nuxt
        ]
      },
      {
        category: "アクション検出",
        patterns: ["作成", "作って", "create", "してください", "起動", "実行", "start", "run", "確認", "テスト", "test"],
        coverage: 70,
        missing: ["構築", "開発", "実装", "配置", "設定", "初期化"],
        suggestions: [
          "構築して", "構築したい", "構築する",
          "開発して", "開発したい", "開発する",
          "実装して", "実装したい", "実装する",
          "配置して", "配置したい", "デプロイして",
          "設定して", "設定したい", "設定する",
          "初期化して", "初期化したい", "セットアップして"
        ]
      },
      {
        category: "機能検出",
        patterns: ["ホームページ", "トップページ", "メインページ", "homepage", "会社情報", "企業情報", "アバウト", "about"],
        coverage: 50,
        missing: ["ログイン", "ユーザー管理", "商品一覧", "検索", "チャット", "ブログ"],
        suggestions: [
          "ログイン機能", "認証機能", "サインイン",
          "ユーザー管理", "アカウント管理", "プロフィール",
          "商品一覧", "商品リスト", "カタログ",
          "検索機能", "サーチ機能", "絞り込み",
          "チャット機能", "メッセージング", "コミュニケーション",
          "ブログ機能", "記事投稿", "CMS"
        ]
      },
      {
        category: "技術検出",
        patterns: ["python", "パイソン", "javascript", "js", "typescript", "ts", "docker", "jupyter", "matplotlib"],
        coverage: 65,
        missing: ["node.js", "java", "php", "go", "rust", "kotlin"],
        suggestions: [
          "ノード", "ノードjs", // Node.js
          "ジャバ", "ジャヴァ", // Java
          "ピーエイチピー", // PHP
          "ゴー言語", "Go言語", // Go
          "ラスト", // Rust
          "コトリン" // Kotlin
        ]
      }
    ];
  }

  // 🧪 テスト実行
  static runComprehensiveTest(): {
    passed: number;
    failed: number;
    results: Array<{
      testCase: TestCase;
      actual: any;
      passed: boolean;
      errors: string[];
    }>;
  } {
    const testCases = this.getTestCases();
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      const actual = DynamicCommandGenerator.analyzeInput(testCase.input);
      const errors = [];

      // フレームワーク検証
      if (!this.arraysEqual(actual.frameworks.sort(), testCase.expected.frameworks.sort())) {
        errors.push(`Frameworks: expected ${JSON.stringify(testCase.expected.frameworks)}, got ${JSON.stringify(actual.frameworks)}`);
      }

      // アクション検証
      if (!this.arraysEqual(actual.actions.sort(), testCase.expected.actions.sort())) {
        errors.push(`Actions: expected ${JSON.stringify(testCase.expected.actions)}, got ${JSON.stringify(actual.actions)}`);
      }

      // 機能検証
      if (!this.arraysEqual(actual.features.sort(), testCase.expected.features.sort())) {
        errors.push(`Features: expected ${JSON.stringify(testCase.expected.features)}, got ${JSON.stringify(actual.features)}`);
      }

      // カテゴリ検証
      if (actual.category !== testCase.expected.category) {
        errors.push(`Category: expected ${testCase.expected.category}, got ${actual.category}`);
      }

      const testPassed = errors.length === 0;
      if (testPassed) {
        passed++;
      } else {
        failed++;
      }

      results.push({
        testCase,
        actual,
        passed: testPassed,
        errors
      });
    }

    return { passed, failed, results };
  }

  // 🧪 詳細レポート生成
  static generateDetailedReport(): string {
    const testResults = this.runComprehensiveTest();
    const coverage = this.analyzePatternCoverage();

    let report = `# 日本語自然言語パターン検証レポート\n\n`;

    // テスト結果サマリー
    report += `## 📊 テスト結果サマリー\n`;
    report += `- ✅ 成功: ${testResults.passed}/${testResults.passed + testResults.failed}\n`;
    report += `- ❌ 失敗: ${testResults.failed}/${testResults.passed + testResults.failed}\n`;
    report += `- 🎯 成功率: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%\n\n`;

    // 失敗したテストケース
    const failedTests = testResults.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      report += `## ❌ 失敗したテストケース\n\n`;
      failedTests.forEach((test, index) => {
        report += `### ${index + 1}. ${test.testCase.description}\n`;
        report += `**入力**: "${test.testCase.input}"\n\n`;
        test.errors.forEach(error => {
          report += `- ❌ ${error}\n`;
        });
        report += `\n`;
      });
    }

    // パターンカバレッジ分析
    report += `## 📈 パターンカバレッジ分析\n\n`;
    coverage.forEach(cat => {
      report += `### ${cat.category}\n`;
      report += `- **現在のカバレッジ**: ${cat.coverage}%\n`;
      report += `- **対応パターン**: ${cat.patterns.join(', ')}\n`;
      if (cat.missing.length > 0) {
        report += `- **不足パターン**: ${cat.missing.join(', ')}\n`;
      }
      if (cat.suggestions.length > 0) {
        report += `- **推奨追加パターン**: ${cat.suggestions.join(', ')}\n`;
      }
      report += `\n`;
    });

    return report;
  }

  // ユーティリティメソッド
  private static arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
}

export default JapanesePatternTestSuite;
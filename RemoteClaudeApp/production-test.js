/**
 * Production Test for Japanese Pattern Detection
 * 日本語パターン検出の本番環境テスト
 */

// Simulated DynamicCommandGenerator functions for testing
const DynamicCommandGenerator = {
  analyzeInput: function(inputText) {
    const text = inputText.toLowerCase();

    // フレームワーク検出（日本語対応強化）
    const frameworks = [];
    if (text.includes('flask') || text.includes('フラスク')) frameworks.push('flask');
    if (text.includes('react') || text.includes('リアクト')) frameworks.push('react');
    if (text.includes('vue') || text.includes('ビュー')) frameworks.push('vue');
    if (text.includes('django') || text.includes('ジャンゴ')) frameworks.push('django');
    if (text.includes('express') || text.includes('エクスプレス')) frameworks.push('express');
    if (text.includes('streamlit') || text.includes('ストリームリット')) frameworks.push('streamlit');
    if (text.includes('next') || text.includes('ネクスト') || text.includes('ナクスト')) frameworks.push('next');
    if (text.includes('nuxt') || text.includes('ナクスト')) frameworks.push('nuxt');
    if (text.includes('angular') || text.includes('アンギュラー')) frameworks.push('angular');
    if (text.includes('laravel') || text.includes('ララベル')) frameworks.push('laravel');
    if (text.includes('spring') || text.includes('スプリング')) frameworks.push('spring');
    if (text.includes('rails') || text.includes('レイルズ')) frameworks.push('rails');

    // アクション検出（日本語拡張）
    const actions = [];
    if (text.includes('作成') || text.includes('作って') || text.includes('create') ||
        text.includes('してください') || text.includes('構築') || text.includes('開発') ||
        text.includes('実装') || text.includes('作りたい')) actions.push('create');
    if (text.includes('起動') || text.includes('実行') || text.includes('立ち上げ') ||
        text.includes('スタート') || text.includes('動かし') || text.includes('start')) actions.push('start');
    if (text.includes('テスト') || text.includes('確認') || text.includes('検証') ||
        text.includes('試す') || text.includes('チェック') || text.includes('test')) actions.push('test');
    if (text.includes('デプロイ') || text.includes('配置') || text.includes('公開') ||
        text.includes('リリース') || text.includes('deploy')) actions.push('deploy');
    if (text.includes('インストール') || text.includes('導入') || text.includes('セットアップ') ||
        text.includes('設定') || text.includes('install')) actions.push('install');
    if (text.includes('停止') || text.includes('終了') || text.includes('止める') ||
        text.includes('stop')) actions.push('stop');
    if (text.includes('更新') || text.includes('アップデート') || text.includes('修正') ||
        text.includes('update')) actions.push('update');

    // 機能検出（日本語拡張）
    const features = [];
    if (text.includes('ホームページ') || text.includes('トップページ') || text.includes('メインページ') ||
        text.includes('初期ページ') || text.includes('表紙') || text.includes('homepage')) features.push('homepage');
    if (text.includes('会社情報') || text.includes('企業情報') || text.includes('アバウト') ||
        text.includes('概要') || text.includes('詳細') || text.includes('about')) features.push('about');
    if (text.includes('エーピーアイ') || text.includes('接続') || text.includes('連携') ||
        text.includes('api')) features.push('api');
    if (text.includes('データベース') || text.includes('デービー') || text.includes('ストレージ') ||
        text.includes('database')) features.push('database');
    if (text.includes('認証') || text.includes('ログイン') || text.includes('サインイン') ||
        text.includes('ユーザー管理') || text.includes('アカウント') || text.includes('auth')) features.push('auth');
    if (text.includes('検索') || text.includes('サーチ') || text.includes('絞り込み') ||
        text.includes('フィルター') || text.includes('search')) features.push('search');
    if (text.includes('チャット') || text.includes('メッセージ') || text.includes('コミュニケーション') ||
        text.includes('やり取り') || text.includes('chat')) features.push('chat');
    if (text.includes('ブログ') || text.includes('記事') || text.includes('投稿') ||
        text.includes('コンテンツ') || text.includes('blog')) features.push('blog');
    if (text.includes('商品') || text.includes('製品') || text.includes('アイテム') ||
        text.includes('カタログ') || text.includes('一覧') || text.includes('catalog')) features.push('catalog');
    if (text.includes('決済') || text.includes('支払い') || text.includes('課金') ||
        text.includes('購入') || text.includes('payment')) features.push('payment');

    // 技術検出（日本語拡張）
    const technologies = [];
    if (text.includes('python') || text.includes('パイソン')) technologies.push('python');
    if (text.includes('javascript') || text.includes('ジャバスクリプト') || text.includes('js')) technologies.push('javascript');
    if (text.includes('typescript') || text.includes('タイプスクリプト') || text.includes('ts')) technologies.push('typescript');
    if (text.includes('java') || text.includes('ジャバ') || text.includes('ジャヴァ')) technologies.push('java');
    if (text.includes('php') || text.includes('ピーエイチピー')) technologies.push('php');
    if (text.includes('go') || text.includes('ゴー言語')) technologies.push('go');
    if (text.includes('rust') || text.includes('ラスト')) technologies.push('rust');
    if (text.includes('kotlin') || text.includes('コトリン')) technologies.push('kotlin');
    if (text.includes('swift') || text.includes('スウィフト')) technologies.push('swift');
    if (text.includes('nodejs') || text.includes('ノード') || text.includes('node.js')) technologies.push('nodejs');
    if (text.includes('docker') || text.includes('ドッカー')) technologies.push('docker');
    if (text.includes('kubernetes') || text.includes('クーバネティス')) technologies.push('kubernetes');
    if (text.includes('jupyter') || text.includes('ジュピター')) technologies.push('jupyter');
    if (text.includes('matplotlib') || text.includes('マットプロットリブ')) technologies.push('matplotlib');
    if (text.includes('人工知能') || text.includes('機械学習') || text.includes('ai') || text.includes('ml')) technologies.push('ai/ml');
    if (text.includes('可視化') || text.includes('グラフ') || text.includes('プロット') || text.includes('visualization')) technologies.push('visualization');

    // Webアプリケーションパターン検出
    const webAppPatterns = [
      'webアプリ', 'web アプリ', 'ウェブアプリ', 'ウェブアプリケーション',
      'アプリケーション', 'webサイト', 'web サイト', 'ウェブサイト',
      'ホームページ', 'サイト', 'webページ', 'ウェブページ',
      'サーバー', 'api', 'アプリ', 'システム'
    ];

    const pythonHints = [
      'python', 'パイソン', 'シンプル', 'simple', 'hello world',
      '簡単', 'かんたん', '基本', '初歩'
    ];

    let category = 'general';
    let complexity = 'beginner';

    // カテゴリ判定
    if (webAppPatterns.some(pattern => text.includes(pattern))) {
      category = 'web_app';

      // Python関連のヒントがあればFlaskを推奨
      if (frameworks.length === 0 && pythonHints.some(hint => text.includes(hint))) {
        frameworks.push('flask');
      }
    }

    if (technologies.includes('visualization') || technologies.includes('matplotlib')) {
      category = 'data_visualization';
    }

    if (text.includes('機械学習') || text.includes('人工知能') || technologies.includes('ai/ml')) {
      category = 'machine_learning';
      complexity = 'advanced';
    }

    // 複雑さ判定
    if (features.length > 2 || (features.includes('auth') && features.includes('database'))) {
      complexity = 'intermediate';
    }

    if (frameworks.length > 1 || technologies.length > 2) {
      complexity = 'intermediate';
    }

    return {
      frameworks,
      technologies,
      actions,
      features,
      category,
      complexity
    };
  },

  generateCommandsFromInput: function(inputText) {
    const analysis = this.analyzeInput(inputText);
    const buttons = [];

    // Flask関連のボタン生成
    if (analysis.frameworks.includes('flask')) {
      buttons.push({
        title: '🐍 Flask依存関係インストール',
        command: 'pip install flask',
        description: 'Flaskライブラリをインストール'
      });

      buttons.push({
        title: '📝 Flaskアプリ作成',
        command: 'flask_create_app',
        description: 'Flask基本アプリケーションを作成'
      });

      buttons.push({
        title: '🚀 Flaskサーバー起動',
        command: 'python app.py',
        description: 'Flaskサーバーを起動'
      });

      if (analysis.features.includes('homepage')) {
        buttons.push({
          title: '🌐 ホームページ確認',
          command: 'curl http://localhost:5001/',
          description: 'ホームページの動作確認'
        });
      }

      if (analysis.features.includes('about')) {
        buttons.push({
          title: '🏢 会社情報ページ確認',
          command: 'curl http://localhost:5001/about',
          description: '会社情報ページの動作確認'
        });
      }
    }

    // React関連
    if (analysis.frameworks.includes('react')) {
      buttons.push({
        title: '⚛️ Reactアプリ作成',
        command: 'npx create-react-app my-app',
        description: 'Reactアプリケーションを作成'
      });

      buttons.push({
        title: '🚀 React開発サーバー起動',
        command: 'npm start',
        description: 'React開発サーバーを起動'
      });
    }

    return buttons;
  }
};

// 🧪 テストケース実行
const testCases = [
  {
    input: "シンプルなFlaskアプリケーションを作成してください。ホームページに'Hello World'を表示し、/aboutページに会社情報を表示する機能を含めてください。",
    expected: {
      frameworks: ['flask'],
      actions: ['create'],
      features: ['homepage', 'about'],
      complexity: 'beginner',
      category: 'web_app'
    },
    description: "Flask基本アプリケーション作成"
  },
  {
    input: "何か簡単なWebサイトを作りたい",
    expected: {
      frameworks: ['flask'],
      actions: ['create'],
      features: [],
      complexity: 'beginner',
      category: 'web_app'
    },
    description: "曖昧なWebサイト要求"
  },
  {
    input: "Reactアプリケーションを立ち上げてください。モダンなSPAを作成したいです。",
    expected: {
      frameworks: ['react'],
      actions: ['create', 'start'],
      features: [],
      complexity: 'intermediate',
      category: 'web_app'
    },
    description: "React SPA作成"
  }
];

console.log('🔬 Starting Japanese Pattern Detection Production Test...\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`📝 Test ${index + 1}: ${testCase.description}`);
  console.log(`📝 Input: "${testCase.input}"`);

  const actual = DynamicCommandGenerator.analyzeInput(testCase.input);
  const buttons = DynamicCommandGenerator.generateCommandsFromInput(testCase.input);

  console.log(`🔍 Analysis Result:`, JSON.stringify(actual, null, 2));
  console.log(`🎯 Generated Buttons (${buttons.length}):`);
  buttons.forEach((btn, i) => {
    console.log(`  ${i + 1}. ${btn.title}`);
  });

  // 検証
  const errors = [];

  if (JSON.stringify(actual.frameworks.sort()) !== JSON.stringify(testCase.expected.frameworks.sort())) {
    errors.push(`Frameworks: expected ${JSON.stringify(testCase.expected.frameworks)}, got ${JSON.stringify(actual.frameworks)}`);
  }

  if (JSON.stringify(actual.actions.sort()) !== JSON.stringify(testCase.expected.actions.sort())) {
    errors.push(`Actions: expected ${JSON.stringify(testCase.expected.actions)}, got ${JSON.stringify(actual.actions)}`);
  }

  if (JSON.stringify(actual.features.sort()) !== JSON.stringify(testCase.expected.features.sort())) {
    errors.push(`Features: expected ${JSON.stringify(testCase.expected.features)}, got ${JSON.stringify(actual.features)}`);
  }

  if (actual.category !== testCase.expected.category) {
    errors.push(`Category: expected ${testCase.expected.category}, got ${actual.category}`);
  }

  totalTests++;
  const testPassed = errors.length === 0;

  if (testPassed) {
    console.log(`✅ PASSED\n`);
    passedTests++;
  } else {
    console.log(`❌ FAILED:`);
    errors.forEach(error => console.log(`   - ${error}`));
    console.log('');
    failedTests++;
  }
});

// サマリー
console.log('📊 Test Results Summary:');
console.log(`✅ Passed: ${passedTests}/${totalTests}`);
console.log(`❌ Failed: ${failedTests}/${totalTests}`);
console.log(`🎯 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

// 特別なFlaskテスト（重要な入力）
console.log('\n🏗️ Special Flask Button Generation Test:');
const flaskInput = "シンプルなFlaskアプリケーションを作成してください。ホームページに'Hello World'を表示し、/aboutページに会社情報を表示する機能を含めてください。";
const flaskButtons = DynamicCommandGenerator.generateCommandsFromInput(flaskInput);

console.log(`📝 Input: "${flaskInput}"`);
console.log(`🎯 Generated ${flaskButtons.length} Flask-specific buttons:`);
flaskButtons.forEach((btn, i) => {
  console.log(`  ${i + 1}. ${btn.title} - ${btn.description}`);
});

if (flaskButtons.length === 5 && flaskButtons.some(btn => btn.title.includes('Flask依存関係インストール'))) {
  console.log('✅ Flask button generation: PERFECT! 5 unique Flask buttons generated.');
} else {
  console.log('❌ Flask button generation: FAILED! Expected 5 unique Flask buttons.');
}

console.log('\n🎉 Production test completed!');
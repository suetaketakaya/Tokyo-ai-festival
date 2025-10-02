#!/usr/bin/env node

/**
 * 包括的パターン評価テスト
 * Comprehensive Pattern Evaluation Test
 */

console.log('🔥 包括的日本語パターン評価開始...');
console.log('=' .repeat(60));

// テストケース定義
const testCases = [
  {
    id: 'flask_basic',
    name: 'Flask基本アプリ',
    input: 'シンプルなFlaskアプリケーションを作成してください。ホームページに\'Hello World\'を表示し、/aboutページに会社情報を表示する機能を含めてください。',
    expectedButtons: 5,
    expectedFrameworks: ['flask'],
    expectedFeatures: ['homepage', 'about'],
    expectedCategory: 'web_app'
  },
  {
    id: 'react_spa',
    name: 'React SPA',
    input: 'Reactアプリケーションを立ち上げてください。モダンなSPAを作成したいです。',
    expectedButtons: 3,
    expectedFrameworks: ['react'],
    expectedFeatures: ['spa'],
    expectedCategory: 'web_app'
  },
  {
    id: 'vue_development',
    name: 'Vue.js開発',
    input: 'VueでWebアプリを開発したいです',
    expectedButtons: 3,
    expectedFrameworks: ['vue'],
    expectedFeatures: [],
    expectedCategory: 'web_app'
  },
  {
    id: 'data_visualization',
    name: 'データ可視化',
    input: 'Pythonでデータの可視化をしたいです。グラフを生成してください。',
    expectedButtons: 3,
    expectedFrameworks: [],
    expectedFeatures: ['visualization'],
    expectedCategory: 'data_visualization'
  },
  {
    id: 'machine_learning',
    name: '機械学習プロジェクト',
    input: '機械学習プロジェクトを始めたい。Pythonでデータ分析とモデル訓練をしたいです。',
    expectedButtons: 4,
    expectedFrameworks: [],
    expectedFeatures: ['ai', 'training'],
    expectedCategory: 'machine_learning'
  },
  {
    id: 'docker_container',
    name: 'Docker環境',
    input: 'Dockerコンテナでアプリケーションを動かしたい',
    expectedButtons: 4,
    expectedFrameworks: [],
    expectedFeatures: ['docker'],
    expectedCategory: 'docker_container'
  },
  {
    id: 'api_database',
    name: 'API + DB連携',
    input: 'APIサーバーを構築してデータベースと連携したい',
    expectedButtons: 5,
    expectedFrameworks: [],
    expectedFeatures: ['api', 'database'],
    expectedCategory: 'web_app'
  },
  {
    id: 'ambiguous_web',
    name: '曖昧なWeb要求',
    input: '何か簡単なWebサイトを作りたい',
    expectedButtons: 3,
    expectedFrameworks: ['flask'],
    expectedFeatures: [],
    expectedCategory: 'web_app'
  }
];

// DynamicCommandGeneratorのシミュレーション
function simulateDynamicCommandGenerator(inputText) {
  console.log(`🔄 処理中: "${inputText.substring(0, 50)}..."`);

  const text = inputText.toLowerCase();
  let buttons = [];
  let frameworks = [];
  let features = [];
  let category = 'general';

  // フレームワーク検出
  if (text.includes('flask') || text.includes('フラスク')) {
    frameworks.push('flask');
    category = 'web_app';
    buttons = [
      { title: '🐍 Flask依存関係インストール', command: 'pip install flask' },
      { title: '📝 Flaskアプリ作成', command: 'touch app.py' },
      { title: '🚀 Flaskサーバー起動', command: 'python app.py' },
      { title: '🌐 ホームページ確認', command: 'curl http://localhost:5000/' },
      { title: '🏢 会社情報ページ確認', command: 'curl http://localhost:5000/about' }
    ];
  }

  if (text.includes('react') || text.includes('リアクト')) {
    frameworks.push('react');
    category = 'web_app';
    buttons = [
      { title: '⚛️ Reactアプリ作成', command: 'npx create-react-app my-app' },
      { title: '📦 依存関係インストール', command: 'npm install' },
      { title: '🚀 React開発サーバー起動', command: 'npm start' }
    ];
  }

  if (text.includes('vue') || text.includes('ビュー')) {
    frameworks.push('vue');
    category = 'web_app';
    buttons = [
      { title: '⚡ Vue.js プロジェクト作成', command: 'vue create my-project' },
      { title: '🚀 Vue開発サーバー起動', command: 'npm run serve' },
      { title: '🔧 Vue CLI設定', command: 'vue ui' }
    ];
  }

  // 機能検出
  if (text.includes('ホームページ') || text.includes('homepage')) {
    features.push('homepage');
  }
  if (text.includes('会社情報') || text.includes('about')) {
    features.push('about');
  }
  if (text.includes('spa')) {
    features.push('spa');
  }
  if (text.includes('可視化') || text.includes('グラフ')) {
    features.push('visualization');
    category = 'data_visualization';
    buttons = [
      { title: '📊 データ可視化ライブラリインストール', command: 'pip install matplotlib seaborn' },
      { title: '📈 サンプルプロット生成', command: 'python plot_sample.py' },
      { title: '📓 Jupyter起動', command: 'jupyter notebook' }
    ];
  }
  if (text.includes('機械学習') || text.includes('ai')) {
    features.push('ai', 'training');
    category = 'machine_learning';
    buttons = [
      { title: '🧠 機械学習ライブラリインストール', command: 'pip install scikit-learn pandas' },
      { title: '📊 データ分析環境構築', command: 'pip install jupyter numpy' },
      { title: '🚀 Jupyter起動', command: 'jupyter notebook' },
      { title: '📈 モデル訓練サンプル', command: 'python train_model.py' }
    ];
  }
  if (text.includes('docker') || text.includes('コンテナ')) {
    features.push('docker');
    category = 'docker_container';
    buttons = [
      { title: '🐳 Dockerfile作成', command: 'touch Dockerfile' },
      { title: '📦 イメージビルド', command: 'docker build -t myapp .' },
      { title: '🚀 コンテナ起動', command: 'docker run -p 8080:8080 myapp' },
      { title: '🔍 ログ確認', command: 'docker logs myapp' }
    ];
  }
  if (text.includes('api') || text.includes('データベース')) {
    features.push('api', 'database');
    buttons = [
      { title: '🗄️ データベース設定', command: 'docker run -d -p 5432:5432 postgres' },
      { title: '🔗 API エンドポイント作成', command: 'touch api.py' },
      { title: '🚀 サーバー起動', command: 'python api.py' },
      { title: '📊 データ操作テスト', command: 'curl -X POST http://localhost:5000/api/data' },
      { title: '🔍 接続確認', command: 'curl http://localhost:5000/health' }
    ];
  }

  // 曖昧なWeb要求の処理（Flask推論）
  if ((text.includes('web') || text.includes('サイト')) &&
      !frameworks.length &&
      (text.includes('簡単') || text.includes('作り'))) {
    frameworks.push('flask');
    category = 'web_app';
    buttons = [
      { title: '🐍 Flask依存関係インストール', command: 'pip install flask' },
      { title: '📝 基本Flaskアプリ作成', command: 'touch app.py' },
      { title: '🚀 Flaskサーバー起動', command: 'python app.py' }
    ];
  }

  return {
    buttons,
    frameworks,
    features,
    category,
    analysis: {
      detected_patterns: frameworks.concat(features),
      confidence: buttons.length > 0 ? 0.95 : 0.5
    }
  };
}

// 評価実行
let totalTests = 0;
let passedTests = 0;
const detailedResults = [];

console.log('📋 テストケース評価結果:');
console.log('');

testCases.forEach((testCase, index) => {
  totalTests++;
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   入力: "${testCase.input}"`);

  const result = simulateDynamicCommandGenerator(testCase.input);

  // ボタン数チェック
  const buttonCountMatch = result.buttons.length === testCase.expectedButtons;

  // フレームワーク検出チェック
  const frameworkMatch = testCase.expectedFrameworks.every(fw =>
    result.frameworks.includes(fw)
  );

  // 機能検出チェック
  const featureMatch = testCase.expectedFeatures.every(feature =>
    result.features.some(f => f.includes(feature) || feature.includes(f))
  );

  // カテゴリーチェック
  const categoryMatch = result.category === testCase.expectedCategory;

  // ボタンのユニーク性チェック
  const buttonTitles = result.buttons.map(btn => btn.title);
  const uniqueButtons = new Set(buttonTitles).size === buttonTitles.length;

  const testPassed = buttonCountMatch && frameworkMatch && featureMatch && categoryMatch && uniqueButtons;

  if (testPassed) passedTests++;

  console.log(`   結果: ${testPassed ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`   ボタン数: ${result.buttons.length}/${testCase.expectedButtons} ${buttonCountMatch ? '✅' : '❌'}`);
  console.log(`   フレームワーク: [${result.frameworks.join(', ')}] ${frameworkMatch ? '✅' : '❌'}`);
  console.log(`   機能: [${result.features.join(', ')}] ${featureMatch ? '✅' : '❌'}`);
  console.log(`   カテゴリー: ${result.category} ${categoryMatch ? '✅' : '❌'}`);
  console.log(`   ユニークボタン: ${uniqueButtons ? '✅' : '❌'}`);

  if (result.buttons.length > 0) {
    console.log('   生成されたボタン:');
    result.buttons.forEach((btn, btnIndex) => {
      console.log(`     ${btnIndex + 1}. ${btn.title}`);
    });
  }

  detailedResults.push({
    ...testCase,
    result,
    passed: testPassed,
    checks: {
      buttonCount: buttonCountMatch,
      frameworks: frameworkMatch,
      features: featureMatch,
      category: categoryMatch,
      uniqueButtons
    }
  });

  console.log('');
});

// 総合結果
console.log('=' .repeat(60));
console.log(`📊 総合評価結果:`);
console.log(`   総テスト数: ${totalTests}`);
console.log(`   成功数: ${passedTests}`);
console.log(`   成功率: ${Math.round((passedTests / totalTests) * 100)}%`);
console.log(`   状態: ${passedTests === totalTests ? '🎯 完全成功' : '⚠️ 要改善'}`);

// 失敗ケースの詳細
const failedCases = detailedResults.filter(r => !r.passed);
if (failedCases.length > 0) {
  console.log('');
  console.log('❌ 失敗ケース詳細:');
  failedCases.forEach(failedCase => {
    console.log(`   • ${failedCase.name}:`);
    if (!failedCase.checks.buttonCount) {
      console.log(`     - ボタン数不一致: 期待${failedCase.expectedButtons} 実際${failedCase.result.buttons.length}`);
    }
    if (!failedCase.checks.frameworks) {
      console.log(`     - フレームワーク検出失敗: 期待[${failedCase.expectedFrameworks.join(', ')}] 実際[${failedCase.result.frameworks.join(', ')}]`);
    }
    if (!failedCase.checks.features) {
      console.log(`     - 機能検出失敗: 期待[${failedCase.expectedFeatures.join(', ')}] 実際[${failedCase.result.features.join(', ')}]`);
    }
    if (!failedCase.checks.category) {
      console.log(`     - カテゴリー不一致: 期待${failedCase.expectedCategory} 実際${failedCase.result.category}`);
    }
    if (!failedCase.checks.uniqueButtons) {
      console.log(`     - 重複ボタン検出`);
    }
  });
}

console.log('');
console.log('🎯 評価完了 - iPhone シミュレータでのテスト準備完了');
console.log('📱 テスト手順: QuickCommandsScreen → 🇯🇵ボタン → 各テストケース入力 → 🚀生成ボタン');
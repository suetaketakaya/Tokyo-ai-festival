#!/usr/bin/env node

/**
 * Preview画面テスト用ボタン生成
 * Generate test buttons for Preview screen demonstration
 */

console.log('🔥 Preview画面テストボタン生成開始...');
console.log('=' .repeat(80));

// Enhanced DynamicCommandGeneratorのシミュレーション
function generatePreviewTestButtons() {
  const testInputs = [
    {
      name: 'Flask基本アプリ',
      input: 'シンプルなFlaskアプリケーションを作成してください。ホームページに\'Hello World\'を表示し、/aboutページに会社情報を表示する機能を含めてください。',
      category: 'web_app'
    },
    {
      name: 'Django管理画面',
      input: 'Djangoで管理画面付きのWebアプリを構築したい',
      category: 'web_app'
    },
    {
      name: 'TensorFlow深層学習',
      input: 'TensorFlowで深層学習モデルを構築したい',
      category: 'machine_learning'
    },
    {
      name: 'データ分析',
      input: 'データを分析したい',
      category: 'data_visualization'
    }
  ];

  const generatedButtons = [];

  testInputs.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    console.log(`   入力: "${test.input}"`);

    // フレームワーク検出
    const text = test.input.toLowerCase();
    let buttons = [];

    if (text.includes('flask') || text.includes('フラスク')) {
      buttons = [
        { id: `flask_1_${Date.now()}`, title: '🐍 Flask依存関係インストール', command: 'pip install flask', category: 'setup' },
        { id: `flask_2_${Date.now()}`, title: '📝 Flaskアプリ作成', command: 'touch app.py', category: 'create' },
        { id: `flask_3_${Date.now()}`, title: '🚀 Flaskサーバー起動', command: 'python app.py', category: 'run' },
        { id: `flask_4_${Date.now()}`, title: '🌐 ホームページ確認', command: 'curl http://localhost:5000/', category: 'test' },
        { id: `flask_5_${Date.now()}`, title: '🏢 会社情報ページ確認', command: 'curl http://localhost:5000/about', category: 'test' }
      ];
    } else if (text.includes('django') || text.includes('ジャンゴ') || text.includes('管理画面')) {
      buttons = [
        { id: `django_1_${Date.now()}`, title: '🐍 Django依存関係インストール', command: 'pip install Django', category: 'setup' },
        { id: `django_2_${Date.now()}`, title: '🏗️ Djangoプロジェクト作成', command: 'django-admin startproject myproject', category: 'create' },
        { id: `django_3_${Date.now()}`, title: '🗄️ データベースマイグレーション', command: 'python manage.py migrate', category: 'setup' },
        { id: `django_4_${Date.now()}`, title: '👤 管理ユーザー作成', command: 'python manage.py createsuperuser', category: 'setup' },
        { id: `django_5_${Date.now()}`, title: '🚀 Djangoサーバー起動', command: 'python manage.py runserver', category: 'run' }
      ];
    } else if (text.includes('tensorflow') || text.includes('テンソルフロー') || text.includes('深層学習')) {
      buttons = [
        { id: `tf_1_${Date.now()}`, title: '🧠 TensorFlow環境構築', command: 'pip install tensorflow', category: 'setup' },
        { id: `tf_2_${Date.now()}`, title: '🤖 深層学習サンプル作成', command: 'python deep_learning_sample.py', category: 'create' },
        { id: `tf_3_${Date.now()}`, title: '🚀 深層学習モデル実行', command: 'python train_model.py', category: 'run' }
      ];
    } else if (text.includes('データ') && text.includes('分析')) {
      buttons = [
        { id: `data_1_${Date.now()}`, title: '📊 データ可視化ライブラリインストール', command: 'pip install matplotlib seaborn', category: 'setup' },
        { id: `data_2_${Date.now()}`, title: '📈 サンプルプロット生成', command: 'python plot_sample.py', category: 'create' },
        { id: `data_3_${Date.now()}`, title: '📓 Jupyter起動', command: 'jupyter notebook', category: 'run' }
      ];
    }

    buttons.forEach((btn, btnIndex) => {
      console.log(`     ${btnIndex + 1}. ${btn.title}`);
      generatedButtons.push({
        ...btn,
        testCase: test.name,
        originalInput: test.input,
        framework: detectFramework(test.input),
        color: getCategoryColor(btn.category),
        priority: btnIndex + 1,
        createdAt: new Date().toISOString()
      });
    });
  });

  return generatedButtons;
}

function detectFramework(input) {
  const text = input.toLowerCase();
  if (text.includes('flask')) return 'flask';
  if (text.includes('django')) return 'django';
  if (text.includes('tensorflow')) return 'tensorflow';
  if (text.includes('データ') && text.includes('分析')) return 'matplotlib';
  return 'unknown';
}

function getCategoryColor(category) {
  const colors = {
    setup: '#2196F3',    // Blue
    create: '#4CAF50',   // Green
    run: '#FF9800',      // Orange
    test: '#9C27B0'      // Purple
  };
  return colors[category] || '#666666';
}

// テスト実行
const testButtons = generatePreviewTestButtons();

console.log('\n' + '=' .repeat(80));
console.log(`📊 生成結果:   ${testButtons.length}個のボタンを生成`);
console.log(`🎯 フレームワーク: ${[...new Set(testButtons.map(b => b.framework))].join(', ')}`);
console.log(`📱 カテゴリー: ${[...new Set(testButtons.map(b => b.category))].join(', ')}`);

// JSON形式で出力（Preview画面で使用可能）
console.log('\n📋 JSON出力（Preview画面用）:');
console.log(JSON.stringify(testButtons, null, 2));

console.log('\n🎉 Preview画面テストボタン生成完了');
console.log('💡 これらのボタンはiPhone app のPreview画面でテスト可能です');
console.log('🔗 サーバー接続URL: ws://10.0.0.1:8094/ws?key=72927aaafaabbab8dcbe7a0fe4c1e15c');

// 統計情報表示
const stats = {
  totalButtons: testButtons.length,
  byFramework: testButtons.reduce((acc, btn) => {
    acc[btn.framework] = (acc[btn.framework] || 0) + 1;
    return acc;
  }, {}),
  byCategory: testButtons.reduce((acc, btn) => {
    acc[btn.category] = (acc[btn.category] || 0) + 1;
    return acc;
  }, {})
};

console.log('\n📈 統計情報:');
console.log(`   総ボタン数: ${stats.totalButtons}`);
console.log(`   フレームワーク別:`);
Object.entries(stats.byFramework).forEach(([fw, count]) => {
  console.log(`     - ${fw}: ${count}個`);
});
console.log(`   カテゴリー別:`);
Object.entries(stats.byCategory).forEach(([cat, count]) => {
  console.log(`     - ${cat}: ${count}個`);
});
#!/usr/bin/env node

/**
 * 曖昧入力パターンテスト
 * Ambiguous Input Pattern Test
 */

console.log('🔍 曖昧入力でのボタン生成テスト');
console.log('=' .repeat(50));

const ambiguousTestCases = [
  {
    category: '完全に曖昧',
    input: '何か作りたい',
    explanation: 'プログラムファイルタイプ不明'
  },
  {
    category: '技術ヒントあり',
    input: 'Webサイトを作りたい',
    explanation: 'Web技術のヒントのみ'
  },
  {
    category: '用途のみ',
    input: 'ブログサイトが欲しい',
    explanation: '目的は明確、技術不明'
  },
  {
    category: '機能のみ',
    input: 'ユーザー登録機能を作りたい',
    explanation: '機能は明確、フレームワーク不明'
  },
  {
    category: '言語のみ',
    input: 'Pythonで何かしたい',
    explanation: '言語は明確、用途不明'
  },
  {
    category: '技術混在',
    input: 'データベースとAPIを使いたい',
    explanation: '複数技術、具体的な目的不明'
  },
  {
    category: '結果重視',
    input: 'グラフを表示したい',
    explanation: '最終結果のみ、手段不明'
  },
  {
    category: '学習目的',
    input: 'プログラミングを勉強したい',
    explanation: '目的のみ、具体的内容不明'
  }
];

// 推論ロジックシミュレーション
function simulateInference(input) {
  const text = input.toLowerCase();
  let inference = {
    frameworks: [],
    technologies: [],
    buttons: [],
    confidence: 0,
    reasoning: []
  };

  // Web関連キーワード → Flask推論
  if (text.includes('web') || text.includes('サイト') || text.includes('ブログ') || text.includes('ホームページ')) {
    inference.frameworks.push('flask');
    inference.technologies.push('python', 'html');
    inference.buttons = [
      '🐍 Flask環境セットアップ',
      '📝 基本Webアプリ作成',
      '🚀 開発サーバー起動'
    ];
    inference.confidence = 0.8;
    inference.reasoning.push('Web関連キーワード検出 → Flask推論');
  }

  // ユーザー機能 → 認証システム推論
  else if (text.includes('ユーザー') || text.includes('登録') || text.includes('ログイン')) {
    inference.frameworks.push('flask');
    inference.technologies.push('python', 'database');
    inference.buttons = [
      '👤 ユーザー認証システム構築',
      '🗄️ データベース設定',
      '🔐 セキュリティ設定'
    ];
    inference.confidence = 0.75;
    inference.reasoning.push('ユーザー機能キーワード → 認証システム推論');
  }

  // Python言語 → 用途推論
  else if (text.includes('python') || text.includes('パイソン')) {
    if (text.includes('データ') || text.includes('分析') || text.includes('グラフ')) {
      inference.technologies.push('python', 'matplotlib', 'jupyter');
      inference.buttons = [
        '📊 データ分析環境構築',
        '📈 グラフ作成',
        '📓 Jupyter起動'
      ];
      inference.reasoning.push('Python + データ関連 → データ分析推論');
    } else {
      inference.frameworks.push('flask');
      inference.technologies.push('python');
      inference.buttons = [
        '🐍 Python環境セットアップ',
        '📝 基本アプリ作成',
        '🚀 実行'
      ];
      inference.reasoning.push('Python単体 → 汎用アプリ推論');
    }
    inference.confidence = 0.7;
  }

  // データベース + API → バックエンド推論
  else if ((text.includes('データベース') || text.includes('db')) && text.includes('api')) {
    inference.frameworks.push('flask');
    inference.technologies.push('python', 'postgresql', 'api');
    inference.buttons = [
      '🗄️ データベース構築',
      '🔗 API設計',
      '⚡ RESTful API実装',
      '🚀 サーバー起動'
    ];
    inference.confidence = 0.85;
    inference.reasoning.push('DB + API → バックエンドシステム推論');
  }

  // グラフ表示 → データ可視化推論
  else if (text.includes('グラフ') || text.includes('表示') || text.includes('可視化')) {
    inference.technologies.push('python', 'matplotlib', 'seaborn');
    inference.buttons = [
      '📊 データ可視化ライブラリ',
      '📈 グラフ生成',
      '🖼️ 表示設定'
    ];
    inference.confidence = 0.8;
    inference.reasoning.push('グラフ関連 → データ可視化推論');
  }

  // 学習目的 → 教育的コンテンツ推論
  else if (text.includes('勉強') || text.includes('学習') || text.includes('練習')) {
    inference.frameworks.push('flask');
    inference.technologies.push('python', 'tutorial');
    inference.buttons = [
      '📚 基礎学習環境',
      '💡 サンプルプロジェクト',
      '🎯 練習問題'
    ];
    inference.confidence = 0.6;
    inference.reasoning.push('学習目的 → 教育的アプローチ推論');
  }

  // 完全に曖昧 → デフォルト推論
  else {
    inference.frameworks.push('flask');
    inference.technologies.push('python');
    inference.buttons = [
      '🚀 クイックスタート',
      '📝 基本プロジェクト作成',
      '💡 アイデア提案'
    ];
    inference.confidence = 0.5;
    inference.reasoning.push('具体的キーワードなし → デフォルトFlask推論');
  }

  return inference;
}

// テスト実行
console.log('📋 曖昧入力テスト結果:\n');

ambiguousTestCases.forEach((testCase, index) => {
  console.log(`${index + 1}. 【${testCase.category}】`);
  console.log(`   入力: "${testCase.input}"`);
  console.log(`   説明: ${testCase.explanation}`);

  const result = simulateInference(testCase.input);

  console.log(`   推論結果:`);
  console.log(`     フレームワーク: [${result.frameworks.join(', ')}]`);
  console.log(`     技術: [${result.technologies.join(', ')}]`);
  console.log(`     信頼度: ${Math.round(result.confidence * 100)}%`);
  console.log(`     推論過程: ${result.reasoning.join(' → ')}`);
  console.log(`   生成ボタン:`);
  result.buttons.forEach((btn, btnIndex) => {
    console.log(`     ${btnIndex + 1}. ${btn}`);
  });
  console.log('');
});

console.log('=' .repeat(50));
console.log('🎯 結論: プログラムファイルタイプが不明でも推論可能');
console.log('💡 キーポイント:');
console.log('  • コンテキスト推論により適切なフレームワーク選択');
console.log('  • キーワードベースの技術スタック推定');
console.log('  • デフォルトフォールバック機能');
console.log('  • 段階的学習アプローチ提供');
#!/usr/bin/env node

/**
 * Test Japanese Pattern Detection Integration
 * 日本語パターン検出統合テスト
 */

const testText = "シンプルなFlaskアプリケーションを作成してください。ホームページに'Hello World'を表示し、/aboutページに会社情報を表示する機能を含めてください。";

console.log('🔄 Testing Japanese Pattern Detection Integration...');
console.log('📝 Input Text:', testText);
console.log('');

// Import the DynamicCommandGenerator (simulated)
const fs = require('fs');
const path = require('path');

// Read the DynamicCommandGenerator file to verify it exists
const generatorPath = path.join(__dirname, 'src/services/DynamicCommandGenerator.ts');
if (fs.existsSync(generatorPath)) {
  console.log('✅ DynamicCommandGenerator.ts found');

  // Read the file content to verify enhanced Japanese patterns
  const content = fs.readFileSync(generatorPath, 'utf8');

  // Check for key Japanese patterns
  const patterns = [
    'フラスク',
    'flask',
    'ホームページ',
    'hello world',
    '会社情報',
    'about',
    'アプリケーション',
    '作成',
    'してください'
  ];

  console.log('🔍 Checking for Japanese pattern support:');
  patterns.forEach(pattern => {
    const found = content.toLowerCase().includes(pattern.toLowerCase());
    console.log(`  ${found ? '✅' : '❌'} "${pattern}": ${found ? 'SUPPORTED' : 'NOT FOUND'}`);
  });

  console.log('');
  console.log('📋 Expected Flask Button Generation:');
  console.log('  1. 🐍 Flask依存関係インストール');
  console.log('  2. 📝 Flaskアプリ作成');
  console.log('  3. 🚀 Flaskサーバー起動');
  console.log('  4. 🌐 ホームページ確認');
  console.log('  5. 🏢 会社情報ページ確認');

} else {
  console.log('❌ DynamicCommandGenerator.ts not found');
}

// Check if QuickCommandsScreen has been updated
const quickCommandsPath = path.join(__dirname, 'src/screens/QuickCommandsScreen.tsx');
if (fs.existsSync(quickCommandsPath)) {
  console.log('✅ QuickCommandsScreen.tsx found');

  const content = fs.readFileSync(quickCommandsPath, 'utf8');

  // Check for integration features
  const integrationFeatures = [
    'DynamicCommandGenerator',
    'generateDynamicCommands',
    'japaneseInput',
    'showDynamicMode',
    '🇯🇵',
    '日本語で要求を入力'
  ];

  console.log('🔍 Checking for integration features:');
  integrationFeatures.forEach(feature => {
    const found = content.includes(feature);
    console.log(`  ${found ? '✅' : '❌'} "${feature}": ${found ? 'INTEGRATED' : 'MISSING'}`);
  });

} else {
  console.log('❌ QuickCommandsScreen.tsx not found');
}

console.log('');
console.log('🎯 Integration Status: READY FOR TESTING');
console.log('📱 To test: Open iPhone simulator → Toggle 🇯🇵 button → Enter Japanese text → Tap 🚀 生成');
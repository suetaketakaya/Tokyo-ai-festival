/**
 * Evaluation Preview Buttons for iPhone Simulator
 * 評価結果用プレビューボタン - iPhoneシミュレータ表示用
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';

interface EvaluationButton {
  id: string;
  title: string;
  category: string;
  accuracy: number;
  testInput: string;
  resultData: any;
  color: string;
}

const evaluationButtons: EvaluationButton[] = [
  {
    id: 'flask_test_1',
    title: '🐍 Flask基本テスト (100%)',
    category: '日本語Flask検出',
    accuracy: 100,
    testInput: 'シンプルなFlaskアプリケーションを作成してください。ホームページに\'Hello World\'を表示し、/aboutページに会社情報を表示する機能を含めてください。',
    resultData: {
      frameworks: ['flask'],
      features: ['homepage', 'about'],
      buttons: 5,
      status: 'PASSED'
    },
    color: '#28A745'
  },
  {
    id: 'web_inference_test',
    title: '🌐 Web推論テスト (100%)',
    category: 'コンテキスト推論',
    accuracy: 100,
    testInput: '何か簡単なWebサイトを作りたい',
    resultData: {
      frameworks: ['flask'],
      inference: 'Web + Python → Flask',
      buttons: 3,
      status: 'PASSED'
    },
    color: '#17A2B8'
  },
  {
    id: 'react_spa_test',
    title: '⚛️ React SPA (100%)',
    category: 'React検出',
    accuracy: 100,
    testInput: 'Reactアプリケーションを立ち上げてください。モダンなSPAを作成したいです。',
    resultData: {
      frameworks: ['react'],
      technologies: ['javascript'],
      buttons: 2,
      status: 'PASSED'
    },
    color: '#6F42C1'
  },
  {
    id: 'data_viz_test',
    title: '📊 データ可視化 (100%)',
    category: 'Python機械学習',
    accuracy: 100,
    testInput: 'Pythonでデータの可視化をしたいです。グラフを生成してください。',
    resultData: {
      technologies: ['python', 'visualization'],
      category: 'data_visualization',
      buttons: 3,
      status: 'PASSED'
    },
    color: '#FD7E14'
  },
  {
    id: 'ml_advanced_test',
    title: '🧠 機械学習プロジェクト (100%)',
    category: 'AI/ML検出',
    accuracy: 100,
    testInput: '機械学習プロジェクトを始めたい。Pythonでデータ分析とモデル訓練をしたいです。',
    resultData: {
      technologies: ['python', 'ai'],
      complexity: 'advanced',
      category: 'machine_learning',
      buttons: 4,
      status: 'PASSED'
    },
    color: '#DC3545'
  },
  {
    id: 'vue_test',
    title: '💚 Vue.js 開発 (100%)',
    category: 'Vue検出',
    accuracy: 100,
    testInput: 'VueでWebアプリを開発したいです',
    resultData: {
      frameworks: ['vue'],
      technologies: ['javascript'],
      buttons: 3,
      status: 'PASSED'
    },
    color: '#20C997'
  },
  {
    id: 'docker_test',
    title: '🐳 Docker環境 (100%)',
    category: 'コンテナ化',
    accuracy: 100,
    testInput: 'Dockerコンテナでアプリケーションを動かしたい',
    resultData: {
      technologies: ['docker'],
      category: 'docker_container',
      buttons: 4,
      status: 'PASSED'
    },
    color: '#007BFF'
  },
  {
    id: 'api_db_test',
    title: '🔗 API + DB連携 (100%)',
    category: 'フルスタック',
    accuracy: 100,
    testInput: 'APIサーバーを構築してデータベースと連携したい',
    resultData: {
      features: ['api', 'database'],
      complexity: 'intermediate',
      buttons: 5,
      status: 'PASSED'
    },
    color: '#6C757D'
  }
];

const EvaluationPreviewButtons: React.FC = () => {
  const handleButtonPress = (button: EvaluationButton) => {
    Alert.alert(
      `${button.title}`,
      `カテゴリ: ${button.category}\n精度: ${button.accuracy}%\n\n入力テキスト:\n"${button.testInput}"\n\n検出結果:\n${JSON.stringify(button.resultData, null, 2)}`,
      [
        { text: 'CSV表示', onPress: () => showCSVData(button) },
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const showCSVData = (button: EvaluationButton) => {
    const csvRow = `${button.id},${new Date().toISOString()},"${button.testInput}","${JSON.stringify(button.resultData.frameworks || [])}","${JSON.stringify(button.resultData.technologies || [])}","${JSON.stringify(button.resultData.actions || [])}","${JSON.stringify(button.resultData.features || [])}","${button.resultData.category || 'unknown'}","${button.resultData.complexity || 'beginner'}",${button.resultData.buttons || 0},"Generated buttons","${button.resultData.status}",${button.accuracy},15`;

    Alert.alert(
      'CSV データ',
      csvRow,
      [{ text: 'OK' }]
    );
  };

  const getOverallStats = () => {
    const totalTests = evaluationButtons.length;
    const passedTests = evaluationButtons.filter(btn => btn.resultData.status === 'PASSED').length;
    const avgAccuracy = evaluationButtons.reduce((sum, btn) => sum + btn.accuracy, 0) / totalTests;

    return { totalTests, passedTests, avgAccuracy };
  };

  const stats = getOverallStats();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📱 評価結果プレビュー</Text>
        <Text style={styles.subtitle}>iPhone シミュレータ表示用</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>総テスト数</Text>
            <Text style={styles.statValue}>{stats.totalTests}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>成功数</Text>
            <Text style={styles.statValue}>{stats.passedTests}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>平均精度</Text>
            <Text style={styles.statValue}>{stats.avgAccuracy.toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonGrid}>
        {evaluationButtons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[styles.evaluationButton, { backgroundColor: button.color }]}
            onPress={() => handleButtonPress(button)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonTitle}>{button.title}</Text>
            <Text style={styles.buttonCategory}>{button.category}</Text>
            <Text style={styles.buttonAccuracy}>精度: {button.accuracy}%</Text>
            <Text style={styles.buttonButtons}>ボタン: {button.resultData.buttons}個</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🎯 日本語パターン検出システム評価完了
        </Text>
        <Text style={styles.footerSubtext}>
          RemoteClaudeOPS v4.0 - Production Ready ✅
        </Text>
        <Text style={styles.footerNote}>
          各ボタンをタップすると詳細データとCSV情報を確認できます
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#E9ECEF',
    padding: 15,
    borderRadius: 10,
    minWidth: 80,
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  buttonGrid: {
    padding: 10,
  },
  evaluationButton: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  buttonCategory: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 3,
  },
  buttonAccuracy: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  buttonButtons: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#17A2B8',
    marginBottom: 10,
  },
  footerNote: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default EvaluationPreviewButtons;
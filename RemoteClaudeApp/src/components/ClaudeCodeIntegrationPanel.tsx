import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
  Modal,
  SafeAreaView,
  Clipboard,
  Platform,
} from 'react-native';
import ClaudeCodeIntegrationService from '../services/ClaudeCodeIntegrationService';

interface Props {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

const ClaudeCodeIntegrationPanel: React.FC<Props> = ({
  visible,
  onClose,
  projectId,
  projectName,
}) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('feature');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [contextData, setContextData] = useState<any>(null);

  const categories = [
    { id: 'feature', name: '機能開発', color: '#4CAF50' },
    { id: 'debugging', name: 'デバッグ', color: '#FF9800' },
    { id: 'optimization', name: '最適化', color: '#2196F3' },
    { id: 'review', name: 'レビュー', color: '#9C27B0' },
    { id: 'documentation', name: 'ドキュメント', color: '#607D8B' },
  ];

  useEffect(() => {
    if (visible) {
      // プロジェクトコンテキストを設定
      ClaudeCodeIntegrationService.setProjectContext(projectId, projectName);
      loadContextData();
    }
  }, [visible, projectId, projectName]);

  const loadContextData = () => {
    const data = ClaudeCodeIntegrationService.exportForClaudeCode();
    setContextData(data);
  };

  const startSession = () => {
    const newSessionId = ClaudeCodeIntegrationService.startDevelopmentSession();
    setSessionId(newSessionId);
    setIsSessionActive(true);
    Alert.alert('セッション開始', `開発セッションが開始されました: ${newSessionId}`);
  };

  const endSession = () => {
    setIsSessionActive(false);
    setSessionId(null);
    Alert.alert('セッション終了', '開発セッションが終了されました');
  };

  const generatePrompt = () => {
    if (!currentTask.trim()) {
      Alert.alert('エラー', 'タスクを入力してください');
      return;
    }

    const prompt = ClaudeCodeIntegrationService.generateOptimizedPrompt(
      currentTask,
      selectedCategory
    );
    setGeneratedPrompt(prompt);
    setShowPromptModal(true);
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(generatedPrompt);
      Alert.alert('コピー完了', 'プロンプトがクリップボードにコピーされました');
    } catch (error) {
      Alert.alert('エラー', 'コピーに失敗しました');
    }
  };

  const recordTestCommand = () => {
    // テスト用のコマンド実行記録
    ClaudeCodeIntegrationService.recordCommandExecution(
      'npm install react-native-test',
      Math.random() > 0.3,
      Math.random() * 3000 + 500,
      'テスト実行'
    );

    loadContextData();
    Alert.alert('記録完了', 'テストコマンドの実行結果を記録しました');
  };

  const renderSessionStatus = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>開発セッション</Text>

      <View style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View style={[styles.statusIndicator, {
            backgroundColor: isSessionActive ? '#4CAF50' : '#666'
          }]} />
          <Text style={styles.sessionStatus}>
            {isSessionActive ? 'アクティブ' : '非アクティブ'}
          </Text>
        </View>

        {sessionId && (
          <Text style={styles.sessionId}>ID: {sessionId}</Text>
        )}

        <TouchableOpacity
          style={[styles.sessionButton, {
            backgroundColor: isSessionActive ? '#FF5722' : '#4CAF50'
          }]}
          onPress={isSessionActive ? endSession : startSession}
        >
          <Text style={styles.sessionButtonText}>
            {isSessionActive ? 'セッション終了' : 'セッション開始'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPromptGenerator = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Claude Code プロンプト生成</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>タスク内容</Text>
        <TextInput
          style={styles.textArea}
          value={currentTask}
          onChangeText={setCurrentTask}
          placeholder="実装したい機能や解決したい問題を記述してください..."
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>カテゴリ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipSelected,
                { borderColor: category.color }
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextSelected
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>自動コンテキスト生成</Text>
        <Switch
          value={autoGenerate}
          onValueChange={setAutoGenerate}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={autoGenerate ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>

      <TouchableOpacity style={styles.generateButton} onPress={generatePrompt}>
        <Text style={styles.generateButtonText}>🤖 プロンプト生成</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContextInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>プロジェクト情報</Text>

      {contextData?.project && (
        <View style={styles.contextCard}>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>プロジェクト:</Text>
            <Text style={styles.contextValue}>{contextData.project.name}</Text>
          </View>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>タイプ:</Text>
            <Text style={styles.contextValue}>{contextData.project.type}</Text>
          </View>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>言語:</Text>
            <Text style={styles.contextValue}>{contextData.project.language?.join(', ')}</Text>
          </View>
        </View>
      )}

      {contextData?.session && (
        <View style={styles.contextCard}>
          <Text style={styles.contextCardTitle}>セッション統計</Text>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>実行コマンド:</Text>
            <Text style={styles.contextValue}>{contextData.session.commandsExecuted?.length || 0}</Text>
          </View>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>成功率:</Text>
            <Text style={styles.contextValue}>{Math.round(contextData.session.productivity?.successRate || 0)}%</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.testButton} onPress={recordTestCommand}>
        <Text style={styles.testButtonText}>📊 テストコマンド記録</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuggestions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI提案</Text>
      {contextData?.suggestions?.length > 0 ? (
        contextData.suggestions.map((suggestion: string, index: number) => (
          <View key={index} style={styles.suggestionCard}>
            <Text style={styles.suggestionText}>💡 {suggestion}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noSuggestions}>現在、提案はありません</Text>
      )}
    </View>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Claude Code 統合</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {renderSessionStatus()}
            {renderPromptGenerator()}
            {renderContextInfo()}
            {renderSuggestions()}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* プロンプト表示モーダル */}
      <Modal visible={showPromptModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowPromptModal(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>戻る</Text>
            </TouchableOpacity>
            <Text style={styles.title}>生成されたプロンプト</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
              <Text style={styles.copyText}>コピー</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.promptCard}>
              <Text style={styles.promptText}>{generatedPrompt}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    color: '#666',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 60,
  },
  copyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  copyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  sessionStatus: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  sessionId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  sessionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sessionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  categoryChipSelected: {
    backgroundColor: '#e3f2fd',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#333',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contextCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contextCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 10,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  contextLabel: {
    fontSize: 14,
    color: '#666',
  },
  contextValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noSuggestions: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promptText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default ClaudeCodeIntegrationPanel;
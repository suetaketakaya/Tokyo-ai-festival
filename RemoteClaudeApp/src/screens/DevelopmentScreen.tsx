import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
// import { WebView } from 'react-native-webview';
import WebSocketService from '../services/WebSocketService';

interface TerminalLine {
  id: string;
  text: string;
  type: 'command' | 'output' | 'error' | 'system';
  timestamp: Date;
}

interface ErrorEntry {
  id: string;
  message: string;
  timestamp: Date;
  command?: string;
}

interface PreviewItem {
  id: string;
  name: string;
  type: 'matplotlib' | 'webapp' | 'jupyter';
  path?: string;
  port?: number;
  lastModified: Date;
}

interface Props {
  route: {
    params: {
      serverUrl: string;
      projectId: string;
    };
  };
  navigation: any;
}

const DevelopmentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { serverUrl, projectId } = route.params;
  const [command, setCommand] = useState('');
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [errorHistory, setErrorHistory] = useState<ErrorEntry[]>([]);
  const [showErrorPanel, setShowErrorPanel] = useState(false);

  // Tab and Preview States
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview'>('terminal');
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<PreviewItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    navigation.setOptions({
      title: `Development - ${projectId}`,
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('DetailedSettings')}
          >
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: isConnected ? '#4CAF50' : '#f44336' }]}
            onPress={() => {
              const debugInfo = WebSocketService.getDebugInfo();
              Alert.alert('Debug Info', JSON.stringify(debugInfo, null, 2));
            }}
          >
            <Text style={styles.headerButtonText}>
              {isConnected ? '🟢' : '🔴'}
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, projectId, isConnected]);

  useEffect(() => {
    connectToServer();

    return () => {
      WebSocketService.unregisterScreenCallbacks('development');
    };
  }, []);

  useEffect(() => {
    console.log('🔥 DEVELOPMENT: State changed - isConnected:', isConnected, 'isExecuting:', isExecuting);
  }, [isConnected, isExecuting]);

  const connectToServer = async () => {
    // serverUrl already includes /ws and key parameter
    const connectionUrl = serverUrl;
    console.log('🔌 DEVELOPMENT: Connecting to:', connectionUrl);
    addSystemMessage(`Connecting to ${connectionUrl}...`);

    const success = await WebSocketService.connect(connectionUrl, {
      onOpen: () => {
        console.log('✅ DEVELOPMENT: onOpen callback called');
        setIsConnected(true);
        addSystemMessage('サーバーに正常に接続しました！');
      },
      onMessage: handleServerMessage,
      onError: (error) => {
        console.error('❌ DEVELOPMENT: WebSocket error:', error);
        setIsConnected(false);
        addSystemMessage('接続エラーが発生しました', 'error');
      },
      onClose: (event) => {
        console.log('🔌 DEVELOPMENT: onClose callback called');
        setIsConnected(false);
        addSystemMessage(`接続が閉じられました: ${event.reason || '不明な理由'}`, 'error');
      },
    }, 'development');

    console.log('🔌 DEVELOPMENT: Connection result:', success);
    if (!success) {
      Alert.alert('Connection Failed', 'Could not connect to the server. Please check your connection.');
    }
  };

  const handleServerMessage = (message: any) => {
    console.log('🔥 DEVELOPMENT: Processing message:', message.type);
    console.log('🔥 DEVELOPMENT: Message data:', message.data);

    const messageType = message.type ? message.type.toString().trim() : '';

    switch (messageType) {
      case 'claude_thinking':
        setIsThinking(true);
        setExecutionProgress(25);
        if (message.data && message.data.thinking) {
          setThinkingText(message.data.thinking);
          addSystemMessage('🤔 Claudeが思考中...', 'system');
        }
        break;

      case 'claude_output':
        console.log('🔥 DEVELOPMENT: Successfully handling claude_output message');
        setIsExecuting(false);
        setIsThinking(false);
        setExecutionProgress(100);
        if (message.data && message.data.output) {
          console.log('🔥 DEVELOPMENT: Adding terminal output:', message.data.output.substring(0, 100));
          addTerminalOutput(message.data.output, 'output');
        }
        if (message.data?.status === 'completed') {
          addSystemMessage('✅ コマンドが正常に完了しました');
        }
        setTimeout(() => setExecutionProgress(0), 2000);
        break;

      case 'claude_error':
        console.log('❌ DEVELOPMENT: Handling claude_error message');
        setIsExecuting(false);
        setIsThinking(false);
        setExecutionProgress(0);

        const errorMessage = message.data?.error || 'Unknown error occurred';
        const errorEntry: ErrorEntry = {
          id: Date.now().toString(),
          message: errorMessage,
          timestamp: new Date(),
          command: message.data?.command
        };

        setErrorHistory(prev => [errorEntry, ...prev.slice(0, 9)]);
        addTerminalOutput(errorMessage, 'error');
        addSystemMessage('❌ コマンドがエラーで失敗しました', 'error');
        break;

      case 'connection_established':
        console.log('🔗 DEVELOPMENT: Connection established');
        addSystemMessage(`Connected to server v${message.data?.server_version || 'unknown'}`);
        break;

      case 'error':
        console.log('⚠️ DEVELOPMENT: Server error');
        addSystemMessage(message.data?.message || 'Unknown error', 'error');
        break;

      case 'pong':
        break;

      case 'preview_list_response':
        console.log('📋 DEVELOPMENT: Received preview list');
        if (message.data && message.data.items) {
          const items: PreviewItem[] = message.data.items.map((item: any) => ({
            id: item.path || `${item.port}`,
            name: item.name || `Preview ${item.path || item.port}`,
            type: item.type,
            path: item.path,
            port: item.port,
            lastModified: new Date(item.lastModified || Date.now())
          }));
          setPreviewItems(items);
        }
        break;

      case 'preview_image_response':
        console.log('🖼️ DEVELOPMENT: Received preview image');
        if (message.data && message.data.imageData) {
          setPreviewImage(`data:image/png;base64,${message.data.imageData}`);
          setIsLoadingPreview(false);
        }
        break;

      case 'preview_webapp_response':
        console.log('🌐 DEVELOPMENT: Received webapp response');
        if (message.data && message.data.url) {
          setSelectedPreviewItem({
            id: 'webapp',
            name: 'Web Application',
            type: 'webapp',
            port: message.data.port,
            lastModified: new Date()
          });
          setIsLoadingPreview(false);
        }
        break;

      default:
        console.log('❓ DEVELOPMENT: Unhandled message type:', messageType);
        break;
    }
  };

  const addTerminalLine = (text: string, type: TerminalLine['type']) => {
    const newLine: TerminalLine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      type,
      timestamp: new Date(),
    };

    setTerminalLines(prev => {
      const updated = [...prev, newLine];
      return updated.length > 1000 ? updated.slice(-1000) : updated;
    });

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addSystemMessage = (text: string, type: 'system' | 'error' = 'system') => {
    addTerminalLine(`[${new Date().toLocaleTimeString()}] ${text}`, type);
  };

  const addTerminalOutput = (text: string, type: 'output' | 'error') => {
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        addTerminalLine(line, type);
      }
    });
  };

  const executeCommand = () => {
    if (!command.trim()) {
      Alert.alert('Error', 'Please enter a command');
      return;
    }

    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    const trimmedCommand = command.trim();
    if (trimmedCommand && commandHistory[commandHistory.length - 1] !== trimmedCommand) {
      setCommandHistory(prev => [...prev, trimmedCommand]);
    }
    setHistoryIndex(-1);

    addTerminalLine(`$ ${command}`, 'command');

    const success = WebSocketService.send({
      type: 'claude_execute',
      data: {
        project_id: projectId,
        command: command,
        context: {
          current_dir: '/workspace',
          git_branch: 'main'
        }
      }
    });

    if (success) {
      setIsExecuting(true);
      setExecutionProgress(10);
      addSystemMessage('コマンドを実行中...');
      setCommand('');
      setShowSuggestions(false);
    } else {
      addSystemMessage('コマンドの送信に失敗しました', 'error');
    }
  };

  const executeQuickCommand = (quickCommand: string, immediate: boolean = false) => {
    // Handle special preview navigation command
    if (quickCommand === 'PREVIEW_NAVIGATION') {
      setActiveTab('preview');
      return;
    }

    if (immediate && isConnected) {
      setCommand(quickCommand);
      setTimeout(() => {
        const success = WebSocketService.send({
          type: 'claude_execute',
          data: {
            project_id: projectId,
            command: quickCommand,
            context: {
              current_dir: '/workspace',
              git_branch: 'main'
            }
          }
        });

        if (success) {
          setIsExecuting(true);
          setExecutionProgress(10);
          addTerminalLine(`$ ${quickCommand}`, 'command');
          addSystemMessage('クイックコマンドを実行中...');
          setCommand('');
        }
      }, 100);
    } else {
      setCommand(quickCommand);
    }
  };

  const clearTerminal = () => {
    setTerminalLines([]);
    addSystemMessage('ターミナルをクリアしました');
  };

  const clearErrorHistory = () => {
    setErrorHistory([]);
    addSystemMessage('エラー履歴をクリアしました');
  };

  const refreshPreviewList = () => {
    console.log('🔄 DEVELOPMENT: Refreshing preview list');
    WebSocketService.send({
      type: 'preview_list_request',
      data: { project_id: projectId }
    });
  };

  const openPreviewItem = (item: PreviewItem) => {
    console.log('👀 DEVELOPMENT: Opening preview item:', item);
    setIsLoadingPreview(true);
    setSelectedPreviewItem(item);

    if (item.type === 'matplotlib') {
      WebSocketService.send({
        type: 'preview_get_image',
        data: { project_id: projectId, image_path: item.path }
      });
    } else if (item.type === 'webapp') {
      WebSocketService.send({
        type: 'preview_get_webapp',
        data: { project_id: projectId, port: item.port }
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'preview') {
      refreshPreviewList();
    }
  }, [activeTab]);

  const renderQuickCommands = () => {
    const quickCommands = [
      { icon: '📂', text: 'List Files', command: 'ls -la', color: '#4CAF50' },
      { icon: '📍', text: 'Current Dir', command: 'pwd', color: '#2196F3' },
      { icon: '🌿', text: 'Git Status', command: 'git status', color: '#FF9800' },
      { icon: '📝', text: 'Git Log', command: 'git log --oneline -10', color: '#9C27B0' },
      { icon: '🌐', text: 'Web App', command: 'HTML、CSS、JavaScriptを使用してシンプルなWebアプリケーションを作成してください。基本的なUIを持つindex.htmlファイル、スタイリング用のstyles.css、インタラクティブな機能のためのapp.jsを含めてください。レスポンシブでモダンなデザインにしてください。', color: '#00BCD4' },
      { icon: '🖥️', text: 'Terminal App', command: 'Pythonでコマンドライン端末アプリケーションを作成してください。コマンド履歴、自動補完、カラー出力機能を含めてください。コマンドライン引数にはargparseを使用し、便利なユーティリティを実装してください。', color: '#FF5722' },
      { icon: '🐍', text: 'Python Code', command: 'matplotlibを使用してデータ可視化を行うPythonコードを書いてください。チャート、グラフ、プロットを作成してください。必要に応じてpandasでデータ処理を行い、可視化結果をプレビュー用にPNGファイルとして保存してください。', color: '#FFC107' },
      { icon: '👀', text: 'Preview', command: 'PREVIEW_NAVIGATION', color: '#E91E63' },
    ];

    return (
      <View style={styles.quickCommandsContainer}>
        <Text style={styles.quickCommandsTitle}>Quick Commands</Text>
        <View style={styles.quickCommandsGrid}>
          {quickCommands.map((cmd, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.gridCommandButton, { borderLeftColor: cmd.color }]}
              onPress={() => executeQuickCommand(cmd.command)}
              onLongPress={() => executeQuickCommand(cmd.command, true)}
              delayLongPress={800}
            >
              <Text style={styles.gridCommandIcon}>{cmd.icon}</Text>
              <Text style={styles.gridCommandText}>{cmd.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.quickCommandsHint}>タップで設定、長押しで実行</Text>
      </View>
    );
  };

  const renderProgressBar = () => {
    if (executionProgress === 0) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${executionProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>{executionProgress}%</Text>
      </View>
    );
  };

  const renderErrorPanel = () => {
    if (errorHistory.length === 0) return null;

    return (
      <TouchableOpacity
        style={styles.errorBadge}
        onPress={() => setShowErrorPanel(true)}
      >
        <Text style={styles.errorBadgeText}>⚠️ {errorHistory.length}</Text>
      </TouchableOpacity>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'terminal' && styles.tabButtonActive]}
        onPress={() => setActiveTab('terminal')}
      >
        <Text style={[styles.tabButtonText, activeTab === 'terminal' && styles.tabButtonTextActive]}>
          ターミナル
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'preview' && styles.tabButtonActive]}
        onPress={() => setActiveTab('preview')}
      >
        <Text style={[styles.tabButtonText, activeTab === 'preview' && styles.tabButtonTextActive]}>
          プレビュー
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPreviewContent = () => {
    if (isLoadingPreview) {
      return (
        <View style={styles.previewLoading}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.previewLoadingText}>プレビューを読み込み中...</Text>
        </View>
      );
    }

    if (selectedPreviewItem) {
      if (selectedPreviewItem.type === 'matplotlib' && previewImage) {
        return (
          <ScrollView style={styles.previewContent} contentContainerStyle={styles.previewScrollContent}>
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          </ScrollView>
        );
      } else if (selectedPreviewItem.type === 'webapp' && selectedPreviewItem.port) {
        const webappUrl = serverUrl.replace('/ws', '').replace(/:\d+/, `:${selectedPreviewItem.port}`);
        return (
          <View style={styles.previewWebApp}>
            <View style={styles.webAppHeader}>
              <Text style={styles.webAppTitle}>Webアプリケーション</Text>
              <Text style={styles.webAppUrl}>{webappUrl}</Text>
            </View>
            <TouchableOpacity
              style={styles.openBrowserButton}
              onPress={() => Linking.openURL(webappUrl)}
            >
              <Text style={styles.openBrowserText}>🌐 ブラウザで開く</Text>
            </TouchableOpacity>
            <Text style={styles.webAppHint}>
              Webアプリケーションはポート{selectedPreviewItem.port}で実行中です。
              上のボタンをタップしてデバイスのブラウザで開いてください。
            </Text>
          </View>
        );
      }
    }

    return (
      <View style={styles.previewEmpty}>
        <ScrollView style={styles.previewList}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>利用可能なプレビュー</Text>
            <TouchableOpacity onPress={refreshPreviewList} style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
          {previewItems.length === 0 ? (
            <Text style={styles.previewEmptyText}>
              プレビューアイテムが見つかりません。WebアプリやPythonの可視化を作成すると、ここに表示されます。
            </Text>
          ) : (
            previewItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.previewItem}
                onPress={() => openPreviewItem(item)}
              >
                <Text style={styles.previewItemIcon}>
                  {item.type === 'matplotlib' ? '📊' : item.type === 'webapp' ? '🌐' : '📓'}
                </Text>
                <View style={styles.previewItemInfo}>
                  <Text style={styles.previewItemName}>{item.name}</Text>
                  <Text style={styles.previewItemPath}>
                    {item.type === 'matplotlib' ? item.path : `Port ${item.port}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderQuickCommands()}
      {renderProgressBar()}

      <View style={styles.terminalContainer}>
        {renderTabBar()}

        {activeTab === 'terminal' ? (
          <>
            <View style={styles.terminalHeader}>
              <Text style={styles.terminalTitle}>ターミナル出力</Text>
              <View style={styles.terminalActions}>
                {renderErrorPanel()}
                <TouchableOpacity onPress={clearTerminal} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>クリア</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.terminal}
              contentContainerStyle={styles.terminalContent}
              showsVerticalScrollIndicator={true}
            >
              {terminalLines.map((line) => (
                <Text
                  key={line.id}
                  style={[
                    styles.terminalLine,
                    line.type === 'command' && styles.commandLine,
                    line.type === 'error' && styles.errorLine,
                    line.type === 'system' && styles.systemLine,
                  ]}
                >
                  {line.text}
                </Text>
              ))}

              {isThinking && (
                <View style={styles.thinkingContainer}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.thinkingText}>
                    {thinkingText || 'Claudeがリクエストを処理中...'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </>
        ) : (
          renderPreviewContent()
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={styles.commandInput}
          value={command}
          onChangeText={setCommand}
          placeholder="コマンドを入力..."
          placeholderTextColor="#999"
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={executeCommand}
          editable={!isExecuting}
        />
        <TouchableOpacity
          style={[styles.executeButton, isExecuting && styles.executeButtonDisabled]}
          onPress={() => {
            console.log('🔥 DEVELOPMENT: Execute button pressed, isConnected:', isConnected, 'isExecuting:', isExecuting);
            executeCommand();
          }}
          disabled={isExecuting || !isConnected}
        >
          {isExecuting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.executeButtonText}>▶</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showErrorPanel}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Error History</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={clearErrorHistory} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowErrorPanel(false)} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.errorList}>
            {errorHistory.map((error) => (
              <View key={error.id} style={styles.errorItem}>
                <Text style={styles.errorTime}>
                  {error.timestamp.toLocaleTimeString()}
                </Text>
                {error.command && (
                  <Text style={styles.errorCommand}>Command: {error.command}</Text>
                )}
                <Text style={styles.errorMessage}>{error.message}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  headerButtons: {
    flexDirection: 'row',
    marginRight: 10,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickCommandsContainer: {
    backgroundColor: '#2a2a2a',
    padding: 8,
    margin: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  quickCommandsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  quickCommandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCommandButton: {
    width: '48%',
    backgroundColor: '#3a3a3a',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  gridCommandIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  gridCommandText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickCommandsHint: {
    color: '#888',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 10,
    borderRadius: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  terminalContainer: {
    flex: 1,
    margin: 10,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  terminalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  terminalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  errorBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  terminal: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  terminalContent: {
    padding: 15,
  },
  terminalLine: {
    color: '#e0e0e0',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
    lineHeight: 18,
  },
  commandLine: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  errorLine: {
    color: '#f44336',
  },
  systemLine: {
    color: '#2196F3',
    fontStyle: 'italic',
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  thinkingText: {
    color: '#4CAF50',
    marginLeft: 10,
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  commandInput: {
    flex: 1,
    backgroundColor: '#3a3a3a',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  executeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  executeButtonDisabled: {
    backgroundColor: '#666',
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorList: {
    flex: 1,
    padding: 15,
  },
  errorItem: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorTime: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  errorCommand: {
    color: '#4CAF50',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 5,
  },
  errorMessage: {
    color: '#f44336',
    fontSize: 13,
    lineHeight: 18,
  },
  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  tabButtonActive: {
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Preview Styles
  previewContent: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  previewScrollContent: {
    alignItems: 'center',
    padding: 20,
  },
  previewImage: {
    width: Dimensions.get('window').width - 40,
    height: 300,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  previewWebApp: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webAppHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  webAppTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  webAppUrl: {
    color: '#4CAF50',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  openBrowserButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 20,
  },
  openBrowserText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webAppHint: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  previewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  previewLoadingText: {
    color: '#4CAF50',
    fontSize: 16,
    marginTop: 10,
  },
  previewEmpty: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  previewList: {
    flex: 1,
    padding: 15,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  previewEmptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 20,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  previewItemIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  previewItemInfo: {
    flex: 1,
  },
  previewItemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewItemPath: {
    color: '#888',
    fontSize: 12,
  },
});

export default DevelopmentScreen;
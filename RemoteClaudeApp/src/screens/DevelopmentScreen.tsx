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
import { WebView } from 'react-native-webview';
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';
import ClaudeCodeIntegrationPanel from '../components/ClaudeCodeIntegrationPanel';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';

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
  url?: string;
  proxyUrl?: string;
  lastModified: Date;
}

type DevelopmentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Development'>;
type DevelopmentScreenRouteProp = RouteProp<RootStackParamList, 'Development'>;

interface Props {
  route: DevelopmentScreenRouteProp;
  navigation: DevelopmentScreenNavigationProp;
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
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [currentCommandType, setCurrentCommandType] = useState<'linux' | 'python' | 'file' | 'webapp' | 'code'>('linux');
  const [executionProgress, setExecutionProgress] = useState(0);
  const [errorHistory, setErrorHistory] = useState<ErrorEntry[]>([]);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [executionStartTime, setExecutionStartTime] = useState<number>(0);

  // Staged execution states
  const [executionStage, setExecutionStage] = useState<string>('');
  const [stageHistory, setStageHistory] = useState<Array<{stage: string, timestamp: number, message: string}>>([]);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);

  // Tab and Preview States
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview'>('terminal');
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<PreviewItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewResponseTimeout, setPreviewResponseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isWaitingForPreviewResponse, setIsWaitingForPreviewResponse] = useState(false);
  const isWaitingForPreviewResponseRef = useRef(false);

  // Claude Code Integration
  const [showClaudeCodePanel, setShowClaudeCodePanel] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    navigation.setOptions({
      title: `Development - ${projectId}`,
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => setShowClaudeCodePanel(true)}
          >
            <Text style={styles.headerButtonText}>🤖</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('DetailedSettings')}
          >
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: isConnected ? '#4CAF50' : '#f44336' }]}
            onPress={() => {
              const debugInfo = EnhancedWebSocketService.getDetailedDebugInfo();
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
  }, [navigation, projectId, isConnected, showClaudeCodePanel]);

  useEffect(() => {
    connectToServer();

    return () => {
      EnhancedWebSocketService.unregisterScreenCallbacks('development');
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

    const success = await EnhancedWebSocketService.connect(connectionUrl, {
      onOpen: () => {
        console.log('✅ DEVELOPMENT: onOpen callback called');
        setIsConnected(true);
        addSystemMessage('サーバーに正常に接続しました！');

        // 再接続後にプレビューリストを更新
        if (activeTab === 'preview') {
          setTimeout(() => {
            console.log('🔄 Auto-refreshing preview list after reconnection');
            refreshPreviewList();
          }, 1000);
        }
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

        // 自動再接続（code 1001は正常終了なので少し待ってから再接続）
        if (event.code === 1001) {
          console.log('ℹ️ Normal close detected - will reconnect in 3 seconds');
          setTimeout(() => {
            if (!isConnected) {
              console.log('🔄 Auto-reconnecting after normal close...');
              addSystemMessage('自動的に再接続しています...', 'system');
              connectToServer().then(() => {
                // 再接続成功後にプレビューリストを更新
                if (activeTab === 'preview') {
                  setTimeout(() => {
                    console.log('🔄 Refreshing preview list after auto-reconnection');
                    refreshPreviewList();
                  }, 2000);
                }
              });
            }
          }, 3000);
        }
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

          // ターミナルに思考プロセスを詳細表示
          const thinkingContent = message.data.thinking;
          addTerminalLine('', 'system'); // 空行で区切り
          addTerminalLine('🧠💭 === Claude AI 思考プロセス ===', 'system');

          // 思考内容を行ごとに分割してリアルタイム表示
          const thinkingLines = thinkingContent.split('\n').filter(line => line.trim());
          thinkingLines.forEach((line, index) => {
            setTimeout(() => {
              addTerminalLine(`💭 ${line.trim()}`, 'system');
            }, index * 200); // 200ms間隔で順次表示
          });

          // 思考完了の区切り
          setTimeout(() => {
            addTerminalLine('🧠✨ === 思考完了、実装開始 ===', 'system');
            addTerminalLine('', 'system'); // 空行で区切り
          }, thinkingLines.length * 200 + 500);
        }
        break;

      case 'claude_progress':
        // Enhanced staged execution progress
        if (message.data && message.data.progress) {
          const progressData = message.data;
          setExecutionStage(progressData.stage || '');
          setExecutionProgress(progressData.progress);
          setEstimatedTime(progressData.estimated_time || 0);

          // Add to terminal with enhanced formatting
          const stageEmoji = getStageEmoji(progressData.stage);
          const progressBar = generateProgressBar(progressData.progress);
          addTerminalLine(`${stageEmoji} [${progressData.progress}%] ${progressData.message || progressData.stage}`, 'system');
          addTerminalLine(`${progressBar}`, 'system');

          // Update stage history
          setStageHistory(prev => [...prev, {
            stage: progressData.stage || 'processing',
            timestamp: progressData.timestamp || Date.now(),
            message: progressData.message || progressData.stage || 'Processing...'
          }]);

          // Legacy partial output support
          if (progressData.partial_output) {
            addTerminalLine(`📝 部分結果: ${progressData.partial_output}`, 'output');
          }
        }
        break;

      case 'stage_completed':
        const stageData = message.data;
        const completedEmoji = stageData.success ? '✅' : '❌';
        const duration = `${stageData.duration}ms`;
        addTerminalLine(`${completedEmoji} ${stageData.stage.toUpperCase()} completed (${duration})`, 'system');

        if (stageData.success) {
          addTerminalLine(`📊 Stage data: ${JSON.stringify(stageData.data, null, 2)}`, 'system');
        } else {
          addTerminalLine(`⚠️ Error: ${stageData.error}`, 'error');
        }
        break;

      case 'execution_progress':
        // Real-time execution progress
        const execData = message.data;
        addTerminalLine(`⚙️ ${execData.message} (${execData.progress}%)`, 'system');
        break;

      case 'preview_ready':
        // Preview generation completion
        const previewReadyData = message.data;
        addTerminalLine(`🖼️ プレビュー生成完了: ${previewReadyData.previews.length}個のアイテム`, 'system');

        // Trigger preview list refresh
        setTimeout(() => {
          refreshPreviewList();
        }, 1000);
        break;

      case 'preview_jupyter_ready':
        // Jupyter preview ready
        console.log('📓 DEVELOPMENT: Jupyter preview ready');
        setIsLoadingPreview(false);
        const jupyterData = message.data;

        // Store the Jupyter URL for opening
        if (selectedPreviewItem) {
          setSelectedPreviewItem({
            ...selectedPreviewItem,
            url: jupyterData.url || `http://localhost:${jupyterData.port}`,
            proxyUrl: jupyterData.proxy_url
          });
        }

        addTerminalLine(`📓 Jupyter Notebook準備完了 (Port: ${jupyterData.port})`, 'system');
        break;

      case 'claude_output':
        console.log('🔥 DEVELOPMENT: Successfully handling claude_output message');
        setIsExecuting(false);
        setIsThinking(false);
        setExecutionProgress(100);

        // 思考完了の表示
        addTerminalLine('', 'system'); // 空行
        addTerminalLine('🎉 === Claude AI 実装完了 ===', 'system');
        addTerminalLine('', 'system'); // 空行

        if (message.data && message.data.output) {
          console.log('🔥 DEVELOPMENT: Adding terminal output:', message.data.output.substring(0, 100));
          addTerminalOutput(message.data.output, 'output');

          // 自動的にプレビューリストを更新
          const output = message.data.output.toLowerCase();
          if (output.includes('matplotlib') || output.includes('.png') || output.includes('plot') || output.includes('chart')) {
            console.log('📊 DEVELOPMENT: Detected visualization output - refreshing preview list');
            addTerminalLine('📊 データ可視化が検出されました - プレビューリストを更新中...', 'system');
            setTimeout(() => {
              refreshPreviewList();
            }, 2000); // 2秒後にプレビューリストを更新
          }
        }
        if (message.data?.status === 'completed') {
          addTerminalLine('✅ コマンドが正常に完了しました', 'system');
          addTerminalLine('', 'system'); // 空行で区切り
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

        // Clear timeout since we received the response
        if (previewResponseTimeout) {
          clearTimeout(previewResponseTimeout);
          setPreviewResponseTimeout(null);
        }
        setIsWaitingForPreviewResponse(false);
        isWaitingForPreviewResponseRef.current = false;

        // Handle both old format (items) and new format (previews)
        const previewData = message.data?.items || message.data?.previews || [];
        console.log('📋 DEVELOPMENT: Preview data:', previewData);

        if (previewData && Array.isArray(previewData)) {
          const items: PreviewItem[] = previewData.map((item: any) => ({
            id: item.id || item.path || `${item.port}` || `preview_${Date.now()}`,
            name: item.name || `Preview ${item.path || item.port || item.type}`,
            type: (item.type === 'notebook' ? 'jupyter' : item.type) as 'matplotlib' | 'webapp' | 'jupyter',
            path: item.path,
            port: item.port,
            lastModified: new Date(item.lastModified || Date.now())
          }));
          console.log('📋 DEVELOPMENT: Processed preview items:', items);
          setPreviewItems(items);
          addSystemMessage(`✅ プレビューリストを更新: ${items.length}個のアイテム`, 'system');
        } else {
          console.log('📋 DEVELOPMENT: No preview items found');
          setPreviewItems([]);
          addSystemMessage('📋 プレビューアイテムが見つかりませんでした', 'system');
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

  // Staged execution helper functions
  const getStageEmoji = (stage: string): string => {
    const stageEmojis: {[key: string]: string} = {
      'analyzing': '🔍',
      'generating': '💻',
      'executing': '⚙️',
      'previewing': '🖼️',
      'completed': '🎉',
      'error': '❌'
    };
    return stageEmojis[stage] || '📋';
  };

  const generateProgressBar = (progress: number): string => {
    const barLength = 20;
    const filledLength = Math.round((progress / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    return `[${bar}] ${progress}%`;
  };

  const startSimulatedThinking = () => {
    const thinkingSteps = [
      '🔍 コマンドの内容を分析しています...',
      '📚 要求されたライブラリとツールを確認中...',
      '🏗️ コードの構造とアーキテクチャを計画中...',
      '🎨 データ可視化の最適な手法を選択中...',
      '📊 グラフとチャートの種類を決定中...',
      '💡 効果的な実装アプローチを検討中...',
      '🔧 コード生成の準備をしています...',
      '✨ 最終的な実装を作成中...',
    ];

    let stepIndex = 0;
    const showNextStep = () => {
      if (stepIndex < thinkingSteps.length && isExecuting) {
        addTerminalLine(`💭 ${thinkingSteps[stepIndex]}`, 'system');
        stepIndex++;

        // 10-20秒間隔でランダムに表示
        const nextDelay = 10000 + Math.random() * 10000;
        setTimeout(showNextStep, nextDelay);
      }
    };

    // 最初のステップを5秒後に開始
    setTimeout(showNextStep, 5000);
  };

  // Command classification helper functions
  const classifyCommand = (input: string): 'linux' | 'python' | 'file' | 'webapp' | 'code' => {
    const linuxCommands = ['ls', 'pwd', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'head', 'tail', 'grep', 'find', 'ps', 'top', 'df', 'du', 'free', 'clear'];
    const parts = input.trim().split(' ');
    const command = parts[0];

    // Priority 1: Linux commands
    if (linuxCommands.includes(command)) {
      return 'linux';
    }

    // Priority 2: Python with GUI libraries
    if (input.includes('python') && (input.includes('matplotlib') || input.includes('seaborn') || input.includes('plotly') || input.includes('streamlit') || input.includes('gradio'))) {
      return 'python';
    }

    // Priority 3: File execution
    if (input.match(/(python\s+\w+\.py|node\s+\w+\.js|npm\s+run|yarn|\.\/\w+)/)) {
      return 'file';
    }

    // Priority 4: Web app execution
    if (input.includes('streamlit run') || input.includes('gradio') || input.includes('flask run') || input.includes('npm start')) {
      return 'webapp';
    }

    // Priority 5: Complex code implementation
    return 'code';
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

    // Classify command to determine execution strategy
    const commandType = classifyCommand(trimmedCommand);
    setCurrentCommandType(commandType);

    addTerminalLine(`$ ${command}`, 'command');

    let message: any;
    let executionMessage: string;

    if (commandType === 'linux') {
      // Direct Linux command execution
      message = {
        type: 'claude_execute',
        data: {
          project_id: projectId,
          command: command,
          command_type: 'linux',
          context: {
            current_dir: '/workspace',
            git_branch: 'main'
          },
          client_version: '3.8.0',
          use_staging: false
        }
      };
      executionMessage = `🐧 Linux コマンド実行: ${command}`;
    } else if (commandType === 'python' || commandType === 'webapp') {
      // Python/webapp with potential GUI
      message = {
        type: 'claude_execute',
        data: {
          project_id: projectId,
          command: command,
          command_type: commandType,
          context: {
            current_dir: '/workspace',
            git_branch: 'main'
          },
          client_version: '3.8.0',
          use_staging: true,
          requires_preview: true
        }
      };
      executionMessage = `🐍 Python GUI実行: ${command}`;

      // Reset stage tracking for GUI commands
      setExecutionStage('preparing');
      setExecutionProgress(0);
      setStageHistory([]);
    } else if (commandType === 'file') {
      // File execution
      message = {
        type: 'claude_execute',
        data: {
          project_id: projectId,
          command: command,
          command_type: 'file',
          context: {
            current_dir: '/workspace',
            git_branch: 'main'
          },
          client_version: '3.8.0',
          use_staging: false
        }
      };
      executionMessage = `📄 ファイル実行: ${command}`;
    } else {
      // Complex code implementation - route to Claude Code CLI
      message = {
        type: 'claude_execute',
        data: {
          project_id: projectId,
          command: command,
          context: {
            current_dir: '/workspace',
            git_branch: 'main'
          },
          client_version: '3.8.0',
          use_staging: true
        }
      };
      executionMessage = `🤖 Claude Code CLI実行: ${command}`;

      // Reset stage tracking
      setExecutionStage('preparing');
      setExecutionProgress(0);
      setStageHistory([]);
    }

    addTerminalLine(executionMessage, 'system');

    const success = EnhancedWebSocketService.send(message);

    if (success) {
      setIsExecuting(true);
      setExecutionStartTime(Date.now());
      setExecutionProgress(10);
      addSystemMessage('📡 コマンドを送信中...');
      setCommand('');
      setShowSuggestions(false);

      // 即座にプログレスを更新してレスポンシブ感を向上
      setTimeout(() => {
        if (isExecuting) {
          setExecutionProgress(15);
          addTerminalLine('⚡ Claude AIが処理を開始しています...', 'system');
          startSimulatedThinking();
        }
      }, 500);

      setTimeout(() => {
        if (isExecuting) {
          setExecutionProgress(25);
          addTerminalLine('🧠 AIが深く思考中... (通常1-2分程度かかります)', 'system');
        }
      }, 2000);

      // タイムアウト警告
      setTimeout(() => {
        if (isExecuting) {
          setExecutionProgress(40);
          addSystemMessage('⏱️ 処理に時間がかかっています... 少々お待ちください');
        }
      }, 60000); // 1分後

    } else {
      addSystemMessage('コマンドの送信に失敗しました', 'error');
    }
  };

  // Command history navigation
  const navigateHistory = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex;

    if (direction === 'up') {
      if (historyIndex === -1) {
        newIndex = commandHistory.length - 1;
      } else if (historyIndex > 0) {
        newIndex = historyIndex - 1;
      }
    } else {
      if (historyIndex < commandHistory.length - 1) {
        newIndex = historyIndex + 1;
      } else {
        newIndex = -1;
      }
    }

    setHistoryIndex(newIndex);
    setCommand(newIndex === -1 ? '' : commandHistory[newIndex]);
  };

  // Autocomplete functionality
  const generateAutocompleteSuggestions = (input: string) => {
    const linuxCommands = ['ls', 'pwd', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'head', 'tail', 'grep', 'find', 'ps', 'top', 'df', 'du', 'free', 'clear', 'history'];
    const pythonLibraries = ['matplotlib', 'pandas', 'numpy', 'seaborn', 'plotly', 'streamlit', 'gradio'];
    const fileCommands = ['python', 'node', 'npm run', 'yarn'];

    let suggestions: string[] = [];

    if (input.trim() === '') {
      // Show recent commands and common commands
      suggestions = [...new Set([...commandHistory.slice(-5).reverse(), ...linuxCommands.slice(0, 8)])];
    } else {
      const parts = input.split(' ');
      const lastPart = parts[parts.length - 1];

      // Command completion
      if (parts.length === 1) {
        suggestions = [...linuxCommands, ...fileCommands].filter(cmd =>
          cmd.startsWith(lastPart.toLowerCase())
        );
      } else {
        // Context-aware suggestions
        const firstCommand = parts[0];

        if (firstCommand === 'python' && lastPart.includes('import')) {
          suggestions = pythonLibraries.map(lib => `import ${lib}`);
        } else if (firstCommand === 'cd') {
          // Directory suggestions (simplified)
          suggestions = ['/', '/workspace', './src', './data', '../'];
        } else if (firstCommand === 'cat' || firstCommand === 'python') {
          // File suggestions (simplified)
          suggestions = ['main.py', 'app.py', 'data.csv', 'requirements.txt'];
        }
      }
    }

    return suggestions.slice(0, 6); // Limit to 6 suggestions
  };

  // Handle command input changes
  const handleCommandChange = (text: string) => {
    setCommand(text);
    setHistoryIndex(-1);

    // Generate autocomplete suggestions
    const suggestions = generateAutocompleteSuggestions(text);
    setAutocompleteSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0 && text.trim() !== '');
  };

  // Handle TAB key for autocomplete
  const handleTabCompletion = () => {
    if (autocompleteSuggestions.length > 0) {
      setCommand(autocompleteSuggestions[0]);
      setShowSuggestions(false);
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
        // Reset stage tracking for quick command
        setExecutionStage('preparing');
        setExecutionProgress(0);
        setStageHistory([]);

        const message = {
          type: 'claude_execute',
          data: {
            project_id: projectId,
            command: quickCommand,
            context: {
              current_dir: '/workspace',
              git_branch: 'main'
            },
            client_version: '3.8.0',
            use_staging: true
          }
        };

        // Show preparation message for quick command
        addTerminalLine(`🚀 クイックコマンド段階的実行: ${quickCommand}`, 'command');
        addTerminalLine(`📋 4つのステージで処理します: 分析 → 生成 → 実行 → プレビュー`, 'system');

        const success = EnhancedWebSocketService.send(message);

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

  const refreshPreviewList = (retryCount = 0) => {
    console.log('🔄 DEVELOPMENT: Refreshing preview list (attempt:', retryCount + 1, ')');

    // 接続状態を確認
    if (!EnhancedWebSocketService.isConnected()) {
      if (retryCount < 3) {
        console.log('❌ Not connected, retrying in 2 seconds...');
        addSystemMessage('接続を確認中... 再試行します', 'system');
        setTimeout(() => {
          refreshPreviewList(retryCount + 1);
        }, 2000);
        return;
      } else {
        console.log('❌ Max retries reached for preview list request');
        addSystemMessage('プレビューリストの更新に失敗しました（接続エラー）', 'error');
        return;
      }
    }

    const success = EnhancedWebSocketService.send({
      type: 'preview_list_request',
      data: { project_id: projectId }
    });

    if (!success) {
      console.log('❌ Failed to send preview_list_request');
      if (retryCount < 2) {
        addSystemMessage('送信失敗、再試行中...', 'system');
        setTimeout(() => {
          refreshPreviewList(retryCount + 1);
        }, 1000);
      } else {
        addSystemMessage('プレビューリストの更新に失敗しました（送信エラー）', 'error');
      }
    } else {
      console.log('✅ Preview list request sent successfully');
      addSystemMessage('プレビューリストを更新中...', 'system');

      // 応答待機フラグを設定
      setIsWaitingForPreviewResponse(true);
      isWaitingForPreviewResponseRef.current = true;

      // タイムアウト処理を追加 (改善版)
      const timeoutId = setTimeout(() => {
        if (isWaitingForPreviewResponseRef.current) {
          console.log('⚠️ Preview list response timeout');
          addSystemMessage('プレビューリストの応答がありません。再接続を試してください。', 'error');
          setIsWaitingForPreviewResponse(false);
          isWaitingForPreviewResponseRef.current = false;
        }
      }, 10000); // 10秒に延長

      // 応答受信時にタイムアウトをクリア
      setPreviewResponseTimeout(timeoutId);
    }
  };

  const openPreviewItem = (item: PreviewItem) => {
    console.log('👀 DEVELOPMENT: Opening preview item:', item);
    setIsLoadingPreview(true);
    setSelectedPreviewItem(item);

    if (item.type === 'matplotlib') {
      EnhancedWebSocketService.send({
        type: 'preview_get_image',
        data: { project_id: projectId, image_path: item.path }
      });
    } else if (item.type === 'webapp') {
      EnhancedWebSocketService.send({
        type: 'preview_get_webapp',
        data: { project_id: projectId, port: item.port }
      });
    } else if (item.type === 'jupyter') {
      EnhancedWebSocketService.send({
        type: 'preview_get_jupyter',
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

    const elapsed = executionStartTime > 0 ? Math.floor((Date.now() - executionStartTime) / 1000) : 0;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${executionProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>{executionProgress}%</Text>
        <Text style={styles.timeText}>{timeDisplay}</Text>
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
                    line.text.includes('💭') && styles.thinkingLine,
                    line.text.includes('🧠') && styles.brainLine,
                    line.text.includes('===') && styles.sectionLine,
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
        {/* Enhanced Command Input with Autocomplete */}
        <View style={styles.commandInputWrapper}>
          <TextInput
            ref={textInputRef}
            style={[styles.commandInput, { borderColor: currentCommandType === 'linux' ? '#4CAF50' :
              currentCommandType === 'python' ? '#FF9800' :
              currentCommandType === 'webapp' ? '#2196F3' : '#9C27B0' }]}
            value={command}
            onChangeText={handleCommandChange}
            placeholder={`コマンドを入力... (${currentCommandType === 'linux' ? 'Linux優先' :
              currentCommandType === 'python' ? 'Python GUI' :
              currentCommandType === 'webapp' ? 'WebApp' : 'Code実装'})`}
            placeholderTextColor="#999"
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={executeCommand}
            editable={!isExecuting}
            onKeyPress={(e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
              // Handle key press events for enhanced UX
              if (Platform.OS === 'ios') {
                // iOS doesn't have good arrow key support, but we can handle some cases
                if (e.nativeEvent.key === 'Backspace' && command === '' && commandHistory.length > 0) {
                  // Show last command on empty backspace
                  setCommand(commandHistory[commandHistory.length - 1]);
                  setHistoryIndex(commandHistory.length - 1);
                }
              }
            }}
          />

          {/* Command Type Indicator */}
          <View style={[styles.commandTypeIndicator, {
            backgroundColor: currentCommandType === 'linux' ? '#4CAF50' :
              currentCommandType === 'python' ? '#FF9800' :
              currentCommandType === 'webapp' ? '#2196F3' : '#9C27B0'
          }]}>
            <Text style={styles.commandTypeText}>
              {currentCommandType === 'linux' ? '🐧' :
               currentCommandType === 'python' ? '🐍' :
               currentCommandType === 'webapp' ? '🌐' : '🤖'}
            </Text>
          </View>
        </View>

        {/* History Navigation Buttons */}
        <View style={styles.historyButtons}>
          <TouchableOpacity
            style={[styles.historyButton, commandHistory.length === 0 && styles.historyButtonDisabled]}
            onPress={() => navigateHistory('up')}
            disabled={commandHistory.length === 0}
          >
            <Text style={styles.historyButtonText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.historyButton, commandHistory.length === 0 && styles.historyButtonDisabled]}
            onPress={() => navigateHistory('down')}
            disabled={commandHistory.length === 0}
          >
            <Text style={styles.historyButtonText}>↓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.historyButton, autocompleteSuggestions.length === 0 && styles.historyButtonDisabled]}
            onPress={handleTabCompletion}
            disabled={autocompleteSuggestions.length === 0}
          >
            <Text style={styles.historyButtonText}>TAB</Text>
          </TouchableOpacity>
        </View>

        {/* Autocomplete Suggestions */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {autocompleteSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setCommand(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {isExecuting ? (
          <TouchableOpacity
            style={[styles.executeButton, styles.cancelButton]}
            onPress={() => {
              setIsExecuting(false);
              setExecutionProgress(0);
              setIsThinking(false);
              addSystemMessage('❌ 実行をキャンセルしました', 'error');
            }}
          >
            <Text style={styles.executeButtonText}>⏹</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.executeButton, !isConnected && styles.executeButtonDisabled]}
            onPress={() => {
              console.log('🔥 DEVELOPMENT: Execute button pressed, isConnected:', isConnected, 'isExecuting:', isExecuting);
              executeCommand();
            }}
            disabled={!isConnected}
          >
            <Text style={styles.executeButtonText}>▶</Text>
          </TouchableOpacity>
        )}
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

      {/* Preview Modal */}
      <Modal
        visible={!!selectedPreviewItem}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedPreviewItem?.name || 'Preview'}
            </Text>
            <View style={styles.modalActions}>
              {selectedPreviewItem?.type === 'jupyter' && selectedPreviewItem?.url && (
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                  onPress={() => {
                    if (selectedPreviewItem?.url) {
                      Linking.openURL(selectedPreviewItem.url).catch(err => {
                        console.error('Failed to open URL:', err);
                        Alert.alert('Error', 'Failed to open Jupyter in browser');
                      });
                    }
                  }}
                >
                  <Text style={styles.modalButtonText}>🌐 ブラウザで開く</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSelectedPreviewItem(null)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.previewContainer}>
            {selectedPreviewItem?.type === 'jupyter' ? (
              <View style={styles.jupyterContainer}>
                {selectedPreviewItem?.url ? (
                  <>
                    <View style={styles.jupyterInfo}>
                      <Text style={styles.jupyterUrlText}>
                        Jupyter URL: {selectedPreviewItem.url}
                      </Text>
                      <Text style={styles.jupyterStatusText}>
                        Status: Ready (Port: {selectedPreviewItem.port})
                      </Text>
                    </View>
                    <WebView
                      source={{ uri: selectedPreviewItem.url }}
                      style={styles.webView}
                      startInLoadingState={true}
                      renderLoading={() => (
                        <View style={styles.webViewLoading}>
                          <ActivityIndicator size="large" color="#4CAF50" />
                          <Text style={styles.loadingText}>Loading Jupyter...</Text>
                        </View>
                      )}
                      onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView error:', nativeEvent);
                        Alert.alert('Jupyter Load Error', `Failed to load Jupyter: ${nativeEvent.description}`);
                      }}
                      onHttpError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('HTTP error:', nativeEvent);
                        Alert.alert('HTTP Error', `${nativeEvent.statusCode}: ${nativeEvent.description}`);
                      }}
                    />
                  </>
                ) : isLoadingPreview ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading Jupyter preview...</Text>
                  </View>
                ) : (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Jupyter URL not available</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => {
                        if (selectedPreviewItem) {
                          openPreviewItem(selectedPreviewItem);
                        }
                      }}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : selectedPreviewItem?.type === 'matplotlib' ? (
              <View style={styles.matplotlibContainer}>
                <Text style={styles.matplotlibTitle}>Matplotlib Plot</Text>
                <Text style={styles.matplotlibPath}>{selectedPreviewItem.path}</Text>
                {/* Matplotlib image would be shown here */}
              </View>
            ) : selectedPreviewItem?.type === 'webapp' ? (
              <View style={styles.webappContainer}>
                <Text style={styles.webappTitle}>Web Application</Text>
                <Text style={styles.webappPort}>Port: {selectedPreviewItem.port}</Text>
                {/* WebApp content would be shown here */}
              </View>
            ) : (
              <View style={styles.unknownContainer}>
                <Text style={styles.unknownText}>
                  Unknown preview type: {selectedPreviewItem?.type}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Claude Code Integration Panel */}
      <ClaudeCodeIntegrationPanel
        visible={showClaudeCodePanel}
        onClose={() => setShowClaudeCodePanel(false)}
        projectId={projectId}
        projectName={route.params.projectName || projectId}
      />
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
  timeText: {
    color: '#888',
    fontSize: 10,
    marginLeft: 8,
  },
  terminalContainer: {
    flex: 0.8, // 80% of available screen space
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
  thinkingLine: {
    color: '#9C27B0',
    fontStyle: 'italic',
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginVertical: 1,
  },
  brainLine: {
    color: '#FF9800',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginVertical: 1,
  },
  sectionLine: {
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 4,
    marginVertical: 2,
    borderRadius: 6,
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
  cancelButton: {
    backgroundColor: '#f44336',
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
  // Preview Modal Styles
  previewContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  jupyterContainer: {
    flex: 1,
  },
  jupyterInfo: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  jupyterUrlText: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 5,
  },
  jupyterStatusText: {
    color: '#888',
    fontSize: 12,
  },
  webView: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  matplotlibContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  matplotlibTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  matplotlibPath: {
    color: '#888',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  webappContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webappTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  webappPort: {
    color: '#888',
    fontSize: 14,
  },
  unknownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unknownText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default DevelopmentScreen;
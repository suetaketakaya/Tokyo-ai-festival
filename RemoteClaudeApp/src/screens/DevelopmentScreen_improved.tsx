import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';

type DevelopmentScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Development'
>;

type DevelopmentScreenRouteProp = RouteProp<RootStackParamList, 'Development'>;

interface Props {
  navigation: DevelopmentScreenNavigationProp;
  route: DevelopmentScreenRouteProp;
}

interface TerminalLine {
  id: string;
  text: string;
  type: 'command' | 'output' | 'error' | 'system';
  timestamp: Date;
}

interface ErrorInfo {
  id: string;
  message: string;
  timestamp: Date;
  type: 'error' | 'warning';
}

export default function DevelopmentScreen({ navigation, route }: Props) {
  const [command, setCommand] = useState('');
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [tabSuggestions, setTabSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [persistentErrors, setPersistentErrors] = useState<ErrorInfo[]>([]);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const { projectId, projectName, connectionUrl, sessionKey } = route.params;

  // 既存のuseEffect, connectToServer, handleServerMessage等の関数は同じ

  useEffect(() => {
    navigation.setOptions({
      title: `🛠️ ${projectName} (IMPROVED)`,
    });

    console.log('🔥 DEVELOPMENT_INIT: Setting up WebSocket callbacks');
    if (EnhancedWebSocketService.isConnected()) {
      console.log('🔥 DEVELOPMENT_INIT: WebSocket already connected, updating callbacks');
      setIsConnected(true);

      EnhancedWebSocketService.updateCallbacks({
        onMessage: handleServerMessage,
      });

      addSystemMessage('🔥 DEVELOPMENT_INIT: WebSocket callbacks updated for development screen');
    } else {
      console.log('🔥 DEVELOPMENT_INIT: WebSocket not connected, establishing connection');
      connectToServer();
    }

    return () => {
      // Don't disconnect here as we might navigate back
    };
  }, []);

  const connectToServer = async () => {
    addSystemMessage('🔌 Attempting to connect to server...');

    const success = await EnhancedEnhancedWebSocketService.connect(connectionUrl, {
      onOpen: () => {
        setIsConnected(true);
        addSystemMessage('✅ Successfully connected to RemoteClaude server');
      },
      onMessage: (message) => {
        handleServerMessage(message);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        addSystemMessage('❌ WebSocket connection error occurred', 'error');
        addSystemMessage('🔍 Check server URL and network connectivity', 'error');
      },
      onClose: (event) => {
        setIsConnected(false);
        const reason = event?.reason || 'Unknown reason';
        const code = event?.code || 'Unknown code';
        addSystemMessage(`🔌 Disconnected from server (${code}: ${reason})`, 'error');

        if (event?.code !== 1000 && event?.code !== 1001) {
          setTimeout(() => {
            addSystemMessage('🔄 Attempting to reconnect...');
            connectToServer();
          }, 3000);
        }
      },
    });

    if (!success) {
      addSystemMessage('❌ Failed to establish WebSocket connection', 'error');
      addPersistentError('Connection failed', 'Check server URL and network connectivity');

      Alert.alert(
        'Connection Failed',
        `Could not connect to the RemoteClaude server.\n\nURL: ${connectionUrl}\n\nPlease verify:\n• Server is running\n• Network connectivity\n• Firewall settings\n• URL is correct`,
        [
          { text: 'Retry', onPress: connectToServer },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleServerMessage = (message: any) => {
    console.log('🔥 DEVELOPMENT_IMPROVED: Processing message:', message.type);

    const messageType = message.type ? message.type.toString().trim() : '';

    switch (messageType) {
      case 'claude_thinking':
        setIsThinking(true);
        setExecutionProgress(25);
        if (message.data && message.data.thinking) {
          setThinkingText(message.data.thinking);
          addSystemMessage('🤔 Claude is thinking...', 'system');
        }
        break;

      case 'claude_output':
        console.log('🔥 DEVELOPMENT_IMPROVED: Successfully handling claude_output message');
        setIsExecuting(false);
        setIsThinking(false);
        setExecutionProgress(100);
        if (message.data && message.data.output) {
          console.log('🔥 DEVELOPMENT_IMPROVED: Adding terminal output:', message.data.output.substring(0, 100));
          addTerminalOutput(message.data.output, 'output');
          addSystemMessage('✅ Command completed successfully');
        }
        // Reset progress after delay
        setTimeout(() => setExecutionProgress(0), 2000);
        break;

      case 'claude_error':
        console.log('❌ DEVELOPMENT: Handling claude_error message');
        setIsExecuting(false);
        setIsThinking(false);
        setExecutionProgress(0);
        if (message.data && message.data.error) {
          addTerminalOutput(message.data.error, 'error');
          addPersistentError('Command execution error', message.data.error);
        }
        addSystemMessage('❌ Command failed with error', 'error');
        break;

      case 'connection_established':
        console.log('🔗 DEVELOPMENT: Connection established');
        addSystemMessage(`Connected to server v${message.data?.server_version || 'unknown'}`);
        break;

      case 'error':
        console.log('⚠️ DEVELOPMENT: Server error');
        const errorMsg = message.data?.message || 'Unknown error';
        addSystemMessage(errorMsg, 'error');
        addPersistentError('Server error', errorMsg);
        break;

      case 'pong':
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
      // Limit to last 1000 lines for performance
      const lines = [...prev, newLine];
      return lines.length > 1000 ? lines.slice(-1000) : lines;
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

  const addPersistentError = (title: string, message: string) => {
    const errorInfo: ErrorInfo = {
      id: Date.now().toString(),
      message: `${title}: ${message}`,
      timestamp: new Date(),
      type: 'error'
    };
    setPersistentErrors(prev => [...prev, errorInfo]);
    setShowErrorPanel(true);
  };

  const clearPersistentErrors = () => {
    setPersistentErrors([]);
    setShowErrorPanel(false);
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

    const success = EnhancedEnhancedWebSocketService.send({
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
      addSystemMessage('Executing command...');
      setCommand('');
      setShowSuggestions(false);
    } else {
      addSystemMessage('Failed to send command', 'error');
      addPersistentError('Send failed', 'Could not send command to server');
    }
  };

  const executeQuickCommand = (quickCommand: string, skipConfirmation: boolean = false) => {
    if (skipConfirmation) {
      setCommand(quickCommand);
      setTimeout(() => executeCommand(), 100);
    } else {
      setCommand(quickCommand);
    }
  };

  const clearTerminal = () => {
    setTerminalLines([]);
    addSystemMessage('Terminal cleared');
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const { key } = e.nativeEvent;

    if (key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      handleArrowUp();
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      handleArrowDown();
    } else if (key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const handleTabCompletion = () => {
    const currentCommand = command.toLowerCase().trim();
    const commonCommands = [
      'ls', 'ls -la', 'pwd', 'cd', 'mkdir', 'rm', 'cp', 'mv',
      'cat', 'vim', 'nano', 'grep', 'find', 'ps', 'top', 'df',
      'git status', 'git add', 'git commit', 'git push', 'git pull',
      'python3', 'npm', 'node', 'docker', 'curl', 'wget'
    ];

    const suggestions = commonCommands.filter(cmd =>
      cmd.startsWith(currentCommand) && cmd !== currentCommand
    );

    if (suggestions.length === 1) {
      setCommand(suggestions[0] + ' ');
      setShowSuggestions(false);
    } else if (suggestions.length > 1) {
      setTabSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleArrowUp = () => {
    if (commandHistory.length > 0) {
      const newIndex = historyIndex === -1 ? commandHistory.length - 1
                      : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
      setShowSuggestions(false);
    }
  };

  const handleArrowDown = () => {
    if (commandHistory.length > 0 && historyIndex >= 0) {
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setCommand(suggestion + ' ');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const getLineStyle = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command': return styles.commandLine;
      case 'output': return styles.outputLine;
      case 'error': return styles.errorLine;
      case 'system': return styles.systemLine;
      default: return styles.outputLine;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Enhanced Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.projectInfo}>📁 {projectName}</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.connectionStatus, { color: isConnected ? '#28a745' : '#dc3545' }]}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </Text>
            {persistentErrors.length > 0 && (
              <TouchableOpacity
                style={styles.errorIndicator}
                onPress={() => setShowErrorPanel(!showErrorPanel)}
              >
                <Text style={styles.errorCount}>⚠️ {persistentErrors.length}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.statusRight}>
          {isExecuting && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${executionProgress}%` }]} />
            </View>
          )}
          <TouchableOpacity style={styles.clearButton} onPress={clearTerminal}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Panel */}
      {showErrorPanel && persistentErrors.length > 0 && (
        <View style={styles.errorPanel}>
          <View style={styles.errorHeader}>
            <Text style={styles.errorTitle}>Recent Errors</Text>
            <TouchableOpacity onPress={clearPersistentErrors}>
              <Text style={styles.clearErrorsText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.errorList} nestedScrollEnabled>
            {persistentErrors.map((error) => (
              <View key={error.id} style={styles.errorItem}>
                <Text style={styles.errorText}>{error.message}</Text>
                <Text style={styles.errorTime}>
                  {error.timestamp.toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Terminal Output */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.terminal}
        contentContainerStyle={styles.terminalContent}
      >
        {terminalLines.length === 0 ? (
          <View style={styles.terminalWelcome}>
            <Text style={styles.welcomeText}>🚀 RemoteClaude Development Terminal</Text>
            <Text style={styles.welcomeSubText}>
              Ready to execute Claude commands for {projectName}
            </Text>
            <Text style={styles.welcomeHint}>
              Try: "Create a simple hello world file" or use quick commands below
            </Text>
          </View>
        ) : (
          terminalLines.map((line) => (
            <Text key={line.id} style={getLineStyle(line.type)}>
              {line.text}
            </Text>
          ))
        )}
        {isExecuting && (
          <View style={styles.executingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.executingLine}>⏳ Executing command...</Text>
          </View>
        )}
        {isThinking && (
          <View style={styles.thinkingContainer}>
            <Text style={styles.thinkingLine}>🤔 Claude is thinking...</Text>
            {thinkingText && (
              <Text style={styles.thinkingDetail}>{thinkingText}</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Improved Quick Commands Grid */}
      <View style={styles.quickCommands}>
        <View style={styles.quickCommandsHeader}>
          <Text style={styles.quickCommandsTitle}>🚀 Quick Commands</Text>
          <TouchableOpacity
            style={styles.moreCommandsButton}
            onPress={() => navigation.navigate('QuickCommands', {
              projectId,
              projectName,
              connectionUrl,
              sessionKey,
            })}
          >
            <Text style={styles.moreCommandsText}>⚡ View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickCommandsGrid}>
          <TouchableOpacity
            style={styles.gridCommandButton}
            onPress={() => executeQuickCommand('ls -la')}
            onLongPress={() => executeQuickCommand('ls -la', true)}
          >
            <Text style={styles.gridCommandIcon}>📂</Text>
            <Text style={styles.gridCommandText}>List Files</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridCommandButton}
            onPress={() => executeQuickCommand('pwd')}
            onLongPress={() => executeQuickCommand('pwd', true)}
          >
            <Text style={styles.gridCommandIcon}>📍</Text>
            <Text style={styles.gridCommandText}>Current Dir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridCommandButton}
            onPress={() => executeQuickCommand('git status')}
            onLongPress={() => executeQuickCommand('git status', true)}
          >
            <Text style={styles.gridCommandIcon}>📝</Text>
            <Text style={styles.gridCommandText}>Git Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridCommandButton}
            onPress={() => executeQuickCommand('python3 --version')}
            onLongPress={() => executeQuickCommand('python3 --version', true)}
          >
            <Text style={styles.gridCommandIcon}>🐍</Text>
            <Text style={styles.gridCommandText}>Python Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridCommandButton}
            onPress={() => executeQuickCommand('find . -name "*.py" -type f')}
            onLongPress={() => executeQuickCommand('find . -name "*.py" -type f', true)}
          >
            <Text style={styles.gridCommandIcon}>🔍</Text>
            <Text style={styles.gridCommandText}>Find Python</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridCommandButton}
            onPress={() => navigation.navigate('QuickCommands', {
              projectId,
              projectName,
              connectionUrl,
              sessionKey,
            })}
          >
            <Text style={styles.gridCommandIcon}>⚡</Text>
            <Text style={styles.gridCommandText}>View All</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.helpText}>💡 Tap to add to input, long press to execute directly</Text>
      </View>

      {/* Tab Suggestions */}
      {showSuggestions && tabSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>💡 Tab Suggestions:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionButton}
                onPress={() => selectSuggestion(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Command Input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.commandInput}
          value={command}
          onChangeText={setCommand}
          onKeyPress={handleKeyPress}
          placeholder="Enter Claude command or shell command... (↑ for history, Tab for completion)"
          placeholderTextColor="#999"
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={executeCommand}
          editable={!isExecuting}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: isExecuting ? 0.5 : 1 }]}
          onPress={executeCommand}
          disabled={isExecuting}
        >
          <Text style={styles.sendButtonText}>
            {isExecuting ? '⏳' : '🚀'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  statusLeft: {
    flex: 1,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectInfo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  connectionStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 10,
  },
  errorIndicator: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  errorCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: 40,
    height: 4,
    backgroundColor: '#404040',
    borderRadius: 2,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  clearButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorPanel: {
    backgroundColor: '#3d1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#ff6b6b',
    maxHeight: 120,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#4d2424',
  },
  errorTitle: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearErrorsText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorList: {
    maxHeight: 80,
  },
  errorItem: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#4d2424',
  },
  errorText: {
    color: '#ffb3b3',
    fontSize: 12,
    lineHeight: 16,
  },
  errorTime: {
    color: '#cc8888',
    fontSize: 10,
    marginTop: 2,
  },
  terminal: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  terminalContent: {
    padding: 15,
    flexGrow: 1,
  },
  terminalWelcome: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeText: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeHint: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  commandLine: {
    color: '#00ff00',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    marginBottom: 5,
  },
  outputLine: {
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    marginBottom: 2,
  },
  errorLine: {
    color: '#ff6b6b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    marginBottom: 2,
  },
  systemLine: {
    color: '#ffd93d',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  executingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  executingLine: {
    color: '#007AFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  quickCommands: {
    backgroundColor: '#2d2d2d',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  quickCommandsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickCommandsTitle: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  moreCommandsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moreCommandsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickCommandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  gridCommandButton: {
    width: '31%',
    backgroundColor: '#404040',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'center',
  },
  gridCommandIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  gridCommandText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
  },
  helpText: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  commandInput: {
    flex: 1,
    backgroundColor: '#404040',
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 20,
  },
  thinkingContainer: {
    backgroundColor: '#2d2d2d',
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  thinkingLine: {
    color: '#007AFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  thinkingDetail: {
    color: '#ccc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  suggestionsContainer: {
    backgroundColor: '#2d2d2d',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  suggestionsTitle: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  suggestionButton: {
    backgroundColor: '#404040',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
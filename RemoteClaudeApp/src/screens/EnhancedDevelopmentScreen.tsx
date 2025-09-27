import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Smart Command Classifier for priority execution
interface CommandClassification {
  type: 'linux' | 'python' | 'code' | 'webapp' | 'file' | 'claude';
  priority: 'immediate' | 'deferred' | 'claude-assisted';
  suggestions?: string[];
  description?: string;
}

interface TerminalLine {
  id: string;
  text: string;
  type: 'command' | 'output' | 'error' | 'system' | 'preview-hint';
  timestamp: Date;
  previewAvailable?: boolean;
}

interface PreviewItem {
  id: string;
  name: string;
  type: 'matplotlib' | 'webapp' | 'jupyter' | 'image' | 'web';
  path?: string;
  port?: number;
  url?: string;
  proxyUrl?: string;
  lastModified: Date;
  preview?: string;
}

interface SmartSuggestion {
  command: string;
  description: string;
  category: 'file' | 'directory' | 'python' | 'common';
}

type DevelopmentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Development'>;
type DevelopmentScreenRouteProp = RouteProp<RootStackParamList, 'Development'>;

interface Props {
  route: DevelopmentScreenRouteProp;
  navigation: DevelopmentScreenNavigationProp;
}

const EnhancedDevelopmentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { serverUrl, projectId } = route.params;

  // Core terminal states
  const [command, setCommand] = useState('');
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Command intelligence states
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentClassification, setCurrentClassification] = useState<CommandClassification | null>(null);

  // UI states for better UX
  const [activeMode, setActiveMode] = useState<'terminal' | 'preview'>('terminal');
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<PreviewItem | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(screenHeight * 0.8); // 80% for terminal
  const [isInputFocused, setIsInputFocused] = useState(false);

  // W&B Integration states
  const [wandbIntegrated, setWandbIntegrated] = useState(false);
  const [wandbApiKey, setWandbApiKey] = useState('');
  const [showWandbSetup, setShowWandbSetup] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  // Smart command classification engine
  const classifyCommand = useCallback((input: string): CommandClassification => {
    const trimmed = input.trim().toLowerCase();

    // Linux commands - immediate execution
    const linuxCommands = ['ls', 'pwd', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'find', 'top', 'ps', 'kill'];
    if (linuxCommands.some(cmd => trimmed.startsWith(cmd))) {
      return {
        type: 'linux',
        priority: 'immediate',
        description: 'Linux command - executing immediately'
      };
    }

    // Python execution - immediate with preview potential
    if (trimmed.startsWith('python') || trimmed.endsWith('.py')) {
      return {
        type: 'python',
        priority: 'immediate',
        description: 'Python execution - checking for visualization output',
        suggestions: ['python -i', 'python -u']
      };
    }

    // File operations - immediate with tab completion
    if (trimmed.includes('.') && (trimmed.includes('/') || !trimmed.includes(' '))) {
      return {
        type: 'file',
        priority: 'immediate',
        description: 'File operation - enabling tab completion'
      };
    }

    // Web applications - deferred with special handling
    if (trimmed.includes('flask') || trimmed.includes('django') || trimmed.includes('streamlit') ||
        trimmed.includes('gradio') || trimmed.includes('serve') || trimmed.includes('http.server')) {
      return {
        type: 'webapp',
        priority: 'deferred',
        description: 'Web application - preparing preview mode'
      };
    }

    // Complex tasks - Claude assistance
    if (input.length > 50 || trimmed.includes('implement') || trimmed.includes('create') ||
        trimmed.includes('build') || trimmed.includes('fix')) {
      return {
        type: 'claude',
        priority: 'claude-assisted',
        description: 'Complex task - Claude Code integration recommended'
      };
    }

    return {
      type: 'linux',
      priority: 'immediate',
      description: 'Standard command execution'
    };
  }, []);

  // Generate smart suggestions based on current directory and context
  const generateSmartSuggestions = useCallback((input: string): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    if (input.length < 2) {
      // Common commands for beginners
      suggestions.push(
        { command: 'ls -la', description: 'List all files with details', category: 'common' },
        { command: 'pwd', description: 'Show current directory', category: 'common' },
        { command: 'python --version', description: 'Check Python version', category: 'python' },
        { command: 'pip list', description: 'Show installed packages', category: 'python' }
      );
    } else {
      // Context-aware suggestions based on input
      if (input.startsWith('cd')) {
        suggestions.push(
          { command: 'cd ..', description: 'Go to parent directory', category: 'directory' },
          { command: 'cd ~', description: 'Go to home directory', category: 'directory' }
        );
      } else if (input.startsWith('python')) {
        suggestions.push(
          { command: 'python -i script.py', description: 'Run Python interactively', category: 'python' },
          { command: 'python -m pip install', description: 'Install Python package', category: 'python' }
        );
      }
    }

    return suggestions;
  }, []);

  // Enhanced execution with priority handling
  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;

    const classification = classifyCommand(cmd);
    setCurrentClassification(classification);

    // Add to terminal immediately for visual feedback
    const commandLine: TerminalLine = {
      id: Date.now().toString(),
      text: `$ ${cmd}`,
      type: 'command',
      timestamp: new Date()
    };

    setTerminalLines(prev => [...prev, commandLine]);
    setIsExecuting(true);

    // Handle based on priority
    switch (classification.priority) {
      case 'immediate':
        await executeImmediate(cmd, classification);
        break;
      case 'deferred':
        await executeDeferred(cmd, classification);
        break;
      case 'claude-assisted':
        await suggestClaudeAssistance(cmd, classification);
        break;
    }

    // Update history
    setCommandHistory(prev => [cmd, ...prev.slice(0, 49)]); // Keep last 50
    setHistoryIndex(-1);
    setCommand('');
    setIsExecuting(false);
  }, [classifyCommand]);

  const executeImmediate = async (cmd: string, classification: CommandClassification) => {
    try {
      const response = await EnhancedWebSocketService.sendCommand({
        type: 'execute',
        command: cmd,
        projectId,
        priority: 'high'
      });

      if (response?.output) {
        const outputLine: TerminalLine = {
          id: (Date.now() + 1).toString(),
          text: response.output,
          type: response.error ? 'error' : 'output',
          timestamp: new Date(),
          previewAvailable: classification.type === 'python' && response.output.includes('matplotlib')
        };

        setTerminalLines(prev => [...prev, outputLine]);

        // Check for preview opportunities
        if (classification.type === 'python' && response.previewUrl) {
          addPreviewItem({
            id: Date.now().toString(),
            name: `Python Output - ${new Date().toLocaleTimeString()}`,
            type: 'matplotlib',
            url: response.previewUrl,
            lastModified: new Date()
          });
        }
      }
    } catch (error) {
      const errorLine: TerminalLine = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        timestamp: new Date()
      };
      setTerminalLines(prev => [...prev, errorLine]);
    }
  };

  const executeDeferred = async (cmd: string, classification: CommandClassification) => {
    // For web applications, set up preview mode first
    const systemLine: TerminalLine = {
      id: Date.now().toString(),
      text: `🌐 Starting ${classification.type} application - Preview will be available shortly...`,
      type: 'system',
      timestamp: new Date()
    };
    setTerminalLines(prev => [...prev, systemLine]);

    // Execute command
    await executeImmediate(cmd, classification);

    // Set up preview monitoring
    setTimeout(() => {
      // Check for web application on common ports
      [3000, 5000, 8000, 8080, 8501].forEach(port => {
        checkWebAppOnPort(port, cmd);
      });
    }, 2000);
  };

  const suggestClaudeAssistance = async (cmd: string, classification: CommandClassification) => {
    const suggestionLine: TerminalLine = {
      id: Date.now().toString(),
      text: `🤖 Complex task detected: "${cmd}".\n💡 Claude Code integration recommended for better assistance.\nExecuting basic interpretation...`,
      type: 'system',
      timestamp: new Date()
    };
    setTerminalLines(prev => [...prev, suggestionLine]);

    // Still execute but suggest Claude integration
    await executeImmediate(cmd, classification);
  };

  const checkWebAppOnPort = async (port: number, originalCommand: string) => {
    try {
      const previewUrl = `http://localhost:${port}`;
      // This would typically be a health check
      addPreviewItem({
        id: `webapp-${port}`,
        name: `Web App (${originalCommand})`,
        type: 'webapp',
        port,
        url: previewUrl,
        lastModified: new Date()
      });
    } catch (error) {
      // Port not available
    }
  };

  const addPreviewItem = (item: PreviewItem) => {
    setPreviewItems(prev => {
      const filtered = prev.filter(p => p.id !== item.id);
      return [item, ...filtered];
    });

    // Auto-show preview hint
    const hintLine: TerminalLine = {
      id: (Date.now() + 2).toString(),
      text: `📱 Preview available: ${item.name}. Tap 'Preview' to view.`,
      type: 'preview-hint',
      timestamp: new Date(),
      previewAvailable: true
    };
    setTerminalLines(prev => [...prev, hintLine]);
  };

  // Enhanced input handling with tab completion and history
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') {
      executeCommand(command);
    } else if (e.nativeEvent.key === 'Tab') {
      // Tab completion
      e.preventDefault();
      handleTabCompletion();
    } else if (e.nativeEvent.key === 'ArrowUp') {
      // History navigation
      e.preventDefault();
      navigateHistory('up');
    } else if (e.nativeEvent.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory('down');
    }
  };

  const handleTabCompletion = () => {
    const suggestions = generateSmartSuggestions(command);
    if (suggestions.length > 0) {
      setSmartSuggestions(suggestions);
      setShowSuggestions(true);
    }
  };

  const navigateHistory = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex;
    if (direction === 'up') {
      newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
    } else {
      newIndex = Math.max(historyIndex - 1, -1);
    }

    setHistoryIndex(newIndex);
    setCommand(newIndex >= 0 ? commandHistory[newIndex] : '');
  };

  const applySuggestion = (suggestion: SmartSuggestion) => {
    setCommand(suggestion.command);
    setShowSuggestions(false);
    textInputRef.current?.focus();
  };

  // W&B Integration setup
  const setupWandB = async () => {
    if (!wandbApiKey.trim()) {
      Alert.alert('Error', 'Please enter your W&B API key');
      return;
    }

    const setupCommand = `pip install wandb && echo "${wandbApiKey}" | wandb login`;
    await executeCommand(setupCommand);
    setWandbIntegrated(true);
    setShowWandbSetup(false);

    // Add sample W&B tracking code
    const sampleLine: TerminalLine = {
      id: Date.now().toString(),
      text: `✅ W&B integrated! Example usage:\n\nimport wandb\nrun = wandb.init(project="my-project")\nwandb.log({"metric": value})`,
      type: 'system',
      timestamp: new Date()
    };
    setTerminalLines(prev => [...prev, sampleLine]);
  };

  // WebSocket connection management
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await EnhancedWebSocketService.connect(serverUrl);
        setIsConnected(true);

        const welcomeLine: TerminalLine = {
          id: Date.now().toString(),
          text: `🚀 Connected to Remote Claude Server\n💡 Type 'help' for commands or start with basic commands like 'ls', 'pwd'\n🤖 For complex tasks, Claude Code integration is available\n`,
          type: 'system',
          timestamp: new Date()
        };
        setTerminalLines([welcomeLine]);

      } catch (error) {
        Alert.alert('Connection Error', 'Failed to connect to server');
      }
    };

    connectWebSocket();

    return () => {
      EnhancedWebSocketService.disconnect();
    };
  }, [serverUrl]);

  // Auto-scroll terminal
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [terminalLines]);

  const renderTerminalLine = ({ item }: { item: TerminalLine }) => (
    <View style={styles.terminalLineContainer}>
      <Text style={[
        styles.terminalText,
        item.type === 'command' && styles.commandText,
        item.type === 'error' && styles.errorText,
        item.type === 'system' && styles.systemText,
        item.type === 'preview-hint' && styles.previewHintText
      ]}>
        {item.text}
      </Text>
      {item.previewAvailable && (
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => setActiveMode('preview')}
        >
          <Text style={styles.previewButtonText}>📱 View Preview</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPreviewItem = ({ item }: { item: PreviewItem }) => (
    <TouchableOpacity
      style={styles.previewItemContainer}
      onPress={() => setSelectedPreview(item)}
    >
      <Text style={styles.previewItemName}>{item.name}</Text>
      <Text style={styles.previewItemType}>{item.type}</Text>
      <Text style={styles.previewItemTime}>{item.lastModified.toLocaleTimeString()}</Text>
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }: { item: SmartSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionContainer}
      onPress={() => applySuggestion(item)}
    >
      <Text style={styles.suggestionCommand}>{item.command}</Text>
      <Text style={styles.suggestionDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header with mode switcher */}
        <View style={styles.header}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, activeMode === 'terminal' && styles.activeMode]}
              onPress={() => setActiveMode('terminal')}
            >
              <Text style={[styles.modeButtonText, activeMode === 'terminal' && styles.activeModeText]}>
                💻 Terminal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, activeMode === 'preview' && styles.activeMode]}
              onPress={() => setActiveMode('preview')}
            >
              <Text style={[styles.modeButtonText, activeMode === 'preview' && styles.activeModeText]}>
                📱 Preview ({previewItems.length})
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.wandbButton}
            onPress={() => setShowWandbSetup(true)}
          >
            <Text style={styles.wandbButtonText}>
              {wandbIntegrated ? '✅ W&B' : '🔧 Setup W&B'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area - 80% Terminal */}
        <View style={[styles.mainContent, { height: terminalHeight }]}>
          {activeMode === 'terminal' ? (
            <>
              {/* Terminal Output */}
              <FlatList
                ref={scrollViewRef}
                data={terminalLines}
                renderItem={renderTerminalLine}
                keyExtractor={(item) => item.id}
                style={styles.terminal}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              />

              {/* Command Classification Display */}
              {currentClassification && (
                <View style={styles.classificationBar}>
                  <Text style={styles.classificationText}>
                    {currentClassification.description}
                  </Text>
                </View>
              )}

              {/* Execution Status */}
              {isExecuting && (
                <View style={styles.executionStatus}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.executionText}>Executing...</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Preview Mode */}
              <Text style={styles.previewHeader}>📱 Preview & Outputs</Text>
              {previewItems.length > 0 ? (
                <FlatList
                  data={previewItems}
                  renderItem={renderPreviewItem}
                  keyExtractor={(item) => item.id}
                  style={styles.previewList}
                />
              ) : (
                <View style={styles.noPreviewContainer}>
                  <Text style={styles.noPreviewText}>
                    No preview items available.{'\n'}
                    Run Python scripts with matplotlib, start web apps, or execute other visual commands to see previews here.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Input Area - 20% */}
        <View style={styles.inputArea}>
          {/* Smart Suggestions */}
          {showSuggestions && smartSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={smartSuggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item, index) => `${item.command}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Command Input */}
          <View style={styles.commandInputContainer}>
            <TextInput
              ref={textInputRef}
              style={styles.commandInput}
              value={command}
              onChangeText={(text) => {
                setCommand(text);
                const suggestions = generateSmartSuggestions(text);
                setSmartSuggestions(suggestions);
                setShowSuggestions(suggestions.length > 0);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type command or describe what you want to do..."
              placeholderTextColor="#666"
              multiline={false}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />
            <TouchableOpacity
              style={styles.executeButton}
              onPress={() => executeCommand(command)}
              disabled={isExecuting || !command.trim()}
            >
              <Text style={styles.executeButtonText}>▶️</Text>
            </TouchableOpacity>
          </View>

          {/* Helper Buttons */}
          <View style={styles.helperButtons}>
            <TouchableOpacity
              style={styles.helperButton}
              onPress={() => setCommand('ls -la')}
            >
              <Text style={styles.helperButtonText}>📂 List Files</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helperButton}
              onPress={() => setCommand('pwd')}
            >
              <Text style={styles.helperButtonText}>📍 Current Dir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helperButton}
              onPress={() => setCommand('python --version')}
            >
              <Text style={styles.helperButtonText}>🐍 Python</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* W&B Setup Modal */}
        <Modal
          visible={showWandbSetup}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowWandbSetup(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🚀 Setup Weights & Biases</Text>
              <Text style={styles.modalDescription}>
                Enter your W&B API key to enable model tracking and tuning:
              </Text>
              <TextInput
                style={styles.modalInput}
                value={wandbApiKey}
                onChangeText={setWandbApiKey}
                placeholder="3c424d79b35640897bb8d970bbcdc872bdf9561a"
                secureTextEntry={true}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowWandbSetup(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={setupWandB}
                >
                  <Text style={styles.modalConfirmText}>Setup W&B</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Preview Detail Modal */}
        {selectedPreview && (
          <Modal
            visible={!!selectedPreview}
            animationType="slide"
            onRequestClose={() => setSelectedPreview(null)}
          >
            <SafeAreaView style={styles.previewModal}>
              <View style={styles.previewModalHeader}>
                <Text style={styles.previewModalTitle}>{selectedPreview.name}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedPreview(null)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              {selectedPreview.url && (
                <WebView
                  source={{ uri: selectedPreview.url }}
                  style={styles.previewWebView}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              )}
            </SafeAreaView>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 2,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  activeMode: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  activeModeText: {
    color: '#fff',
  },
  wandbButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  wandbButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
  },
  terminal: {
    flex: 1,
    paddingHorizontal: 16,
  },
  terminalLineContainer: {
    marginVertical: 2,
  },
  terminalText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  commandText: {
    color: '#00ff00',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff4444',
  },
  systemText: {
    color: '#ffaa00',
  },
  previewHintText: {
    color: '#00aaff',
    fontStyle: 'italic',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  classificationBar: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  classificationText: {
    color: '#ffaa00',
    fontSize: 12,
    fontStyle: 'italic',
  },
  executionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
  },
  executionText: {
    color: '#007AFF',
    marginLeft: 8,
    fontSize: 14,
  },
  previewHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 16,
  },
  previewList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  previewItemContainer: {
    backgroundColor: '#333',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  previewItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewItemType: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 4,
  },
  previewItemTime: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  noPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noPreviewText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputArea: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 16,
    maxHeight: screenHeight * 0.25, // 25% maximum for input area
  },
  suggestionsContainer: {
    marginBottom: 12,
  },
  suggestionContainer: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    minWidth: 120,
  },
  suggestionCommand: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  suggestionDescription: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 2,
  },
  commandInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  commandInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingVertical: 12,
  },
  executeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  executeButtonText: {
    fontSize: 16,
  },
  helperButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  helperButton: {
    backgroundColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  helperButtonText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#333',
    padding: 24,
    borderRadius: 16,
    width: screenWidth * 0.9,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: '#444',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalConfirmButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  modalConfirmText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  previewModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  previewModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewWebView: {
    flex: 1,
  },
});

export default EnhancedDevelopmentScreen;
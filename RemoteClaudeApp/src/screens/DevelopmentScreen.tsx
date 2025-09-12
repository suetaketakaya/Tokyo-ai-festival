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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';
import WebSocketService from '../services/WebSocketService';

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
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const { projectId, projectName, connectionUrl, sessionKey } = route.params;

  useEffect(() => {
    // Set navigation title
    navigation.setOptions({
      title: `🛠️ ${projectName} (NEW_CODE_VERSION)`,
    });

    // Always set up message callbacks for this screen
    console.log('🔥 DEVELOPMENT_INIT: Setting up WebSocket callbacks');
    if (WebSocketService.isConnected()) {
      console.log('🔥 DEVELOPMENT_INIT: WebSocket already connected, updating callbacks');
      setIsConnected(true);
      
      // Re-establish callbacks for this screen
      WebSocketService.updateCallbacks({
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
    
    const success = await WebSocketService.connect(connectionUrl, {
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
        
        // Auto-reconnect for certain close codes
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
      addSystemMessage(`🌐 Server URL: ${connectionUrl}`, 'error');
      addSystemMessage('💡 Please check that the server is running and accessible', 'error');
      
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
    console.log('🔥 DEVELOPMENT_FIXED_v1: Processing message:', message.type);
    console.log('🔥 DEVELOPMENT_FIXED_v1: Message data:', message.data);
    
    // Normalize message type to handle potential whitespace/newline issues
    const messageType = message.type ? message.type.toString().trim() : '';
    
    switch (messageType) {
      case 'claude_thinking':
        setIsThinking(true);
        if (message.data && message.data.thinking) {
          setThinkingText(message.data.thinking);
          addSystemMessage('🤔 Claude is thinking...', 'system');
        }
        break;
        
      case 'claude_output':
        console.log('🔥 DEVELOPMENT_FIXED_v1: Successfully handling claude_output message');
        setIsExecuting(false);
        setIsThinking(false);
        if (message.data && message.data.output) {
          console.log('🔥 DEVELOPMENT_FIXED_v1: Adding terminal output:', message.data.output.substring(0, 100));
          addTerminalOutput(message.data.output, 'output');
          addSystemMessage('🔥 FIXED_v1: Terminal output added successfully');
        }
        if (message.data?.status === 'completed') {
          addSystemMessage('✅ Command completed successfully');
        }
        break;
        
      case 'claude_error':
        console.log('❌ DEVELOPMENT: Handling claude_error message');
        setIsExecuting(false);
        if (message.data && message.data.error) {
          addTerminalOutput(message.data.error, 'error');
        }
        addSystemMessage('❌ Command failed with error', 'error');
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
        // Handle ping/pong silently
        break;
        
      default:
        console.log('❓ DEVELOPMENT: Unhandled message type:', messageType);
        // Don't show debug messages for unknown types to keep terminal clean
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

    setTerminalLines(prev => [...prev, newLine]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addSystemMessage = (text: string, type: 'system' | 'error' = 'system') => {
    addTerminalLine(`[${new Date().toLocaleTimeString()}] ${text}`, type);
  };

  const addTerminalOutput = (text: string, type: 'output' | 'error') => {
    // Split multi-line output into separate lines
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

    // Add command to history
    const trimmedCommand = command.trim();
    if (trimmedCommand && commandHistory[commandHistory.length - 1] !== trimmedCommand) {
      setCommandHistory(prev => [...prev, trimmedCommand]);
    }
    setHistoryIndex(-1);

    // Add command to terminal
    addTerminalLine(`$ ${command}`, 'command');

    // Send command to server
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
      addSystemMessage('Executing command...');
      setCommand('');
      setShowSuggestions(false);
    } else {
      addSystemMessage('Failed to send command', 'error');
    }
  };

  const executeQuickCommand = (quickCommand: string) => {
    setCommand(quickCommand);
    // Don't execute immediately, let user review the command
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
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.projectInfo}>📁 {projectName}</Text>
          <Text style={[styles.connectionStatus, { color: isConnected ? '#28a745' : '#dc3545' }]}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearTerminal}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

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
          <Text style={styles.executingLine}>⏳ Executing command...</Text>
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

      {/* Quick Commands */}
      <View style={styles.quickCommands}>
        <Text style={styles.quickCommandsTitle}>🚀 Quick Commands</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('ls -la')}
          >
            <Text style={styles.quickCommandText}>📂 List Files</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('pwd')}
          >
            <Text style={styles.quickCommandText}>📍 Current Dir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('git status')}
          >
            <Text style={styles.quickCommandText}>📝 Git Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('Create a simple README file')}
          >
            <Text style={styles.quickCommandText}>📄 Claude: README</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('Show project structure and explain the codebase')}
          >
            <Text style={styles.quickCommandText}>🏗️ Claude: Analyze</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('claude --help')}
          >
            <Text style={styles.quickCommandText}>❓ Claude Help</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('echo "Hello from RemoteClaude!"')}
          >
            <Text style={styles.quickCommandText}>👋 Test Echo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('Write a simple hello world Python script')}
          >
            <Text style={styles.quickCommandText}>🐍 Claude: Python</Text>
          </TouchableOpacity>
          
          {/* Linux Commands */}
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('cat /etc/os-release')}
          >
            <Text style={styles.quickCommandText}>🐧 OS Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('ps aux')}
          >
            <Text style={styles.quickCommandText}>⚙️ Processes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('df -h')}
          >
            <Text style={styles.quickCommandText}>💾 Disk Usage</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('free -h')}
          >
            <Text style={styles.quickCommandText}>🧠 Memory</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('top -n 1')}
          >
            <Text style={styles.quickCommandText}>📊 System Load</Text>
          </TouchableOpacity>
          
          {/* Python Commands */}
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('python3 --version')}
          >
            <Text style={styles.quickCommandText}>🐍 Python Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('python3 -c "print(\'Hello from Python!\')"')}
          >
            <Text style={styles.quickCommandText}>🐍 Python Hello</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('python3 -c "import sys; print(sys.path)"')}
          >
            <Text style={styles.quickCommandText}>🐍 Python Path</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('pip3 list')}
          >
            <Text style={styles.quickCommandText}>📦 Pip Packages</Text>
          </TouchableOpacity>
          
          {/* File Operations */}
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('find . -name "*.py" -type f')}
          >
            <Text style={styles.quickCommandText}>🔍 Find Python</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('find . -name "*.js" -type f')}
          >
            <Text style={styles.quickCommandText}>🔍 Find JS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('wc -l *.py 2>/dev/null || echo "No Python files found"')}
          >
            <Text style={styles.quickCommandText}>📏 Count Lines</Text>
          </TouchableOpacity>
          
          {/* Development Tools */}
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('which python3 node npm git')}
          >
            <Text style={styles.quickCommandText}>🛠️ Tools Check</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('env | grep -E "(PATH|PYTHON|NODE)"')}
          >
            <Text style={styles.quickCommandText}>🌍 Environment</Text>
          </TouchableOpacity>
          
          {/* Network & System */}
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('curl -s https://httpbin.org/ip')}
          >
            <Text style={styles.quickCommandText}>🌐 My IP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCommandButton}
            onPress={() => executeQuickCommand('date')}
          >
            <Text style={styles.quickCommandText}>🕐 Date/Time</Text>
          </TouchableOpacity>
        </ScrollView>
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
  projectInfo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  connectionStatus: {
    fontSize: 12,
    fontWeight: 'bold',
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
  executingLine: {
    color: '#007AFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  quickCommands: {
    backgroundColor: '#2d2d2d',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  quickCommandsTitle: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quickCommandButton: {
    backgroundColor: '#404040',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 8,
  },
  quickCommandText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  // New styles for keyboard shortcuts and thinking display
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
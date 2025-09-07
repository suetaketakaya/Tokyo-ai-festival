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
  const scrollViewRef = useRef<ScrollView>(null);

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
    const success = await WebSocketService.connect(connectionUrl, {
      onOpen: () => {
        setIsConnected(true);
        addSystemMessage('Connected to RemoteClaude server');
      },
      onMessage: (message) => {
        handleServerMessage(message);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        addSystemMessage('Connection error occurred', 'error');
      },
      onClose: () => {
        setIsConnected(false);
        addSystemMessage('Disconnected from server', 'error');
      },
    });

    if (!success) {
      Alert.alert('Connection Failed', 'Could not connect to the RemoteClaude server.');
    }
  };

  const handleServerMessage = (message: any) => {
    console.log('🔥 DEVELOPMENT_FIXED_v1: Processing message:', message.type);
    console.log('🔥 DEVELOPMENT_FIXED_v1: Message data:', message.data);
    
    // Normalize message type to handle potential whitespace/newline issues
    const messageType = message.type ? message.type.toString().trim() : '';
    
    switch (messageType) {
      case 'claude_output':
        console.log('🔥 DEVELOPMENT_FIXED_v1: Successfully handling claude_output message');
        setIsExecuting(false);
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

      {/* Command Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.commandInput}
          value={command}
          onChangeText={setCommand}
          placeholder="Enter Claude command or shell command..."
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
});
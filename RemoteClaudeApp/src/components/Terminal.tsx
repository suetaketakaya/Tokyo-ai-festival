import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface TerminalOutput {
  id: string;
  text: string;
  type: 'input' | 'output' | 'error' | 'system';
  timestamp: Date;
}

interface TerminalProps {
  onCommandSubmit: (command: string) => void;
  isConnected: boolean;
  isExecuting: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({
  onCommandSubmit,
  isConnected,
  isExecuting,
}) => {
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Add welcome message when component mounts
    addOutput('RemoteClaude Terminal Ready', 'system');
    if (isConnected) {
      addOutput('Connected to RemoteClaude server', 'system');
    }
  }, []);

  useEffect(() => {
    // Update connection status
    if (isConnected) {
      addOutput('Connected to server', 'system');
    } else {
      addOutput('Disconnected from server', 'error');
    }
  }, [isConnected]);

  const addOutput = (text: string, type: TerminalOutput['type']) => {
    const newOutput: TerminalOutput = {
      id: Date.now().toString() + Math.random().toString(),
      text,
      type,
      timestamp: new Date(),
    };
    
    setOutput(prev => [...prev, newOutput]);
    
    // Auto scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCommandSubmit = () => {
    if (!currentCommand.trim() || !isConnected || isExecuting) {
      return;
    }

    const command = currentCommand.trim();
    
    // Add command to output
    addOutput(`$ ${command}`, 'input');
    
    // Add to history
    if (command !== commandHistory[commandHistory.length - 1]) {
      setCommandHistory(prev => [...prev, command]);
    }
    setHistoryIndex(-1);
    
    // Submit command
    onCommandSubmit(command);
    
    // Clear input
    setCurrentCommand('');
    Keyboard.dismiss();
  };

  const handleKeyPress = (key: string) => {
    if (key === 'Enter') {
      handleCommandSubmit();
    }
  };

  const navigateHistory = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;
    
    let newIndex: number;
    if (direction === 'up') {
      newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
    } else {
      newIndex = historyIndex === -1 ? -1 : Math.min(commandHistory.length - 1, historyIndex + 1);
    }
    
    setHistoryIndex(newIndex);
    setCurrentCommand(newIndex === -1 ? '' : commandHistory[newIndex]);
  };

  const clearTerminal = () => {
    setOutput([]);
    addOutput('Terminal cleared', 'system');
  };

  const getPromptPrefix = () => {
    if (!isConnected) return '[DISCONNECTED] $ ';
    if (isExecuting) return '[EXECUTING] $ ';
    return '$ ';
  };

  const getOutputStyle = (type: TerminalOutput['type']) => {
    switch (type) {
      case 'input':
        return styles.inputText;
      case 'error':
        return styles.errorText;
      case 'system':
        return styles.systemText;
      default:
        return styles.outputText;
    }
  };

  // Method to add output from parent component
  React.useImperativeHandle(ref, () => ({
    addOutput: (text: string, type: TerminalOutput['type'] = 'output') => {
      addOutput(text, type);
    },
  }));

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>RemoteClaude Terminal</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearTerminal}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.outputContainer}
        showsVerticalScrollIndicator={false}
      >
        {output.map((item) => (
          <View key={item.id} style={styles.outputLine}>
            <Text style={getOutputStyle(item.type)}>
              {item.text}
            </Text>
          </View>
        ))}
        
        {isExecuting && (
          <View style={styles.executingIndicator}>
            <Text style={styles.executingText}>Executing...</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.inputContainer}>
        <Text style={styles.prompt}>{getPromptPrefix()}</Text>
        <TextInput
          ref={textInputRef}
          style={styles.input}
          value={currentCommand}
          onChangeText={setCurrentCommand}
          onSubmitEditing={handleCommandSubmit}
          placeholder="Enter Claude command..."
          placeholderTextColor="#9aa0a6"
          returnKeyType="send"
          editable={isConnected && !isExecuting}
          multiline={false}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!isConnected || isExecuting) && styles.sendButtonDisabled]}
          onPress={handleCommandSubmit}
          disabled={!isConnected || isExecuting}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.quickCommands}>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => setCurrentCommand('claude -p "Create a simple React component"')}
          disabled={!isConnected || isExecuting}
        >
          <Text style={styles.quickButtonText}>Quick: React Component</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => onCommandSubmit('git status')}
          disabled={!isConnected || isExecuting}
        >
          <Text style={styles.quickButtonText}>Git Status</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  headerText: {
    color: '#e0e0e0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#404040',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  outputContainer: {
    flex: 1,
    padding: 15,
  },
  outputLine: {
    marginBottom: 2,
  },
  inputText: {
    color: '#1a73e8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  outputText: {
    color: '#e0e0e0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  errorText: {
    color: '#ff6b6b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  systemText: {
    color: '#34a853',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontStyle: 'italic',
  },
  executingIndicator: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 6,
    marginTop: 10,
  },
  executingText: {
    color: '#ffa500',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  prompt: {
    color: '#34a853',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    color: '#e0e0e0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    marginLeft: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#404040',
    borderRadius: 6,
  },
  sendButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 6,
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickCommands: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
    gap: 10,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#404040',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  quickButtonText: {
    color: '#9aa0a6',
    fontSize: 12,
    textAlign: 'center',
  },
});
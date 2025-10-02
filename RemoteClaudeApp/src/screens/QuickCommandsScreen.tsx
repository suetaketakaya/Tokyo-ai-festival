import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';
import { DynamicCommandGenerator } from '../services/DynamicCommandGenerator';

interface Command {
  id: string;
  name: string;
  command: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  isFavorite?: boolean;
  lastUsed?: Date;
  usageCount?: number;
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

const QuickCommandsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { serverUrl, projectId } = route.params;
  const [commands, setCommands] = useState<Command[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'recent' | 'frequent'>('category');
  const [quickExecuteMode, setQuickExecuteMode] = useState(false);
  const [dynamicCommands, setDynamicCommands] = useState<Command[]>([]);
  const [inputText, setInputText] = useState('');
  const [showDynamicMode, setShowDynamicMode] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: `Quick Commands - ${projectId}`,
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: showDynamicMode ? '#FF9800' : '#666' }]}
            onPress={() => setShowDynamicMode(!showDynamicMode)}
          >
            <Text style={styles.headerButtonText}>🇯🇵</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: quickExecuteMode ? '#4CAF50' : '#666' }]}
            onPress={() => setQuickExecuteMode(!quickExecuteMode)}
          >
            <Text style={styles.headerButtonText}>⚡</Text>
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
  }, [navigation, projectId, isConnected, quickExecuteMode, showDynamicMode]);

  useEffect(() => {
    initializeCommands();
    connectToServer();

    return () => {
      EnhancedWebSocketService.unregisterScreenCallbacks('quickcommands');
    };
  }, []);

  const connectToServer = async () => {
    // serverUrl already includes /ws and key parameter
    const connectionUrl = serverUrl;

    const success = await EnhancedWebSocketService.connect(connectionUrl, {
      onOpen: () => {
        setIsConnected(true);
      },
      onMessage: handleServerMessage,
      onError: (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      },
      onClose: (event) => {
        setIsConnected(false);
      },
    }, 'quickcommands');

    if (!success) {
      Alert.alert('Connection Failed', 'Could not connect to the server.');
    }
  };

  const handleServerMessage = (message: any) => {
    const messageType = message.type ? message.type.toString().trim() : '';

    switch (messageType) {
      case 'claude_output':
        setIsExecuting(false);
        Alert.alert('Command Completed', 'Command executed successfully!');
        break;

      case 'claude_error':
        setIsExecuting(false);
        Alert.alert('Command Failed', message.data?.error || 'Unknown error occurred');
        break;

      case 'pong':
        break;

      default:
        break;
    }
  };

  const initializeCommands = () => {
    const defaultCommands: Command[] = [
      // File Operations
      {
        id: '1',
        name: 'List Files',
        command: 'ls -la',
        description: 'List all files and directories with details',
        category: 'File Operations',
        color: '#4CAF50',
        usageCount: 0,
      },
      {
        id: '2',
        name: 'Current Directory',
        command: 'pwd',
        description: 'Show current working directory',
        category: 'File Operations',
        color: '#2196F3',
        usageCount: 0,
      },
      {
        id: '3',
        name: 'File Search',
        command: 'find . -name "*.py" -type f',
        description: 'Find Python files in current directory',
        category: 'File Operations',
                color: '#FF9800',
        usageCount: 0,
      },

      // Git Commands
      {
        id: '4',
        name: 'Git Status',
        command: 'git status',
        description: 'Show git repository status',
        category: 'Git',
                color: '#FF9800',
        usageCount: 0,
      },
      {
        id: '5',
        name: 'Git Log',
        command: 'git log --oneline -10',
        description: 'Show recent git commits',
        category: 'Git',
                color: '#9C27B0',
        usageCount: 0,
      },
      {
        id: '6',
        name: 'Git Branch',
        command: 'git branch -a',
        description: 'List all git branches',
        category: 'Git',
                color: '#795548',
        usageCount: 0,
      },

      // System Info
      {
        id: '7',
        name: 'Disk Usage',
        command: 'df -h',
        description: 'Show disk space usage',
        category: 'System',
                color: '#F44336',
        usageCount: 0,
      },
      {
        id: '8',
        name: 'Memory Usage',
        command: 'free -h',
        description: 'Show memory usage',
        category: 'System',
                color: '#E91E63',
        usageCount: 0,
      },
      {
        id: '9',
        name: 'Process List',
        command: 'ps aux | head -20',
        description: 'Show running processes',
        category: 'System',
                color: '#607D8B',
        usageCount: 0,
      },

      // Development
      {
        id: '10',
        name: 'Python Version',
        command: 'python3.11 --version',
        description: 'Check Python version',
        category: 'Development',
                color: '#3F51B5',
        usageCount: 0,
      },
      {
        id: '11',
        name: 'Node Version',
        command: 'node --version',
        description: 'Check Node.js version',
        category: 'Development',
                color: '#4CAF50',
        usageCount: 0,
      },
      {
        id: '12',
        name: 'NPM List',
        command: 'npm list --depth=0',
        description: 'List installed npm packages',
        category: 'Development',
                color: '#FF5722',
        usageCount: 0,
      },

      // Docker
      {
        id: '13',
        name: 'Docker Containers',
        command: 'docker ps',
        description: 'List running Docker containers',
        category: 'Docker',
                color: '#2196F3',
        usageCount: 0,
      },
      {
        id: '14',
        name: 'Docker Images',
        command: 'docker images',
        description: 'List Docker images',
        category: 'Docker',
                color: '#9C27B0',
        usageCount: 0,
      },

      // Network
      {
        id: '15',
        name: 'Network Info',
        command: 'ip addr show',
        description: 'Show network interface information',
        category: 'Network',
                color: '#00BCD4',
        usageCount: 0,
      },
      {
        id: '16',
        name: 'Port Check',
        command: 'netstat -tulpn | grep LISTEN',
        description: 'Show listening ports',
        category: 'Network',
                color: '#FFC107',
        usageCount: 0,
      },
    ];

    setCommands(defaultCommands);
  };

  // 🔥 Japanese Pattern Detection Integration
  const generateDynamicCommands = (inputText: string) => {
    if (!inputText || inputText.trim().length === 0) {
      setDynamicCommands([]);
      return;
    }

    try {
      console.log('🔄 日本語パターン検出開始:', inputText);
      const dynamicButtons = DynamicCommandGenerator.generateCommandsFromInput(inputText);

      // Convert DynamicCommandGenerator buttons to Command format
      const convertedCommands: Command[] = dynamicButtons.map((btn, index) => ({
        id: `dynamic_${Date.now()}_${index}`,
        name: btn.title || btn.name || `Command ${index + 1}`,
        command: btn.command || btn.action || '',
        description: btn.description || `Generated from: ${inputText.substring(0, 50)}...`,
        category: 'Dynamic',
        icon: btn.icon || '⚡',
        color: btn.color || '#4CAF50',
        usageCount: 0,
      }));

      console.log('✅ Flask専用ボタン生成完了:', convertedCommands.length, 'ボタン');
      console.log('📋 生成されたボタン:', convertedCommands.map(cmd => cmd.name));
      setDynamicCommands(convertedCommands);
    } catch (error) {
      console.error('❌ 日本語パターン検出エラー:', error);
      setDynamicCommands([]);
    }
  };

  const executeCommand = (command: Command) => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    if (quickExecuteMode) {
      // Execute immediately in quick mode
      performExecution(command);
    } else {
      // Show confirmation modal
      setSelectedCommand(command);
      setShowConfirmModal(true);
    }
  };

  const performExecution = (command: Command) => {
    setIsExecuting(true);

    // Update usage statistics
    setCommands(prev => prev.map(cmd =>
      cmd.id === command.id
        ? {
            ...cmd,
            usageCount: (cmd.usageCount || 0) + 1,
            lastUsed: new Date()
          }
        : cmd
    ));

    const success = EnhancedEnhancedWebSocketService.send({
      type: 'claude_execute',
      data: {
        project_id: projectId,
        command: command.command,
        context: {
          current_dir: '/workspace',
          git_branch: 'main'
        }
      }
    });

    if (!success) {
      setIsExecuting(false);
      Alert.alert('Error', 'Failed to send command');
    }
  };

  const toggleFavorite = (commandId: string) => {
    setCommands(prev => prev.map(cmd =>
      cmd.id === commandId ? { ...cmd, isFavorite: !cmd.isFavorite } : cmd
    ));
  };

  const getSortedCommands = () => {
    // Use dynamic commands when in dynamic mode, otherwise use default commands
    const activeCommands = showDynamicMode ? dynamicCommands : commands;

    let filteredCommands = activeCommands.filter(cmd =>
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'name':
        return filteredCommands.sort((a, b) => a.name.localeCompare(b.name));
      case 'category':
        return filteredCommands.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return a.category.localeCompare(b.category);
        });
      case 'recent':
        return filteredCommands.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          const aTime = a.lastUsed ? a.lastUsed.getTime() : 0;
          const bTime = b.lastUsed ? b.lastUsed.getTime() : 0;
          return bTime - aTime;
        });
      case 'frequent':
        return filteredCommands.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return (b.usageCount || 0) - (a.usageCount || 0);
        });
      default:
        return filteredCommands;
    }
  };

  const renderCommandCard = ({ item }: { item: Command }) => (
    <TouchableOpacity
      style={[styles.commandCard, { borderLeftColor: item.color }]}
      onPress={() => executeCommand(item)}
      onLongPress={() => toggleFavorite(item.id)}
      disabled={isExecuting}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.commandName}>{item.name}</Text>
          {item.isFavorite && (
            <Text style={styles.favoriteIcon}>⭐</Text>
          )}
        </View>
        <View style={styles.usageInfo}>
          {item.usageCount ? (
            <Text style={styles.usageCount}>×{item.usageCount}</Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.commandDescription}>{item.description}</Text>
      <Text style={styles.commandText}>{item.command}</Text>

      <View style={styles.cardFooter}>
        <Text style={[styles.categoryTag, { backgroundColor: item.color }]}>
          {item.category}
        </Text>
        {item.lastUsed && (
          <Text style={styles.lastUsed}>
            {item.lastUsed.toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSortButtons = () => (
    <View style={styles.sortContainer}>
      {[
        { key: 'category', label: 'Category' },
        { key: 'name', label: 'Name' },
        { key: 'recent', label: 'Recent' },
        { key: 'frequent', label: 'Popular' },
      ].map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.sortButton,
            sortBy === option.key && styles.sortButtonActive
          ]}
          onPress={() => setSortBy(option.key as any)}
        >
          <Text style={[
            styles.sortText,
            sortBy === option.key && styles.sortTextActive
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search commands..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {showDynamicMode && (
        <View style={styles.dynamicModeContainer}>
          <View style={styles.japaneseInputContainer}>
            <TextInput
              style={styles.japaneseInput}
              placeholder="シンプルなFlaskアプリケーションを作成してください..."
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
              multiline={true}
              numberOfLines={3}
            />
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => generateDynamicCommands(inputText)}
              disabled={!inputText.trim()}
            >
              <Text style={styles.generateButtonText}>🚀 生成</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.dynamicModeHint}>
            日本語で要求を入力すると、適切なコマンドが自動生成されます
          </Text>
        </View>
      )}

      {renderSortButtons()}

      {quickExecuteMode && (
        <View style={styles.quickModeNotice}>
          <Text style={styles.quickModeText}>⚡ Quick Execute Mode: Commands run immediately</Text>
        </View>
      )}

      <FlatList
        data={getSortedCommands()}
        renderItem={renderCommandCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showConfirmModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Execute Command</Text>
          </View>

          {selectedCommand && (
            <View style={styles.modalContent}>
              <View style={styles.commandPreview}>
                <Text style={styles.previewName}>{selectedCommand.name}</Text>
                <Text style={styles.previewDescription}>{selectedCommand.description}</Text>
                <View style={styles.commandCodeContainer}>
                  <Text style={styles.commandCode}>{selectedCommand.command}</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowConfirmModal(false);
                    setSelectedCommand(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.executeButtonModal]}
                  onPress={() => {
                    setShowConfirmModal(false);
                    if (selectedCommand) {
                      performExecution(selectedCommand);
                    }
                    setSelectedCommand(null);
                  }}
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.executeButtonText}>Execute</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  searchContainer: {
    padding: 15,
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  sortButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#4CAF50',
  },
  sortText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  sortTextActive: {
    color: '#fff',
  },
  quickModeNotice: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 6,
  },
  quickModeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
  commandCard: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  favoriteIcon: {
    fontSize: 10,
    marginLeft: 3,
  },
  usageInfo: {
    alignItems: 'flex-end',
  },
  usageCount: {
    color: '#4CAF50',
    fontSize: 9,
    fontWeight: 'bold',
  },
  commandName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  commandDescription: {
    color: '#ccc',
    fontSize: 10,
    marginBottom: 6,
    lineHeight: 12,
  },
  commandText: {
    color: '#4CAF50',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#1a1a1a',
    padding: 4,
    borderRadius: 3,
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  lastUsed: {
    color: '#888',
    fontSize: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  commandPreview: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  previewName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewDescription: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  commandCodeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    width: '100%',
  },
  commandCode: {
    color: '#4CAF50',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  executeButtonModal: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 🔥 Dynamic Mode Styles
  dynamicModeContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  japaneseInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  japaneseInput: {
    flex: 1,
    backgroundColor: '#fff',
    color: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    maxHeight: 80,
  },
  generateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dynamicModeHint: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default QuickCommandsScreen;
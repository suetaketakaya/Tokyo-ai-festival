import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Switch,
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';

type QuickCommandsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'QuickCommands'
>;

type QuickCommandsScreenRouteProp = RouteProp<RootStackParamList, 'QuickCommands'>;

interface Props {
  navigation: QuickCommandsScreenNavigationProp;
  route: QuickCommandsScreenRouteProp;
}

interface QuickCommand {
  id: string;
  name: string;
  description: string;
  command: string;
  category: string;
  requires_confirmation?: boolean;
  frequency?: number; // Usage frequency for smart sorting
  lastUsed?: Date;
  isFavorite?: boolean;
}

interface CommandExecutionState {
  executingCommands: Set<string>;
  lastExecutionResults: Map<string, { success: boolean; output: string }>;
}

export default function QuickCommandsScreen({ navigation, route }: Props) {
  const [commands, setCommands] = useState<QuickCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [executionState, setExecutionState] = useState<CommandExecutionState>({
    executingCommands: new Set(),
    lastExecutionResults: new Map(),
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCommand, setConfirmCommand] = useState<QuickCommand | null>(null);
  const [sortBy, setSortBy] = useState<'category' | 'frequency' | 'recent'>('category');
  const [quickExecuteMode, setQuickExecuteMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { projectId, projectName, connectionUrl, sessionKey } = route.params;

  useEffect(() => {
    navigation.setOptions({
      title: `⚡ Quick Commands - ${projectName}`,
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Configuration', { connectionUrl, sessionKey })}
        >
          <Text style={styles.headerButtonText}>⚙️</Text>
        </TouchableOpacity>
      ),
    });

    loadQuickCommands();
    setupMessageHandlers();

    return () => {
      EnhancedWebSocketService.updateCallbacks({
        onMessage: () => {},
      });
    };
  }, []);

  const setupMessageHandlers = () => {
    EnhancedWebSocketService.updateCallbacks({
      onMessage: (message) => {
        handleServerMessage(message);
      },
    });
  };

  const handleServerMessage = (message: any) => {
    console.log('📨 Quick Commands received message:', message.type);

    switch (message.type) {
      case 'config_quick_commands_response':
        const responseData = message.data || message;
        const status = responseData.status;
        const commands = responseData.commands;

        if (status === 'success' && commands) {
          // Add usage frequency data (mock for now)
          const enhancedCommands = commands.map((cmd: QuickCommand, index: number) => ({
            ...cmd,
            frequency: Math.floor(Math.random() * 100), // Mock frequency
            lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within last week
            isFavorite: index % 5 === 0, // Every 5th command is favorite
          }));
          setCommands(enhancedCommands);
          console.log('✅ QuickCommands loaded successfully:', enhancedCommands.length, 'commands');
        } else {
          console.log('❌ Failed to load QuickCommands:', status);
        }
        setIsLoading(false);
        break;

      case 'quick_command_confirmation':
        const confirmData = message.data || message;
        setConfirmCommand(confirmData.command);
        setShowConfirmModal(true);
        break;

      case 'quick_command_started':
        const startData = message.data || message;
        setExecutionState(prev => ({
          ...prev,
          executingCommands: new Set([...prev.executingCommands, startData.command_id]),
        }));
        break;

      case 'quick_command_response':
        const responseResult = message.data || message;
        setExecutionState(prev => {
          const newExecutingCommands = new Set(prev.executingCommands);
          newExecutingCommands.delete(responseResult.command_id);

          const newResults = new Map(prev.lastExecutionResults);
          newResults.set(responseResult.command_id, {
            success: responseResult.status === 'success',
            output: responseResult.output || '',
          });

          return {
            executingCommands: newExecutingCommands,
            lastExecutionResults: newResults,
          };
        });

        if (responseResult.status === 'success') {
          // Update command frequency
          updateCommandFrequency(responseResult.command_id);

          if (!quickExecuteMode) {
            Alert.alert(
              '✅ 実行完了',
              `コマンド「${responseResult.command_name}」が正常に実行されました！`,
              [
                { text: 'OK' },
                { text: '出力を表示', onPress: () => Alert.alert('実行結果', responseResult.output || '出力なし') }
              ]
            );
          }
        }
        break;

      case 'quick_command_error':
        const errorResult = message.data || message;
        setExecutionState(prev => {
          const newExecutingCommands = new Set(prev.executingCommands);
          newExecutingCommands.delete(errorResult.command_id);

          const newResults = new Map(prev.lastExecutionResults);
          newResults.set(errorResult.command_id, {
            success: false,
            output: errorResult.error || '',
          });

          return {
            executingCommands: newExecutingCommands,
            lastExecutionResults: newResults,
          };
        });

        Alert.alert(
          '❌ 実行エラー',
          `コマンドの実行に失敗しました：\n${errorResult.error}`,
          [
            { text: 'OK' },
            { text: '詳細を表示', onPress: () => Alert.alert('エラー詳細', errorResult.output || 'エラー出力なし') }
          ]
        );
        break;
    }
  };

  const loadQuickCommands = async () => {
    if (!EnhancedWebSocketService.isConnected()) {
      Alert.alert('接続エラー', 'サーバーに接続されていません。', [
        { text: '戻る', onPress: () => navigation.goBack() },
        { text: 'リトライ', onPress: loadQuickCommands }
      ]);
      return;
    }

    try {
      EnhancedEnhancedWebSocketService.send({
        type: 'config_quick_commands',
        data: {
          action: 'get_defaults',
        },
      });
    } catch (error) {
      console.error('Failed to load quick commands:', error);
      setIsLoading(false);
    }
  };

  const executeQuickCommand = async (command: QuickCommand) => {
    if (!EnhancedWebSocketService.isConnected()) {
      Alert.alert('接続エラー', 'サーバーに接続されていません。', [
        { text: '戻る', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    // Skip confirmation if quick execute mode is enabled or command doesn't require confirmation
    if (quickExecuteMode || !command.requires_confirmation) {
      performExecution(command);
    } else {
      setConfirmCommand(command);
      setShowConfirmModal(true);
    }
  };

  const performExecution = async (command: QuickCommand) => {
    try {
      EnhancedEnhancedWebSocketService.send({
        type: 'quick_command_execute',
        data: {
          project_id: projectId,
          command_id: command.id,
        },
      });
    } catch (error) {
      console.error('Failed to execute quick command:', error);
      Alert.alert('Error', 'Failed to execute command');
    }
  };

  const updateCommandFrequency = (commandId: string) => {
    setCommands(prev => prev.map(cmd =>
      cmd.id === commandId
        ? { ...cmd, frequency: (cmd.frequency || 0) + 1, lastUsed: new Date() }
        : cmd
    ));
  };

  const toggleFavorite = (commandId: string) => {
    setCommands(prev => prev.map(cmd =>
      cmd.id === commandId
        ? { ...cmd, isFavorite: !cmd.isFavorite }
        : cmd
    ));
  };

  const confirmAndExecute = () => {
    if (confirmCommand) {
      setShowConfirmModal(false);
      performExecution(confirmCommand);
      setConfirmCommand(null);
    }
  };

  const getSortedCommands = () => {
    let sorted = [...commands];

    // Filter by category first
    if (selectedCategory !== 'all') {
      sorted = sorted.filter(cmd => cmd.category === selectedCategory);
    }

    // Then sort
    switch (sortBy) {
      case 'frequency':
        sorted.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const aTime = a.lastUsed ? a.lastUsed.getTime() : 0;
          const bTime = b.lastUsed ? b.lastUsed.getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'category':
      default:
        sorted.sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        });
        break;
    }

    // Favorites first
    sorted.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

    return sorted;
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(commands.map(cmd => cmd.category))];
    return ['all', ...categories.sort()];
  };

  const getCommandIcon = (category: string) => {
    switch (category) {
      case 'git': return '📝';
      case 'deployment': return '🚀';
      case 'package_management': return '📦';
      case 'system': return '⚙️';
      case 'file': return '📁';
      case 'network': return '🌐';
      default: return '⚡';
    }
  };

  const getExecutionStatus = (command: QuickCommand) => {
    const isExecuting = executionState.executingCommands.has(command.id);
    const lastResult = executionState.lastExecutionResults.get(command.id);

    if (isExecuting) {
      return { status: 'executing', icon: '⏳', color: '#ffd93d' };
    } else if (lastResult) {
      return {
        status: lastResult.success ? 'success' : 'error',
        icon: lastResult.success ? '✅' : '❌',
        color: lastResult.success ? '#28a745' : '#dc3545'
      };
    }
    return { status: 'idle', icon: '', color: 'transparent' };
  };

  const renderCommandCard = ({ item: command }: { item: QuickCommand }) => {
    const executionStatus = getExecutionStatus(command);
    const isExecuting = executionStatus.status === 'executing';

    return (
      <TouchableOpacity
        style={[
          styles.commandCard,
          command.isFavorite && styles.favoriteCard,
          isExecuting && styles.executingCard,
        ]}
        onPress={() => executeQuickCommand(command)}
        disabled={isExecuting}
        delayLongPress={500}
        onLongPress={() => toggleFavorite(command.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>{getCommandIcon(command.category)}</Text>
            {command.isFavorite && (
              <Text style={styles.favoriteIndicator}>⭐</Text>
            )}
          </View>
          <View style={styles.statusContainer}>
            {executionStatus.icon && (
              <Text style={[styles.statusIcon, { color: executionStatus.color }]}>
                {executionStatus.icon}
              </Text>
            )}
            {command.requires_confirmation && (
              <Text style={styles.warningIcon}>⚠️</Text>
            )}
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {command.name}
        </Text>

        <Text style={styles.cardDescription} numberOfLines={3}>
          {command.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardCategory}>
            {command.category.replace('_', ' ').toUpperCase()}
          </Text>
          {command.frequency && command.frequency > 0 && (
            <Text style={styles.cardFrequency}>
              Used {command.frequency}x
            </Text>
          )}
        </View>

        <Text style={styles.cardCommand} numberOfLines={2}>
          {isExecuting ? 'Executing...' : command.command}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading Quick Commands...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sortedCommands = getSortedCommands();
  const categories = getUniqueCategories();

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header Controls */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategoryButton
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category && styles.selectedCategoryButtonText
              ]}>
                {category === 'all' ? '🔍 All' : `${getCommandIcon(category)} ${category.replace('_', ' ')}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.settingsRow}>
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => {
                const nextSort = {
                  'category': 'frequency',
                  'frequency': 'recent',
                  'recent': 'category'
                };
                setSortBy(nextSort[sortBy] as typeof sortBy);
              }}
            >
              <Text style={styles.sortButtonText}>
                {sortBy === 'category' && '📂 Category'}
                {sortBy === 'frequency' && '🔥 Popular'}
                {sortBy === 'recent' && '🕐 Recent'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickModeContainer}>
            <Text style={styles.quickModeLabel}>Quick Execute:</Text>
            <Switch
              value={quickExecuteMode}
              onValueChange={setQuickExecuteMode}
              thumbColor={quickExecuteMode ? '#3b82f6' : '#f4f3f4'}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
            />
          </View>
        </View>
      </View>

      {/* Commands Grid */}
      <FlatList
        data={sortedCommands}
        renderItem={renderCommandCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>📋 コマンドが見つかりません</Text>
            <Text style={styles.emptyText}>
              {selectedCategory === 'all'
                ? 'サーバーからクイックコマンドを取得できませんでした。'
                : `${selectedCategory} カテゴリにコマンドがありません。`
              }
            </Text>
            <TouchableOpacity
              style={styles.reloadButton}
              onPress={loadQuickCommands}
            >
              <Text style={styles.reloadButtonText}>🔄 再読み込み</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Helper Text */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          💡 Long press to favorite • Quick mode skips confirmations
        </Text>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Confirm Action</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to execute:
            </Text>
            <Text style={styles.modalCommand}>
              {confirmCommand?.name}
            </Text>
            <Text style={styles.modalDescription}>
              {confirmCommand?.description}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmAndExecute}
              >
                <Text style={styles.confirmButtonText}>Execute</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerButton: {
    marginRight: 15,
    padding: 8,
  },
  headerButtonText: {
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryFilter: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedCategoryButton: {
    backgroundColor: '#3b82f6',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  selectedCategoryButtonText: {
    color: '#fff',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  sortButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  quickModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickModeLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  gridContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  commandCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  favoriteCard: {
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  executingCard: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 24,
  },
  favoriteIndicator: {
    fontSize: 12,
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 14,
    marginLeft: 4,
  },
  warningIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 20,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardFrequency: {
    fontSize: 10,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  cardCommand: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 6,
    lineHeight: 14,
  },
  helpContainer: {
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  reloadButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalCommand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
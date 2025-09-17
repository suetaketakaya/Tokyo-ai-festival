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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';
import WebSocketService from '../services/WebSocketService';

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
}

export default function QuickCommandsScreen({ navigation, route }: Props) {
  const [commands, setCommands] = useState<QuickCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [executingCommand, setExecutingCommand] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCommand, setConfirmCommand] = useState<QuickCommand | null>(null);

  const { projectId, projectName, connectionUrl, sessionKey } = route.params;

  useEffect(() => {
    navigation.setOptions({
      title: `⚡ Quick Commands - ${projectName}`,
    });

    loadQuickCommands();
    setupMessageHandlers();

    // Cleanup function to prevent memory leaks
    return () => {
      WebSocketService.updateCallbacks({
        onMessage: () => {}, // Clear callbacks
      });
    };
  }, []);

  const setupMessageHandlers = () => {
    WebSocketService.updateCallbacks({
      onMessage: (message) => {
        handleServerMessage(message);
      },
    });
  };

  const handleServerMessage = (message: any) => {
    console.log('📨 Quick Commands received message:', message.type);

    switch (message.type) {
      case 'config_quick_commands_response':
        if (message.status === 'success' && message.commands) {
          setCommands(message.commands);
        }
        setIsLoading(false);
        break;

      case 'quick_command_confirmation':
        setConfirmCommand(message.command);
        setShowConfirmModal(true);
        break;

      case 'quick_command_started':
        setExecutingCommand(message.command_id);
        break;

      case 'quick_command_response':
        setExecutingCommand(null);
        if (message.status === 'success') {
          Alert.alert(
            '✅ 実行完了',
            `コマンド「${message.command_name}」が正常に実行されました！`,
            [
              { text: 'OK' },
              { text: '出力を表示', onPress: () => Alert.alert('実行結果', message.output || '出力なし') }
            ]
          );
        }
        break;

      case 'quick_command_error':
        setExecutingCommand(null);
        Alert.alert(
          '❌ 実行エラー',
          `コマンドの実行に失敗しました：\n${message.error}`,
          [
            { text: 'OK' },
            { text: '詳細を表示', onPress: () => Alert.alert('エラー詳細', message.output || 'エラー出力なし') }
          ]
        );
        break;
    }
  };

  const loadQuickCommands = async () => {
    if (!WebSocketService.isConnected()) {
      Alert.alert('接続エラー', 'サーバーに接続されていません。', [
        { text: '戻る', onPress: () => navigation.goBack() },
        { text: 'リトライ', onPress: loadQuickCommands }
      ]);
      return;
    }

    try {
      WebSocketService.send({
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
    if (!WebSocketService.isConnected()) {
      Alert.alert('接続エラー', 'サーバーに接続されていません。', [
        { text: '戻る', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    try {
      WebSocketService.send({
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

  const confirmAndExecute = () => {
    if (confirmCommand) {
      setShowConfirmModal(false);
      executeQuickCommand(confirmCommand);
      setConfirmCommand(null);
    }
  };

  const getCommandIcon = (category: string) => {
    switch (category) {
      case 'git':
        return '📝';
      case 'deployment':
        return '🚀';
      case 'package_management':
        return '📦';
      case 'system':
        return '⚙️';
      default:
        return '⚡';
    }
  };

  const getCommandButtonStyle = (category: string, isExecuting: boolean) => {
    let baseStyle = [styles.commandButton];

    if (isExecuting) {
      baseStyle.push(styles.executingButton);
      return baseStyle;
    }

    switch (category) {
      case 'git':
        baseStyle.push(styles.gitButton);
        break;
      case 'deployment':
        baseStyle.push(styles.deploymentButton);
        break;
      case 'package_management':
        baseStyle.push(styles.packageButton);
        break;
      default:
        baseStyle.push(styles.defaultButton);
    }

    return baseStyle;
  };

  const groupedCommands = commands.reduce((groups, command) => {
    const category = command.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, QuickCommand[]>);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚡ Quick Commands</Text>
          <Text style={styles.headerSubtitle}>
            Execute common tasks with one tap
          </Text>
        </View>

        {Object.keys(groupedCommands).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>📋 コマンドが見つかりません</Text>
            <Text style={styles.emptyText}>
              サーバーからクイックコマンドを取得できませんでした。
              ネットワーク接続を確認するか、設定画面からコマンドを設定してください。
            </Text>
            <TouchableOpacity
              style={styles.reloadButton}
              onPress={loadQuickCommands}
            >
              <Text style={styles.reloadButtonText}>🔄 再読み込み</Text>
            </TouchableOpacity>
          </View>
        ) : Object.entries(groupedCommands).map(([category, categoryCommands]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {getCommandIcon(category)} {category.replace('_', ' ').toUpperCase()}
            </Text>

            {categoryCommands.map((command) => {
              const isExecuting = executingCommand === command.id;

              return (
                <TouchableOpacity
                  key={command.id}
                  style={getCommandButtonStyle(command.category, isExecuting)}
                  onPress={() => executeQuickCommand(command)}
                  disabled={isExecuting || executingCommand !== null}
                >
                  <View style={styles.commandContent}>
                    <View style={styles.commandHeader}>
                      <Text style={styles.commandName}>
                        {isExecuting ? '⏳' : getCommandIcon(command.category)} {command.name}
                      </Text>
                      {command.requires_confirmation && (
                        <Text style={styles.confirmationBadge}>⚠️</Text>
                      )}
                    </View>
                    <Text style={styles.commandDescription}>
                      {command.description}
                    </Text>
                    <Text style={styles.commandCode}>
                      {isExecuting ? 'Executing...' : command.command}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.configButton}
            onPress={() => navigation.navigate('Configuration', {
              connectionUrl,
              sessionKey,
            })}
          >
            <Text style={styles.configButtonText}>⚙️ Configure Commands</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  commandButton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  defaultButton: {
    backgroundColor: '#ffffff',
  },
  gitButton: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  deploymentButton: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  packageButton: {
    backgroundColor: '#fefce8',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  executingButton: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  commandContent: {
    flex: 1,
  },
  commandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  confirmationBadge: {
    fontSize: 12,
    color: '#f59e0b',
  },
  commandDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  commandCode: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 6,
  },
  footer: {
    marginTop: 24,
    marginBottom: 32,
  },
  configButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  configButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
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
});
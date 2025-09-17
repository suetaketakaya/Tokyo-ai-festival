import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';
import WebSocketService from '../services/WebSocketService';

type ConfigurationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Configuration'
>;

type ConfigurationScreenRouteProp = RouteProp<RootStackParamList, 'Configuration'>;

interface Props {
  navigation: ConfigurationScreenNavigationProp;
  route: ConfigurationScreenRouteProp;
}

interface UserConfiguration {
  id?: string;
  user_id: string;
  name: string;
  email: string;
  git: {
    username: string;
    email: string;
    default_repo?: string;
  };
  services: {
    firebase?: {
      project_id: string;
      hosting_site?: string;
    };
    aws?: {
      region: string;
      s3_bucket?: string;
    };
  };
  preferences: {
    default_language: string;
    auto_commit: boolean;
    auto_push: boolean;
    terminal_theme: string;
  };
}

export default function ConfigurationScreen({ navigation, route }: Props) {
  const [config, setConfig] = useState<UserConfiguration>({
    user_id: 'default',
    name: '',
    email: '',
    git: {
      username: '',
      email: '',
    },
    services: {},
    preferences: {
      default_language: 'en',
      auto_commit: false,
      auto_push: false,
      terminal_theme: 'default',
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingSyncAction, setPendingSyncAction] = useState<() => void>(() => {});

  useEffect(() => {
    navigation.setOptions({
      title: '⚙️ Configuration',
    });

    loadConfiguration();

    // Cleanup function to prevent memory leaks
    return () => {
      WebSocketService.updateCallbacks({
        onMessage: () => {}, // Clear callbacks
      });
    };
  }, []);

  const loadConfiguration = async () => {
    if (!WebSocketService.isConnected()) {
      Alert.alert('接続エラー', 'サーバーに接続されていません。サーバーリストから接続を確認してください。', [
        { text: 'サーバーリストへ', onPress: () => navigation.goBack() },
        { text: 'リトライ', onPress: loadConfiguration }
      ]);
      return;
    }

    try {
      // Send config load request
      WebSocketService.send({
        type: 'config_load',
        data: {
          user_id: 'default',
        },
      });

      // Set up message handler
      WebSocketService.updateCallbacks({
        onMessage: (message) => {
          try {
            console.log('📥 Config load message received:', message.type, message.status);

            if (message.type === 'config_load_response') {
              const responseData = message.data || message;
              const config = responseData.config;

              console.log('📥 Load response data:', responseData);

              if (config) {
                setConfig(config);
                console.log('✅ Configuration loaded successfully');
              }
              setIsLoading(false);
            }
          } catch (error) {
            console.error('❌ Error in config load message handler:', error);
            setIsLoading(false);
            Alert.alert('読み込みエラー', '設定の読み込み中にエラーが発生しました');
          }
        },
      });
    } catch (error) {
      console.error('Failed to load configuration:', error);
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    // 入力検証
    if (!config.name.trim()) {
      Alert.alert('入力エラー', '名前を入力してください。');
      return;
    }
    if (!config.email.trim()) {
      Alert.alert('入力エラー', 'メールアドレスを入力してください。');
      return;
    }
    if (!config.git.username.trim()) {
      Alert.alert('入力エラー', 'Gitユーザー名を入力してください。');
      return;
    }

    if (!WebSocketService.isConnected()) {
      Alert.alert('接続エラー', 'サーバーに接続されていません。', [
        { text: 'サーバーリストへ', onPress: () => navigation.goBack() },
        { text: 'リトライ', onPress: saveConfiguration }
      ]);
      return;
    }

    setIsSaving(true);

    try {
      // Send config save request
      WebSocketService.send({
        type: 'config_save',
        data: config,
      });

      // Set up message handler
      WebSocketService.updateCallbacks({
        onMessage: (message) => {
          try {
            console.log('💾 Config save message received:', message.type, message.status);

            if (message.type === 'config_save_response') {
              setIsSaving(false);
              const responseData = message.data || message;
              const status = responseData.status;
              const errorMessage = responseData.error || responseData.message;

              console.log('💾 Response data:', responseData);

              if (status === 'success') {
                Alert.alert('保存完了', '設定が正常に保存されました！', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                  { text: '同期実行', onPress: syncConfiguration }
                ]);
              } else {
                Alert.alert('保存エラー', errorMessage || '設定の保存に失敗しました', [
                  { text: 'OK' },
                  { text: 'リトライ', onPress: saveConfiguration }
                ]);
              }
            }
          } catch (error) {
            console.error('❌ Error in config save message handler:', error);
            setIsSaving(false);
            Alert.alert('処理エラー', 'メッセージ処理中にエラーが発生しました');
          }
        },
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setIsSaving(false);
      Alert.alert('保存エラー', '設定の保存リクエストに失敗しました', [
        { text: 'OK' },
        { text: 'リトライ', onPress: saveConfiguration }
      ]);
    }
  };

  const requestPermissionAndSync = () => {
    Alert.alert(
      '🔐 管理者権限が必要',
      'Docker設定の変更には管理者権限が必要です。権限昇格を承認しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '🔓 権限を要求',
          onPress: () => {
            setShowPermissionModal(true);
            setPendingSyncAction(() => syncConfiguration);
          }
        }
      ]
    );
  };

  const executeWithPermission = async () => {
    if (!adminPassword.trim()) {
      Alert.alert('入力エラー', '管理者パスワードを入力してください。');
      return;
    }

    setShowPermissionModal(false);
    setAdminPassword('');

    // Execute the pending action with admin privileges
    if (pendingSyncAction) {
      pendingSyncAction();
    }
  };

  const syncConfiguration = async (useAdminPrivileges = false) => {
    if (!WebSocketService.isConnected()) {
      Alert.alert('接続エラー', 'サーバーに接続されていません。', [
        { text: 'サーバーリストへ', onPress: () => navigation.goBack() },
        { text: 'リトライ', onPress: syncConfiguration }
      ]);
      return;
    }

    setIsSyncing(true);

    try {
      // Set up message handler first
      WebSocketService.updateCallbacks({
        onMessage: (message) => {
          try {
            console.log('🔄 Sync message received:', message.type, message.status);

            if (message.type === 'config_sync_response') {
              setIsSyncing(false);
              const responseData = message.data || message;
              const status = responseData.status;
              const syncResults = responseData.sync_results;
              const errorMessage = responseData.error || responseData.message;

              console.log('🔄 Sync response data:', responseData);

              if (status === 'success') {
                const containerCount = syncResults?.length || 0;
                Alert.alert(
                  '✅ 同期完了',
                  `設定を ${containerCount} 個のコンテナに正常に同期しました！`,
                  [
                    { text: 'OK' },
                    { text: '詳細を表示', onPress: () => {
                      const details = syncResults?.map(r =>
                        `${r.project_name}: ${r.response?.status || 'unknown'}`
                      ).join('\n') || '詳細情報なし';
                      Alert.alert('同期詳細', details);
                    }}
                  ]
                );
              } else {
                Alert.alert('同期エラー', errorMessage || '設定の同期に失敗しました', [
                  { text: 'OK' },
                  { text: 'リトライ', onPress: syncConfiguration }
                ]);
              }
            }
          } catch (error) {
            console.error('❌ Error in config sync message handler:', error);
            setIsSyncing(false);
            Alert.alert('処理エラー', '同期メッセージ処理中にエラーが発生しました');
          }
        },
      });

      // Send config sync request
      WebSocketService.send({
        type: 'config_sync',
        data: {
          user_id: 'default',
          user_config: config,
          sync_type: 'update',
          admin_privileges: useAdminPrivileges,
          admin_password: useAdminPrivileges ? adminPassword : undefined,
        },
      });

      console.log('🔄 Sync request sent');
    } catch (error) {
      console.error('Failed to sync configuration:', error);
      setIsSyncing(false);
      Alert.alert('同期エラー', '設定の同期リクエストに失敗しました', [
        { text: 'OK' },
        { text: 'リトライ', onPress: syncConfiguration }
      ]);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>⚙️ 設定を読み込み中</Text>
          <Text style={styles.loadingText}>サーバーから最新の設定情報を取得しています...</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadConfiguration}
          >
            <Text style={styles.retryButtonText}>🔄 再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          {/* User Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 User Information</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={config.name}
              onChangeText={(text) => setConfig({...config, name: text})}
              placeholder="Your name"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={config.email}
              onChangeText={(text) => setConfig({...config, email: text})}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Git Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Git Configuration</Text>

            <Text style={styles.label}>Git Username</Text>
            <TextInput
              style={styles.input}
              value={config.git.username}
              onChangeText={(text) => setConfig({
                ...config,
                git: {...config.git, username: text}
              })}
              placeholder="git-username"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Git Email</Text>
            <TextInput
              style={styles.input}
              value={config.git.email}
              onChangeText={(text) => setConfig({
                ...config,
                git: {...config.git, email: text}
              })}
              placeholder="git.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Default Repository (Optional)</Text>
            <TextInput
              style={styles.input}
              value={config.git.default_repo || ''}
              onChangeText={(text) => setConfig({
                ...config,
                git: {...config.git, default_repo: text}
              })}
              placeholder="https://github.com/user/repo.git"
              autoCapitalize="none"
            />
          </View>

          {/* Cloud Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>☁️ Cloud Services</Text>

            <Text style={styles.label}>Firebase Project ID</Text>
            <TextInput
              style={styles.input}
              value={config.services.firebase?.project_id || ''}
              onChangeText={(text) => setConfig({
                ...config,
                services: {
                  ...config.services,
                  firebase: {
                    ...config.services.firebase,
                    project_id: text,
                  }
                }
              })}
              placeholder="my-firebase-project"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Firebase Hosting Site (Optional)</Text>
            <TextInput
              style={styles.input}
              value={config.services.firebase?.hosting_site || ''}
              onChangeText={(text) => setConfig({
                ...config,
                services: {
                  ...config.services,
                  firebase: {
                    ...config.services.firebase,
                    hosting_site: text,
                  }
                }
              })}
              placeholder="my-site"
              autoCapitalize="none"
            />
          </View>

          {/* Development Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Development Preferences</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Auto Commit Changes</Text>
              <Switch
                value={config.preferences.auto_commit}
                onValueChange={(value) => setConfig({
                  ...config,
                  preferences: {...config.preferences, auto_commit: value}
                })}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Auto Push to Remote</Text>
              <Switch
                value={config.preferences.auto_push}
                onValueChange={(value) => setConfig({
                  ...config,
                  preferences: {...config.preferences, auto_push: value}
                })}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={saveConfiguration}
              disabled={isSaving}
            >
              <Text style={styles.buttonText}>
                {isSaving ? '💾 Saving...' : '💾 Save Configuration'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.syncButton, isSyncing && styles.buttonDisabled]}
              onPress={requestPermissionAndSync}
              disabled={isSyncing}
            >
              <Text style={styles.buttonText}>
                {isSyncing ? '🔄 同期中...' : '🔐 管理者権限で同期'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Permission Request Modal */}
      <Modal
        visible={showPermissionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.permissionModalContent}>
            <Text style={styles.permissionModalTitle}>🔐 管理者認証</Text>
            <Text style={styles.permissionModalMessage}>
              Docker設定を変更するため、管理者パスワードを入力してください。
            </Text>

            <TextInput
              style={styles.passwordInput}
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="管理者パスワード"
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.permissionModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPermissionModal(false);
                  setAdminPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.executeButton]}
                onPress={executeWithPermission}
              >
                <Text style={styles.executeButtonText}>🔓 実行</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.permissionNotice}>
              ⚠️ この操作はDockerコンテナの設定を変更します。
            </Text>
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
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  syncButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
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
  permissionModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 300,
  },
  permissionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionModalMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginBottom: 20,
  },
  permissionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  executeButton: {
    backgroundColor: '#dc2626',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: 'bold',
  },
  executeButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  permissionNotice: {
    fontSize: 12,
    color: '#f59e0b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
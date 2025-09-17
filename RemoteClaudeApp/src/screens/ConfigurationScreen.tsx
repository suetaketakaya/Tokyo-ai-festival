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

  useEffect(() => {
    navigation.setOptions({
      title: '⚙️ Configuration',
    });

    loadConfiguration();
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
          if (message.type === 'config_load_response') {
            if (message.config) {
              setConfig(message.config);
            }
            setIsLoading(false);
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
          if (message.type === 'config_save_response') {
            setIsSaving(false);
            if (message.status === 'success') {
              Alert.alert('保存完了', '設定が正常に保存されました！', [
                { text: 'OK', onPress: () => navigation.goBack() },
                { text: '同期実行', onPress: syncConfiguration }
              ]);
            } else {
              Alert.alert('保存エラー', message.error || '設定の保存に失敗しました', [
                { text: 'OK' },
                { text: 'リトライ', onPress: saveConfiguration }
              ]);
            }
          }
        },
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const syncConfiguration = async () => {
    if (!WebSocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    try {
      // Send config sync request
      WebSocketService.send({
        type: 'config_sync',
        data: {
          user_id: 'default',
          user_config: config,
          sync_type: 'update',
        },
      });

      // Set up message handler
      WebSocketService.updateCallbacks({
        onMessage: (message) => {
          if (message.type === 'config_sync_response') {
            if (message.status === 'success') {
              Alert.alert(
                'Success',
                `Configuration synced to ${message.sync_results?.length || 0} containers`
              );
            } else {
              Alert.alert('Error', message.error || 'Failed to sync configuration');
            }
          }
        },
      });

      Alert.alert('Info', 'Syncing configuration to all containers...');
    } catch (error) {
      console.error('Failed to sync configuration:', error);
      Alert.alert('Error', 'Failed to sync configuration');
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
              style={[styles.button, styles.syncButton]}
              onPress={syncConfiguration}
            >
              <Text style={styles.buttonText}>🔄 Sync to All Containers</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
});
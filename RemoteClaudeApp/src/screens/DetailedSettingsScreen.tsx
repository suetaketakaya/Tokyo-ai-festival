import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import StorageService from '../services/StorageService';
import WebSocketService from '../services/WebSocketService';

interface GitConfig {
  username: string;
  email: string;
  defaultBranch: string;
  autoCommit: boolean;
  signCommits: boolean;
}

interface UserSettings {
  gitConfig: GitConfig;
  favoriteServers: any[];
  quickExecuteMode: boolean;
  showCommandDetails: boolean;
  autoSyncSettings: boolean;
  theme: 'light' | 'dark' | 'auto';
  terminalFont: 'default' | 'monospace';
  terminalFontSize: number;
}

interface Props {
  navigation: any;
}

const DetailedSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingWithServer, setSyncingWithServer] = useState(false);

  // Local Data Management
  const [customCommands, setCustomCommands] = useState<any[]>([]);
  const [serverHistory, setServerHistory] = useState<any[]>([]);
  const [commandUsageStats, setCommandUsageStats] = useState<any[]>([]);
  const [showLocalDataPanel, setShowLocalDataPanel] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await StorageService.getUserSettings();
      setSettings(userSettings);

      // Load local data
      const commands = await StorageService.getCustomCommands();
      const history = await StorageService.getServerHistory();
      const stats = await StorageService.getCommandUsageStats();

      setCustomCommands(commands);
      setServerHistory(history);
      setCommandUsageStats(stats);
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const success = await StorageService.saveUserSettings(settings);
      if (success) {
        Alert.alert('Success', 'Settings saved successfully');

        // Auto-sync with server if enabled
        if (settings.autoSyncSettings) {
          await syncWithServer();
        }
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const syncWithServer = async () => {
    if (!settings) return;

    setSyncingWithServer(true);
    try {
      const success = WebSocketService.send({
        type: 'config_sync',
        data: {
          user_id: 'default',
          user_config: {
            git_config: settings.gitConfig,
            quick_commands: await StorageService.getCustomCommands(),
            preferences: {
              quickExecuteMode: settings.quickExecuteMode,
              showCommandDetails: settings.showCommandDetails,
              theme: settings.theme,
              terminalFont: settings.terminalFont,
              terminalFontSize: settings.terminalFontSize,
            },
          },
          sync_type: 'update',
        },
      });

      if (success) {
        Alert.alert('Success', 'Settings synced with server');
      } else {
        Alert.alert('Error', 'Failed to sync with server');
      }
    } catch (error) {
      console.error('Failed to sync with server:', error);
      Alert.alert('Error', 'Failed to sync with server');
    } finally {
      setSyncingWithServer(false);
    }
  };

  const exportData = async () => {
    try {
      const exportData = await StorageService.exportData();
      console.log('エクスポートデータ:', exportData);
      Alert.alert(
        'データエクスポート',
        `データがエクスポートされました。\n\nカスタムコマンド: ${exportData.customCommands?.length || 0}個\nサーバー履歴: ${exportData.serverHistory?.length || 0}個\n使用統計: ${exportData.commandUsageStats?.length || 0}個`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('エラー', 'データのエクスポートに失敗しました');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      '全データクリア',
      'すべてのローカルデータを削除しますか？この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              await loadSettings();
              Alert.alert('完了', 'すべてのローカルデータが削除されました');
            } catch (error) {
              Alert.alert('エラー', 'データの削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const clearCommandUsageStats = async () => {
    try {
      await StorageService.clearCommandUsageStats();
      await loadSettings();
      Alert.alert('完了', 'コマンド使用統計をクリアしました');
    } catch (error) {
      Alert.alert('エラー', '統計のクリアに失敗しました');
    }
  };

  const updateGitConfig = (field: keyof GitConfig, value: string | boolean) => {
    if (!settings) return;

    setSettings({
      ...settings,
      gitConfig: {
        ...settings.gitConfig,
        [field]: value,
      },
    });
  };

  const updateSetting = (field: keyof UserSettings, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [field]: value,
    });
  };

  const exportSettings = async () => {
    try {
      const exportData = await StorageService.exportAllData();
      // In a real app, you'd use a share dialog or file picker
      Alert.alert(
        'Export Data',
        'Settings exported successfully. Copy the following JSON:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Copy to Clipboard',
            onPress: () => {
              // In a real app, you'd copy to clipboard
              console.log('Export data:', exportData);
              Alert.alert('Copied', 'Settings copied to console log');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export settings');
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load settings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Detailed Settings</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Git Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Git Configuration</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={settings.gitConfig.username}
              onChangeText={(value) => updateGitConfig('username', value)}
              placeholder="Your Git username"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={settings.gitConfig.email}
              onChangeText={(value) => updateGitConfig('email', value)}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Branch</Text>
            <TextInput
              style={styles.input}
              value={settings.gitConfig.defaultBranch}
              onChangeText={(value) => updateGitConfig('defaultBranch', value)}
              placeholder="main"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Auto Commit</Text>
              <Text style={styles.switchDescription}>
                Automatically commit changes after execution
              </Text>
            </View>
            <Switch
              value={settings.gitConfig.autoCommit}
              onValueChange={(value) => updateGitConfig('autoCommit', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.gitConfig.autoCommit ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Sign Commits</Text>
              <Text style={styles.switchDescription}>
                Use GPG to sign commits
              </Text>
            </View>
            <Switch
              value={settings.gitConfig.signCommits}
              onValueChange={(value) => updateGitConfig('signCommits', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.gitConfig.signCommits ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* UI Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UI Preferences</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Quick Execute Mode</Text>
              <Text style={styles.switchDescription}>
                Execute commands without confirmation
              </Text>
            </View>
            <Switch
              value={settings.quickExecuteMode}
              onValueChange={(value) => updateSetting('quickExecuteMode', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.quickExecuteMode ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Show Command Details</Text>
              <Text style={styles.switchDescription}>
                Show descriptions and categories
              </Text>
            </View>
            <Switch
              value={settings.showCommandDetails}
              onValueChange={(value) => updateSetting('showCommandDetails', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.showCommandDetails ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Theme</Text>
            <View style={styles.segmentedControl}>
              {['light', 'dark', 'auto'].map((theme) => (
                <TouchableOpacity
                  key={theme}
                  style={[
                    styles.segmentButton,
                    settings.theme === theme && styles.segmentButtonActive,
                  ]}
                  onPress={() => updateSetting('theme', theme)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      settings.theme === theme && styles.segmentTextActive,
                    ]}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Terminal Font Size</Text>
            <View style={styles.fontSizeControls}>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={() => updateSetting('terminalFontSize', Math.max(10, settings.terminalFontSize - 1))}
              >
                <Text style={styles.fontSizeButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.fontSizeValue}>{settings.terminalFontSize}px</Text>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={() => updateSetting('terminalFontSize', Math.min(24, settings.terminalFontSize + 1))}
              >
                <Text style={styles.fontSizeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Server Sync */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Synchronization</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Auto Sync Settings</Text>
              <Text style={styles.switchDescription}>
                Automatically sync with server on save
              </Text>
            </View>
            <Switch
              value={settings.autoSyncSettings}
              onValueChange={(value) => updateSetting('autoSyncSettings', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.autoSyncSettings ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={[styles.actionButton, syncingWithServer && styles.disabledButton]}
            onPress={syncWithServer}
            disabled={syncingWithServer}
          >
            {syncingWithServer ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Sync Now</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Local Data Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ローカルデータ管理</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowLocalDataPanel(!showLocalDataPanel)}
            >
              <Text style={styles.toggleButtonText}>
                {showLocalDataPanel ? '隠す' : '詳細表示'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Data Summary */}
          <View style={styles.dataSummary}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>カスタムコマンド</Text>
              <Text style={styles.dataValue}>{customCommands.length}個</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>サーバー履歴</Text>
              <Text style={styles.dataValue}>{serverHistory.length}個</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>使用統計</Text>
              <Text style={styles.dataValue}>{commandUsageStats.length}個</Text>
            </View>
          </View>

          {/* Detailed Data Panel */}
          {showLocalDataPanel && (
            <View style={styles.detailPanel}>
              <Text style={styles.detailTitle}>詳細情報</Text>

              {/* Custom Commands */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>カスタムコマンド</Text>
                {customCommands.length > 0 ? (
                  customCommands.slice(0, 3).map((cmd, index) => (
                    <View key={index} style={styles.detailItem}>
                      <Text style={styles.detailItemName}>{cmd.name}</Text>
                      <Text style={styles.detailItemDescription} numberOfLines={1}>
                        {cmd.description || 'No description'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>カスタムコマンドはありません</Text>
                )}
                {customCommands.length > 3 && (
                  <Text style={styles.moreText}>他 {customCommands.length - 3}個...</Text>
                )}
              </View>

              {/* Command Usage Stats */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>よく使用されるコマンド</Text>
                {commandUsageStats.length > 0 ? (
                  commandUsageStats
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)
                    .map((stat, index) => (
                      <View key={index} style={styles.detailItem}>
                        <Text style={styles.detailItemName}>{stat.command}</Text>
                        <Text style={styles.detailItemCount}>{stat.count}回使用</Text>
                      </View>
                    ))
                ) : (
                  <Text style={styles.emptyText}>使用統計はありません</Text>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <TouchableOpacity style={styles.actionButton} onPress={exportData}>
            <Text style={styles.actionButtonText}>📤 データをエクスポート</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={clearCommandUsageStats}>
            <Text style={styles.actionButtonText}>📊 使用統計をクリア</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Text style={styles.dangerButtonText}>🗑️ 全データを削除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  switchInfo: {
    flex: 1,
    marginRight: 15,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#007AFF',
  },
  segmentText: {
    fontSize: 16,
    color: '#333',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 15,
  },
  fontSizeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  fontSizeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Local Data Management Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  toggleButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  dataSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataItem: {
    alignItems: 'center',
    flex: 1,
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  dataValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailSection: {
    marginBottom: 15,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 4,
  },
  detailItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  detailItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  detailItemDescription: {
    fontSize: 12,
    color: '#666',
  },
  detailItemCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 15,
  },
  moreText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 5,
  },
});

export default DetailedSettingsScreen;
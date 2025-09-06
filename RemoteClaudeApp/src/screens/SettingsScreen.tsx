import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';

type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Settings'
>;

type SettingsScreenRouteProp = RouteProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
  route: SettingsScreenRouteProp;
}

interface Settings {
  claudeApiKey: string;
  gitUserName: string;
  gitUserEmail: string;
  defaultProjectType: string;
  enableClaudeIntegration: boolean;
  autoCommit: boolean;
  resourceLimits: {
    memory: string;
    cpus: string;
  };
}

const defaultSettings: Settings = {
  claudeApiKey: '',
  gitUserName: '',
  gitUserEmail: '',
  defaultProjectType: 'general',
  enableClaudeIntegration: true,
  autoCommit: false,
  resourceLimits: {
    memory: '2g',
    cpus: '1.0'
  }
};

export default function SettingsScreen({ navigation }: Props) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('remoteClaude_settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      await AsyncStorage.setItem('remoteClaude_settings', JSON.stringify(settings));
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings(defaultSettings);
            Alert.alert('Settings Reset', 'All settings have been reset to default values.');
          },
        },
      ]
    );
  };

  const testClaudeConnection = async () => {
    if (!settings.claudeApiKey.trim()) {
      Alert.alert('Error', 'Please enter your Claude API key first.');
      return;
    }

    Alert.alert(
      'Test Connection',
      'This feature will test the Claude API connection once implemented.',
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>RemoteClaude Settings</Text>
          <Text style={styles.subtitle}>Configure your development environment</Text>
        </View>

        {/* Claude Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 Claude Configuration</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Claude API Key</Text>
            <TextInput
              style={styles.textInput}
              value={settings.claudeApiKey}
              onChangeText={(text) => setSettings({...settings, claudeApiKey: text})}
              placeholder="sk-ant-api03-..."
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helpText}>
              Get your API key from https://console.anthropic.com/
            </Text>
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.label}>Enable Claude Integration</Text>
            <Switch
              value={settings.enableClaudeIntegration}
              onValueChange={(value) => 
                setSettings({...settings, enableClaudeIntegration: value})
              }
              trackColor={{ false: '#767577', true: '#007AFF' }}
              thumbColor={settings.enableClaudeIntegration ? '#fff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.testButton} onPress={testClaudeConnection}>
            <Text style={styles.testButtonText}>🔗 Test Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Git Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Git Configuration</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Git User Name</Text>
            <TextInput
              style={styles.textInput}
              value={settings.gitUserName}
              onChangeText={(text) => setSettings({...settings, gitUserName: text})}
              placeholder="Your Name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Git User Email</Text>
            <TextInput
              style={styles.textInput}
              value={settings.gitUserEmail}
              onChangeText={(text) => setSettings({...settings, gitUserEmail: text})}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.label}>Auto Commit Changes</Text>
            <Switch
              value={settings.autoCommit}
              onValueChange={(value) => 
                setSettings({...settings, autoCommit: value})
              }
              trackColor={{ false: '#767577', true: '#007AFF' }}
              thumbColor={settings.autoCommit ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Project Defaults */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Project Defaults</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Project Type</Text>
            <View style={styles.pickerContainer}>
              {['general', 'node', 'python', 'react', 'go', 'rust'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.pickerOption,
                    settings.defaultProjectType === type && styles.pickerOptionSelected
                  ]}
                  onPress={() => setSettings({...settings, defaultProjectType: type})}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    settings.defaultProjectType === type && styles.pickerOptionTextSelected
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Memory Limit</Text>
            <View style={styles.resourceContainer}>
              {['1g', '2g', '4g', '8g'].map((memory) => (
                <TouchableOpacity
                  key={memory}
                  style={[
                    styles.resourceOption,
                    settings.resourceLimits.memory === memory && styles.resourceOptionSelected
                  ]}
                  onPress={() => setSettings({
                    ...settings, 
                    resourceLimits: {...settings.resourceLimits, memory}
                  })}
                >
                  <Text style={[
                    styles.resourceOptionText,
                    settings.resourceLimits.memory === memory && styles.resourceOptionTextSelected
                  ]}>
                    {memory}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default CPU Limit</Text>
            <View style={styles.resourceContainer}>
              {['0.5', '1.0', '2.0', '4.0'].map((cpus) => (
                <TouchableOpacity
                  key={cpus}
                  style={[
                    styles.resourceOption,
                    settings.resourceLimits.cpus === cpus && styles.resourceOptionSelected
                  ]}
                  onPress={() => setSettings({
                    ...settings, 
                    resourceLimits: {...settings.resourceLimits, cpus}
                  })}
                >
                  <Text style={[
                    styles.resourceOptionText,
                    settings.resourceLimits.cpus === cpus && styles.resourceOptionTextSelected
                  ]}>
                    {cpus}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.buttonDisabled]} 
            onPress={saveSettings}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? '💾 Saving...' : '💾 Save Settings'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={resetSettings}>
            <Text style={styles.resetButtonText}>🔄 Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            These settings will be applied to all new projects.
            Existing projects may need to be recreated to use new settings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  inputGroup: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  testButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  resourceContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  resourceOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  resourceOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  resourceOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resourceOptionTextSelected: {
    color: '#fff',
  },
  actionsSection: {
    marginTop: 30,
    marginHorizontal: 20,
    gap: 15,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
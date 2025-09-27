import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';

// Enhanced services
import EnhancedWebSocketService from './src/services/EnhancedWebSocketService';
import FirebaseConfigService from './src/services/FirebaseConfigService';

// React Native compatibility: Remove URL API dependency
// WebSocket URL validation is now handled in EnhancedWebSocketService.ts

// Screens
import QRScannerScreen from './src/screens/QRScannerScreen';
import ServerListScreen from './src/screens/ServerListScreen';
import ProjectListScreen from './src/screens/ProjectListScreen';
import EnhancedDevelopmentScreen from './src/screens/EnhancedDevelopmentScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ConfigurationScreen from './src/screens/ConfigurationScreen';
import QuickCommandsScreen from './src/screens/QuickCommandsScreen';
import DetailedSettingsScreen from './src/screens/DetailedSettingsScreen';
import ProjectManagementScreen from './src/screens/ProjectManagementScreen';

// Types
import { RootStackParamList } from './src/types/Navigation';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing Enhanced Remote Claude App...');

      // Initialize Firebase Config Service
      await FirebaseConfigService.initialize();
      console.log('✅ Firebase Config Service initialized');

      // Apply enhanced WebSocket configuration
      const serverConfig = FirebaseConfigService.getServerConfig();
      EnhancedWebSocketService.updateConfiguration({
        connectionTimeout: serverConfig.timeoutSettings.connection,
        heartbeatInterval: serverConfig.timeoutSettings.heartbeat,
        reconnectInterval: serverConfig.timeoutSettings.reconnect,
        enableCompression: true,
        enableKeepAlive: true,
      });
      console.log('✅ Enhanced WebSocket Service configured');

      setIsInitialized(true);
      console.log('🎉 App initialization completed successfully');

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown initialization error');

      // Show error to user with retry option
      Alert.alert(
        'Initialization Error',
        `Failed to initialize app: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [
          { text: 'Retry', onPress: initializeApp },
          { text: 'Continue Anyway', onPress: () => setIsInitialized(true) }
        ]
      );
    }
  };

  if (!isInitialized) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="auto" />
        <Text style={styles.loadingText}>🚀 Initializing Remote Claude...</Text>
        {initError && (
          <Text style={styles.errorText}>Error: {initError}</Text>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName="ServerList">
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{
              title: '📱 QR Scanner',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
          <Stack.Screen
            name="ServerList"
            component={ServerListScreen}
            options={{
              title: '🖥️ Servers',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
          <Stack.Screen
            name="ProjectList"
            component={ProjectListScreen}
            options={{
              title: '📋 Projects',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
          <Stack.Screen
            name="Development"
            component={EnhancedDevelopmentScreen}
            options={{
              title: '🚀 AI Development',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: '⚙️ Settings',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
          <Stack.Screen
            name="Configuration"
            component={ConfigurationScreen}
            options={{
              title: '⚙️ Configuration',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
          <Stack.Screen
            name="QuickCommands"
            component={QuickCommandsScreen}
            options={{
              title: '⚡ Quick Commands',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
          <Stack.Screen
            name="DetailedSettings"
            component={DetailedSettingsScreen}
            options={{
              title: '🔧 詳細設定',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
          <Stack.Screen
            name="ProjectManagement"
            component={ProjectManagementScreen}
            options={{
              title: '⚙️ Project Management',
              headerStyle: { backgroundColor: '#007AFF' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginHorizontal: 20,
  },
});
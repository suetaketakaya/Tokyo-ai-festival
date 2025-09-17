import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

// React Native compatibility: Remove URL API dependency
// WebSocket URL validation is now handled in WebSocketService.ts

// Screens
import QRScannerScreen from './src/screens/QRScannerScreen';
import ServerListScreen from './src/screens/ServerListScreen';
import ProjectListScreen from './src/screens/ProjectListScreen';
import DevelopmentScreen from './src/screens/DevelopmentScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ConfigurationScreen from './src/screens/ConfigurationScreen';
import QuickCommandsScreen from './src/screens/QuickCommandsScreen';

// Types
import { RootStackParamList } from './src/types/Navigation';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
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
            component={DevelopmentScreen}
            options={{
              title: '🛠️ Development',
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
});
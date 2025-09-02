import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { QRScanner } from '../components/QRScanner';
import { Terminal } from '../components/Terminal';
import WebSocketService from '../services/WebSocketService';

const { width } = Dimensions.get('window');

type Screen = 'scanner' | 'terminal' | 'preview';

export const HomeScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('scanner');
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  const terminalRef = useRef<any>(null);

  useEffect(() => {
    // Set up WebSocket event listeners
    WebSocketService.on('connection', (data: any) => {
      setIsConnected(data.status === 'connected');
      setConnectionStatus(data.status);
    });

    WebSocketService.on('claude_output', (data: any) => {
      if (terminalRef.current) {
        const outputType = data.status === 'error' ? 'error' : 'output';
        terminalRef.current.addOutput(data.data, outputType);
        
        if (data.status === 'completed' || data.status === 'error') {
          setIsExecuting(false);
        }
      }
    });

    WebSocketService.on('git_response', (data: any) => {
      if (terminalRef.current) {
        const outputType = data.status === 'error' ? 'error' : 'output';
        terminalRef.current.addOutput(`Git ${data.operation}: ${data.data}`, outputType);
      }
    });

    WebSocketService.on('error', (data: any) => {
      Alert.alert('Connection Error', data.message);
      setIsConnected(false);
    });

    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  const handleQRScanSuccess = async (url: string) => {
    try {
      setServerUrl(url);
      setConnectionStatus('Connecting...');
      
      const connected = await WebSocketService.connect(url);
      
      if (connected) {
        setCurrentScreen('terminal');
        Alert.alert('接続成功', 'RemoteClaudeサーバーに接続しました！');
      }
    } catch (error) {
      Alert.alert('接続エラー', `サーバーに接続できませんでした: ${error}`);
      setConnectionStatus('Connection failed');
    }
  };

  const handleQRScanError = (error: string) => {
    Alert.alert('QRコードエラー', error);
  };

  const handleCommandSubmit = (command: string) => {
    if (!isConnected) {
      Alert.alert('エラー', 'サーバーに接続されていません');
      return;
    }

    setIsExecuting(true);
    
    if (command.startsWith('claude')) {
      WebSocketService.executeClaudeCommand(command);
    } else if (command.startsWith('git')) {
      const gitCommand = command.replace('git ', '');
      WebSocketService.executeGitOperation(gitCommand as any);
    } else {
      // Handle other commands or show error
      if (terminalRef.current) {
        terminalRef.current.addOutput(`Unknown command: ${command}`, 'error');
      }
      setIsExecuting(false);
    }
  };

  const handleDisconnect = () => {
    WebSocketService.disconnect();
    setCurrentScreen('scanner');
    setServerUrl('');
    setConnectionStatus('');
  };

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RemoteClaude</Text>
        <View style={styles.headerRight}>
          {isConnected && (
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Text style={styles.disconnectText}>切断</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderTabBar = () => {
    if (!isConnected) return null;

    const tabs = [
      { key: 'terminal', label: 'Terminal', icon: '💻' },
      { key: 'preview', label: 'Preview', icon: '🌐' },
    ];

    return (
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              currentScreen === tab.key && styles.activeTab,
            ]}
            onPress={() => setCurrentScreen(tab.key as Screen)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabLabel,
              currentScreen === tab.key && styles.activeTabLabel,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStatusBar = () => {
    if (!isConnected) return null;

    return (
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        
        {serverUrl && (
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Server:</Text>
            <Text style={styles.statusUrl} numberOfLines={1}>
              {serverUrl.replace('http://', '')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    switch (currentScreen) {
      case 'scanner':
        return (
          <QRScanner
            onScanSuccess={handleQRScanSuccess}
            onScanError={handleQRScanError}
            isActive={true}
          />
        );
      case 'terminal':
        return (
          <Terminal
            ref={terminalRef}
            onCommandSubmit={handleCommandSubmit}
            isConnected={isConnected}
            isExecuting={isExecuting}
          />
        );
      case 'preview':
        return (
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>Web Preview</Text>
            <Text style={styles.previewSubtext}>
              Preview functionality coming soon...
            </Text>
            {/* WebView would go here */}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {renderHeader()}
      {renderStatusBar()}
      {renderTabBar()}
      
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  headerTitle: {
    color: '#1a73e8',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disconnectText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#333',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#9aa0a6',
    fontSize: 12,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b6b',
    marginRight: 6,
  },
  statusDotConnected: {
    backgroundColor: '#34a853',
  },
  statusText: {
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusUrl: {
    color: '#1a73e8',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#1a73e8',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  tabLabel: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#1a73e8',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  previewText: {
    color: '#e0e0e0',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewSubtext: {
    color: '#9aa0a6',
    fontSize: 16,
    textAlign: 'center',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/Navigation';
import { ServerManager } from '../services/ServerManager';
import { ServerConnection } from '../types/Server';

type ServerListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ServerList'>;

const ServerListScreen: React.FC = () => {
  const navigation = useNavigation<ServerListScreenNavigationProp>();
  const [servers, setServers] = useState<ServerConnection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addServerModalVisible, setAddServerModalVisible] = useState(false);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newServerName, setNewServerName] = useState('');
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const serverManager = ServerManager.getInstance();

  useEffect(() => {
    initializeAndLoadServers();
  }, []);

  const initializeAndLoadServers = async () => {
    try {
      console.log('🚀 Initializing ServerManager...');
      await serverManager.initialize();
      console.log('✅ ServerManager initialized, loading servers...');
      loadServers();
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      Alert.alert('Error', 'Failed to initialize server manager');
    }
  };

  const loadServers = () => {
    const allServers = serverManager.getAllServers();
    console.log('📋 Loading servers:', allServers.length, 'found');
    allServers.forEach(server => {
      console.log('  - Server:', server.name, 'ID:', server.id);
    });
    setServers(allServers);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    loadServers();
    setRefreshing(false);
  };

  const handleAddServer = async () => {
    if (!newServerUrl.trim()) {
      Alert.alert('Error', 'Please enter a connection URL');
      return;
    }

    try {
      await serverManager.addServer(newServerUrl.trim(), newServerName.trim() || undefined);
      loadServers();
      setAddServerModalVisible(false);
      setNewServerUrl('');
      setNewServerName('');
      Alert.alert('Success', 'Server added successfully');
    } catch (error) {
      console.error('❌ Failed to add server:', error);
      Alert.alert('Error', 'Failed to add server. Please check the URL format.');
    }
  };

  const handleConnectToServer = async (serverId: string) => {
    console.log('🔍 Attempting to connect to server ID:', serverId);
    
    // Check if server exists before attempting connection
    const server = serverManager.getServer(serverId);
    if (!server) {
      console.error('❌ Server not found:', serverId);
      Alert.alert('Error', 'Server not found. Please refresh the list.');
      return;
    }
    
    console.log('🔍 Found server:', {
      id: server.id,
      name: server.name,
      connectionUrl: server.connectionUrl
    });

    setIsConnecting(serverId);
    try {
      const success = await serverManager.connectToServer(serverId);
      if (success) {
        loadServers();
        // Navigate to project list for this server with proper parameters
        navigation.navigate('ProjectList', {
          connectionUrl: server.connectionUrl,
          sessionKey: server.sessionKey
        });
      } else {
        Alert.alert('Connection Failed', 'Could not connect to the server');
      }
    } catch (error) {
      console.error('❌ Connection error:', error);
      Alert.alert('Connection Error', 'Failed to connect to server');
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnectFromServer = async (serverId: string) => {
    try {
      await serverManager.disconnectFromServer(serverId);
      loadServers();
    } catch (error) {
      console.error('❌ Disconnection error:', error);
    }
  };

  const handleRemoveServer = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    Alert.alert(
      'Remove Server',
      `Are you sure you want to remove "${server.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await serverManager.removeServer(serverId);
              loadServers();
            } catch (error) {
              console.error('❌ Failed to remove server:', error);
              Alert.alert('Error', 'Failed to remove server');
            }
          },
        },
      ]
    );
  };

  const handleEditServerName = (serverId: string, currentName: string) => {
    Alert.prompt(
      'Edit Server Name',
      'Enter a new name for this server:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newName) => {
            if (newName && newName.trim()) {
              try {
                await serverManager.updateServerName(serverId, newName.trim());
                loadServers();
              } catch (error) {
                console.error('❌ Failed to update server name:', error);
              }
            }
          },
        },
      ],
      'plain-text',
      currentName
    );
  };

  const getStatusColor = (status: ServerConnection['status']) => {
    switch (status) {
      case 'connected': return '#28a745';
      case 'connecting': return '#ffc107';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: ServerConnection['status']) => {
    switch (status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const renderServer = (server: ServerConnection) => (
    <View key={server.id} style={styles.serverCard}>
      <View style={styles.serverHeader}>
        <TouchableOpacity
          style={styles.serverTitleContainer}
          onPress={() => handleEditServerName(server.id, server.name)}
        >
          <Text style={styles.serverName}>{server.name}</Text>
          <Text style={styles.editHint}>Tap to edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveServer(server.id)}
        >
          <Text style={styles.removeButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.serverInfo}>
        <Text style={styles.serverUrl}>{server.host}:{server.port}</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{getStatusIcon(server.status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(server.status) }]}>
            {server.status}
          </Text>
        </View>
      </View>

      {server.lastConnected && (
        <Text style={styles.lastConnected}>
          Last connected: {server.lastConnected.toLocaleString()}
        </Text>
      )}

      {server.serverVersion && (
        <Text style={styles.serverVersion}>
          Server v{server.serverVersion}
        </Text>
      )}

      <View style={styles.serverActions}>
        {server.isConnected ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.navigateButton]}
              onPress={() => navigation.navigate('ProjectList', {
                connectionUrl: server.connectionUrl,
                sessionKey: server.sessionKey
              })}
            >
              <Text style={styles.actionButtonText}>📋 View Projects</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.disconnectButton]}
              onPress={() => handleDisconnectFromServer(server.id)}
            >
              <Text style={styles.actionButtonText}>🔌 Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.connectButton,
              { opacity: isConnecting === server.id ? 0.5 : 1 }
            ]}
            onPress={() => handleConnectToServer(server.id)}
            disabled={isConnecting === server.id}
          >
            <Text style={styles.actionButtonText}>
              {isConnecting === server.id ? '⏳ Connecting...' : '🔗 Connect'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🖥️ Server Connections</Text>
        <Text style={styles.headerSubtitle}>
          {servers.length} server{servers.length !== 1 ? 's' : ''} • {' '}
          {servers.filter(s => s.isConnected).length} connected
        </Text>
      </View>

      <ScrollView
        style={styles.serverList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {servers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Servers Added</Text>
            <Text style={styles.emptyStateText}>
              Add a RemoteClaude server connection to get started
            </Text>
          </View>
        ) : (
          servers.map(renderServer)
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.addButton, styles.scanButton]}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <Text style={styles.addButtonText}>📱 Scan QR Code</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.addButton, styles.manualButton]}
          onPress={() => setAddServerModalVisible(true)}
        >
          <Text style={styles.addButtonText}>✏️ Add Manually</Text>
        </TouchableOpacity>
      </View>

      {/* Add Server Modal */}
      <Modal
        visible={addServerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Server</Text>
            
            <Text style={styles.inputLabel}>Connection URL *</Text>
            <TextInput
              style={styles.textInput}
              value={newServerUrl}
              onChangeText={setNewServerUrl}
              placeholder="ws://192.168.1.100:8090/ws?key=..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              multiline={true}
            />

            <Text style={styles.inputLabel}>Server Name (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={newServerName}
              onChangeText={setNewServerName}
              placeholder="My Development Server"
              placeholderTextColor="#999"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAddServerModalVisible(false);
                  setNewServerUrl('');
                  setNewServerName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButtonModal]}
                onPress={handleAddServer}
              >
                <Text style={styles.addButtonModalText}>Add Server</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
  serverList: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  serverCard: {
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
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  serverTitleContainer: {
    flex: 1,
  },
  serverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  editHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 5,
  },
  removeButtonText: {
    fontSize: 16,
  },
  serverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serverUrl: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Courier New',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  lastConnected: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  serverVersion: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 10,
  },
  serverActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#28a745',
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
  },
  navigateButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
    gap: 10,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#28a745',
  },
  manualButton: {
    backgroundColor: '#007AFF',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButtonModal: {
    backgroundColor: '#007AFF',
  },
  addButtonModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ServerListScreen;
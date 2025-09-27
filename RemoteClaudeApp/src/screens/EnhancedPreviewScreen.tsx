import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';

interface PreviewItem {
  id: string;
  type: 'matplotlib' | 'webapp' | 'notebook';
  name: string;
  description: string;
  status: 'ready' | 'running' | 'error';
  path?: string;
  port?: number;
  url?: string;
  size?: string;
  timestamp?: string;
  process?: string;
}

interface Props {
  route: {
    params: {
      serverUrl: string;
      projectId: string;
      projectName?: string;
    };
  };
  navigation: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const EnhancedPreviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { serverUrl, projectId, projectName } = route.params;
  const [isConnected, setIsConnected] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PreviewItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'matplotlib' | 'webapp' | 'notebook'>('all');
  const [imageData, setImageData] = useState<string | null>(null);
  const [webAppUrl, setWebAppUrl] = useState<string | null>(null);

  useEffect(() => {
    connectToServer();
    return () => {
      EnhancedWebSocketService.unregisterScreenCallbacks('preview');
    };
  }, []);

  const connectToServer = async () => {
    try {
      setIsLoading(true);

      const success = await EnhancedEnhancedWebSocketService.connect(serverUrl);
      if (success) {
        setIsConnected(true);

        EnhancedWebSocketService.registerScreenCallbacks('preview', {
          onMessage: handleServerMessage,
          onConnect: () => {
            setIsConnected(true);
            requestPreviewList();
          },
          onDisconnect: () => setIsConnected(false),
          onError: (error) => {
            console.error('WebSocket error:', error);
            Alert.alert('Connection Error', 'Failed to connect to server');
          },
        }, 3);

        requestPreviewList();
      } else {
        Alert.alert('Connection Failed', 'Could not connect to server');
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to establish connection');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPreviewList = () => {
    if (!isConnected) return;

    EnhancedEnhancedWebSocketService.send({
      type: 'preview_list_request',
      data: {
        project_id: projectId,
      }
    });
  };

  const handleServerMessage = (message: any) => {
    console.log('Preview message received:', message.type, message.data);

    switch (message.type) {
      case 'preview_list_response':
        if (message.data.previews) {
          setPreviewItems(message.data.previews);
        }
        break;

      case 'preview_image_response':
        if (message.data.image_data) {
          setImageData(message.data.image_data);
          setShowFullscreen(true);
        }
        break;

      case 'preview_webapp_response':
        if (message.data.url) {
          setWebAppUrl(message.data.url);
          setShowFullscreen(true);
        }
        break;

      case 'error':
        Alert.alert('Error', message.data.message || 'Unknown error occurred');
        break;
    }
  };

  const refreshPreviews = async () => {
    setRefreshing(true);
    requestPreviewList();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const openPreviewItem = (item: PreviewItem) => {
    setSelectedItem(item);

    if (item.type === 'matplotlib') {
      // Request image data
      EnhancedEnhancedWebSocketService.send({
        type: 'preview_get_image',
        data: {
          project_id: projectId,
          image_path: item.path,
        }
      });
    } else if (item.type === 'webapp') {
      // Request webapp info
      EnhancedEnhancedWebSocketService.send({
        type: 'preview_get_webapp',
        data: {
          project_id: projectId,
          port: item.port,
        }
      });
    } else if (item.type === 'notebook') {
      // Open Jupyter in fullscreen
      setWebAppUrl(item.url || `http://localhost:${item.port}`);
      setShowFullscreen(true);
    }
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    setImageData(null);
    setWebAppUrl(null);
    setSelectedItem(null);
  };

  const getFilteredItems = () => {
    if (activeTab === 'all') return previewItems;
    return previewItems.filter(item => item.type === activeTab);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return '#4CAF50';
      case 'running': return '#2196F3';
      case 'error': return '#F44336';
      default: return '#666';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'matplotlib': return '📊';
      case 'webapp': return '🌐';
      case 'notebook': return '📓';
      default: return '📄';
    }
  };

  const renderPreviewItem = ({ item }: { item: PreviewItem }) => (
    <TouchableOpacity style={styles.previewCard} onPress={() => openPreviewItem(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardIcon}>{getTypeIcon(item.type)}</Text>
          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {item.type === 'matplotlib' && (
        <View style={styles.cardMetadata}>
          <Text style={styles.metadataText}>📁 {item.path}</Text>
          {item.size && <Text style={styles.metadataText}>📏 {item.size} bytes</Text>}
          {item.timestamp && <Text style={styles.metadataText}>🕒 {item.timestamp}</Text>}
        </View>
      )}

      {item.type === 'webapp' && (
        <View style={styles.cardMetadata}>
          <Text style={styles.metadataText}>🌐 localhost:{item.port}</Text>
          {item.process && <Text style={styles.metadataText}>⚙️ {item.process}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFullscreenContent = () => {
    if (imageData) {
      return (
        <ScrollView
          style={styles.fullscreenContent}
          maximumZoomScale={3}
          minimumZoomScale={1}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <Image
            source={{ uri: `data:image/png;base64,${imageData}` }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </ScrollView>
      );
    }

    if (webAppUrl) {
      return (
        <WebView
          source={{ uri: webAppUrl }}
          style={styles.fullscreenWebView}
          onError={() => Alert.alert('Error', 'Failed to load web application')}
          onLoad={() => console.log('WebView loaded')}
        />
      );
    }

    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading preview...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Preview</Text>
          <Text style={styles.subtitle}>{projectName || projectId}</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, !isConnected && styles.disabledButton]}
          onPress={refreshPreviews}
          disabled={!isConnected}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {[
          { key: 'all', label: 'All', icon: '📄' },
          { key: 'matplotlib', label: 'Plots', icon: '📊' },
          { key: 'webapp', label: 'Web', icon: '🌐' },
          { key: 'notebook', label: 'Jupyter', icon: '📓' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Connecting...</Text>
          </View>
        ) : !isConnected ? (
          <View style={styles.centered}>
            <Text style={styles.errorIcon}>📡</Text>
            <Text style={styles.errorTitle}>Not Connected</Text>
            <Text style={styles.errorDescription}>
              Unable to connect to server
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={connectToServer}>
              <Text style={styles.retryText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : getFilteredItems().length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>👁️</Text>
            <Text style={styles.emptyTitle}>No Previews Available</Text>
            <Text style={styles.emptyDescription}>
              Run commands that generate matplotlib plots or start web applications to see previews here.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={refreshPreviews}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={getFilteredItems()}
            renderItem={renderPreviewItem}
            keyExtractor={(item) => item.id}
            style={styles.previewList}
            contentContainerStyle={styles.previewListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshPreviews}
                colors={['#007AFF']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Fullscreen Modal */}
      <Modal
        visible={showFullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeFullscreen}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={closeFullscreen}>
              <Text style={styles.closeText}>✕ Close</Text>
            </TouchableOpacity>
            {selectedItem && (
              <Text style={styles.fullscreenTitle}>{selectedItem.name}</Text>
            )}
          </View>
          {renderFullscreenContent()}
        </SafeAreaView>
      </Modal>
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
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  refreshText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  previewList: {
    flex: 1,
  },
  previewListContent: {
    padding: 15,
  },
  previewCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardMetadata: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metadataText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  fullscreenContent: {
    flex: 1,
  },
  fullscreenImage: {
    width: screenWidth,
    height: screenHeight - 100,
  },
  fullscreenWebView: {
    flex: 1,
  },
});

export default EnhancedPreviewScreen;
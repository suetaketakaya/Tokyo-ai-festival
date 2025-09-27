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
  Platform,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';

interface PreviewContent {
  id: string;
  type: 'matplotlib' | 'web' | 'image' | 'pdf' | 'html';
  title: string;
  content: string;
  metadata: {
    port?: number;
    filename?: string;
    timestamp: Date;
    size?: number;
    mimeType?: string;
  };
}

interface Props {
  route: {
    params: {
      serverUrl: string;
      projectId: string;
    };
  };
  navigation: any;
}

const PreviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { serverUrl, projectId } = route.params;
  const [isConnected, setIsConnected] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewContent[]>([]);
  const [selectedItem, setSelectedItem] = useState<PreviewContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'matplotlib' | 'web' | 'images'>('all');
  const [errorState, setErrorState] = useState<{
    hasError: boolean;
    message: string;
    type: 'connection' | 'preview' | 'server' | null;
  }>({ hasError: false, message: '', type: null });

  const webViewRef = useRef<WebView>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    navigation.setOptions({
      title: `Preview - ${projectId}`,
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: '#FF9800' }]}
            onPress={refreshPreviews}
          >
            <Text style={styles.headerButtonText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: isConnected ? '#4CAF50' : '#f44336' }]}
            onPress={() => {
              const debugInfo = EnhancedWebSocketService.getDetailedDebugInfo();
              Alert.alert('Debug Info', JSON.stringify(debugInfo, null, 2));
            }}
          >
            <Text style={styles.headerButtonText}>
              {isConnected ? '🟢' : '🔴'}
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, projectId, isConnected]);

  useEffect(() => {
    connectToServer();
    loadInitialPreviews();

    return () => {
      EnhancedWebSocketService.unregisterScreenCallbacks('preview');
    };
  }, []);

  const connectToServer = async () => {
    try {
      setErrorState({ hasError: false, message: '', type: null });
      // serverUrl already includes /ws and key parameter
      const connectionUrl = serverUrl;

      const success = await EnhancedWebSocketService.connect(connectionUrl, {
        onOpen: () => {
          setIsConnected(true);
          setErrorState({ hasError: false, message: '', type: null });
          requestPreviewList();
        },
        onMessage: handleServerMessage,
        onError: (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          setErrorState({
            hasError: true,
            message: `WebSocket connection error: ${error.message || 'Unknown error'}`,
            type: 'connection'
          });
        },
        onClose: (event) => {
          setIsConnected(false);
          if (event.code !== 1000) { // Not a normal closure
            setErrorState({
              hasError: true,
              message: `Connection closed unexpectedly (Code: ${event.code})`,
              type: 'connection'
            });
          }
        },
      }, 'preview');

      if (!success) {
        setErrorState({
          hasError: true,
          message: 'Failed to establish WebSocket connection to server',
          type: 'connection'
        });
        Alert.alert('Connection Failed', 'Could not connect to the server.');
      }
    } catch (error) {
      console.error('Connection setup error:', error);
      setErrorState({
        hasError: true,
        message: `Connection setup failed: ${error.message || 'Unknown error'}`,
        type: 'connection'
      });
    }
  };

  const handleServerMessage = (message: any) => {
    const messageType = message.type ? message.type.toString().trim() : '';

    switch (messageType) {
      case 'preview_list':
        handlePreviewList(message.data);
        break;

      case 'preview_content':
        handlePreviewContent(message.data);
        break;

      case 'matplotlib_generated':
        handleMatplotlibGenerated(message.data);
        break;

      case 'web_app_started':
        handleWebAppStarted(message.data);
        break;

      case 'preview_error':
        const errorMessage = message.data?.error || 'Unknown error occurred';
        setErrorState({
          hasError: true,
          message: errorMessage,
          type: 'preview'
        });
        Alert.alert('Preview Error', errorMessage);
        setIsLoading(false);
        break;

      case 'server_error':
        const serverError = message.data?.error || 'Server error occurred';
        setErrorState({
          hasError: true,
          message: serverError,
          type: 'server'
        });
        Alert.alert('Server Error', serverError);
        setIsLoading(false);
        break;

      default:
        break;
    }
  };

  const handlePreviewList = (data: any) => {
    if (data.previews && Array.isArray(data.previews)) {
      const items: PreviewContent[] = data.previews.map((item: any) => ({
        id: item.id || Date.now().toString(),
        type: item.type || 'image',
        title: item.title || item.filename || 'Untitled',
        content: item.content || item.url || '',
        metadata: {
          port: item.port,
          filename: item.filename,
          timestamp: new Date(item.timestamp || Date.now()),
          size: item.size,
          mimeType: item.mimeType,
        },
      }));
      setPreviewItems(items);
    }
    setIsLoading(false);
  };

  const handlePreviewContent = (data: any) => {
    const newItem: PreviewContent = {
      id: data.id || Date.now().toString(),
      type: data.type || 'image',
      title: data.title || data.filename || 'Preview',
      content: data.content || data.url || '',
      metadata: {
        port: data.port,
        filename: data.filename,
        timestamp: new Date(),
        size: data.size,
        mimeType: data.mimeType,
      },
    };

    setPreviewItems(prev => [newItem, ...prev]);
    setSelectedItem(newItem);
    setIsLoading(false);
  };

  const handleMatplotlibGenerated = (data: any) => {
    // Check image size to prevent PayloadTooLargeError
    const base64Image = data.base64_image || '';
    const imageSizeKB = Math.round((base64Image.length * 3) / 4 / 1024); // Approximate KB size

    if (imageSizeKB > 5000) { // Limit to 5MB
      Alert.alert(
        'Image Too Large',
        `Image size (${imageSizeKB}KB) exceeds limit. Please reduce image resolution.`
      );
      return;
    }

    const newItem: PreviewContent = {
      id: Date.now().toString(),
      type: 'matplotlib',
      title: data.title || 'Matplotlib Plot',
      content: base64Image,
      metadata: {
        filename: data.filename,
        timestamp: new Date(),
        mimeType: 'image/png',
        size: imageSizeKB,
      },
    };

    setPreviewItems(prev => [newItem, ...prev]);
    setSelectedItem(newItem);
  };

  const handleWebAppStarted = (data: any) => {
    const newItem: PreviewContent = {
      id: Date.now().toString(),
      type: 'web',
      title: data.title || `Web App (Port ${data.port})`,
      content: `${serverUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '')}:${data.port}`,
      metadata: {
        port: data.port,
        timestamp: new Date(),
      },
    };

    setPreviewItems(prev => [newItem, ...prev]);
    setSelectedItem(newItem);
  };

  const loadInitialPreviews = () => {
    // Add some sample previews for demonstration
    const samplePreviews: PreviewContent[] = [
      {
        id: 'sample-1',
        type: 'matplotlib',
        title: 'Sample Plot',
        content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        metadata: {
          filename: 'sample_plot.png',
          timestamp: new Date(),
          mimeType: 'image/png',
        },
      },
    ];
    setPreviewItems(samplePreviews);
  };

  const requestPreviewList = () => {
    setIsLoading(true);
    EnhancedWebSocketService.send({
      type: 'preview_list_request',
      data: {
        project_id: projectId,
      }
    });
  };

  const refreshPreviews = () => {
    if (isConnected) {
      setErrorState({ hasError: false, message: '', type: null });
      setIsLoading(true);
      requestPreviewList();
    } else {
      setErrorState({
        hasError: true,
        message: 'Cannot refresh: not connected to server',
        type: 'connection'
      });
      Alert.alert('Error', 'Not connected to server');
    }
  };

  const openInBrowser = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        throw new Error(`Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error('Browser open error:', error);
      setErrorState({
        hasError: true,
        message: `Failed to open in browser: ${error.message || 'Unknown error'}`,
        type: 'preview'
      });
      Alert.alert(
        'ブラウザで開けませんでした',
        `URLを開くことができませんでした: ${error.message || 'Unknown error'}\n\nURL: ${url}`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'URLをコピー',
            onPress: () => {
              // Copy URL to clipboard functionality would go here
              Alert.alert('URL', url);
            }
          }
        ]
      );
    }
  };

  const getFilteredItems = () => {
    switch (activeTab) {
      case 'matplotlib':
        return previewItems.filter(item => item.type === 'matplotlib');
      case 'web':
        return previewItems.filter(item => item.type === 'web');
      case 'images':
        return previewItems.filter(item => ['image', 'matplotlib'].includes(item.type));
      default:
        return previewItems;
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'all', label: 'All', icon: '📄' },
        { key: 'matplotlib', label: 'Plots', icon: '📊' },
        { key: 'web', label: 'Web Apps', icon: '🌐' },
        { key: 'images', label: 'Images', icon: '🖼️' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            activeTab === tab.key && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[
            styles.tabText,
            activeTab === tab.key && styles.tabTextActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPreviewItem = (item: PreviewContent) => (
    <TouchableOpacity
      key={item.id}
      style={styles.previewItem}
      onPress={() => setSelectedItem(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemType}>{item.type.toUpperCase()}</Text>
      </View>

      <View style={styles.itemContent}>
        {item.type === 'matplotlib' || item.type === 'image' ? (
          <Image
            source={{ uri: item.content.startsWith('data:') ? item.content : `data:image/png;base64,${item.content}` }}
            style={styles.thumbnailImage}
            resizeMode="cover"
            onError={(error) => {
              console.error('Image load error:', error);
              setErrorState({
                hasError: true,
                message: `Failed to load image: ${item.title}`,
                type: 'preview'
              });
            }}
          />
        ) : item.type === 'web' ? (
          <View style={styles.webPreview}>
            <Text style={styles.webUrl}>{item.content}</Text>
            <Text style={styles.webPort}>Port: {item.metadata.port}</Text>
            <TouchableOpacity
              style={styles.browserButton}
              onPress={() => openInBrowser(item.content)}
            >
              <Text style={styles.browserButtonText}>🌐 ブラウザで開く</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.genericPreview}>
            <Text style={styles.genericText}>Preview Available</Text>
          </View>
        )}
      </View>

      <View style={styles.itemFooter}>
        <Text style={styles.itemTimestamp}>
          {item.metadata.timestamp.toLocaleString()}
        </Text>
        {item.metadata.filename && (
          <Text style={styles.itemFilename}>{item.metadata.filename}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFullPreview = () => {
    if (!selectedItem) return null;

    return (
      <Modal
        visible={!!selectedItem}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedItem.title}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: '#FF9800' }]}
                onPress={() => setShowFullscreen(!showFullscreen)}
              >
                <Text style={styles.headerButtonText}>
                  {showFullscreen ? '🔍' : '⛶'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: '#666' }]}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.headerButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.previewContainer}>
            {selectedItem.type === 'matplotlib' || selectedItem.type === 'image' ? (
              <ScrollView
                contentContainerStyle={styles.imageScrollContainer}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image
                  source={{
                    uri: selectedItem.content.startsWith('data:')
                      ? selectedItem.content
                      : `data:image/png;base64,${selectedItem.content}`
                  }}
                  style={[
                    styles.fullImage,
                    showFullscreen && { width: screenWidth, height: screenHeight - 100 }
                  ]}
                  resizeMode="contain"
                />
              </ScrollView>
            ) : selectedItem.type === 'web' ? (
              <View style={styles.webContainer}>
                <View style={styles.webActions}>
                  <TouchableOpacity
                    style={styles.browserOpenButton}
                    onPress={() => openInBrowser(selectedItem.content)}
                  >
                    <Text style={styles.browserOpenButtonText}>🌐 ブラウザで開く</Text>
                  </TouchableOpacity>
                </View>
                <WebView
                  ref={webViewRef}
                  source={{ uri: selectedItem.content }}
                  style={styles.webView}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={styles.webViewLoading}>
                      <ActivityIndicator size="large" color="#4CAF50" />
                      <Text style={styles.loadingText}>Loading web app...</Text>
                    </View>
                  )}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    const errorMessage = `WebView failed to load: ${nativeEvent.description}`;
                    setErrorState({
                      hasError: true,
                      message: errorMessage,
                      type: 'preview'
                    });
                    Alert.alert('WebView Error', errorMessage);
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    const errorMessage = `HTTP Error ${nativeEvent.statusCode}: ${nativeEvent.description}`;
                    setErrorState({
                      hasError: true,
                      message: errorMessage,
                      type: 'preview'
                    });
                  }}
                  onLoadStart={() => setErrorState({ hasError: false, message: '', type: null })}
                />
              </View>
            ) : (
              <View style={styles.unsupportedPreview}>
                <Text style={styles.unsupportedText}>
                  Preview type "{selectedItem.type}" is not yet supported
                </Text>
                <Text style={styles.unsupportedContent}>{selectedItem.content}</Text>
              </View>
            )}
          </View>

          <View style={styles.previewInfo}>
            <Text style={styles.infoText}>Type: {selectedItem.type}</Text>
            {selectedItem.metadata.filename && (
              <Text style={styles.infoText}>File: {selectedItem.metadata.filename}</Text>
            )}
            {selectedItem.metadata.port && (
              <Text style={styles.infoText}>Port: {selectedItem.metadata.port}</Text>
            )}
            <Text style={styles.infoText}>
              Created: {selectedItem.metadata.timestamp.toLocaleString()}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderErrorBanner = () => {
    if (!errorState.hasError) return null;

    const getErrorColor = () => {
      switch (errorState.type) {
        case 'connection': return '#f44336';
        case 'server': return '#FF5722';
        case 'preview': return '#FF9800';
        default: return '#666';
      }
    };

    return (
      <View style={[styles.errorBanner, { backgroundColor: getErrorColor() }]}>
        <Text style={styles.errorText}>{errorState.message}</Text>
        <TouchableOpacity
          style={styles.errorCloseButton}
          onPress={() => setErrorState({ hasError: false, message: '', type: null })}
        >
          <Text style={styles.errorCloseText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderTabBar()}
      {renderErrorBanner()}

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading previews...</Text>
          </View>
        )}

        {!isLoading && getFilteredItems().length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No previews available</Text>
            <Text style={styles.emptyText}>
              Run commands that generate matplotlib plots or start web applications to see previews here.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={refreshPreviews}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.previewGrid}>
          {getFilteredItems().map(renderPreviewItem)}
        </View>
      </ScrollView>

      {renderFullPreview()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  headerButtons: {
    flexDirection: 'row',
    marginRight: 10,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabButtonActive: {
    backgroundColor: '#4CAF50',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewGrid: {
    padding: 15,
  },
  previewItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  itemType: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemContent: {
    marginBottom: 10,
  },
  thumbnailImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  webPreview: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  webUrl: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    marginBottom: 5,
  },
  webPort: {
    color: '#888',
    fontSize: 11,
  },
  browserButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'center',
  },
  browserButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  webContainer: {
    flex: 1,
  },
  webActions: {
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    alignItems: 'center',
  },
  browserOpenButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browserOpenButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
    marginRight: 10,
  },
  errorCloseButton: {
    padding: 4,
  },
  errorCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  genericPreview: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  genericText: {
    color: '#888',
    fontSize: 14,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTimestamp: {
    color: '#888',
    fontSize: 11,
  },
  itemFilename: {
    color: '#888',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
  },
  previewContainer: {
    flex: 1,
  },
  imageScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: 300,
    minHeight: 200,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  unsupportedPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unsupportedText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  unsupportedContent: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  previewInfo: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
});

export default PreviewScreen;
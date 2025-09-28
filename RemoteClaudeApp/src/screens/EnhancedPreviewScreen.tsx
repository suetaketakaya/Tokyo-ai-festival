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
import WandBIntegrationService, { WandBExperiment, WandBPlot } from '../services/WandBIntegrationService';

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
  const [activeTab, setActiveTab] = useState<'all' | 'matplotlib' | 'webapp' | 'notebook' | 'wandb'>('all');
  const [imageData, setImageData] = useState<string | null>(null);
  const [webAppUrl, setWebAppUrl] = useState<string | null>(null);

  // W&B統合関連の状態
  const [wandbService] = useState(() => WandBIntegrationService.getInstance());
  const [wandbExperiments, setWandBExperiments] = useState<WandBExperiment[]>([]);
  const [currentExperiment, setCurrentExperiment] = useState<WandBExperiment | null>(null);
  const [wandbConnected, setWandBConnected] = useState<boolean>(false);
  const [showWandBModal, setShowWandBModal] = useState<boolean>(false);

  useEffect(() => {
    connectToServer();
    initializeWandB();

    return () => {
      EnhancedWebSocketService.unregisterScreenCallbacks('preview');
    };
  }, []);

  // W&B状態の更新
  useEffect(() => {
    const updateWandBState = () => {
      setWandBExperiments(wandbService.getExperiments());
      setCurrentExperiment(wandbService.getCurrentExperiment());
      setWandBConnected(wandbService.isWandBConnected());
    };

    updateWandBState();
    const interval = setInterval(updateWandBState, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, [wandbService]);

  const connectToServer = async () => {
    try {
      setIsLoading(true);

      const success = await EnhancedWebSocketService.connect(serverUrl);
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

    EnhancedWebSocketService.send({
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
      EnhancedWebSocketService.send({
        type: 'preview_get_image',
        data: {
          project_id: projectId,
          image_path: item.path,
        }
      });
    } else if (item.type === 'webapp') {
      // Request webapp info
      EnhancedWebSocketService.send({
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

    // W&B統合: Matplotlibプロットを自動でW&Bにログ
    if (item.type === 'matplotlib' && currentExperiment) {
      integrateWithWandB(item);
    }
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    setImageData(null);
    setWebAppUrl(null);
    setSelectedItem(null);
  };

  // W&B初期化
  const initializeWandB = async () => {
    try {
      // デモ用のダミーAPIキーで初期化
      await wandbService.initialize('demo_api_key_' + Date.now());
      console.log('W&B integration initialized');
    } catch (error) {
      console.error('Failed to initialize W&B:', error);
    }
  };

  // MatplotlibプロットのW&B統合
  const integrateWithWandB = async (previewItem: PreviewItem) => {
    try {
      if (previewItem.type === 'matplotlib' && currentExperiment) {
        // プロットをW&Bに統合
        const plotData = wandbService.convertPreviewToWandB({
          title: previewItem.name,
          content: imageData, // base64データ
          type: 'matplotlib',
          metadata: {
            timestamp: new Date().toISOString(),
            projectId: projectId,
          },
        });

        if (plotData) {
          await wandbService.logPlot(
            previewItem.name,
            plotData.data,
            imageData || undefined
          );
          console.log(`Plot integrated with W&B: ${previewItem.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to integrate with W&B:', error);
    }
  };

  // W&B実験を開始
  const startWandBExperiment = async () => {
    try {
      const experiment = await wandbService.startExperiment(
        `Preview_Experiment_${Date.now()}`,
        projectId || 'remote_claude_preview',
        {
          project_id: projectId,
          timestamp: new Date().toISOString(),
        }
      );

      if (experiment) {
        console.log('W&B experiment started:', experiment.name);
        setCurrentExperiment(experiment);
      }
    } catch (error) {
      console.error('Failed to start W&B experiment:', error);
    }
  };

  // W&B実験を終了
  const finishWandBExperiment = async () => {
    try {
      if (currentExperiment) {
        await wandbService.finishExperiment(currentExperiment.id);
        console.log('W&B experiment finished:', currentExperiment.name);
        setCurrentExperiment(null);
      }
    } catch (error) {
      console.error('Failed to finish W&B experiment:', error);
    }
  };

  const getFilteredItems = () => {
    if (activeTab === 'all') return previewItems;
    if (activeTab === 'wandb') return []; // W&Bタブでは通常のプレビューアイテムを除外
    return previewItems.filter(item => item.type === activeTab);
  };

  // W&Bコンテンツのレンダリング
  const renderWandBContent = () => {
    return (
      <ScrollView style={styles.wandbContainer} showsVerticalScrollIndicator={false}>
        {/* W&B接続状態 */}
        <View style={styles.wandbStatusCard}>
          <View style={styles.wandbStatusHeader}>
            <Text style={styles.wandbStatusTitle}>🔬 W&B Integration Status</Text>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: wandbConnected ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.wandbConnectionStatusText}>
                {wandbConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
        </View>

        {/* 現在の実験 */}
        <View style={styles.currentExperimentCard}>
          <Text style={styles.wandbCardTitle}>📊 Current Experiment</Text>
          {currentExperiment ? (
            <View style={styles.experimentInfo}>
              <Text style={styles.experimentName}>{currentExperiment.name}</Text>
              <Text style={styles.experimentProject}>Project: {currentExperiment.project}</Text>
              <Text style={styles.experimentStatus}>Status: {currentExperiment.status}</Text>
              <Text style={styles.experimentTime}>
                Started: {currentExperiment.createdAt.toLocaleString()}
              </Text>

              <View style={styles.experimentActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.finishButton]}
                  onPress={finishWandBExperiment}
                >
                  <Text style={styles.actionButtonText}>✓ Finish Experiment</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noExperiment}>
              <Text style={styles.noExperimentText}>No active experiment</Text>
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={startWandBExperiment}
              >
                <Text style={styles.actionButtonText}>▶️ Start New Experiment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 実験一覧 */}
        <View style={styles.experimentsListCard}>
          <Text style={styles.wandbCardTitle}>📜 Experiment History</Text>
          {wandbExperiments.length > 0 ? (
            wandbExperiments.slice(0, 5).map((experiment) => (
              <View key={experiment.id} style={styles.experimentItem}>
                <View style={styles.experimentHeader}>
                  <Text style={styles.experimentItemName}>{experiment.name}</Text>
                  <View style={[
                    styles.experimentStatusBadge,
                    { backgroundColor: getExperimentStatusColor(experiment.status) }
                  ]}>
                    <Text style={styles.wandbExperimentStatusText}>{experiment.status}</Text>
                  </View>
                </View>
                <Text style={styles.experimentItemProject}>{experiment.project}</Text>
                <Text style={styles.experimentItemTime}>
                  {experiment.updatedAt.toLocaleString()}
                </Text>
                {Object.keys(experiment.metrics).length > 0 && (
                  <View style={styles.metricsPreview}>
                    <Text style={styles.metricsTitle}>Metrics:</Text>
                    {Object.entries(experiment.metrics).slice(0, 3).map(([key, value]) => (
                      <Text key={key} style={styles.metricItem}>
                        {key}: {typeof value === 'number' ? value.toFixed(4) : value}
                      </Text>
                    ))}
                  </View>
                )}
                {experiment.plots.length > 0 && (
                  <Text style={styles.plotsInfo}>
                    📈 {experiment.plots.length} plot(s) logged
                  </Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.noExperiments}>
              <Text style={styles.noExperimentsText}>No experiments yet</Text>
              <Text style={styles.noExperimentsSubtext}>
                Start an experiment to track your ML workflow with W&B
              </Text>
            </View>
          )}
        </View>

        {/* W&B統合情報 */}
        <View style={styles.integrationInfoCard}>
          <Text style={styles.wandbCardTitle}>ℹ️ Integration Info</Text>
          <Text style={styles.infoText}>
            • Matplotlib plots are automatically logged to W&B when an experiment is active
          </Text>
          <Text style={styles.infoText}>
            • Experiments track model metrics, plots, and artifacts
          </Text>
          <Text style={styles.infoText}>
            • View detailed experiment data in the W&B dashboard
          </Text>
        </View>
      </ScrollView>
    );
  };

  // 実験ステータスの色を取得
  const getExperimentStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'failed': return '#F44336';
      case 'crashed': return '#FF5722';
      default: return '#666';
    }
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
          { key: 'wandb', label: 'W&B', icon: '🔬' },
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
        ) : activeTab === 'wandb' ? (
          renderWandBContent()
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
  // W&B統合用スタイル
  wandbContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  wandbStatusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wandbStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wandbStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  wandbConnectionStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentExperimentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wandbCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  experimentInfo: {
    marginTop: 8,
  },
  experimentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  experimentProject: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  experimentStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  experimentTime: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  experimentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  finishButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noExperiment: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noExperimentText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  experimentsListCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  experimentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
    marginBottom: 8,
  },
  experimentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  experimentItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  experimentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  wandbExperimentStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  experimentItemProject: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  experimentItemTime: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
  },
  metricsPreview: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  metricsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  metricItem: {
    fontSize: 11,
    color: '#666',
    marginBottom: 1,
  },
  plotsInfo: {
    fontSize: 11,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  noExperiments: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noExperimentsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  noExperimentsSubtext: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
  integrationInfoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default EnhancedPreviewScreen;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface PreviewConfig {
  id: string;
  type: 'web_app' | 'matplotlib' | 'jupyter' | 'gui_app' | 'data_analysis';
  title: string;
  description: string;
  port?: number;
  dockerfile?: string;
  duration?: number; // minutes
  requirements?: string[];
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
}

interface InteractivePreviewButtonProps {
  config: PreviewConfig;
  onLaunch: (config: PreviewConfig) => Promise<{
    success: boolean;
    containerID?: string;
    url?: string;
    message?: string;
  }>;
  serverUrl: string;
}

const InteractivePreviewButton: React.FC<InteractivePreviewButtonProps> = ({
  config,
  onLaunch,
  serverUrl,
}) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [containerInfo, setContainerInfo] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const animatedValue = new Animated.Value(0);

  const { width: screenWidth } = Dimensions.get('window');

  // ボタン設定
  const buttonConfigs = {
    web_app: {
      icon: 'globe-outline' as const,
      title: '🌐 Webアプリプレビュー',
      gradient: ['#2196F3', '#21CBF3'],
      description: '一時コンテナでWebアプリケーションを実行します',
      estimatedTime: '30-60秒',
      maxDuration: '10分間（自動停止）',
    },
    matplotlib: {
      icon: 'bar-chart-outline' as const,
      title: '📊 W&B拡張プロットビューアー',
      gradient: ['#4CAF50', '#8BC34A'],
      description: 'CNN分析付き高度なデータ可視化システム',
      estimatedTime: '15-30秒',
      maxDuration: '5分間（自動停止）',
    },
    jupyter: {
      icon: 'book-outline' as const,
      title: '📔 Jupyter Notebook環境',
      gradient: ['#FF9800', '#FFC107'],
      description: 'インタラクティブな分析・開発環境を起動',
      estimatedTime: '45-90秒',
      maxDuration: '15分間（自動停止）',
    },
    gui_app: {
      icon: 'desktop-outline' as const,
      title: '🖥️ GUIアプリケーション',
      gradient: ['#9C27B0', '#E91E63'],
      description: 'デスクトップアプリケーションの動作確認',
      estimatedTime: '60-120秒',
      maxDuration: '8分間（自動停止）',
    },
    data_analysis: {
      icon: 'analytics-outline' as const,
      title: '📈 データ分析環境',
      gradient: ['#F44336', '#FF5722'],
      description: 'データサイエンス・機械学習実行環境',
      estimatedTime: '30-60秒',
      maxDuration: '12分間（自動停止）',
    },
  };

  const buttonConfig = buttonConfigs[config.type];

  useEffect(() => {
    // アニメーション効果
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setIsRunning(false);
      setContainerInfo(null);
      setCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleLaunch = async () => {
    setIsLaunching(true);
    Vibration.vibrate(50); // 触覚フィードバック

    try {
      const result = await onLaunch(config);

      if (result.success) {
        setIsRunning(true);
        setContainerInfo(result);
        setCountdown((config.duration || 10) * 60); // minutes to seconds

        Alert.alert(
          '🚀 起動成功!',
          `${buttonConfig.title}が正常に起動しました。\n\n` +
          `アクセスURL: ${result.url || 'サーバーログを確認してください'}\n` +
          `コンテナID: ${result.containerID?.substring(0, 12)}...\n` +
          `自動停止まで: ${config.duration || 10}分`,
          [
            { text: 'ブラウザで開く', onPress: () => openInBrowser(result.url) },
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert('❌ 起動失敗', result.message || '不明なエラーが発生しました');
      }
    } catch (error) {
      Alert.alert('❌ エラー', `起動に失敗しました: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const openInBrowser = (url?: string) => {
    if (url) {
      // ブラウザで開く処理（Linking.openURLを使用）
      console.log('Opening URL:', url);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      default: return '#2196F3';
    }
  };

  const renderDetailModal = () => (
    <Modal
      visible={showDetails}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetails(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{config.title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetails(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>📝 説明</Text>
            <Text style={styles.detailText}>{config.description}</Text>
          </View>

          {config.requirements && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>⚙️ 必要条件</Text>
              {config.requirements.map((req, index) => (
                <Text key={index} style={styles.requirementItem}>• {req}</Text>
              ))}
            </View>
          )}

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>⏱️ 実行情報</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>起動時間</Text>
                <Text style={styles.infoValue}>{buttonConfig.estimatedTime}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>実行時間</Text>
                <Text style={styles.infoValue}>{buttonConfig.maxDuration}</Text>
              </View>
              {config.difficulty && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>難易度</Text>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(config.difficulty) }]}>
                    <Text style={styles.difficultyText}>{config.difficulty}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {config.tags && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>🏷️ タグ</Text>
              <View style={styles.tagsContainer}>
                {config.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>🔒 セキュリティ</Text>
            <Text style={styles.securityText}>
              • すべての実行は隔離されたDockerコンテナ内で行われます{'\n'}
              • 一時的な実行のため、データは自動削除されます{'\n'}
              • ネットワークアクセスは制限されています{'\n'}
              • リソース使用量は監視・制限されています
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.launchButton}
            onPress={() => {
              setShowDetails(false);
              handleLaunch();
            }}
            disabled={isLaunching || isRunning}
          >
            <LinearGradient
              colors={buttonConfig.gradient}
              style={styles.launchButtonGradient}
            >
              {isLaunching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="rocket-outline" size={20} color="#fff" />
                  <Text style={styles.launchButtonText}>
                    {isRunning ? '実行中...' : '今すぐ起動'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const animatedOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animatedContainer, { opacity: animatedOpacity }]}>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => setShowDetails(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={buttonConfig.gradient}
            style={styles.buttonGradient}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIcon}>
                <Ionicons name={buttonConfig.icon} size={32} color="#fff" />
                {isRunning && (
                  <View style={styles.statusIndicator}>
                    <View style={styles.runningDot} />
                  </View>
                )}
              </View>

              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>{config.title}</Text>
                <Text style={styles.buttonDescription} numberOfLines={2}>
                  {buttonConfig.description}
                </Text>
                {countdown !== null && (
                  <Text style={styles.countdownText}>
                    自動停止まで: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </Text>
                )}
              </View>

              <View style={styles.buttonActions}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  animatedContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  previewButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    padding: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    position: 'relative',
    marginRight: 15,
  },
  statusIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonDescription: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    lineHeight: 16,
  },
  countdownText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  buttonActions: {
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  requirementItem: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
    paddingLeft: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: 100,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
  },
  securityText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  launchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  launchButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  launchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InteractivePreviewButton;
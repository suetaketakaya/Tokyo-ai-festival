import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface CommandConfig {
  id: string;
  name: string;
  description: string;
  command: string;
  type: 'python' | 'matplotlib' | 'web_server' | 'docker' | 'jupyter';
  category: string;
  expected_output: string;
  execution_time: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface CommandExecutionButtonProps {
  config: CommandConfig;
  onExecute: (command: CommandConfig) => Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }>;
  projectId: string;
}

const CommandExecutionButton: React.FC<CommandExecutionButtonProps> = ({
  config,
  onExecute,
  projectId,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [lastOutput, setLastOutput] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
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

  const typeConfigs = {
    python: {
      icon: 'logo-python' as const,
      gradient: ['#3776ab', '#4b8bbe'],
      bgColor: '#306998',
    },
    matplotlib: {
      icon: 'analytics-outline' as const,
      gradient: ['#ff6b35', '#f7931e'],
      bgColor: '#ff6b35',
    },
    web_server: {
      icon: 'globe-outline' as const,
      gradient: ['#00d4aa', '#00b4d8'],
      bgColor: '#00d4aa',
    },
    docker: {
      icon: 'cube-outline' as const,
      gradient: ['#0db7ed', '#2496ed'],
      bgColor: '#0db7ed',
    },
    jupyter: {
      icon: 'book-outline' as const,
      gradient: ['#f37626', '#f57c00'],
      bgColor: '#f37626',
    },
  };

  const difficultyColors = {
    beginner: '#4CAF50',
    intermediate: '#FF9800',
    advanced: '#F44336',
  };

  const buttonConfig = typeConfigs[config.type];

  const handleExecute = async () => {
    setIsExecuting(true);
    Vibration.vibrate(50);

    try {
      const result = await onExecute(config);

      if (result.success) {
        setLastOutput(result.output || 'Command executed successfully');
        setLastError(null);
        Alert.alert(
          '✅ Command Executed Successfully',
          `Command: ${config.name}\\n\\nOutput: ${result.output || 'Completed successfully'}`,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        setLastError(result.error || 'Unknown error occurred');
        setLastOutput(null);
        Alert.alert(
          '❌ Command Failed',
          `Error: ${result.error || 'Unknown error occurred'}`,
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    } catch (error: any) {
      setLastError(error.message || 'Execution failed');
      setLastOutput(null);
      Alert.alert(
        '❌ Execution Error',
        `Failed to execute command: ${error.message || 'Unknown error'}`,
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setIsExecuting(false);
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
        <View style={[styles.modalHeader, { backgroundColor: buttonConfig.bgColor }]}>
          <Text style={styles.modalTitle}>{config.name}</Text>
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

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>💻 実行コマンド</Text>
            <View style={styles.commandBox}>
              <Text style={styles.commandText}>{config.command}</Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>⚙️ 実行情報</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>実行時間</Text>
                <Text style={styles.infoValue}>{config.execution_time}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>カテゴリ</Text>
                <Text style={styles.infoValue}>{config.category}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>難易度</Text>
                <View style={[
                  styles.difficultyBadge,
                  { backgroundColor: difficultyColors[config.difficulty] }
                ]}>
                  <Text style={styles.difficultyText}>{config.difficulty}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>📊 期待される出力</Text>
            <Text style={styles.detailText}>{config.expected_output}</Text>
          </View>

          {lastOutput && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>✅ 最新の出力</Text>
              <View style={styles.outputBox}>
                <Text style={styles.outputText}>{lastOutput}</Text>
              </View>
            </View>
          )}

          {lastError && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>❌ 最新のエラー</Text>
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{lastError}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.executeButton}
            onPress={() => {
              setShowDetails(false);
              handleExecute();
            }}
            disabled={isExecuting}
          >
            <LinearGradient
              colors={buttonConfig.gradient}
              style={styles.executeButtonGradient}
            >
              {isExecuting ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.executeButtonText}>実行中...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play-outline" size={20} color="#fff" />
                  <Text style={styles.executeButtonText}>今すぐ実行</Text>
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
          style={styles.commandButton}
          onPress={() => setShowDetails(true)}
          onLongPress={handleExecute}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={buttonConfig.gradient}
            style={styles.buttonGradient}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIcon}>
                <Ionicons name={buttonConfig.icon} size={28} color="#fff" />
                {isExecuting && (
                  <View style={styles.executingIndicator}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>

              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>{config.name}</Text>
                <Text style={styles.buttonDescription} numberOfLines={2}>
                  {config.description}
                </Text>
                <View style={styles.buttonMeta}>
                  <Text style={styles.buttonMetaText}>
                    {config.execution_time} | {config.category}
                  </Text>
                </View>
              </View>

              <View style={styles.buttonActions}>
                <View style={[
                  styles.difficultyIndicator,
                  { backgroundColor: difficultyColors[config.difficulty] }
                ]}>
                  <Text style={styles.difficultyIndicatorText}>
                    {config.difficulty[0].toUpperCase()}
                  </Text>
                </View>
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
    marginVertical: 6,
  },
  animatedContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  commandButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    padding: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    position: 'relative',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executingIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  buttonDescription: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
    lineHeight: 14,
    marginBottom: 2,
  },
  buttonMeta: {
    flexDirection: 'row',
  },
  buttonMetaText: {
    color: '#fff',
    fontSize: 9,
    opacity: 0.8,
  },
  buttonActions: {
    alignItems: 'center',
    marginLeft: 8,
  },
  difficultyIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  difficultyIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
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
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  commandBox: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  commandText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: 80,
  },
  infoLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  outputBox: {
    backgroundColor: '#0d4427',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  outputText: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorBox: {
    backgroundColor: '#4a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  executeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  executeButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CommandExecutionButton;
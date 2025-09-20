import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Clipboard,
  Alert,
} from 'react-native';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  direction: 'sent' | 'received';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  messages: WebSocketMessage[];
  title?: string;
}

const WebSocketResponseModal: React.FC<Props> = ({
  visible,
  onClose,
  messages,
  title = 'WebSocket Messages'
}) => {
  const copyToClipboard = (content: string) => {
    Clipboard.setString(content);
    Alert.alert('Copied', 'Content copied to clipboard');
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return String(obj);
    }
  };

  const getMessageTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'claude_execute': '#4CAF50',
      'claude_output': '#2196F3',
      'claude_error': '#F44336',
      'claude_stream_start': '#9C27B0',
      'claude_stream_output': '#FF9800',
      'claude_stream_end': '#9C27B0',
      'project_list_response': '#00BCD4',
      'project_create_response': '#4CAF50',
      'quick_command_response': '#FF5722',
      'error': '#F44336',
      'ping': '#607D8B',
      'pong': '#607D8B',
      'connection_established': '#4CAF50',
    };
    return colors[type] || '#666';
  };

  const getDirectionIcon = (direction: 'sent' | 'received') => {
    return direction === 'sent' ? '📤' : '📨';
  };

  const getDirectionColor = (direction: 'sent' | 'received') => {
    return direction === 'sent' ? '#2196F3' : '#4CAF50';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={() => {
              const allMessages = messages.map(msg => ({
                timestamp: formatTimestamp(msg.timestamp),
                direction: msg.direction,
                type: msg.type,
                data: msg.data,
              }));
              copyToClipboard(formatJSON(allMessages));
            }}
            style={styles.copyAllButton}
          >
            <Text style={styles.copyAllText}>Copy All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{messages.length}</Text>
            <Text style={styles.statLabel}>Total Messages</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{messages.filter(m => m.direction === 'sent').length}</Text>
            <Text style={styles.statLabel}>Sent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{messages.filter(m => m.direction === 'received').length}</Text>
            <Text style={styles.statLabel}>Received</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {messages.filter(m => m.type.includes('error')).length}
            </Text>
            <Text style={styles.statLabel}>Errors</Text>
          </View>
        </View>

        <ScrollView style={styles.messageList} showsVerticalScrollIndicator={false}>
          {messages.map((message, index) => (
            <View key={index} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <View style={styles.messageInfo}>
                  <View style={styles.messageTypeContainer}>
                    <Text style={styles.directionIcon}>
                      {getDirectionIcon(message.direction)}
                    </Text>
                    <View
                      style={[
                        styles.messageTypeBadge,
                        { backgroundColor: getMessageTypeColor(message.type) }
                      ]}
                    >
                      <Text style={styles.messageTypeText}>{message.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.messageTimestamp}>
                    {formatTimestamp(message.timestamp)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => copyToClipboard(formatJSON(message))}
                  style={styles.copyButton}
                >
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.messageContent}>
                <Text style={styles.dataLabel}>Direction:</Text>
                <Text style={[
                  styles.directionText,
                  { color: getDirectionColor(message.direction) }
                ]}>
                  {message.direction.toUpperCase()}
                </Text>

                <Text style={styles.dataLabel}>Data:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.dataText}>
                    {formatJSON(message.data)}
                  </Text>
                </ScrollView>
              </View>

              {/* Special handling for specific message types */}
              {message.type === 'claude_output' && message.data?.output && (
                <View style={styles.outputPreview}>
                  <Text style={styles.outputLabel}>Output Preview:</Text>
                  <ScrollView style={styles.outputContainer} nestedScrollEnabled>
                    <Text style={styles.outputText}>{message.data.output}</Text>
                  </ScrollView>
                </View>
              )}

              {message.type === 'claude_error' && message.data?.error && (
                <View style={styles.errorPreview}>
                  <Text style={styles.errorLabel}>Error Details:</Text>
                  <Text style={styles.errorText}>{message.data.error}</Text>
                </View>
              )}

              {message.type === 'project_list_response' && message.data?.projects && (
                <View style={styles.projectsPreview}>
                  <Text style={styles.projectsLabel}>
                    Projects ({message.data.total}):
                  </Text>
                  {message.data.projects.slice(0, 3).map((project: any, idx: number) => (
                    <Text key={idx} style={styles.projectItem}>
                      • {project.name} ({project.status})
                    </Text>
                  ))}
                  {message.data.projects.length > 3 && (
                    <Text style={styles.moreText}>
                      ... and {message.data.projects.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}

          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No Messages</Text>
              <Text style={styles.emptyDescription}>
                WebSocket messages will appear here
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    color: '#666',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  copyAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  copyAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messageList: {
    flex: 1,
    padding: 15,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  messageInfo: {
    flex: 1,
  },
  messageTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  directionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  messageTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  messageTimestamp: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Courier',
  },
  copyButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  messageContent: {
    padding: 15,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  directionText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  dataText: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#333',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 6,
    lineHeight: 16,
  },
  outputPreview: {
    backgroundColor: '#f8f9fa',
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    padding: 10,
  },
  outputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  outputContainer: {
    maxHeight: 100,
  },
  outputText: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
  errorPreview: {
    backgroundColor: '#fff5f5',
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    lineHeight: 16,
  },
  projectsPreview: {
    backgroundColor: '#f0f8ff',
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    padding: 10,
  },
  projectsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  projectItem: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
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
  },
});

export default WebSocketResponseModal;
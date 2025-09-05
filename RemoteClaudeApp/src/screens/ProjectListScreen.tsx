import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Navigation';
import WebSocketService from '../services/WebSocketService';

type ProjectListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProjectList'
>;

type ProjectListScreenRouteProp = RouteProp<RootStackParamList, 'ProjectList'>;

interface Props {
  navigation: ProjectListScreenNavigationProp;
  route: ProjectListScreenRouteProp;
}

interface Project {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'building' | 'error';
  lastModified: string;
  path?: string;
}

export default function ProjectListScreen({ navigation, route }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { connectionUrl, sessionKey } = route.params;

  useEffect(() => {
    connectToServer();
    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  const connectToServer = async () => {
    try {
      setIsLoading(true);
      
      const success = await WebSocketService.connect(connectionUrl, {
        onOpen: () => {
          console.log('✅ Connected to RemoteClaude server');
          setIsConnected(true);
          requestProjectList();
        },
        onMessage: (message) => {
          handleServerMessage(message);
        },
        onError: (error) => {
          console.error('❌ WebSocket error:', error);
          Alert.alert('Connection Error', 'Failed to connect to the server.');
        },
        onClose: () => {
          console.log('🔌 Disconnected from server');
          setIsConnected(false);
        },
      });

      if (!success) {
        Alert.alert('Connection Failed', 'Could not connect to the RemoteClaude server.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to establish connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestProjectList = () => {
    WebSocketService.send({
      type: 'project_list_request',
      data: {}
    });
  };

  const handleServerMessage = (message: any) => {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'connection_established':
        console.log('🚀 Connection established with server v' + message.data?.server_version);
        break;
        
      case 'project_list_response':
        if (message.data?.projects) {
          setProjects(message.data.projects);
        }
        break;
        
      case 'error':
        Alert.alert('Server Error', message.data?.message || 'Unknown error occurred.');
        break;
      
      case 'claude_output':
      case 'claude_error':
        // These messages are handled by DevelopmentScreen, ignore them here
        console.log('🔄 PROJECTLIST: Ignoring development message type:', message.type);
        return;
        
      default:
        console.log('🚨 PROJECTLIST: Unknown message type:', message.type);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    requestProjectList();
    setRefreshing(false);
  };

  const handleProjectSelect = (project: Project) => {
    if (project.status === 'error') {
      Alert.alert('Project Error', 'This project is in an error state and cannot be accessed.');
      return;
    }

    navigation.navigate('Development', {
      projectId: project.id,
      projectName: project.name,
      connectionUrl: connectionUrl,
      sessionKey: sessionKey,
    });
  };

  const handleCreateProject = () => {
    Alert.alert(
      '🚀 Create New Project',
      'This will create a new Docker-based development environment.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            // TODO: Implement project creation flow
            Alert.alert('Coming Soon', 'Project creation will be implemented in the next version.');
          }
        },
      ]
    );
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'running': return '#28a745';
      case 'stopped': return '#6c757d';
      case 'building': return '#ffc107';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'running': return '🟢 Running';
      case 'stopped': return '⚫ Stopped';
      case 'building': return '🟡 Building';
      case 'error': return '🔴 Error';
      default: return '⚫ Unknown';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Connecting to RemoteClaude...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ Not Connected</Text>
        <Text style={styles.errorSubText}>
          Unable to connect to the RemoteClaude server.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={connectToServer}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>RemoteClaude Projects</Text>
          <Text style={styles.connectionInfo}>
            🟢 Connected • Session: {sessionKey.substring(0, 8)}...
          </Text>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreateProject}>
          <Text style={styles.createButtonText}>+ Create New Project</Text>
        </TouchableOpacity>

        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>📂 No Projects Found</Text>
            <Text style={styles.emptySubText}>
              Create your first project to get started with RemoteClaude development.
            </Text>
            <TouchableOpacity style={styles.setupButton} onPress={handleCreateProject}>
              <Text style={styles.setupButtonText}>🚀 Create First Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectCard}
              onPress={() => handleProjectSelect(project)}
            >
              <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={[styles.projectStatus, { color: getStatusColor(project.status) }]}>
                  {getStatusText(project.status)}
                </Text>
              </View>
              <Text style={styles.projectId}>ID: {project.id}</Text>
              <Text style={styles.lastModified}>
                Last modified: {new Date(project.lastModified).toLocaleString()}
              </Text>
              {project.path && (
                <Text style={styles.projectPath}>📁 {project.path}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  connectionInfo: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  errorSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  setupButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  projectCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  projectStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  projectId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  lastModified: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  projectPath: {
    fontSize: 12,
    color: '#007AFF',
  },
});
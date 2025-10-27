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
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';

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
    checkConnection();

    return () => {
      // Cleanup callbacks when component unmounts
      EnhancedWebSocketService.unregisterScreenCallbacks('projectlist');
    };
  }, []);

  const checkConnection = async () => {
    console.log('🔍 ProjectListScreen - Checking connection...');
    const wsConnected = EnhancedWebSocketService.isConnected();
    console.log('🔍 WebSocket connected:', wsConnected);
    
    if (wsConnected) {
      setIsConnected(true);
      setIsLoading(false);
      
      // Register callbacks for this screen
      EnhancedWebSocketService.registerScreenCallbacks('projectlist', {
        onMessage: (message) => {
          handleServerMessage(message);
        },
        onClose: () => {
          console.log('🔌 Disconnected from server in ProjectList');
          setIsConnected(false);
        },
      }, 2); // High priority for project list
      
      // Request project list
      requestProjectList();
    } else {
      console.log('❌ No WebSocket connection found, attempting to connect...');
      connectToServer();
    }
  };

  const connectToServer = async () => {
    try {
      setIsLoading(true);
      
      const success = await EnhancedWebSocketService.connect(connectionUrl, {
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
      }, 'projectlist'); // Register with screen ID

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
    EnhancedWebSocketService.send({
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
        
      case 'project_create_status':
        // Show creation progress
        console.log('Project creation status:', message.data?.message);
        break;
        
      case 'project_create_response':
        console.log('🎉 ProjectListScreen: Received project_create_response:', message.data);
        setIsLoading(false);
        if (message.data?.project) {
          Alert.alert('Success!', message.data?.message || 'Project created successfully!');
          // Refresh project list after a short delay to ensure server is ready
          setTimeout(() => {
            console.log('🔄 ProjectListScreen: Refreshing project list after creation');
            requestProjectList();
          }, 1000);
        }
        break;

      case 'project_start_response':
        Alert.alert('Success!', message.data?.message || 'Project started successfully!');
        requestProjectList();
        break;

      case 'project_stop_response':
        Alert.alert('Success!', message.data?.message || 'Project stopped successfully!');
        requestProjectList();
        break;

      case 'project_remove_response':
        Alert.alert('Success!', message.data?.message || 'Project removed successfully!');
        requestProjectList();
        break;
        
      case 'error':
        setIsLoading(false);
        Alert.alert('Server Error', message.data?.message || 'Unknown error occurred.');
        break;
      
      case 'preview_list_response':
        // This message is handled by DevelopmentScreen, ignore here
        console.log('🔄 PROJECTLIST: Forwarding preview_list_response to DevelopmentScreen');
        return;

      case 'claude_progress':
      case 'stage_completed':
      case 'execution_progress':
      case 'preview_ready':
      case 'claude_thinking':
      case 'claude_output':
      case 'claude_error':
      case 'preview_jupyter_ready':
      case 'preview_webapp_response':
      case 'matplotlib_generated':
      case 'code_generated':
      case 'execution_completed':
      case 'container_info_response':
        // These messages are handled by DevelopmentScreen, ignore them here
        console.log('🔄 PROJECTLIST: Ignoring development message type:', message.type);
        return;

      default:
        console.log('🚨 PROJECTLIST: Unknown message type:', message.type);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (EnhancedWebSocketService.isConnected()) {
      requestProjectList();
    } else {
      await checkConnection();
    }
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
      serverUrl: connectionUrl || '',
    });
  };

  const handleCreateProject = () => {
    Alert.prompt(
      '🚀 Create New Project',
      'Enter a name for your new Docker project:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: (projectName) => {
            if (projectName && projectName.trim()) {
              createProject(projectName.trim());
            } else {
              Alert.alert('Error', 'Project name cannot be empty.');
            }
          }
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const createProject = (projectName: string) => {
    setIsLoading(true);
    
    EnhancedWebSocketService.send({
      type: 'project_create_request',
      data: {
        name: projectName,
        type: 'general',  // Default project type
        config: {},
        resources: {
          memory: '2g',
          cpus: '1.0'
        }
      }
    });
  };

  const startProject = (projectId: string) => {
    EnhancedWebSocketService.send({
      type: 'project_start_request',
      data: {
        project_id: projectId
      }
    });
  };

  const stopProject = (projectId: string) => {
    EnhancedWebSocketService.send({
      type: 'project_stop_request',
      data: {
        project_id: projectId
      }
    });
  };

  const removeProject = (projectId: string) => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            EnhancedWebSocketService.send({
              type: 'project_remove_request',
              data: {
                project_id: projectId
              }
            });
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
        <TouchableOpacity style={styles.retryButton} onPress={checkConnection}>
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
          <View style={styles.titleRow}>
            <Text style={styles.title}>RemoteClaude Projects</Text>
            {/* <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.settingsButtonText}>⚙️</Text>
            </TouchableOpacity> */}
          </View>
          <Text style={styles.connectionInfo}>
            🟢 Connected • Session: {sessionKey?.substring(0, 8) || 'Unknown'}...
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
            <View key={project.id} style={styles.projectCard}>
              <TouchableOpacity
                onPress={() => handleProjectSelect(project)}
                style={styles.projectContent}
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
              
              <View style={styles.projectActions}>
                {project.status === 'stopped' ? (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => startProject(project.id)}
                  >
                    <Text style={styles.actionButtonText}>▶️ Start</Text>
                  </TouchableOpacity>
                ) : project.status === 'running' ? (
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={() => stopProject(project.id)}
                  >
                    <Text style={styles.actionButtonText}>⏹️ Stop</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => navigation.navigate('ProjectManagement', {
                    serverUrl: connectionUrl || '',
                    projectId: project.id,
                    projectName: project.name,
                  })}
                >
                  <Text style={styles.actionButtonText}>⚙️ Manage</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeProject(project.id)}
                >
                  <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  projectContent: {
    flex: 1,
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  startButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  manageButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  settingsButtonText: {
    fontSize: 20,
  },
});
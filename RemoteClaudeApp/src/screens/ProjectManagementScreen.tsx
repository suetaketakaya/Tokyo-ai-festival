import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  RefreshControl,
} from 'react-native';
import EnhancedWebSocketService from '../services/EnhancedWebSocketService';

interface ProjectDetails {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  containerId: string;
  ports: PortInfo[];
  resources: {
    memory: string;
    cpus: string;
  };
  environment: {
    [key: string]: string;
  };
  createdAt: Date;
  lastUsed: Date;
}

interface PortInfo {
  internal: number;
  external: number;
  protocol: 'tcp' | 'udp';
  service: string;
  status: 'open' | 'closed';
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

const ProjectManagementScreen: React.FC<Props> = ({ route, navigation }) => {
  const { serverUrl, projectId, projectName } = route.params;
  const [isConnected, setIsConnected] = useState(false);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPortModal, setShowPortModal] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [newPortInternal, setNewPortInternal] = useState('');
  const [newPortExternal, setNewPortExternal] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  useEffect(() => {
    navigation.setOptions({
      title: `Project: ${projectName || projectId}`,
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: isConnected ? '#4CAF50' : '#f44336' }]}
            onPress={refreshProjectDetails}
          >
            <Text style={styles.headerButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, projectName, projectId, isConnected]);

  useEffect(() => {
    connectToServer();
    return () => {
      EnhancedWebSocketService.unregisterScreenCallbacks('project_management');
    };
  }, []);

  const connectToServer = async () => {
    try {
      const success = await EnhancedWebSocketService.connect(serverUrl, {
        onOpen: () => {
          setIsConnected(true);
          loadProjectDetails();
        },
        onMessage: handleServerMessage,
        onError: (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        },
        onClose: () => {
          setIsConnected(false);
        },
      }, 'project_management');

      if (!success) {
        Alert.alert('Connection Failed', 'Could not connect to the server.');
      }
    } catch (error) {
      console.error('Connection setup error:', error);
    }
  };

  const handleServerMessage = (message: any) => {
    const messageType = message.type ? message.type.toString().trim() : '';

    switch (messageType) {
      case 'project_details':
        handleProjectDetails(message.data);
        break;

      case 'project_status_updated':
        updateProjectStatus(message.data);
        break;

      case 'port_operation_result':
        handlePortOperationResult(message.data);
        break;

      case 'environment_updated':
        handleEnvironmentUpdated(message.data);
        break;

      case 'project_error':
        Alert.alert('Project Error', message.data?.error || 'Unknown error occurred');
        setIsLoading(false);
        break;

      default:
        break;
    }
  };

  const handleProjectDetails = (data: any) => {
    if (data.project) {
      const project: ProjectDetails = {
        id: data.project.id,
        name: data.project.name,
        type: data.project.type,
        status: data.project.status,
        containerId: data.project.container_id,
        ports: data.project.ports || [],
        resources: data.project.resources || { memory: '1g', cpus: '0.5' },
        environment: data.project.environment || {},
        createdAt: new Date(data.project.created_at),
        lastUsed: new Date(data.project.last_used || Date.now()),
      };
      setProjectDetails(project);
    }
    setIsLoading(false);
    setRefreshing(false);
  };

  const updateProjectStatus = (data: any) => {
    if (projectDetails && data.project_id === projectId) {
      setProjectDetails(prev => prev ? { ...prev, status: data.status } : null);
    }
  };

  const handlePortOperationResult = (data: any) => {
    if (data.success) {
      loadProjectDetails(); // Refresh to get updated port info
      Alert.alert('Success', data.message || 'Port operation completed');
    } else {
      Alert.alert('Port Error', data.error || 'Port operation failed');
    }
  };

  const handleEnvironmentUpdated = (data: any) => {
    if (data.success && projectDetails) {
      setProjectDetails(prev => prev ? { ...prev, environment: data.environment } : null);
      Alert.alert('Success', 'Environment variables updated');
    } else {
      Alert.alert('Environment Error', data.error || 'Failed to update environment');
    }
  };

  const loadProjectDetails = () => {
    setIsLoading(true);
    EnhancedWebSocketService.send({
      type: 'project_details_request',
      data: { project_id: projectId }
    });
  };

  const refreshProjectDetails = () => {
    setRefreshing(true);
    loadProjectDetails();
  };

  const startProject = () => {
    Alert.alert(
      'Start Project',
      `Are you sure you want to start project "${projectDetails?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            EnhancedWebSocketService.send({
              type: 'project_start',
              data: { project_id: projectId }
            });
          }
        }
      ]
    );
  };

  const stopProject = () => {
    Alert.alert(
      'Stop Project',
      `Are you sure you want to stop project "${projectDetails?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            EnhancedWebSocketService.send({
              type: 'project_stop',
              data: { project_id: projectId }
            });
          }
        }
      ]
    );
  };

  const restartProject = () => {
    Alert.alert(
      'Restart Project',
      `Are you sure you want to restart project "${projectDetails?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: () => {
            EnhancedWebSocketService.send({
              type: 'project_restart',
              data: { project_id: projectId }
            });
          }
        }
      ]
    );
  };

  const deleteProject = () => {
    Alert.alert(
      'Delete Project',
      `⚠️ This will permanently delete project "${projectDetails?.name}" and all its data. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            EnhancedWebSocketService.send({
              type: 'project_delete',
              data: { project_id: projectId }
            });
            navigation.goBack();
          }
        }
      ]
    );
  };

  const addPort = () => {
    if (!newPortInternal || !newPortExternal) {
      Alert.alert('Error', 'Please enter both internal and external port numbers');
      return;
    }

    EnhancedWebSocketService.send({
      type: 'project_add_port',
      data: {
        project_id: projectId,
        internal_port: parseInt(newPortInternal),
        external_port: parseInt(newPortExternal),
        protocol: 'tcp'
      }
    });

    setNewPortInternal('');
    setNewPortExternal('');
    setShowPortModal(false);
  };

  const removePort = (port: PortInfo) => {
    Alert.alert(
      'Remove Port',
      `Remove port mapping ${port.external}:${port.internal}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            EnhancedWebSocketService.send({
              type: 'project_remove_port',
              data: {
                project_id: projectId,
                internal_port: port.internal,
                external_port: port.external
              }
            });
          }
        }
      ]
    );
  };

  const addEnvironmentVariable = () => {
    if (!newEnvKey || !newEnvValue) {
      Alert.alert('Error', 'Please enter both key and value');
      return;
    }

    const updatedEnv = { ...projectDetails?.environment, [newEnvKey]: newEnvValue };

    EnhancedWebSocketService.send({
      type: 'project_update_environment',
      data: {
        project_id: projectId,
        environment: updatedEnv
      }
    });

    setNewEnvKey('');
    setNewEnvValue('');
    setShowEnvModal(false);
  };

  const removeEnvironmentVariable = (key: string) => {
    Alert.alert(
      'Remove Environment Variable',
      `Remove environment variable "${key}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedEnv = { ...projectDetails?.environment };
            delete updatedEnv[key];

            EnhancedWebSocketService.send({
              type: 'project_update_environment',
              data: {
                project_id: projectId,
                environment: updatedEnv
              }
            });
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#4CAF50';
      case 'stopped': return '#f44336';
      case 'starting': return '#FF9800';
      case 'stopping': return '#FF5722';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '🔴';
      case 'starting': return '🟡';
      case 'stopping': return '🟠';
      default: return '⚪';
    }
  };

  const renderProjectInfo = () => {
    if (!projectDetails) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{projectDetails.name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>{getStatusIcon(projectDetails.status)}</Text>
            <Text style={[styles.statusText, { color: getStatusColor(projectDetails.status) }]}>
              {projectDetails.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type:</Text>
          <Text style={styles.infoValue}>{projectDetails.type}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Container ID:</Text>
          <Text style={styles.infoValueMono}>{projectDetails.containerId.substring(0, 12)}...</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Resources:</Text>
          <Text style={styles.infoValue}>
            {projectDetails.resources.memory} RAM, {projectDetails.resources.cpus} CPU
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>{projectDetails.createdAt.toLocaleDateString()}</Text>
        </View>
      </View>
    );
  };

  const renderControlButtons = () => {
    if (!projectDetails) return null;

    const isRunning = projectDetails.status === 'running';
    const isTransitioning = projectDetails.status === 'starting' || projectDetails.status === 'stopping';

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Control</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#4CAF50' }, isRunning && styles.disabledButton]}
            onPress={startProject}
            disabled={isRunning || isTransitioning}
          >
            <Text style={styles.controlButtonText}>▶ Start</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#f44336' }, !isRunning && styles.disabledButton]}
            onPress={stopProject}
            disabled={!isRunning || isTransitioning}
          >
            <Text style={styles.controlButtonText}>⏹ Stop</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#FF9800' }]}
            onPress={restartProject}
            disabled={isTransitioning}
          >
            <Text style={styles.controlButtonText}>🔄 Restart</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.controlButton, styles.deleteButton]}
          onPress={deleteProject}
        >
          <Text style={styles.controlButtonText}>🗑 Delete Project</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPorts = () => {
    if (!projectDetails) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Port Mappings</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowPortModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {projectDetails.ports.length === 0 ? (
          <Text style={styles.emptyText}>No port mappings configured</Text>
        ) : (
          projectDetails.ports.map((port, index) => (
            <View key={index} style={styles.portItem}>
              <View style={styles.portInfo}>
                <Text style={styles.portText}>
                  {port.external}:{port.internal} ({port.protocol})
                </Text>
                <Text style={styles.portService}>{port.service || 'Unknown'}</Text>
                <Text style={[styles.portStatus, { color: port.status === 'open' ? '#4CAF50' : '#f44336' }]}>
                  {port.status}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePort(port)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderEnvironment = () => {
    if (!projectDetails) return null;

    const envEntries = Object.entries(projectDetails.environment);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Environment Variables</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowEnvModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {envEntries.length === 0 ? (
          <Text style={styles.emptyText}>No environment variables set</Text>
        ) : (
          envEntries.map(([key, value], index) => (
            <View key={index} style={styles.envItem}>
              <View style={styles.envInfo}>
                <Text style={styles.envKey}>{key}</Text>
                <Text style={styles.envValue}>{value}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeEnvironmentVariable(key)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderPortModal = () => (
    <Modal
      visible={showPortModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Port Mapping</Text>
          <TouchableOpacity onPress={() => setShowPortModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>External Port (Host)</Text>
            <TextInput
              style={styles.textInput}
              value={newPortExternal}
              onChangeText={setNewPortExternal}
              placeholder="e.g. 8080"
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Internal Port (Container)</Text>
            <TextInput
              style={styles.textInput}
              value={newPortInternal}
              onChangeText={setNewPortInternal}
              placeholder="e.g. 8000"
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity style={styles.modalButton} onPress={addPort}>
            <Text style={styles.modalButtonText}>Add Port Mapping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderEnvModal = () => (
    <Modal
      visible={showEnvModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Environment Variable</Text>
          <TouchableOpacity onPress={() => setShowEnvModal(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Variable Name</Text>
            <TextInput
              style={styles.textInput}
              value={newEnvKey}
              onChangeText={setNewEnvKey}
              placeholder="e.g. API_KEY"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Variable Value</Text>
            <TextInput
              style={styles.textInput}
              value={newEnvValue}
              onChangeText={setNewEnvValue}
              placeholder="e.g. your-api-key-here"
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity style={styles.modalButton} onPress={addEnvironmentVariable}>
            <Text style={styles.modalButtonText}>Add Variable</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading && !projectDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading project details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProjectDetails}
            tintColor="#4CAF50"
          />
        }
      >
        {renderProjectInfo()}
        {renderControlButtons()}
        {renderPorts()}
        {renderEnvironment()}
      </ScrollView>

      {renderPortModal()}
      {renderEnvModal()}
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
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 16,
  },
  section: {
    margin: 15,
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  infoValueMono: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'Courier',
    flex: 2,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    marginTop: 10,
    marginHorizontal: 0,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  portItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  portInfo: {
    flex: 1,
  },
  portText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  portService: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  portStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  envItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  envInfo: {
    flex: 1,
  },
  envKey: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Courier',
  },
  envValue: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Courier',
  },
  removeButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
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
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectManagementScreen;
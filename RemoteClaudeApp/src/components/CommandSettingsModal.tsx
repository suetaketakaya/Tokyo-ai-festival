import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  Switch,
} from 'react-native';

interface Command {
  id: string;
  name: string;
  command: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  isFavorite?: boolean;
  isCustom?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaveCommand: (command: Command) => void;
  onDeleteCommand?: (commandId: string) => void;
  editingCommand?: Command | null;
}

const categories = [
  { id: 'Git', name: 'Git', color: '#FF9800' },
  { id: 'System', name: 'System', color: '#2196F3' },
  { id: 'Development', name: 'Development', color: '#4CAF50' },
  { id: 'Docker', name: 'Docker', color: '#2196F3' },
  { id: 'Network', name: 'Network', color: '#00BCD4' },
  { id: 'Custom', name: 'Custom', color: '#9C27B0' },
];


const colors = ['#FF9800', '#2196F3', '#4CAF50', '#F44336', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B', '#795548', '#E91E63'];

const CommandSettingsModal: React.FC<Props> = ({
  visible,
  onClose,
  onSaveCommand,
  onDeleteCommand,
  editingCommand
}) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Custom');
  const [selectedColor, setSelectedColor] = useState('#9C27B0');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (editingCommand) {
      setName(editingCommand.name);
      setCommand(editingCommand.command);
      setDescription(editingCommand.description);
      setCategory(editingCommand.category);
      setSelectedColor(editingCommand.color);
      setIsFavorite(editingCommand.isFavorite || false);
    } else {
      // Reset for new command
      setName('');
      setCommand('');
      setDescription('');
      setCategory('Custom');
      setSelectedColor('#9C27B0');
      setIsFavorite(false);
    }
  }, [editingCommand, visible]);

  const handleSave = () => {
    if (!name.trim() || !command.trim()) {
      Alert.alert('Error', 'Name and command are required');
      return;
    }

    const newCommand: Command = {
      id: editingCommand?.id || Date.now().toString(),
      name: name.trim(),
      command: command.trim(),
      description: description.trim(),
      category,
      icon: '',
      color: selectedColor,
      isFavorite,
      isCustom: true,
    };

    onSaveCommand(newCommand);
    onClose();
  };

  const handleDelete = () => {
    if (editingCommand && onDeleteCommand) {
      Alert.alert(
        'Delete Command',
        `Are you sure you want to delete "${editingCommand.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onDeleteCommand(editingCommand.id);
              onClose();
            },
          },
        ]
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingCommand ? 'Edit Command' : 'Add Command'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Command name"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Command *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={command}
                onChangeText={setCommand}
                placeholder="Command to execute (e.g., git status)"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryList}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryItem,
                      category === cat.id && styles.categoryItemSelected,
                      { borderColor: cat.color }
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorList}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorItem,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorItemSelected
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.favoriteRow}>
                <Text style={styles.label}>Add to Favorites</Text>
                <Switch
                  value={isFavorite}
                  onValueChange={setIsFavorite}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={isFavorite ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={[styles.previewCard, { borderLeftColor: selectedColor }]}>
              <View style={styles.previewHeader}>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{name || 'Command Name'}</Text>
                  <Text style={styles.previewCategory}>{category}</Text>
                </View>
                {isFavorite && <Text style={styles.favoriteIcon}>⭐</Text>}
              </View>
              <Text style={styles.previewDescription}>
                {description || 'Command description'}
              </Text>
              <Text style={styles.previewCommand}>{command || 'command'}</Text>
            </View>
          </View>

          {editingCommand && editingCommand.isCustom && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteText}>Delete Command</Text>
              </TouchableOpacity>
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
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryList: {
    flexDirection: 'row',
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  categoryItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  colorList: {
    flexDirection: 'row',
  },
  colorItem: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorItemSelected: {
    borderColor: '#333',
  },
  favoriteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  previewCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  favoriteIcon: {
    fontSize: 16,
  },
  previewDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  previewCommand: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Courier',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CommandSettingsModal;
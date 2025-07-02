import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface LocationMemory {
  id: string;
  title: string;
  description: string;
  emoji: string;
  photoUri?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: number;
}

const EMOJI_LIST = ['📍', '🏠', '🏢', '🍕', '☕', '🌳', '🏖️', '🎉', '❤️', '⭐', '🎈', '🌸', '🔥', '💎', '🌟'];

export default function MemoriesScreen() {
  const [memories, setMemories] = useState<LocationMemory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📍');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const stored = await AsyncStorage.getItem('locationMemories');
      if (stored) {
        const parsed = JSON.parse(stored);
        setMemories(parsed.sort((a: LocationMemory, b: LocationMemory) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const saveMemories = async (newMemories: LocationMemory[]) => {
    try {
      await AsyncStorage.setItem('locationMemories', JSON.stringify(newMemories));
      setMemories(newMemories.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error saving memories:', error);
      Alert.alert('Error', 'Failed to save memory');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to save memories with location.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let address = '';
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          address = [addr.street, addr.city, addr.region]
            .filter(Boolean)
            .join(', ');
        }
      } catch (error) {
        console.log('Error getting address:', error);
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get current location');
      return null;
    }
  };

  const pickImage = async () => {
    try {
      // Request permission to access photo library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to select images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const createMemory = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for your memory');
      return;
    }

    setLoading(true);
    
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setLoading(false);
        return;
      }

      let photoUri = capturedPhoto;
      
      // Photo is already available from the picker, no need to save to media library
      // The image picker already provides a persistent URI that we can use

      const newMemory: LocationMemory = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        emoji: selectedEmoji,
        photoUri: photoUri || undefined,
        location,
        timestamp: Date.now(),
      };

      const updatedMemories = [newMemory, ...memories];
      await saveMemories(updatedMemories);

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedEmoji('📍');
      setCapturedPhoto(null);
      setModalVisible(false);

      Alert.alert('Success!', 'Memory saved successfully!');
    } catch (error) {
      console.error('Error creating memory:', error);
      Alert.alert('Error', 'Failed to create memory');
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const updatedMemories = memories.filter(m => m.id !== id);
            await saveMemories(updatedMemories);
          }
        },
      ]
    );
  };

  const openMemoryLocation = (memory: LocationMemory) => {
    const url = `http://maps.apple.com/?q=${memory.location.latitude},${memory.location.longitude}`;
    require('react-native').Linking.openURL(url);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Location Memories</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Memories List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {memories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No memories yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first location memory by tapping the + button above
            </Text>
          </View>
        ) : (
          memories.map((memory) => (
            <View key={memory.id} style={styles.memoryCard}>
              <View style={styles.memoryHeader}>
                <View style={styles.memoryTitleRow}>
                  <Text style={styles.memoryEmoji}>{memory.emoji}</Text>
                  <Text style={styles.memoryTitle}>{memory.title}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => deleteMemory(memory.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </View>

              {memory.photoUri && (
                <Image 
                  source={{ uri: memory.photoUri }} 
                  style={styles.memoryPhoto}
                  contentFit="cover"
                />
              )}

              {memory.description && (
                <Text style={styles.memoryDescription}>{memory.description}</Text>
              )}

              <View style={styles.memoryFooter}>
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={() => openMemoryLocation(memory)}
                >
                  <Ionicons name="location-outline" size={16} color="#007AFF" />
                  <Text style={styles.locationText}>
                    {memory.location.address || `${memory.location.latitude.toFixed(4)}, ${memory.location.longitude.toFixed(4)}`}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.timestampText}>{formatDate(memory.timestamp)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Memory Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Memory</Text>
            <TouchableOpacity 
              onPress={createMemory}
              disabled={loading}
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Emoji Selection */}
            <Text style={styles.sectionTitle}>Choose an emoji</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.emojiContainer}
            >
              {EMOJI_LIST.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    selectedEmoji === emoji && styles.emojiButtonSelected
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title Input */}
            <Text style={styles.sectionTitle}>Title *</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Enter a title for this memory..."
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />

            {/* Description Input */}
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add a description (optional)..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={200}
            />

            {/* Photo Section */}
            <Text style={styles.sectionTitle}>Photo</Text>
            {capturedPhoto ? (
              <View style={styles.photoContainer}>
                <Image 
                  source={{ uri: capturedPhoto }} 
                  style={styles.previewPhoto}
                  contentFit="cover"
                />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => setCapturedPhoto(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Ionicons name="images" size={24} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  memoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memoryEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  memoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  memoryPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  memoryDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  memoryFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    flex: 1,
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emojiContainer: {
    marginBottom: 10,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  emojiButtonSelected: {
    backgroundColor: '#007AFF',
  },
  emojiText: {
    fontSize: 24,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    height: 100,
    textAlignVertical: 'top',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  cameraButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  photoButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  photoContainer: {
    position: 'relative',
  },
  previewPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
});

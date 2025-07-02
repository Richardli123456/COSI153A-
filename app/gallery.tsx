import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const numColumns = 3;
const imageSize = (width - 40) / numColumns; // 40 for padding

interface Photo {
  id: string;
  uri: string;
  creationTime: number;
  filename: string;
  localUri?: string; // For iOS compatibility
}

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  // Function to get proper URI for iOS photos
  const getPhotoInfo = async (asset: MediaLibrary.Asset): Promise<Photo> => {
    try {
      // Get asset info which includes the local URI
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
      return {
        id: asset.id,
        uri: assetInfo.localUri || asset.uri,
        creationTime: asset.creationTime,
        filename: asset.filename,
        localUri: assetInfo.localUri,
      };
    } catch (error) {
      console.log('Error getting asset info for', asset.id, error);
      // Fallback to original URI
      return {
        id: asset.id,
        uri: asset.uri,
        creationTime: asset.creationTime,
        filename: asset.filename,
      };
    }
  };

  const loadPhotos = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photo library to view photos.');
        return;
      }
    }

    try {
      setLoading(true);
      
      let allPhotos: Photo[] = [];

      // First, try to get photos from our custom album
      try {
        const albumName = 'Camera App Photos';
        const album = await MediaLibrary.getAlbumAsync(albumName);
        
        if (album) {
          const albumAssets = await MediaLibrary.getAssetsAsync({
            album: album,
            mediaType: 'photo',
            sortBy: 'creationTime',
            first: 50,
          });

          // Get proper URIs for each photo
          const albumPhotos = await Promise.all(
            albumAssets.assets.map(asset => getPhotoInfo(asset))
          );

          allPhotos = [...albumPhotos];
        }
      } catch (albumError) {
        console.log('No custom album found or error accessing it:', albumError);
      }

      // Also get recent photos from camera roll
      const recentResult = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: 'creationTime',
        first: 50,
      });

      // Get proper URIs for recent photos
      const recentPhotos = await Promise.all(
        recentResult.assets.map(asset => getPhotoInfo(asset))
      );

      // Merge and deduplicate photos
      const photoMap = new Map();
      [...allPhotos, ...recentPhotos].forEach(photo => {
        photoMap.set(photo.id, photo);
      });

      const uniquePhotos = Array.from(photoMap.values()).sort(
        (a, b) => b.creationTime - a.creationTime
      );

      setPhotos(uniquePhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      const canDelete = await MediaLibrary.deleteAssetsAsync([photoId]);
      if (canDelete) {
        setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId));
        setModalVisible(false);
        Alert.alert('Success', 'Photo deleted successfully!');
      } else {
        Alert.alert('Error', 'Failed to delete photo.');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo.');
    }
  };

  const confirmDelete = (photo: Photo) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(photo.id) },
      ]
    );
  };

  const openPhotoModal = (photo: Photo) => {
    setSelectedPhoto(photo);
    setModalVisible(true);
  };

  const renderPhoto = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.photoContainer}
      onPress={() => openPhotoModal(item)}
    >
      <Image 
        source={{ uri: item.uri }} 
        style={styles.photo}
        onError={(error) => {
          console.log('Error loading image:', item.id, error.error);
        }}
        contentFit="cover"
      />
    </TouchableOpacity>
  );

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="images-outline" size={64} color="#ccc" />
        <Text style={styles.permissionText}>
          Permission needed to access your photo library
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gallery</Text>
        <TouchableOpacity onPress={loadPhotos} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>
            Take some photos with the camera to see them here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.photoList}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadPhotos} />
          }
        />
      )}

      {/* Photo Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          />
          
          {selectedPhoto && (
            <View style={styles.modalContent}>
              <Image 
                source={{ uri: selectedPhoto.uri }} 
                style={styles.modalImage}
                onError={(error) => {
                  console.log('Error loading modal image:', selectedPhoto.id, error.error);
                }}
                contentFit="contain"
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => confirmDelete(selectedPhoto)}
                >
                  <Ionicons name="trash" size={24} color="white" />
                  <Text style={styles.modalButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
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
  refreshButton: {
    padding: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  },
  photoList: {
    padding: 10,
  },
  photoContainer: {
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  photo: {
    width: imageSize,
    height: imageSize,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '85%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 100,
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
  modalButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

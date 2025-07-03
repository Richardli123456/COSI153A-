import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

// Using WebView for Google Maps display

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

interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}

export default function MapScreen() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [memories, setMemories] = useState<LocationMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<LocationMemory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    getCurrentLocation();
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

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show your location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: getCurrentLocation },
          ]
        );
        setLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        altitude: currentLocation.coords.altitude,
        accuracy: currentLocation.coords.accuracy,
        speed: currentLocation.coords.speed,
        heading: currentLocation.coords.heading,
      };

      setLocation(locationData);
      setLastUpdated(new Date());

      // Get address from coordinates (reverse geocoding)
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          const formattedAddress = [
            addr.streetNumber,
            addr.street,
            addr.city,
            addr.region,
            addr.country,
          ]
            .filter(Boolean)
            .join(', ');
          setAddress(formattedAddress);
        }
      } catch (reverseGeoError) {
        console.log('Error getting address:', reverseGeoError);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again.',
        [{ text: 'Retry', onPress: getCurrentLocation }]
      );
    } finally {
      setLoading(false);
    }
  };

  const openMemoryDetails = (memory: LocationMemory) => {
    setSelectedMemory(memory);
    setModalVisible(true);
  };

  const openInMapsWithMemory = (memory: LocationMemory) => {
    const url = `http://maps.apple.com/?q=${memory.location.latitude},${memory.location.longitude}`;
    Linking.openURL(url);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openInMaps = () => {
    if (location) {
      const url = `http://maps.apple.com/?q=${location.latitude},${location.longitude}`;
      Linking.openURL(url);
    }
  };

  const openInGoogleMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
      Linking.openURL(url);
    }
  };

  const copyCoordinates = () => {
    if (location) {
      const coords = `${location.latitude}, ${location.longitude}`;
      Alert.alert('Coordinates', coords, [{ text: 'OK' }]);
    }
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="location-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Unable to get your location</Text>
        <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Interactive Map</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => setShowMap(!showMap)} 
            style={styles.toggleButton}
          >
            <Ionicons name={showMap ? "list" : "map"} size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={getCurrentLocation} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {showMap ? (
        <View style={styles.mapContainer}>
          {location && (
            <>
              <WebView
                style={styles.map}
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style>
                        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                        #map { height: 100vh; width: 100%; }
                        .info-overlay {
                          position: absolute;
                          top: 10px;
                          left: 10px;
                          right: 10px;
                          background: rgba(255, 255, 255, 0.95);
                          padding: 12px;
                          border-radius: 8px;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                          z-index: 1000;
                          display: flex;
                          justify-content: space-between;
                          font-size: 14px;
                          font-weight: 500;
                        }
                        .leaflet-popup-content-wrapper {
                          border-radius: 8px;
                        }
                        .memory-popup {
                          text-align: center;
                          min-width: 150px;
                        }
                        .memory-popup h3 {
                          margin: 0 0 8px 0;
                          color: #333;
                        }
                        .memory-popup p {
                          margin: 4px 0;
                          color: #666;
                          font-size: 12px;
                        }
                        .popup-button {
                          background: #007AFF;
                          color: white;
                          border: none;
                          padding: 6px 12px;
                          border-radius: 4px;
                          font-size: 12px;
                          cursor: pointer;
                          margin-top: 8px;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="info-overlay">
                        <span>📍 Current Location</span>
                        <span>🏷️ ${memories.length} Memories</span>
                      </div>
                      <div id="map"></div>
                      <script>
                        const map = L.map('map').setView([${location.latitude}, ${location.longitude}], 15);
                        
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                          attribution: '© OpenStreetMap contributors'
                        }).addTo(map);
                        
                        // Current location marker
                        const currentIcon = L.divIcon({
                          html: '<div style="background: #007AFF; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                          iconSize: [20, 20],
                          iconAnchor: [10, 10],
                          className: 'current-location-marker'
                        });
                        
                        L.marker([${location.latitude}, ${location.longitude}], {icon: currentIcon})
                          .addTo(map)
                          .bindPopup('<div class="memory-popup"><h3>📍 You are here</h3><p>Current Location</p></div>');
                        
                        // Memory markers
                        const memories = ${JSON.stringify(memories)};
                        memories.forEach(memory => {
                          const memoryIcon = L.divIcon({
                            html: '<div style="background: white; border: 2px solid #FF6B6B; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">' + memory.emoji + '</div>',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15],
                            className: 'memory-marker'
                          });
                          
                          L.marker([memory.location.latitude, memory.location.longitude], {icon: memoryIcon})
                            .addTo(map)
                            .bindPopup(\`
                              <div class="memory-popup">
                                <h3>\${memory.emoji} \${memory.title}</h3>
                                <p>\${memory.description || 'No description'}</p>
                                <p>\${memory.location.address || 'No address'}</p>
                                <button class="popup-button" onclick="openMemory('\${memory.id}')">View Details</button>
                              </div>
                            \`);
                        });
                        
                        function openMemory(id) {
                          window.ReactNativeWebView?.postMessage(JSON.stringify({
                            type: 'openMemory',
                            memoryId: id
                          }));
                        }
                      </script>
                    </body>
                    </html>
                  `
                }}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'openMemory') {
                      const memory = memories.find(m => m.id === data.memoryId);
                      if (memory) {
                        openMemoryDetails(memory);
                      }
                    }
                  } catch (error) {
                    console.log('Error parsing WebView message:', error);
                  }
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                scrollEnabled={false}
              />
            </>
          )}
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Current Location</Text>
            </View>
            {address && (
              <Text style={styles.addressText}>{address}</Text>
            )}
            <View style={styles.coordinateRow}>
              <Text style={styles.coordinateLabel}>Coordinates:</Text>
              <Text style={styles.coordinateValue}>
                {location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)}
              </Text>
            </View>
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bookmark" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Memory Locations ({memories.length})</Text>
            </View>
            {memories.length === 0 ? (
              <View style={styles.emptyMemories}>
                <Ionicons name="bookmark-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No memories yet</Text>
                <Text style={styles.emptySubtext}>Create memories in the Memories tab</Text>
              </View>
            ) : (
              memories.map((memory) => (
                <TouchableOpacity 
                  key={memory.id} 
                  style={styles.memoryItem}
                  onPress={() => openMemoryDetails(memory)}
                >
                  <View style={styles.memoryHeader}>
                    <Text style={styles.memoryEmoji}>{memory.emoji}</Text>
                    <View style={styles.memoryInfo}>
                      <Text style={styles.memoryTitle}>{memory.title}</Text>
                      <Text style={styles.memoryLocation}>
                        {memory.location.address || `${memory.location.latitude.toFixed(4)}, ${memory.location.longitude.toFixed(4)}`}
                      </Text>
                      <Text style={styles.memoryDate}>{formatDate(memory.timestamp)}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.mapIconButton}
                      onPress={() => openInMapsWithMemory(memory)}
                    >
                      <Ionicons name="map" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedMemory && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Memory Details</Text>
              <TouchableOpacity onPress={() => openInMapsWithMemory(selectedMemory)}>
                <Ionicons name="map" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={styles.memoryDetailHeader}>
                <Text style={styles.memoryDetailEmoji}>{selectedMemory.emoji}</Text>
                <Text style={styles.memoryDetailTitle}>{selectedMemory.title}</Text>
              </View>
              {selectedMemory.photoUri && (
                <Image 
                  source={{ uri: selectedMemory.photoUri }} 
                  style={styles.memoryDetailPhoto}
                  contentFit="cover"
                />
              )}
              {selectedMemory.description && (
                <Text style={styles.memoryDetailDescription}>{selectedMemory.description}</Text>
              )}
              <View style={styles.locationDetails}>
                <Text style={styles.locationDetailTitle}>Location</Text>
                <Text style={styles.locationDetailAddress}>
                  {selectedMemory.location.address || 'No address available'}
                </Text>
                <Text style={styles.locationDetailCoords}>
                  {selectedMemory.location.latitude.toFixed(6)}, {selectedMemory.location.longitude.toFixed(6)}
                </Text>
                <Text style={styles.locationDetailDate}>
                  Created on {formatDate(selectedMemory.timestamp)}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  coordinateLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  coordinateValue: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'monospace',
  },
  mapButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  googleMapButton: {
    backgroundColor: '#4285F4',
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  emptyMemories: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  memoryItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoryEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  memoryInfo: {
    flex: 1,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  memoryLocation: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  memoryDate: {
    fontSize: 12,
    color: '#999',
  },
  mapIconButton: {
    padding: 8,
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
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  memoryDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  memoryDetailEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  memoryDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  memoryDetailPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  memoryDetailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  locationDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  locationDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  locationDetailAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  locationDetailCoords: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  locationDetailDate: {
    fontSize: 12,
    color: '#999',
  },
  // Map-specific styles
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
  },
  mapInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
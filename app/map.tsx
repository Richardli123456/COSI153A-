import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

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
        <Text style={styles.title}>Your Location</Text>
        <TouchableOpacity onPress={getCurrentLocation} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Icon */}
        <View style={styles.locationIconContainer}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={48} color="#007AFF" />
          </View>
          <Text style={styles.locationTitle}>Current Location</Text>
        </View>

        {/* Address */}
        {address ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="home" size={20} color="#007AFF" />
              <Text style={styles.cardTitle}>Address</Text>
            </View>
            <Text style={styles.addressText}>{address}</Text>
          </View>
        ) : null}

        {/* Coordinates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="navigate" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Coordinates</Text>
          </View>
          <View style={styles.coordinateRow}>
            <Text style={styles.coordinateLabel}>Latitude:</Text>
            <Text style={styles.coordinateValue}>{location.latitude.toFixed(6)}</Text>
          </View>
          <View style={styles.coordinateRow}>
            <Text style={styles.coordinateLabel}>Longitude:</Text>
            <Text style={styles.coordinateValue}>{location.longitude.toFixed(6)}</Text>
          </View>
          <TouchableOpacity style={styles.copyButton} onPress={copyCoordinates}>
            <Ionicons name="copy" size={16} color="#007AFF" />
            <Text style={styles.copyButtonText}>Copy Coordinates</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Details</Text>
          </View>
          
          {location.altitude !== null && (
            <View style={styles.coordinateRow}>
              <Text style={styles.coordinateLabel}>Altitude:</Text>
              <Text style={styles.coordinateValue}>
                {location.altitude?.toFixed(1) || 'N/A'} m
              </Text>
            </View>
          )}
          
          {location.accuracy !== null && (
            <View style={styles.coordinateRow}>
              <Text style={styles.coordinateLabel}>Accuracy:</Text>
              <Text style={styles.coordinateValue}>
                ±{location.accuracy?.toFixed(1) || 'N/A'} m
              </Text>
            </View>
          )}

          {location.speed !== null && location.speed !== undefined && location.speed > 0 && (
            <View style={styles.coordinateRow}>
              <Text style={styles.coordinateLabel}>Speed:</Text>
              <Text style={styles.coordinateValue}>
                {(location.speed * 3.6).toFixed(1)} km/h
              </Text>
            </View>
          )}

          {lastUpdated && (
            <View style={styles.coordinateRow}>
              <Text style={styles.coordinateLabel}>Last Updated:</Text>
              <Text style={styles.coordinateValue}>
                {lastUpdated.toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>

        {/* Map Actions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Open in Maps</Text>
          </View>
          
          <TouchableOpacity style={styles.mapButton} onPress={openInMaps}>
            <Ionicons name="logo-apple" size={20} color="white" />
            <Text style={styles.mapButtonText}>Open in Apple Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.mapButton, styles.googleMapButton]} onPress={openInGoogleMaps}>
            <Ionicons name="earth" size={20} color="white" />
            <Text style={styles.mapButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  locationIconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  locationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  googleMapButton: {
    backgroundColor: '#4285F4',
  },
  mapButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
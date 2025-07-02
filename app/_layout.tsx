import { Ionicons } from '@expo/vector-icons';
import { Tabs } from "expo-router";

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: 'Memories',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

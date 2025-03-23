import React, { useState, useEffect, useRef } from 'react';
import { Platform, Text, View, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Region } from 'react-native-maps';
import SearchBar from '../components/SearchBar';
import EtaPanel from '../components/EtaPanel';
import NavigationPanel from '../components/NavigationPanel';
import NavigationControls from '../components/NavigationControls';
import ApiService, { WeatherData, RouteData } from '../services/ApiService';

// Sample user ID - in a real app, this would come from auth
const USER_ID = 'user123';

// Update frequency for navigation mode (in milliseconds)
const UPDATE_INTERVAL = 5000;

export default function App() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [showEtaPanel, setShowEtaPanel] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  
  // Navigation mode states
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [traveledPathCoordinates, setTraveledPathCoordinates] = useState<any[]>([]);
  const [distanceLeft, setDistanceLeft] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [pace, setPace] = useState('0:00 min/km');
  const [eta, setEta] = useState('--:--');
  
  // Refs
  const mapRef = useRef<MapView>(null);
  const startTimeRef = useRef<number | null>(null);
  const watchPositionSubscription = useRef<Location.LocationSubscription | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    let isMounted = true;

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setErrorMsg('Permission to access location was denied');
          }
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setLocation(location.coords);
          
          // Get weather data for current location
          if (location.coords.latitude && location.coords.longitude) {
            fetchWeatherData(location.coords.latitude, location.coords.longitude);
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMsg('Error getting location: ' + (error as Error).message);
        }
      }
    };

    getLocation();

    return () => {
      isMounted = false;
    };
  }, []);
  
  // Start/stop location tracking based on navigation state
  useEffect(() => {
    if (isNavigating && !isPaused) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    
    return () => {
      stopLocationTracking();
    };
  }, [isNavigating, isPaused]);
  
  // Timer effect for elapsed time
  useEffect(() => {
    if (isNavigating && !isPaused) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - elapsedTime * 1000;
      }
      
      const timer = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isNavigating, isPaused]);
  
  // Set up periodic updates for navigation data
  useEffect(() => {
    if (isNavigating && !isPaused) {
      updateIntervalRef.current = setInterval(() => {
        updateNavigationData();
      }, UPDATE_INTERVAL);
      
      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };
    }
  }, [isNavigating, isPaused, location, traveledPathCoordinates]);
  
  // Start tracking user's location for navigation
  const startLocationTracking = async () => {
    if (watchPositionSubscription.current) {
      return;
    }
    
    try {
      watchPositionSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10, // Update if moved 10 meters
          timeInterval: 5000,   // Or every 5 seconds
        },
        (locationUpdate) => {
          const { latitude, longitude } = locationUpdate.coords;
          setLocation(locationUpdate.coords);
          
          // Add to traveled path
          if (latitude && longitude) {
            setTraveledPathCoordinates((prev) => [
              ...prev,
              { latitude, longitude },
            ]);
          }
          
          // Check if user reached destination
          if (routeData?.endLocation && latitude && longitude) {
            const distanceToDestination = calculateDistance(
              latitude,
              longitude,
              routeData.endLocation.latitude || 0,
              routeData.endLocation.longitude || 0
            );
            
            // If within 50 meters of destination, finish navigation
            if (distanceToDestination <= 0.05) {
              handleFinishNavigation();
            }
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };
  
  // Stop tracking user's location
  const stopLocationTracking = () => {
    if (watchPositionSubscription.current) {
      watchPositionSubscription.current.remove();
      watchPositionSubscription.current = null;
    }
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  };
  
  // Update navigation data (distance left, pace, ETA)
  const updateNavigationData = () => {
    if (!location || !routeData?.endLocation || traveledPathCoordinates.length === 0) {
      return;
    }
    
    // Calculate distance left
    const currentLat = location.latitude;
    const currentLng = location.longitude;
    const destLat = routeData.endLocation.latitude || 0;
    const destLng = routeData.endLocation.longitude || 0;
    
    const remainingDistance = calculateDistance(currentLat, currentLng, destLat, destLng);
    setDistanceLeft(remainingDistance);
    
    // Calculate current pace (if we've moved)
    if (traveledPathCoordinates.length > 1 && elapsedTime > 0) {
      let totalDistance = 0;
      for (let i = 1; i < traveledPathCoordinates.length; i++) {
        const prevCoord = traveledPathCoordinates[i - 1];
        const currCoord = traveledPathCoordinates[i];
        totalDistance += calculateDistance(
          prevCoord.latitude,
          prevCoord.longitude,
          currCoord.latitude,
          currCoord.longitude
        );
      }
      
      // Calculate pace in minutes per kilometer
      const paceMinutes = (elapsedTime / 60) / totalDistance;
      
      // Format as MM:SS
      const paceMinutesInt = Math.floor(paceMinutes);
      const paceSeconds = Math.floor((paceMinutes - paceMinutesInt) * 60);
      setPace(`${paceMinutesInt}:${paceSeconds.toString().padStart(2, '0')} min/km`);
      
      // Calculate ETA
      if (remainingDistance > 0) {
        const timeLeftSeconds = remainingDistance * paceMinutes * 60;
        const etaTimestamp = new Date(Date.now() + timeLeftSeconds * 1000);
        setEta(etaTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }
  };
  
  // Fetch weather data from API
  const fetchWeatherData = async (latitude: number, longitude: number) => {
    try {
      const data = await ApiService.getWeather(latitude, longitude);
      setWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  };
  
  // Fetch route data from API
  const fetchRouteData = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    try {
      const data = await ApiService.getRoute(startLat, startLng, endLat, endLng);
      setRouteData(data);
      
      // For demo purposes - in a real app, you would decode polyline from the API response
      // This creates a mockup route between points
      const fakePath = createFakeRoutePath(
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng },
      );
      setRouteCoordinates(fakePath);
      
      return data;
    } catch (error) {
      console.error('Error fetching route data:', error);
      // Generate fallback route data
      const distance = calculateDistance(startLat, startLng, endLat, endLng);
      const dummyRouteData: RouteData = {
        distance: distance,
        duration: Math.round((distance / 20) * 60), // Assuming 20 km/h average speed
        startLocation: {
          id: 'start',
          place: currentLocation || 'Current Position',
          address: 'Starting Point',
          frequency: 0,
          latitude: startLat,
          longitude: startLng,
        },
        endLocation: {
          id: 'end',
          place: destination || 'Destination',
          address: 'End Point',
          frequency: 0,
          latitude: endLat,
          longitude: endLng,
        },
        trafficCondition: 'moderate',
      };
      
      setRouteData(dummyRouteData);
      setDistanceLeft(distance);
      
      // Generate fake route path for visualization
      const fakePath = createFakeRoutePath(
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng },
      );
      setRouteCoordinates(fakePath);
      
      return dummyRouteData;
    }
  };
  
  // Create a simple route visualization between two points
  const createFakeRoutePath = (start: { latitude: number, longitude: number}, end: { latitude: number, longitude: number}) => {
    // Create a slightly curved path between points
    const midPoint = {
      latitude: (start.latitude + end.latitude) / 2,
      longitude: (start.longitude + end.longitude) / 2,
    };
    
    // Add a slight offset to create a curve
    const offset = 0.002;
    const midPointWithOffset = {
      latitude: midPoint.latitude + offset,
      longitude: midPoint.longitude + offset,
    };
    
    // Return a path with multiple points for a smoother line
    return [
      start,
      {
        latitude: (start.latitude + midPointWithOffset.latitude) / 2,
        longitude: (start.longitude + midPointWithOffset.longitude) / 2,
      },
      midPointWithOffset,
      {
        latitude: (midPointWithOffset.latitude + end.latitude) / 2,
        longitude: (midPointWithOffset.longitude + end.longitude) / 2,
      },
      end,
    ];
  };
  
  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  const handleLocationSelect = async (destination: string, currentLoc: string) => {
    setDestination(destination);
    setCurrentLocation(currentLoc);
    
    // For demo - in a real app, you would geocode the addresses to get coordinates
    // Here we're using the current location and generating a random destination point
    if (location) {
      const startLat = location.latitude;
      const startLng = location.longitude;
      
      // Generate a destination point within a reasonable distance
      const latOffset = (Math.random() - 0.5) * 0.05; // ~5km max
      const lngOffset = (Math.random() - 0.5) * 0.05;
      const endLat = startLat + latOffset;
      const endLng = startLng + lngOffset;
      
      // Fetch route data
      const route = await fetchRouteData(startLat, startLng, endLat, endLng);
      
      // Show the ETA panel once we have route data
      setShowEtaPanel(true);
    }
  };

  const handleCloseEtaPanel = () => {
    setShowEtaPanel(false);
  };
  
  // Start navigation mode
  const handleStartNavigation = () => {
    // Reset navigation-related states
    setIsNavigating(true);
    setIsPaused(false);
    setTraveledPathCoordinates([]);
    setElapsedTime(0);
    setPace('0:00 min/km');
    startTimeRef.current = Date.now();
    
    // Hide planning ETA panel
    setShowEtaPanel(false);
    
    // Zoom in on user's location
    if (mapRef.current && location) {
      const region: Region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0075, // Zoomed in
        longitudeDelta: 0.0075,
      };
      
      mapRef.current.animateToRegion(region, 1000);
    }
  };
  
  // Handle pause navigation
  const handlePauseNavigation = () => {
    setIsPaused(true);
    
    // Save the elapsed time when paused
    if (startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);
    }
    
    // Clear the start time reference so we can recalculate it on resume
    startTimeRef.current = null;
  };
  
  // Handle resume navigation
  const handleResumeNavigation = () => {
    setIsPaused(false);
    
    // Set the start time to account for the elapsed time
    startTimeRef.current = Date.now() - elapsedTime * 1000;
  };
  
  // Handle finish navigation
  const handleFinishNavigation = () => {
    setIsNavigating(false);
    setIsPaused(false);
    
    // Clear all the navigation state
    stopLocationTracking();
    startTimeRef.current = null;
    
    // Reset map zoom
    if (mapRef.current && location) {
      const region: Region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      mapRef.current.animateToRegion(region, 1000);
    }
  };
  
  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.paragraph}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Planned route polyline - dotted in navigation mode */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#2089dc"
            // Use dotted line during navigation
            lineDashPattern={isNavigating ? [5, 5] : undefined}
          />
        )}
        
        {/* Traveled path polyline - solid line */}
        {isNavigating && traveledPathCoordinates.length > 1 && (
          <Polyline
            coordinates={traveledPathCoordinates}
            strokeWidth={5}
            strokeColor="#ff6b6b"
          />
        )}
        
        {/* Destination marker */}
        {routeData?.endLocation && (
          <Marker
            coordinate={{
              latitude: routeData.endLocation.latitude || 0,
              longitude: routeData.endLocation.longitude || 0,
            }}
            title={destination || 'Destination'}
            pinColor="#FF6B6B"
          />
        )}
      </MapView>
      
      {/* Only show the search bar when not navigating */}
      {!isNavigating && (
        <SearchBar 
          onLocationSelect={handleLocationSelect}
          userId={USER_ID}
        />
      )}
      
      {/* Planning ETA Panel */}
      <EtaPanel 
        visible={showEtaPanel}
        destination={destination || undefined}
        currentLocation={currentLocation || undefined}
        distance={routeData?.distance || undefined}
        onClose={handleCloseEtaPanel}
        // Add a prop for the start navigation button
        onStartNavigation={handleStartNavigation}
      />
      
      {/* Navigation ETA Panel */}
      {isNavigating && (
        <NavigationPanel
          visible={true}
          destination={destination || 'Destination'}
          currentLocation={currentLocation || 'Current Position'}
          distance={routeData?.distance || 0}
          distanceLeft={distanceLeft}
          pace={pace}
          eta={eta}
          elapsedTime={formatElapsedTime(elapsedTime)}
          onFinish={handleFinishNavigation}
        />
      )}
      
      {/* Navigation Controls */}
      {isNavigating && (
        <NavigationControls
          onPause={handlePauseNavigation}
          onResume={handleResumeNavigation}
          onFinish={handleFinishNavigation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  paragraph: {
    fontSize: 18,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
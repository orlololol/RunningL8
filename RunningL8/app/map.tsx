import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Region, MapPressEvent } from 'react-native-maps';
import SearchBar from '../components/SearchBar';
import EtaPanel from '../components/EtaPanel';
import NavigationPanel from '../components/NavigationPanel';
import NavigationControls from '../components/NavigationControls';
import ApiService, { RouteData, LocationData } from '../services/ApiService';
import { decodePolyline } from '../utils/polyline';
import { checkNetworkStatus } from '../utils/network';

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
  //const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [markerLocation, setMarkerLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Store actual location coordinates for destination and current location
  const [destinationCoords, setDestinationCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [startCoords, setStartCoords] = useState<{latitude: number, longitude: number} | null>(null);
  
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
    let locationSubscription: Location.LocationSubscription | null = null;

    const setupLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setErrorMsg('Permission to access location was denied');
          }
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 1000,    // Update every second
            distanceInterval: 1,   // Or when moved 1 meter
          },
          (location) => {
            if (isMounted) {
              setLocation(location.coords);
            }
          }
        );
      } catch (error) {
        if (isMounted) {
          setErrorMsg('Error getting location: ' + (error as Error).message);
        }
      }
    };

    setupLocationTracking();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const handleMapPress = (event: MapPressEvent) => {
    const { coordinate } = event.nativeEvent;
    console.log("🖱️ Map pressed at:", coordinate);
    
    // Clear previous marker and route data
    setDestinationCoords(null);
    setRouteCoordinates([]);
    setRouteData(null);
    
    // Set new marker
    setMarkerLocation(coordinate);
  };

  const handleMarkerPress = () => {
    setMarkerLocation(null);
  };

  const handleBottomButtonPress = () => {
    console.log("👍 Continue button pressed");
    
    // If marker location exists, use it to set destination
    if (markerLocation && location) {
      // Set destination coordinates - this will be used for the red marker
      setDestinationCoords(markerLocation);
      
      // Set start coordinates from current location
      setStartCoords({
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      // Clear the marker now that we have set destination coords
      // This prevents having both a temp marker and destination marker
      setMarkerLocation(null);
      
      console.log("📍 Set destination at:", markerLocation);
      
      // Fetch route between current location and selected marker
      console.log("🔄 Fetching route data...");
      fetchRouteData(
        location.latitude,
        location.longitude,
        markerLocation.latitude,
        markerLocation.longitude
      );
      
      setShowEtaPanel(true);
    }
  };
  
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
  
  // Fetch route data from API
  const fetchRouteData = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    console.log("🚶‍♂️ fetchRouteData called with coordinates:");
    console.log(`- Start: ${startLat}, ${startLng}`);
    console.log(`- End: ${endLat}, ${endLng}`);
    
    // Clear any previous route
    setRouteCoordinates([]);
    
    try {
      // Create route request
      const routeRequest = {
        currentLat: startLat,
        currentLng: startLng,
        destinationLat: endLat,
        destinationLng: endLng
      };
      
      console.log("📤 Requesting route with data:", JSON.stringify(routeRequest, null, 2));
      
      // Add a timeout promise to prevent long-hanging requests
      const timeoutPromise = new Promise<RouteData>((_, reject) => {
        setTimeout(() => {
          reject(new Error("API request timed out after 10 seconds"));
        }, 10000);
      });
      
      // Race the actual API call against the timeout
      const data = await Promise.race([
        ApiService.getGenericRoute(routeRequest),
        timeoutPromise
      ]);
      
      console.log("✅ Successfully received route data"); 
      setRouteData(data);
      
      if (data && data.polyline) {
        try {
          console.log("📐 Decoding polyline...");
          const decodedCoords = decodePolyline(data.polyline);
          
          if (decodedCoords && decodedCoords.length > 0) {
            console.log("✅ Setting route coordinates from polyline, points:", decodedCoords.length);
            setRouteCoordinates(decodedCoords);
            return;
          } else {
            console.warn("⚠️ Decoded polyline had no points");
          }
        } catch (err) {
          console.error("❌ Error decoding polyline:", err);
        }
      } else {
        console.warn("⚠️ No polyline in response data");
      }
      
      // Fall back to fake route
      console.log("🛣️ Using fake route as fallback");
      const fakeRoute = createFakeRoutePath(
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng }
      );
      setRouteCoordinates(fakeRoute);
      
    } catch (error: any) {
      console.error("❌ Error in fetchRouteData:", error);
      console.error("❌ Error message:", error.message);
      
      // Always provide a route visualization
      console.log("🛣️ Creating fake route path due to error");
      const fakeRoute = createFakeRoutePath(
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng }
      );
      
      setRouteCoordinates(fakeRoute);
      
      // If we don't have route data, create default data
      if (!routeData) {
        const defaultRouteData = {
          distance: calculateDistance(startLat, startLng, endLat, endLng),
          duration: 30, // Default 30 min
          polyline: '',
          startLocation: { latitude: startLat, longitude: startLng },
          endLocation: { latitude: endLat, longitude: endLng }
        };
        
        setRouteData(defaultRouteData);
      }
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

  const handleLocationSelect = async (
    destination: string, 
    originLocation: string, 
    destinationDetails?: LocationData, 
    originDetails?: LocationData
  ) => {
    console.log("🔍 Location selected from search:", {
      destination,
      destinationDetails: destinationDetails ? 
        `${destinationDetails.place} (${destinationDetails.latitude}, ${destinationDetails.longitude})` : 
        'undefined',
      originLocation,
      originDetails: originDetails ? 
        `${originDetails.place} (${originDetails.latitude}, ${originDetails.longitude})` : 
        'undefined'
    });
    
    setDestination(destination);
    setCurrentLocation(originLocation);
    
    // Always clear any temporary marker when selecting from search
    setMarkerLocation(null);
    
    // If no coordinates are provided, do nothing else
    if (!destinationDetails?.latitude && !originDetails?.latitude) {
      console.log("⚠️ No coordinates provided in search selection");
      return;
    }
    
    // If we received destination details with coordinates, update destination marker
    if (destinationDetails?.latitude && destinationDetails?.longitude) {
      const coords = {
        latitude: destinationDetails.latitude,
        longitude: destinationDetails.longitude
      };
      
      console.log("📍 Setting destination marker from search at:", coords);
      setDestinationCoords(coords);
    }
    
    // Set origin coordinates (from either location details or current GPS position)
    if (originDetails?.latitude && originDetails?.longitude) {
      setStartCoords({
        latitude: originDetails.latitude,
        longitude: originDetails.longitude
      });
      console.log("📍 Set origin from search selection:", originDetails.place);
    } else if (location && originLocation === 'Current Position') {
      setStartCoords({
        latitude: location.latitude,
        longitude: location.longitude
      });
      console.log("📍 Set origin from current GPS position");
    }
    
    // IMMEDIATE ROUTE GENERATION:
    // If we have both coordinates, fetch the route immediately
    if (destinationDetails?.latitude && destinationDetails?.longitude) {
      const startLat = originDetails?.latitude || location?.latitude || 0;
      const startLng = originDetails?.longitude || location?.longitude || 0;
      const destLat = destinationDetails.latitude;
      const destLng = destinationDetails.longitude;
      
      if (startLat !== 0 && startLng !== 0) {
        console.log("🛣️ Immediately fetching route between:", 
          { start: {lat: startLat, lng: startLng}, 
            dest: {lat: destLat, lng: destLng} });
        
        // Immediately fetch route without waiting for Confirm button
        await fetchRouteData(startLat, startLng, destLat, destLng);
        
        // Move map to show both points
        if (mapRef.current) {
          // Calculate region that includes both points
          const region = {
            latitude: (startLat + destLat) / 2,
            longitude: (startLng + destLng) / 2,
            latitudeDelta: Math.abs(startLat - destLat) * 1.5 + 0.02,
            longitudeDelta: Math.abs(startLng - destLng) * 1.5 + 0.02
          };
          
          console.log("🗺️ Animating map to show route");
          mapRef.current.animateToRegion(region, 1000);
        }
        
        // Show the ETA panel
        setShowEtaPanel(true);
      } else {
        console.warn("⚠️ Missing start coordinates, cannot generate route");
      }
    }
  };

  const handleCloseEtaPanel = () => {
    setShowEtaPanel(false);
  };
  
  // Start navigation mode
  const handleStartNavigation = () => {
    setIsNavigating(true);
    setShowEtaPanel(false);
    
    // Initialize navigation data
    if (location) {
      setTraveledPathCoordinates([{
        latitude: location.latitude,
        longitude: location.longitude
      }]);
    }
    
    // Set initial distance left
    if (routeData?.distance) {
      setDistanceLeft(routeData.distance);
    }
    
    // Start tracking
    startLocationTracking();
  };
  
  // Handle pause navigation
  const handlePauseNavigation = () => {
    setIsPaused(true);
    stopLocationTracking();
  };
  
  // Handle resume navigation
  const handleResumeNavigation = () => {
    setIsPaused(false);
    startLocationTracking();
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

  // Start tracking location for navigation
  const startLocationTracking = async () => {
    try {
      // Make sure we have permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      
      // Start tracking location with high accuracy
      watchPositionSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          if (isNavigating && !isPaused) {
            // Add new point to traveled path
            setTraveledPathCoordinates(prevPath => [
              ...prevPath,
              {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude
              }
            ]);
            
            // Update navigation data
            updateNavigationData();
          }
        }
      );
    } catch (error) {
      setErrorMsg(`Error tracking location: ${(error as Error).message}`);
    }
  };

  // Stop tracking location
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

  // Update navigation information like distance left, pace, etc.
  const updateNavigationData = () => {
    // Only update if we have location and we're navigating
    if (!location || !isNavigating || !routeData) return;
    
    // Calculate distance left
    if (destinationCoords) {
      const distanceToDestination = calculateDistance(
        location.latitude,
        location.longitude,
        destinationCoords.latitude,
        destinationCoords.longitude
      );
      
      setDistanceLeft(distanceToDestination);
      
      // Calculate pace (if we've been moving for at least 1 minute)
      if (elapsedTime > 60 && traveledPathCoordinates.length > 1) {
        // Calculate total distance traveled
        let totalDistance = 0;
        for (let i = 1; i < traveledPathCoordinates.length; i++) {
          const prev = traveledPathCoordinates[i - 1];
          const curr = traveledPathCoordinates[i];
          
          totalDistance += calculateDistance(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude
          );
        }
        
        // Calculate pace in minutes per km
        const paceMinPerKm = totalDistance > 0 ? (elapsedTime / 60) / totalDistance : 0;
        const paceMinutes = Math.floor(paceMinPerKm);
        const paceSeconds = Math.floor((paceMinPerKm - paceMinutes) * 60);
        
        setPace(`${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} min/km`);
        
        // Estimate ETA
        if (paceMinPerKm > 0) {
          const timeToDestinationMinutes = distanceToDestination * paceMinPerKm;
          const etaTimestamp = Date.now() + timeToDestinationMinutes * 60 * 1000;
          const etaDate = new Date(etaTimestamp);
          
          // Format as HH:MM
          const hours = etaDate.getHours();
          const minutes = etaDate.getMinutes();
          setEta(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        }
      }
    }
  };

  // Add this useEffect to ensure markers behave correctly
  useEffect(() => {
    // If we have a destination marker, always clear the temporary marker
    if (destinationCoords) {
      setMarkerLocation(null);
    }
  }, [destinationCoords]);

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
        onPress={handleMapPress}
        moveOnMarkerPress={false}
      >
        {/* Only show temporary marker if no destination set */}
        {markerLocation && !destinationCoords && (
          <Marker
            coordinate={markerLocation}
            onPress={handleMarkerPress}
            title="Selected Location"
            description="Tap to remove"
            pinColor="#FFA500" // Orange for temporary marker
          />
        )}
        
        {/* Destination marker always has priority and is always red */}
        {destinationCoords && (
          <Marker
            coordinate={destinationCoords}
            title={destination || 'Destination'}
            pinColor="#FF6B6B" // Always red for destination
          />
        )}
        
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
      </MapView>
      
      {markerLocation && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={handleBottomButtonPress}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Only show the search bar when not navigating */}
      {!isNavigating && (
        <SearchBar 
          onLocationSelect={handleLocationSelect}
          userLocation={location}
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
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
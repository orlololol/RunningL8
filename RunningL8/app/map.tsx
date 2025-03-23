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
  const [destinationText, setDestinationText] = useState<string | null>(null);
  const [currentLocationText, setCurrentLocationText] = useState<string>("Current Position");
  const [showEtaPanel, setShowEtaPanel] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [destinationCoords, setDestinationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
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
  
  // Add this to your state variables at the top of the component
  const [isLoading, setIsLoading] = useState(false);
  
  // Add this to your state in map.tsx
  const [recentLocations, setRecentLocations] = useState<Array<{
    timestamp: number;
    coords: {latitude: number; longitude: number}
  }>>([]);
  
  // Add this to store recent pace readings for smoothing
  const [recentPaceReadings, setRecentPaceReadings] = useState<number[]>([]);
  
  // Add this state to store the last valid pace value
  const [lastValidPace, setLastValidPace] = useState<string | null>(null);
  
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
    
    // Set the destination coordinates immediately (no temporary marker)
    setDestinationCoords(coordinate);
    
    // Update destination text with coordinates in a clear format for display
    const coordString = `Location (${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)})`;
    setDestinationText(coordString);
    
    // If we have current location, fetch the route immediately
    if (location) {
      fetchRouteData(
        location.latitude,
        location.longitude,
        coordinate.latitude,
        coordinate.longitude
      );
    }
    
    // Close any expanded UI elements
    if (showEtaPanel) {
      setShowEtaPanel(false);
    }
  };

  const handleMarkerPress = () => {
    setDestinationCoords(null);
  };

  const handleBottomButtonPress = () => {
    console.log("👍 Continue button pressed");
    
    // If marker location exists, use it to set destination
    if (destinationCoords && location) {
      // Set destination coordinates - this will be used for the red marker
      setDestinationCoords(destinationCoords);
      
      // Set start coordinates from current location
      setStartCoords({
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      console.log("�� Set destination at:", destinationCoords);
      
      // Fetch route between current location and selected marker
      console.log("🔄 Fetching route data...");
      fetchRouteData(
        location.latitude,
        location.longitude,
        destinationCoords.latitude,
        destinationCoords.longitude
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
    console.log("🔍 Fetching route from", { startLat, startLng }, "to", { endLat, endLng });
    
    try {
      // Show loading state
      setIsLoading(true);
      
      const routeRequest = {
        currentLat: startLat,
        currentLng: startLng,
        destinationLat: endLat,
        destinationLng: endLng,
      };
      
      // Get route data from the API
      const data = await ApiService.getGenericRoute(routeRequest);
      console.log("✅ Route data received:", data);
      
      // Set the route data for rendering
      setRouteData(data);
      
      // Update route coordinates for display
      if (data.polyline) {
        const decodedCoords = decodePolyline(data.polyline);
        setRouteCoordinates(decodedCoords);
      } else {
        // Create a fallback route if no polyline is available
        const fakeCoords = createFakeRoutePath(
          { latitude: startLat, longitude: startLng },
          { latitude: endLat, longitude: endLng }
        );
        setRouteCoordinates(fakeCoords);
      }
      
      // Show the ETA panel with route info
      setShowEtaPanel(true);
      
      return data;
    } catch (error) {
      console.error("❌ Error fetching route:", error);
      
      // Create fallback data with a straight line
      const fakeRoutePath = createFakeRoutePath(
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng }
      );
      
      // Create a proper RouteData object that matches the interface
      const fakeRouteData: RouteData = {
        distance: calculateDistance(startLat, startLng, endLat, endLng),
        duration: 30, // Default 30 minutes
        polyline: '', // Empty polyline
        startLocation: { latitude: startLat, longitude: startLng },
        endLocation: { latitude: endLat, longitude: endLng },
      };
      
      setRouteData(fakeRouteData);
      setRouteCoordinates(fakeRoutePath);
      
      // Still show the ETA panel with the approximate info
      setShowEtaPanel(true);
      
      return fakeRouteData;
    } finally {
      setIsLoading(false);
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
  // Now returns distance in METERS for higher precision
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in METERS (not km)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = R * c; // Distance in meters
    return distanceMeters;
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
      destinationDetails,
      originLocation,
      originDetails
    });
    
    setDestinationText(destination);
    setCurrentLocationText(originLocation);
    
    // No more temporary markers - directly set destination coords
    if (destinationDetails && destinationDetails.latitude && destinationDetails.longitude) {
      const coords = {
        latitude: destinationDetails.latitude,
        longitude: destinationDetails.longitude
      };
      
      // Set the destination marker
      setDestinationCoords(coords);
      
      // Fetch the route if we have current location
      if (location) {
        fetchRouteData(
          location.latitude,
          location.longitude,
          coords.latitude,
          coords.longitude
        );
      }
    }
    
    // Set origin coordinates (either from location details or current GPS position)
    if (originDetails?.latitude && originDetails?.longitude) {
      setStartCoords({
        latitude: originDetails.latitude,
        longitude: originDetails.longitude
      });
      console.log("📍 Set origin from search selection:", originDetails);
    } else if (location && originLocation === 'Current Position') {
      setStartCoords({
        latitude: location.latitude,
        longitude: location.longitude
      });
      console.log("📍 Set origin from current GPS position");
    }
    
    // Show the ETA panel
    setShowEtaPanel(true);
  };

  const handleCloseEtaPanel = () => {
    setShowEtaPanel(false);
  };
  
  // Start navigation mode
  const handleStartNavigation = () => {
    setIsNavigating(true);
    setShowEtaPanel(false);
    
    // Set default values for navigation data - use a default pace instead of "--:-- min/km"
    const defaultPace = "8:00 min/km";
    setPace(defaultPace);
    setLastValidPace(defaultPace); // Initialize with a default pace
    setEta("--:--");
    
    // Initialize navigation data with current location
    if (location) {
      console.log("🏁 Starting navigation from current position");
      
      // Clear any previous path data
      setTraveledPathCoordinates([{
        latitude: location.latitude,
        longitude: location.longitude
      }]);
      
      // Reset all time-tracking
      startTimeRef.current = Date.now();
      setElapsedTime(0);
    }
    
    // Set initial distance left
    if (routeData?.distance) {
      setDistanceLeft(routeData.distance);
      console.log(`📏 Initial distance: ${routeData.distance} km`);
    }
    
    // Start location tracking
    startLocationTracking();
    
    // Force an immediate update of the navigation data
    setTimeout(() => {
      updateNavigationData();
    }, 500);
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
    
    // Reset pace values
    setPace("--:-- min/km");
    setLastValidPace(null);
    
    // Clear destination marker and route polyline
    setDestinationCoords(null);
    setRouteCoordinates([]);
    setRouteData(null);
    
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
      
      // Clear recent pace readings when starting new tracking
      setRecentPaceReadings([]);
      console.log("🔍 Starting high-density location tracking (10 points/second)");
      
      // Initialize traveledPathCoordinates with current location
      if (location && isNavigating) {
        console.log(`🧭 Initializing path with current location: ${location.latitude}, ${location.longitude}`);
        setTraveledPathCoordinates([{
          latitude: location.latitude,
          longitude: location.longitude
        }]);
        
        // Initialize recent locations with current location
        setRecentLocations([{
          timestamp: Date.now(),
          coords: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }]);
      }
      
      // Start tracking location with high accuracy and increased frequency
      watchPositionSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation, // Highest possible accuracy
          timeInterval: 100,  // Update 10 times per second
          distanceInterval: 0.05, // Update with extremely tiny movements (5cm)
        },
        (newLocation) => {
          if (isNavigating && !isPaused) {
            const coords = newLocation.coords;
            const now = Date.now();
            console.log(`📍 New location at ${now % 10000}: ${coords.latitude.toFixed(8)}, ${coords.longitude.toFixed(8)}, accuracy: ${coords.accuracy}m`);
            
            // Add to recent locations window (keep more points for better responsiveness)
            setRecentLocations(prev => {
              // Keep only locations from last 15 seconds
              const recent = prev.filter(loc => now - loc.timestamp < 15000);
              // Add new location
              const updated = [...recent, {
                timestamp: now,
                coords: {
                  latitude: coords.latitude,
                  longitude: coords.longitude
                }
              }];
              
              console.log(`📊 Recent locations buffer: ${updated.length} points in last 15s`);
              return updated;
            });
            
            // Check if the new location is different
            const lastPath = traveledPathCoordinates[traveledPathCoordinates.length - 1];
            const distanceMoved = lastPath ? calculateDistance(
              lastPath.latitude, 
              lastPath.longitude,
              coords.latitude,
              coords.longitude
            ) : 0;
            
            console.log(`📏 Distance moved since last point: ${distanceMoved.toFixed(2)}m`);
            
            // Add new point with an even lower threshold to capture more movement data
            if (!lastPath || distanceMoved > 0.05) { // 5cm threshold - more aggressive
              // Add new point to traveled path
              setTraveledPathCoordinates(prevPath => {
                const newPath = [
                  ...prevPath,
                  {
                    latitude: coords.latitude,
                    longitude: coords.longitude
                  }
                ];
                console.log(`🛣️ Path updated: ${newPath.length} points total (${(newPath.length / (elapsedTime || 1)).toFixed(1)} pts/sec)`);
                return newPath;
              });
              
              // Force a navigation data update with each significant new point
              updateNavigationData();
            }
          }
        }
      );
      
      // Also set up a regular interval to ensure the UI updates even if location doesn't change
      updateIntervalRef.current = setInterval(() => {
        if (isNavigating && !isPaused) {
          console.log(`⏱️ Periodic update triggered`);
          updateNavigationData();
        }
      }, 500); // Update every half second
      
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

  // Update the pace calculation to use a simple point-to-point approach
  const calculateRecentPace = () => {
    // Need at least 2 points to calculate pace
    if (recentLocations.length < 2) {
      console.log(`⚠️ Need at least 2 points, using default pace`);
      return 8; // Default pace of 8 min/km (walking pace)
    }
    
    // Sort by timestamp ascending to get the newest points
    const sortedLocations = [...recentLocations].sort((a, b) => a.timestamp - b.timestamp);
    
    // Use the most recent two points
    const currentPoint = sortedLocations[sortedLocations.length - 1];
    const previousPoint = sortedLocations[sortedLocations.length - 2];
    
    // Calculate distance between two points
    const distanceMeters = calculateDistance(
      previousPoint.coords.latitude, previousPoint.coords.longitude,
      currentPoint.coords.latitude, currentPoint.coords.longitude
    );

    // Get time difference in minutes
    const timeSpanMinutes = (currentPoint.timestamp - previousPoint.timestamp) / 60000;

    // Calculate pace (minutes per km)
    const distanceKm = distanceMeters / 1000;
    const pace = timeSpanMinutes / distanceKm;
    
    // Log details for debugging
    console.log(`📏 Point-to-point distance: ${distanceMeters.toFixed(2)}m`);
    console.log(`⏱️ Time between points: ${(timeSpanMinutes * 60).toFixed(1)} seconds`);
    
    // If we moved a meaningful distance, calculate accurate pace
    if (distanceMeters > 0.1) { // 10cm minimum threshold
      // Calculate pace (minutes per km)
      const distanceKm = distanceMeters / 1000;
      const pace = timeSpanMinutes / distanceKm;
      console.log(`🏃‍♂️ Direct pace calculation: ${pace.toFixed(2)} min/km`);
      return pace;
    }
    
    // If we didn't move much but have a previous valid pace, maintain it
    if (lastValidPace) {
      // Extract numeric value from the pace string (e.g. "8:30 min/km" → 8.5)
      const paceParts = lastValidPace.split(':');
      const minutes = parseInt(paceParts[0]);
      const seconds = parseInt(paceParts[1]);
      const numericPace = minutes + (seconds / 60);
      console.log(`🏃‍♂️ Using extracted numeric pace from last valid: ${numericPace.toFixed(2)} min/km`);
      return numericPace;
    }
    
    // Fall back to default pace
    console.log(`🏃‍♂️ Using default pace`);
    return 8; // Default 8 min/km
  }

  // Update navigation information like distance left, pace, etc.
  const updateNavigationData = () => {
    console.log(`🔄 Navigation data update triggered`);
    
    // Only update if we have location and we're navigating
    if (!location || !isNavigating || !routeData) {
      console.log(`⚠️ Skipping navigation update - missing data`);
      return;
    }
    
    // Calculate distance left in kilometers (for display)
    if (destinationCoords) {
      const distanceToDestinationMeters = calculateDistance(
        location.latitude,
        location.longitude,
        destinationCoords.latitude,
        destinationCoords.longitude
      );
      
      // Convert to kilometers for display
      const distanceToDestinationKm = distanceToDestinationMeters / 1000;
      
      // Round to 1 decimal place for display
      setDistanceLeft(Math.round(distanceToDestinationKm * 10) / 10);
      
      // Calculate total distance traveled (in meters for precision)
      let totalDistanceMeters = 0;
      
      // Only calculate if we have at least 2 points
      if (traveledPathCoordinates.length > 1) {
        for (let i = 1; i < traveledPathCoordinates.length; i++) {
          const prev = traveledPathCoordinates[i - 1];
          const curr = traveledPathCoordinates[i];
          
          const segmentDistanceMeters = calculateDistance(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude
          );
          
          // Use an even lower threshold to detect very small movements
          if (segmentDistanceMeters > 0.01) { // 1cm threshold
            totalDistanceMeters += segmentDistanceMeters;
          }
        }
        
        console.log(`📊 Total distance traveled: ${totalDistanceMeters.toFixed(1)}m (${(totalDistanceMeters/1000).toFixed(3)}km) over ${traveledPathCoordinates.length} points`);
      }
      
      // Calculate recent pace - this will always return a value now
      const recentPaceValue = calculateRecentPace();
      
      // Add to recent pace readings (keep last 3 readings for smoothing)
      setRecentPaceReadings(prev => {
        const newReadings = [...prev, recentPaceValue].slice(-3);
        console.log(`🏃‍♂️ Pace readings buffer: ${newReadings.length} readings`);
        return newReadings;
      });
      
      // Apply smoothing by averaging the last few pace readings (if available)
      const smoothedPace = recentPaceReadings.length > 0 
        ? recentPaceReadings.reduce((sum, val) => sum + val, recentPaceValue) / (recentPaceReadings.length + 1)
        : recentPaceValue;
      
      // Format pace as MM:SS
      const paceMinutes = Math.floor(smoothedPace);
      const paceSeconds = Math.floor((smoothedPace - paceMinutes) * 60);
      
      const paceString = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} min/km`;
      console.log(`🏃‍♂️ Setting pace: ${paceString}`);
      
      // Store this as the last valid pace value
      setLastValidPace(paceString);
      // Always update the current pace
      setPace(paceString);
      
      // Estimate ETA based on smoothed pace
      if (smoothedPace > 0) {
        const timeToDestinationMinutes = (distanceToDestinationMeters / 1000) * smoothedPace;
        const etaTimestamp = Date.now() + timeToDestinationMinutes * 60 * 1000;
        const etaDate = new Date(etaTimestamp);
        
        // Format as HH:MM
        const hours = etaDate.getHours();
        const minutes = etaDate.getMinutes();
        setEta(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      }
    }
  };

  // Add a new clearMapElements function to handle clearing the map
  const clearMapElements = () => {
    setDestinationCoords(null);
    setRouteData(null);
    setShowEtaPanel(false);
  };

  // Add this function to handle map region changes if you want to 
  // fetch addresses for the center of the map as it moves
  const handleMapRegionChangeComplete = async (region: Region) => {
    // Add this flag to track if user moved the map
    const userMovedMap = true; // You should have some logic to determine this
    
    // Only trigger reverse geocoding if the map was moved by user
    // and not as a result of setting a destination
    if (userMovedMap && region.latitude !== 0 && region.longitude !== 0) {
      // You could implement reverse geocoding here
      console.log("Map region changed to:", region);
    }
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
        onPress={handleMapPress}
        moveOnMarkerPress={false}
      >
        {/* Destination marker - red and takes priority */}
        {destinationCoords && (
          <Marker
            coordinate={destinationCoords}
            pinColor="red" // Always use red for the destination
            title="Destination"
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
      
      {/* Only show the search bar when not navigating */}
      {!isNavigating && (
        <SearchBar 
          onLocationSelect={handleLocationSelect}
          userLocation={location ? { latitude: location.latitude, longitude: location.longitude } : null}
          onClear={clearMapElements}
        />
      )}
      
      {/* Planning ETA Panel */}
      <EtaPanel 
        visible={showEtaPanel}
        destination={destinationText || undefined}
        currentLocation={currentLocationText || undefined}
        distance={routeData?.distance || undefined}
        onClose={handleCloseEtaPanel}
        // Add a prop for the start navigation button
        onStartNavigation={handleStartNavigation}
      />
      
      {/* Navigation ETA Panel */}
      {isNavigating && (
        <NavigationPanel
          visible={true}
          destination={destinationText || 'Destination'}
          currentLocation={currentLocationText || 'Current Position'}
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
  currentLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
});
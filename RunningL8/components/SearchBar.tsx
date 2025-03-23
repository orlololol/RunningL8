import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Text, 
  Keyboard, 
  Platform, 
  KeyboardAvoidingView,
  Animated,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService, { LocationData } from '../services/ApiService';

// Temporary example history until connected to backend
// const EXAMPLE_HISTORY = [
//   { id: '1', place: 'Home', address: '123 Main St', frequency: 10 },
//   { id: '2', place: 'Work', address: '456 Office Blvd', frequency: 8 },
//   { id: '3', place: 'Gym', address: '789 Fitness Ave', frequency: 5 },
//   { id: '4', place: 'Coffee Shop', address: '321 Brew St', frequency: 3 },
// ];

interface SearchBarProps {
  onLocationSelect?: (
    destination: string, 
    currentLocation: string, 
    destinationDetails?: LocationData, 
    originDetails?: LocationData
  ) => void;
  userLocation?: { latitude: number, longitude: number } | null;
  onClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onLocationSelect,
  userLocation,
  onClear
}) => {
  const [destinationText, setDestinationText] = useState('');
  const [currentLocationText, setCurrentLocationText] = useState('Current Position');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDestinationFocused, setIsDestinationFocused] = useState(false);
  const [isCurrentLocationFocused, setIsCurrentLocationFocused] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  
  // Animation values
  const expandHeight = useRef(new Animated.Value(50)).current;
  const separatorOpacity = useRef(new Animated.Value(0)).current;
  const currentLocationOpacity = useRef(new Animated.Value(0)).current;
  
  // Search debounce timer
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Animation effect for expanding/collapsing
  useEffect(() => {
    if (isExpanded) {
      // Animate expansion
      Animated.parallel([
        Animated.timing(expandHeight, {
          toValue: 100, // Total height for both search fields
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(separatorOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(currentLocationOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Animate collapse
      Animated.parallel([
        Animated.timing(expandHeight, {
          toValue: 50, // Original height
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(separatorOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(currentLocationOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isExpanded, expandHeight, separatorOpacity, currentLocationOpacity]);

  // Update recommendations visibility based on focus state
  useEffect(() => {
    setShowRecommendations(isDestinationFocused || isCurrentLocationFocused);
  }, [isDestinationFocused, isCurrentLocationFocused]);
  
  // Handle search query changes with debounce
  useEffect(() => {
    // Skip empty searches
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set new timeout for debounce
    searchTimeout.current = setTimeout(() => {
      searchLocations(searchQuery);
    }, 300); // 300ms debounce
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  // Search for locations by query
  const searchLocations = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      setIsLoading(true);
      // Pass current coordinates for location bias
      const results = await ApiService.searchLocations(
        query, 
        userLocation?.latitude, 
        userLocation?.longitude
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchBarPress = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleLocationSelect = async (item: LocationData) => {
    try {
      // Show loading state
      setIsLoading(true);
      
      // Store which input is being filled
      const isDestination = isDestinationFocused;
      
      console.log("🔍 Getting details for selected location:", item.id);
      
      // Get complete location details including coordinates
      const details = await ApiService.getPlaceDetails(item.id);
      
      if (!details) {
        console.error('Could not get location details');
        setIsLoading(false);
        return;
      }
      
      console.log('📍 Got location details with coordinates:', {
        lat: details.latitude,
        lng: details.longitude
      });
      
      // Update the text field with the complete place name
      if (isDestination) {
        // Ensure we use the full text that comes from the API
        setDestinationText(details.place);
      } else {
        setCurrentLocationText(details.place);
      }
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
      
      // Dismiss keyboard
      Keyboard.dismiss();
      
      // Auto-collapse the search bar
      setShowRecommendations(false);
      
      // Set confirmed to prevent collapsing the search bar
      setIsConfirmed(true);
      
      // IMPORTANT: Immediately call the parent with location details
      // This will trigger marker placement and route calculation right away
      if (onLocationSelect) {
        console.log("📢 Immediately passing location details to parent");
        onLocationSelect(
          details.place,
          isDestination ? currentLocationText : details.place,
          isDestination ? details : undefined,
          isDestination ? undefined : details
        );
      }
    } catch (error) {
      console.error('Error in handleLocationSelect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDestinationFocus = () => {
    setIsDestinationFocused(true);
    setIsExpanded(true);
  };
  
  const handleDestinationChange = (text: string) => {
    setDestinationText(text);
    setSearchQuery(text);
  };

  const handleCurrentLocationFocus = () => {
    setIsCurrentLocationFocused(true);
    setIsExpanded(true);
  };
  
  const handleCurrentLocationChange = (text: string) => {
    setCurrentLocationText(text);
    
    // Only search if not "Current Position"
    if (text !== 'Current Position') {
      setSearchQuery(text);
    }
  };

  const handleBlur = () => {
    if (!isDestinationFocused && !isCurrentLocationFocused) {
      // If not confirmed, collapse after a delay
      if (!isConfirmed) {
        setTimeout(() => {
          if (!isDestinationFocused && !isCurrentLocationFocused) {
            setIsExpanded(false);
          }
        }, 200);
      }
    }
  };

  const handleConfirm = async () => {
    // Show loading state
    setIsLoading(true);
    setIsConfirmed(true);
    setShowRecommendations(false);
    Keyboard.dismiss();
    
    try {
      // If a destination was typed but not selected from results, geocode it
      if (destinationText && destinationText.trim() !== '') {
        console.log("🔍 Geocoding manually entered text:", destinationText);
        
        // First try to search for the location
        const searchResults = await ApiService.searchLocations(
          destinationText,
          userLocation?.latitude,
          userLocation?.longitude
        );
        
        // If we found any results, get details for the first one
        if (searchResults && searchResults.length > 0) {
          const firstResult = searchResults[0];
          console.log("📍 Found location match:", firstResult.place);
          
          // Get complete details including coordinates
          const details = await ApiService.getPlaceDetails(firstResult.id);
          
          if (details && details.latitude && details.longitude) {
            console.log("📍 Geocoded coordinates:", {
              lat: details.latitude,
              lng: details.longitude
            });
            
            // Call the parent with the geocoded location
            if (onLocationSelect) {
              onLocationSelect(
                details.place,
                currentLocationText.trim() || 'Current Position',
                details, // Now we have coordinates!
                undefined
              );
            }
            
            setIsLoading(false);
            return;
          }
        }
        
        // If we couldn't find coordinates, notify the user
        console.log("⚠️ Could not find coordinates for:", destinationText);
        
        // Still call onLocationSelect with the text but no coordinates
        if (onLocationSelect) {
          onLocationSelect(
            destinationText.trim(),
            currentLocationText.trim() || 'Current Position',
            undefined,
            undefined
          );
        }
      }
    } catch (error) {
      console.error("❌ Error geocoding text input:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    // Clear all search state
    setIsConfirmed(false);
    setIsExpanded(false);
    setShowRecommendations(false);
    setSearchQuery('');
    setSearchResults([]);
    
    // Explicitly clear the destination
    setDestinationText('');
    
    // Close keyboard
    Keyboard.dismiss();
    
    // Call parent's clear callback to remove marker and polyline
    if (onClear) {
      console.log("🧹 Clearing map elements via parent callback");
      onClear();
    }
  };

  const handleSearchResultSelect = async (item: LocationData) => {
    try {
      // Show loading state
      setIsLoading(true);
      
      // Store which input is being filled
      const isDestination = isDestinationFocused;
      
      // Get complete location details including coordinates
      const details = await ApiService.getPlaceDetails(item.id);
      
      if (!details) {
        console.error('Could not get location details');
        return;
      }
      
      console.log('📍 Got location details:', details);
      
      // Update the text field with the full place name from the API
      if (isDestination) {
        setDestinationText(details.place);
      } else {
        setCurrentLocationText(details.place);
      }
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
      
      // Dismiss keyboard
      Keyboard.dismiss();
      
      // Close recommendations
      setShowRecommendations(false);
      
      // Auto-collapse the search bar if it's a destination
      if (isDestination) {
        setIsExpanded(false);
      }
      
      // Set confirmed to prevent auto-collapsing
      setIsConfirmed(true);
      
      // Immediately call parent component with location details
      if (onLocationSelect) {
        onLocationSelect(
          details.place,
          isDestination ? currentLocationText : details.place,
          isDestination ? details : undefined,
          isDestination ? undefined : details
        );
      }
    } catch (error) {
      console.error('Error in handleSearchResultSelect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle Enter key press
  const handleSubmitEditing = () => {
    if (destinationText.trim() !== '') {
      handleConfirm();
    }
  };

  // Add this effect to auto-confirm after editing is done
  useEffect(() => {
    if (!isDestinationFocused && destinationText.trim() !== '' && !isConfirmed) {
      // User finished editing but didn't select a result or press enter
      // Wait a moment and then try to geocode
      const timer = setTimeout(() => {
        if (!isConfirmed && !isDestinationFocused && destinationText.trim() !== '') {
          console.log("🔄 Auto-confirming after editing");
          handleConfirm();
        }
      }, 1500); // 1.5 seconds after editing
      
      return () => clearTimeout(timer);
    }
  }, [isDestinationFocused, destinationText, isConfirmed]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Pressable onPress={handleSearchBarPress}>
        <Animated.View 
          style={[
            styles.searchBarContainer,
            {
              height: expandHeight,
            }
          ]}
        >
          {/* Back button - only visible when expanded */}
          {isExpanded && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
            >
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
          )}

          {/* Destination Search Bar - Always visible */}
          <View style={styles.inputRow}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchBar}
              placeholder="Where to?"
              value={destinationText}
              onChangeText={handleDestinationChange}
              onFocus={handleDestinationFocus}
              onSubmitEditing={handleSubmitEditing}
              returnKeyType="search"
              onBlur={() => {
                setIsDestinationFocused(false);
                handleBlur();
              }}
            />
          </View>

          {/* Separator line - only visible when expanded */}
          <Animated.View 
            style={[
              styles.separator,
              { opacity: separatorOpacity }
            ]} 
          />

          {/* Current Location - only visible when expanded */}
          <Animated.View 
            style={[
              styles.inputRow,
              { opacity: currentLocationOpacity }
            ]}
          >
            <Ionicons name="location" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchBar}
              placeholder="Your location"
              value={currentLocationText}
              onChangeText={handleCurrentLocationChange}
              onFocus={handleCurrentLocationFocus}
              onBlur={() => {
                setIsCurrentLocationFocused(false);
                handleBlur();
              }}
            />
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* Places Autocomplete Results */}
      {(showRecommendations && isExpanded) && (
        <View style={styles.recommendationsContainer}>
          {/* Title changes based on search context */}
          <Text style={styles.recentHeader}>
            {searchQuery 
              ? `Results for "${searchQuery}"` 
              : 'Nearby Places'}
          </Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2089dc" />
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.recommendationItem}
                  onPress={() => handleSearchResultSelect(item)}
                >
                  <Ionicons 
                    name="navigate-outline" 
                    size={20} 
                    color="#888" 
                    style={styles.itemIcon} 
                  />
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>{item.place}</Text>
                    <Text style={styles.itemSubtitle}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyResultsContainer}>
              <Text style={styles.emptyResultsText}>
                {searchQuery 
                  ? 'No locations found. Try a different search term.' 
                  : 'Type to search for places.'}
              </Text>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: 15,
  },
  searchBarContainer: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 5,
    top: 13,
    zIndex: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '100%',
  },
  searchBar: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  searchIcon: {
    marginRight: 15,
  },
  recommendationsContainer: {
    marginTop: 10,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 10,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentHeader: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemIcon: {
    marginRight: 15,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default SearchBar; 
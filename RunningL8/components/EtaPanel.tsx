import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  PanResponder,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EtaPanelProps {
  visible: boolean;
  destination?: string;
  currentLocation?: string;
  distance?: number; // in kilometers
  onClose?: () => void;
  onStartNavigation?: () => void; // New prop for starting navigation
}

// Panel positions
const PANEL_POSITIONS = {
  COLLAPSED: 0,    // Just the top handle is visible
  HALF: 1,         // Half screen view (default)
  EXPANDED: 2,     // Full screen view
};

const EtaPanel: React.FC<EtaPanelProps> = ({
  visible,
  destination = 'Destination',
  currentLocation = 'Current Position',
  distance = 5.2, // Default example distance
  onClose,
  onStartNavigation,
}) => {
  const [customEta, setCustomEta] = useState('');
  const [selectedEtaMode, setSelectedEtaMode] = useState<'average' | 'custom'>('average');
  const [panelPosition, setPanelPosition] = useState(PANEL_POSITIONS.HALF);
  
  // Example data - in a real app these would be calculated based on real data from API
  const avgSpeed = 8; // km/h
  const calculatedEta = Math.round((distance / avgSpeed) * 60); // in minutes
  const requiredSpeed = customEta ? Math.round((distance / (parseInt(customEta) / 60)) * 10) / 10 : 0;
  
  // Screen dimensions
  const screenHeight = Dimensions.get('window').height;
  const panelHeightCollapsed = 80; // Height when collapsed, showing just the handle and title
  const panelHeightHalf = screenHeight * 0.7; // Height when half-expanded (default)
  const panelHeightFull = screenHeight - (Platform.OS === 'ios' ? StatusBar.currentHeight || 0 : 0); // Full height minus status bar
  
  // Animation values
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const lastGestureDy = useRef(0);
  
  // Track the panel's position for swipe calculations
  const currentPanelHeight = useRef(panelHeightHalf);

  // Pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 3);
      },
      onPanResponderGrant: () => {
        // When touch begins, don't animate to allow immediate response to touch
        translateY.stopAnimation();
        translateY.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        // Track the drag amount
        lastGestureDy.current = gestureState.dy;
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        // When released, flatten the offset
        translateY.flattenOffset();
        
        const { dy } = gestureState;
        const draggedUp = dy < 0;
        const draggedDown = dy > 0;
        const significantDrag = Math.abs(dy) > 50;
        
        // Determine target position based on drag direction and current position
        let newPosition = panelPosition;
        
        if (significantDrag) {
          if (draggedUp) {
            // Dragged up - go to next higher position if possible
            newPosition = Math.min(panelPosition + 1, PANEL_POSITIONS.EXPANDED);
          } else if (draggedDown) {
            // Dragged down - go to next lower position if possible
            newPosition = Math.max(panelPosition - 1, PANEL_POSITIONS.COLLAPSED);
          }
        }
        
        // Animate to the target position
        animateToPosition(newPosition);
      },
    })
  ).current;

  // Animate panel to a specific position
  const animateToPosition = (position: number) => {
    let targetValue = 0;
    
    switch (position) {
      case PANEL_POSITIONS.COLLAPSED:
        targetValue = screenHeight - panelHeightCollapsed;
        currentPanelHeight.current = panelHeightCollapsed;
        break;
      case PANEL_POSITIONS.HALF:
        targetValue = screenHeight - panelHeightHalf;
        currentPanelHeight.current = panelHeightHalf;
        break;
      case PANEL_POSITIONS.EXPANDED:
        targetValue = screenHeight - panelHeightFull;
        currentPanelHeight.current = panelHeightFull;
        break;
    }
    
    Animated.spring(translateY, {
      toValue: targetValue,
      useNativeDriver: true,
      friction: 20,
      tension: 40,
    }).start();
    
    setPanelPosition(position);
  };

  // Effect to animate in/out when visibility changes
  useEffect(() => {
    if (visible) {
      // When shown, animate to half position by default
      animateToPosition(PANEL_POSITIONS.HALF);
    } else {
      // When hidden, animate fully off screen
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, screenHeight]);

  const handleCustomEtaChange = (text: string) => {
    // Only allow numbers
    if (/^\d*$/.test(text)) {
      setCustomEta(text);
      if (text) {
        setSelectedEtaMode('custom');
      }
    }
  };

  // Close handler with position reset
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    
    // Reset to half position for next time it's opened
    setPanelPosition(PANEL_POSITIONS.HALF);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          height: panelHeightFull,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>
      
      <View style={styles.header}>
        <Text style={styles.title}>Trip Information</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#555" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        // Disable scrolling when panel is in collapsed state
        scrollEnabled={panelPosition !== PANEL_POSITIONS.COLLAPSED}
      >
        <View style={styles.locationInfo}>
          <View style={styles.locationRow}>
            <Ionicons name="navigate" size={20} color="#2089dc" style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>{destination}</Text>
          </View>
          <View style={styles.locationDivider} />
          <View style={styles.locationRow}>
            <Ionicons name="location" size={20} color="#ff6b6b" style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>{currentLocation}</Text>
          </View>
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Distance:</Text>
            <Text style={styles.infoValue}>{distance} km</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.etaSection}>
            <Text style={styles.sectionTitle}>Estimated Time of Arrival</Text>
            
            <TouchableOpacity 
              style={[
                styles.etaOption,
                selectedEtaMode === 'average' && styles.selectedEtaOption,
              ]}
              onPress={() => setSelectedEtaMode('average')}
            >
              <View style={styles.etaOptionContent}>
                <Text style={styles.etaOptionTitle}>Based on Average Speed</Text>
                <Text style={styles.etaOptionSubtitle}>({avgSpeed} km/h)</Text>
              </View>
              <Text style={styles.etaTime}>{calculatedEta} min</Text>
            </TouchableOpacity>
            
            <View style={styles.etaOptionSeparator} />
            
            <TouchableOpacity 
              style={[
                styles.etaOption,
                selectedEtaMode === 'custom' && styles.selectedEtaOption,
              ]}
              onPress={() => setSelectedEtaMode('custom')}
            >
              <View style={styles.etaOptionContent}>
                <Text style={styles.etaOptionTitle}>Custom Arrival Time</Text>
                <Text style={styles.etaOptionSubtitle}>
                  {customEta ? `Need to travel at ${requiredSpeed} km/h` : 'Set your preferred time'}
                </Text>
              </View>
              <View style={styles.customEtaInput}>
                <TextInput
                  style={styles.etaInput}
                  placeholder="min"
                  keyboardType="numeric"
                  value={customEta}
                  onChangeText={handleCustomEtaChange}
                  onFocus={() => setSelectedEtaMode('custom')}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Weather Conditions</Text>
          <View style={styles.weatherRow}>
            <Ionicons name="partly-sunny" size={24} color="#FFB100" />
            <Text style={styles.weatherText}>Sunny, 23°C</Text>
          </View>
          <Text style={styles.weatherImpact}>Good conditions for your trip</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.startButton}
          onPress={onStartNavigation}
        >
          <Text style={styles.startButtonText}>Start Navigation</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 100,
  },
  handleContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    height: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  locationInfo: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  locationIcon: {
    marginRight: 15,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  locationDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 5,
    marginLeft: 35,
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 16,
    color: '#555',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  etaSection: {
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  etaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedEtaOption: {
    borderColor: '#2089dc',
    backgroundColor: 'rgba(32, 137, 220, 0.05)',
  },
  etaOptionContent: {
    flex: 1,
  },
  etaOptionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  etaOptionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  etaTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2089dc',
  },
  etaOptionSeparator: {
    height: 10,
  },
  customEtaInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    width: 70,
    textAlign: 'center',
    fontSize: 16,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  weatherText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  weatherImpact: {
    fontSize: 14,
    color: '#3CB371',
    marginTop: 5,
  },
  startButton: {
    backgroundColor: '#2089dc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EtaPanel; 
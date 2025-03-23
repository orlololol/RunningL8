import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  PanResponder,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Split {
  id: number;
  time: string;
  distance: number;
  pace: string;
}

interface NavigationPanelProps {
  visible: boolean;
  destination: string;
  currentLocation: string;
  distance: number; // in kilometers
  distanceLeft: number; // in kilometers
  pace: string; // e.g., "5:30 min/km"
  eta: string; // e.g., "10:45 AM"
  elapsedTime: string; // e.g., "00:15:30"
  onFinish: () => void;
}

// Panel positions
const PANEL_POSITIONS = {
  COLLAPSED: 0,    // Just the top handle is visible
  MIDDLE: 1,       // Middle screen view (40%)
  EXPANDED: 2,     // Full screen view
};

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  visible,
  destination,
  currentLocation,
  distance,
  distanceLeft,
  pace,
  eta,
  elapsedTime,
  onFinish,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [splits, setSplits] = useState<Split[]>([
    { id: 1, time: "00:00:00", distance: 0.0, pace: "0:00 min/km" }
  ]);
  const [panelPosition, setPanelPosition] = useState(PANEL_POSITIONS.MIDDLE);
  
  // Screen dimensions
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const panelHeightCollapsed = 400; // Height when collapsed
  const panelHeightMiddle = screenHeight * 0.4; // 40% of screen height
  const panelHeightFull = screenHeight - (Platform.OS === 'ios' ? StatusBar.currentHeight || 0 : 0) - 80; // Subtract navigation controls height
  
  // Animation values
  const translateY = useRef(new Animated.Value(screenHeight - panelHeightMiddle)).current;
  const lastGestureDy = useRef(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Track the panel's position for swipe calculations
  const currentPanelHeight = useRef(panelHeightMiddle);
  const splitsScrollViewRef = useRef<ScrollView>(null);

  // Add a pulse animation for the "Calculating..." text
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
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
      case PANEL_POSITIONS.MIDDLE:
        targetValue = screenHeight - panelHeightMiddle;
        currentPanelHeight.current = panelHeightMiddle;
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

  useEffect(() => {
    if (visible) {
      animateToPosition(PANEL_POSITIONS.MIDDLE);
    } else {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Mock split recording - in a real app, this would be based on actual distance traveled
  useEffect(() => {
    // This is just a mock to simulate splits being recorded every 5 minutes
    const timer = setInterval(() => {
      setSplits(prevSplits => {
        const newSplit = {
          id: prevSplits.length + 1,
          time: elapsedTime,
          distance: 0.5 * prevSplits.length,
          pace: `${4 + Math.floor(Math.random() * 2)}:${30 + Math.floor(Math.random() * 30)} min/km`,
        };
        
        // Scroll to the bottom of splits view when new split is added
        setTimeout(() => {
          if (splitsScrollViewRef.current) {
            splitsScrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
        
        return [...prevSplits, newSplit];
      });
    }, 30000); // Every 30 seconds for demo purposes (would be 5 minutes in real app)

    return () => clearInterval(timer);
  }, [elapsedTime]);

  // Set up pulse animation
  useEffect(() => {
    // Only run animation when pace is being calculated
    if (pace === '--:-- min/km') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animation when pace is calculated
      pulseAnim.setValue(1);
    }
  }, [pace]);

  const slides = [
    {
      id: 'eta',
      title: 'ETA',
      value: eta,
      icon: 'time-outline' as const,
    },
    {
      id: 'distance',
      title: 'Distance Left',
      value: `${distanceLeft.toFixed(1)} km`,
      icon: 'map-outline' as const,
    },
  ];

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (e: any) => {
    const contentOffset = e.nativeEvent.contentOffset;
    const viewSize = e.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setActiveSlide(pageNum);
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
    >
      {/* Drag Handle */}
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Elapsed Time */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeLabel}>Time</Text>
        <Text style={styles.timeValue}>{elapsedTime}</Text>
      </View>

      {/* Locations */}
      <View style={styles.locationInfo}>
        <View style={styles.locationRow}>
          <Ionicons name="navigate" size={20} color="#2089dc" style={styles.locationIcon} />
          <Text style={styles.locationText} numberOfLines={1}>{destination}</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((distance - distanceLeft) / distance) * 100}%` }
            ]} 
          />
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={20} color="#ff6b6b" style={styles.locationIcon} />
          <Text style={styles.locationText} numberOfLines={1}>{currentLocation}</Text>
        </View>
      </View>

      {/* Current Pace - Larger Display */}
      <View style={styles.paceContainer}>
        <Text style={styles.paceLabel}>Current Pace</Text>
        <View style={styles.paceValueContainer}>
          <Ionicons 
            name="speedometer-outline" 
            size={28} 
            color="#333" 
            style={styles.paceIcon} 
          />
          <View style={styles.paceTextContainer}>
            <Text style={styles.paceValue}>{pace}</Text>
            {/* Always show "current pace" indicator */}
            <Text style={styles.paceSubtext}>current pace</Text>
          </View>
        </View>
      </View>

      {/* Stats carousel - only ETA and Distance */}
      <View style={styles.carouselContainer}>
        <Animated.FlatList
          data={slides}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: screenWidth - 40 }]}>
              <View style={styles.slideContent}>
                <Ionicons name={item.icon} size={28} color="#555" style={styles.slideIcon} />
                <View>
                  <Text style={styles.slideTitle}>{item.title}</Text>
                  <Text style={styles.slideValue}>{item.value}</Text>
                </View>
              </View>
            </View>
          )}
        />

        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeSlide ? styles.paginationDotActive : {},
              ]}
            />
          ))}
        </View>
      </View>

      {/* Splits - visible at all times */}
      <View style={[
        styles.splitsContainer,
        { maxHeight: panelPosition === PANEL_POSITIONS.EXPANDED ? 'auto' : 150 }
      ]}>
        <Text style={styles.splitsTitle}>Splits</Text>
        <View style={styles.splitsHeader}>
          <Text style={styles.splitHeaderText}>Split</Text>
          <Text style={styles.splitHeaderText}>Time</Text>
          <Text style={styles.splitHeaderText}>Distance</Text>
          <Text style={styles.splitHeaderText}>Pace</Text>
        </View>
        <ScrollView 
          ref={splitsScrollViewRef}
          style={styles.splitsList}
          showsVerticalScrollIndicator={true}
        >
          {splits.map((split) => (
            <View key={split.id} style={styles.splitItem}>
              <Text style={styles.splitText}>{split.id}</Text>
              <Text style={styles.splitText}>{split.time}</Text>
              <Text style={styles.splitText}>{split.distance.toFixed(1)} km</Text>
              <Text style={styles.splitText}>{split.pace}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {panelPosition === PANEL_POSITIONS.EXPANDED && (
        <TouchableOpacity 
          style={styles.expandHint}
          onPress={() => animateToPosition(PANEL_POSITIONS.MIDDLE)}
        >
          <Ionicons name="chevron-down" size={24} color="#999" />
          <Text style={styles.expandHintText}>Collapse panel</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Leave space for the navigation controls at the bottom
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 90,
  },
  handleContainer: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  timeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  timeLabel: {
    fontSize: 14,
    color: '#777',
  },
  timeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  locationInfo: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    marginHorizontal: 20,
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
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginVertical: 10,
    marginLeft: 10,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2089dc',
    borderRadius: 2,
  },
  paceContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  paceLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  paceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceIcon: {
    marginRight: 10,
  },
  paceValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
  },
  paceCalculating: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  paceInstructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  carouselContainer: {
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  slide: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    height: 90,
    justifyContent: 'center',
  },
  slideContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideIcon: {
    marginRight: 15,
  },
  slideTitle: {
    fontSize: 16,
    color: '#555',
  },
  slideValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#2089dc',
  },
  splitsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
  },
  splitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  splitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  splitHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#777',
    width: '25%',
  },
  splitsList: {
    maxHeight: 300,
  },
  splitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  splitText: {
    fontSize: 14,
    color: '#333',
    width: '25%',
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 10,
  },
  expandHintText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 5,
  },
  paceTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});

export default NavigationPanel; 
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NavigationControlsProps {
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  onPause,
  onResume,
  onFinish,
}) => {
  const [isPaused, setIsPaused] = useState(false);

  const handlePauseToggle = () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      onResume();
    } else {
      // Pause
      setIsPaused(true);
      onPause();
    }
  };

  const handleFinish = () => {
    onFinish();
    setIsPaused(false);
  };

  return (
    <View style={styles.container}>
      {!isPaused ? (
        // Single pause button when not paused
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={handlePauseToggle}
        >
          <Ionicons name="pause" size={28} color="white" />
        </TouchableOpacity>
      ) : (
        // Two buttons when paused
        <View style={styles.pausedContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePauseToggle}
          >
            <Ionicons name="play" size={24} color="white" />
            <Text style={styles.buttonText}>Resume</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.finishButton]}
            onPress={handleFinish}
          >
            <Ionicons name="flag" size={24} color="white" />
            <Text style={styles.buttonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    zIndex: 100,
  },
  pauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2089dc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pausedContainer: {
    flexDirection: 'row',
    width: '80%',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2089dc',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  finishButton: {
    backgroundColor: '#ff6b6b',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default NavigationControls; 
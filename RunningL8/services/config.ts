// API Configuration
export const API_CONFIG = {
  // Backend URL
  BASE_URL: 'http://138.197.155.224:8080/api',
  TIMEOUT: 15000, // 15 seconds timeout - longer for hackathon conditions
  
  // This is used for Google Places API
  GOOGLE_PLACES_API_KEY: 'AIzaSyDrSO3955VyJY7HOmBfTrVXMhjoY5qDDIk', // Replace with your actual key
};

// Replace 'YOUR_GOOGLE_PLACES_API_KEY' with your actual Google Places API key
// For better security, use:
// GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',

// Add this key to your .env file
// EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_places_api_key 
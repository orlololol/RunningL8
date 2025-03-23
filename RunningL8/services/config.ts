// API Configuration
export const API_CONFIG = {
  // Production backend URL
  BASE_URL: 'http://138.197.155.224:8080/api',
  TIMEOUT: 10000, // 10 seconds
  
  // Google Places API config
  GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
};

// Add this key to your .env file
// EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_places_api_key 
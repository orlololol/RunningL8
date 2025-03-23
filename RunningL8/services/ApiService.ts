import axios from 'axios';

// Base URL for the Spring Boot backend
// TODO: Replace with your actual backend URL
const API_BASE_URL = 'http://localhost:8080/api';

// Interface for location data
export interface LocationData {
  id: string;
  place: string;
  address: string;
  frequency: number;
  latitude?: number;
  longitude?: number;
}

// Interface for route data
export interface RouteData {
  distance: number;        // in kilometers
  duration: number;        // in minutes
  startLocation: LocationData;
  endLocation: LocationData;
  polyline?: string;       // encoded polyline for route
  trafficCondition?: 'light' | 'moderate' | 'heavy';
}

// Interface for weather data
export interface WeatherData {
  temperature: number;     // in Celsius
  condition: string;       // e.g., "Sunny", "Rainy", etc.
  icon: string;            // icon name or code
  impact: string;          // e.g., "Good conditions for your trip"
}

/**
 * Service for all API calls to the backend
 */
class ApiService {
  /**
   * Get recent destinations for the user
   * @param userId The ID of the user
   * @returns Promise with array of recent locations
   */
  async getRecentDestinations(userId: string): Promise<LocationData[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/recent-destinations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent destinations:', error);
      return [];
    }
  }

  /**
   * Get suggested destinations based on user history and preferences
   * @param userId The ID of the user
   * @returns Promise with array of suggested locations
   */
  async getSuggestedDestinations(userId: string): Promise<LocationData[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/suggested-destinations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching suggested destinations:', error);
      return [];
    }
  }

  /**
   * Save a destination to user history
   * @param userId The ID of the user
   * @param location The location data to save
   * @returns Promise with saved location data
   */
  async saveDestination(userId: string, location: Partial<LocationData>): Promise<LocationData> {
    try {
      const response = await axios.post(`${API_BASE_URL}/users/${userId}/destinations`, location);
      return response.data;
    } catch (error) {
      console.error('Error saving destination:', error);
      throw error;
    }
  }

  /**
   * Get route information between two locations
   * @param startLat Starting latitude
   * @param startLng Starting longitude
   * @param endLat Ending latitude
   * @param endLng Ending longitude
   * @returns Promise with route data
   */
  async getRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<RouteData> {
    try {
      const response = await axios.get(`${API_BASE_URL}/routes`, {
        params: {
          startLat,
          startLng,
          endLat,
          endLng,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  }

  /**
   * Get weather information for a location
   * @param lat Latitude
   * @param lng Longitude
   * @returns Promise with weather data
   */
  async getWeather(lat: number, lng: number): Promise<WeatherData> {
    try {
      const response = await axios.get(`${API_BASE_URL}/weather`, {
        params: {
          lat,
          lng,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  }

  /**
   * Search for locations by query text
   * @param query The search query
   * @returns Promise with array of matching locations
   */
  async searchLocations(query: string): Promise<LocationData[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/locations/search`, {
        params: {
          query,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }

  /**
   * Get ETA based on average speed
   * @param distance Distance in kilometers
   * @returns Promise with ETA in minutes
   */
  async getAverageEta(distance: number): Promise<number> {
    try {
      const response = await axios.get(`${API_BASE_URL}/eta/average`, {
        params: {
          distance,
        },
      });
      return response.data.eta;
    } catch (error) {
      console.error('Error fetching average ETA:', error);
      // Fallback calculation (20 km/h average)
      return Math.round((distance / 20) * 60);
    }
  }

  /**
   * Calculate required speed to reach destination in given time
   * @param distance Distance in kilometers
   * @param timeMinutes Time in minutes
   * @returns Promise with required speed in km/h
   */
  async getRequiredSpeed(distance: number, timeMinutes: number): Promise<number> {
    try {
      const response = await axios.get(`${API_BASE_URL}/eta/required-speed`, {
        params: {
          distance,
          timeMinutes,
        },
      });
      return response.data.requiredSpeed;
    } catch (error) {
      console.error('Error calculating required speed:', error);
      // Fallback calculation
      return Math.round((distance / (timeMinutes / 60)) * 10) / 10;
    }
  }
}

export default new ApiService(); 
import axios from 'axios';
import { API_CONFIG } from './config';

console.log("🔧 API Service Configuration:", {
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT
});

// Configure axios instance with interceptors for better logging
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Add request interceptor for logging
api.interceptors.request.use(
  config => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error("❌ API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  response => {
    console.log(`✅ API Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  error => {
    if (error.response) {
      // Server responded with an error status code
      console.error(`❌ API Error Response: ${error.response.status} from ${error.config?.url}`);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error("❌ API No Response:", error.message);
      console.error("Request:", error.request);
    } else {
      // Error in setting up the request
      console.error("❌ API Request Setup Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ---------- Interfaces for Data Structures ----------

export interface LocationData {
  id: string;
  place: string;
  address: string;
  latitude: number;
  longitude: number;
}

// ---------- Interfaces for Requests ----------

// For routing using detailed info
export interface RouteRequest {
  currentLat: number;
  currentLng: number;
  destinationLat: number;
  destinationLng: number;
  distance?: string;
  neededArrivalTime?: string;
}

// For generic routing (minimal lat/lng data)
export interface GenericRouteRequest {
  currentLat: number;
  currentLng: number;
  destinationLat: number;
  destinationLng: number;
}

// For starting a run
export interface StartRunRequest {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: string;
  neededArrivalTime: string;
}

// For ending a run
export interface EndRunRequest {
  timeFinished: Date | string;
}

// ---------- Interfaces for Responses ----------

export interface RouteData {
  distance: number;
  duration: number;
  polyline: string;
  startLocation: {
    latitude: number;
    longitude: number;
  };
  endLocation: {
    latitude: number;
    longitude: number;
  };
}

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  impact: string;
}

// ---------- API Service Class ----------
const apiService = {
  // ---------------- Route Endpoints ----------------

  /**
   * Gets a route based on start and end coordinates
   */
  async getRoute(request: RouteRequest): Promise<RouteData> {
    try {
      const response = await api.post('/route', request);
      return this.parseRouteResponse(response.data);
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  },

  /**
   * Helper function to retry API calls on failure
   */
  async retryApiCall<T>(
    apiCall: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 API call attempt ${attempt}/${maxRetries}`);
        return await apiCall();
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        // Only retry for network errors
        if (axios.isAxiosError(error) && !error.response) {
          if (attempt < maxRetries) {
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Increase delay for next attempt (exponential backoff)
            delay *= 2;
          }
        } else {
          // Not a network error, don't retry
          break;
        }
      }
    }
    
    console.error(`❌ All ${maxRetries} attempts failed.`);
    throw lastError;
  },

  /**
   * Gets a generic route based on basic latitude and longitude information
   */
  async getGenericRoute(request: GenericRouteRequest): Promise<RouteData> {
    console.log("📝 getGenericRoute() called with request:", JSON.stringify(request, null, 2));
    console.log("🌐 API URL:", `${API_CONFIG.BASE_URL}/route/generic`);
    
    // For hackathon debugging - try both endpoint variations
    const endpoints = ['/route/generic', '/route'];
    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`⏳ Trying endpoint: ${endpoint}`);
        const response = await axios({
          method: 'post',
          url: `${API_CONFIG.BASE_URL}${endpoint}`,
          data: request,
          timeout: API_CONFIG.TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log(`✅ Success with endpoint: ${endpoint}`);
        console.log("✅ Response received:", JSON.stringify(response.data, null, 2));
        return this.parseRouteResponse(response.data);
      } catch (error) {
        lastError = error;
        console.error(`❌ Error with endpoint ${endpoint}:`, error.message);
        
        // Add more detailed error info for debugging
        if (axios.isAxiosError(error)) {
          if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data || {})}`);
          } else if (error.request) {
            console.error("   No response received from server");
            console.error(`   Request: ${error.request}`);
          }
        }
      }
    }
    
    console.error("❌ All endpoints failed. Using placeholder route data");
    
    // For hackathon - return fake data instead of throwing an error
    return {
      distance: 2.5,
      duration: 30,
      polyline: '',
      startLocation: {
        latitude: request.currentLat,
        longitude: request.currentLng,
      },
      endLocation: {
        latitude: request.destinationLat,
        longitude: request.destinationLng,
      }
    };
  },

  /**
   * Parse Google route response into our format
   */
  parseRouteResponse(data: any): RouteData {
    console.log("📊 Parsing route response data", typeof data);
    
    try {
      // Check if data is a string, try to parse it
      if (typeof data === 'string') {
        try {
          console.log("🔄 Converting string response to JSON");
          data = JSON.parse(data);
        } catch (parseError) {
          console.error("❌ Failed to parse JSON string:", parseError);
          console.log("📜 Raw data received:", data.substring(0, 200) + "...");
        }
      }
      
      // Parse the Google Maps API response
      const routes = data.routes || [];
      console.log(`🛣️ Found ${routes.length} routes in response`);
      
      if (routes.length === 0) {
        console.error("⚠️ No routes found in API response");
        throw new Error('No routes found');
      }
      
      const route = routes[0];
      const legs = route.legs || [];
      console.log(`🦿 Found ${legs.length} legs in route`);
      
      if (legs.length === 0) {
        console.error("⚠️ No route legs found in API response");
        throw new Error('No route legs found');
      }
      
      const leg = legs[0];
      console.log(`👟 First leg has ${leg.steps?.length || 0} steps`);
      
      // Get total distance in meters, convert to kilometers
      const distanceMeters = Array.isArray(leg.steps) 
        ? leg.steps.reduce((total: number, step: any) => {
            console.log(`- Step distance: ${step.distanceMeters || 0} meters`);
            return total + (step.distanceMeters || 0);
          }, 0)
        : 0;
      
      // Estimate duration based on walking speed (5 km/h)
      const distanceKm = distanceMeters / 1000;
      const durationMinutes = Math.round((distanceKm / 5) * 60);
      
      console.log(`📏 Total distance: ${distanceKm.toFixed(2)} km`);
      console.log(`⏱️ Estimated duration: ${durationMinutes} minutes`);
      console.log(`📍 Start location:`, route.polyline?.encodedPolyline ? "Polyline exists" : "No polyline");
      
      return {
        distance: distanceKm,
        duration: durationMinutes,
        polyline: route.polyline?.encodedPolyline || '',
        startLocation: {
          latitude: leg.startLocation?.latLng?.latitude || 0,
          longitude: leg.startLocation?.latLng?.longitude || 0,
        },
        endLocation: {
          latitude: leg.endLocation?.latLng?.latitude || 0,
          longitude: leg.endLocation?.latLng?.longitude || 0,
        }
      };
    } catch (error) {
      console.error("❌ Error parsing route response:", error);
      console.log("📜 Raw data structure:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
      return {
        distance: 0,
        duration: 0,
        polyline: '',
        startLocation: { latitude: 0, longitude: 0 },
        endLocation: { latitude: 0, longitude: 0 }
      };
    }
  },

  // ---------------- Location Search (Google Places API) ----------------
  
  /**
   * Search for locations using Google Places Autocomplete API
   */
  async searchLocations(query: string): Promise<LocationData[]> {
    if (!query || query.trim() === '') {
      return [];
    }
    
    try {
      // This uses the Google Places API directly from the client
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${API_CONFIG.GOOGLE_PLACES_API_KEY}&types=geocode`
      );
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.warn(`Places API error: ${data.status}`);
        return [];
      }
      
      // Convert Google Places predictions to LocationData format
      return data.predictions.map((prediction: any, index: number) => ({
        id: prediction.place_id || `location-${index}`,
        place: prediction.structured_formatting?.main_text || prediction.description,
        address: prediction.structured_formatting?.secondary_text || '',
        latitude: 0, // These would need to be populated with a follow-up API call
        longitude: 0, // to get detailed place information including coordinates
      }));
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  },

  /**
   * Get detailed location information from a place_id
   */
  async getPlaceDetails(placeId: string): Promise<LocationData | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name&key=${API_CONFIG.GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.result) {
        console.warn(`Place details API error: ${data.status}`);
        return null;
      }
      
      return {
        id: placeId,
        place: data.result.name,
        address: data.result.formatted_address,
        latitude: data.result.geometry?.location?.lat || 0,
        longitude: data.result.geometry?.location?.lng || 0,
      };
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  },

  // ---------------- Run Endpoints ----------------

  /**
   * Starts a new run
   */
  async startRun(request: StartRunRequest): Promise<any> {
    try {
      const response = await api.post('/run/start', request);
      return response.data;
    } catch (error) {
      console.error('Error starting run:', error);
      throw error;
    }
  },

  /**
   * Ends a run and logs its finish time
   */
  async endRun(request: EndRunRequest): Promise<any> {
    try {
      const response = await api.post('/run/end', request);
      return response.data;
    } catch (error) {
      console.error('Error ending run:', error);
      throw error;
    }
  },
};

export default apiService;
import axios from 'axios';
import { API_CONFIG } from './config';

// Configure axios instance
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

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
   * Gets a generic route based on basic latitude and longitude information
   */
  async getGenericRoute(request: GenericRouteRequest): Promise<RouteData> {
    try {
      const response = await api.post('/route/generic', request);
      return this.parseRouteResponse(response.data);
    } catch (error) {
      console.error('Error fetching generic route:', error);
      throw error;
    }
  },

  /**
   * Parse Google route response into our format
   */
  parseRouteResponse(data: any): RouteData {
    try {
      // Parse the Google Maps API response
      const routes = data.routes || [];
      if (routes.length === 0) {
        throw new Error('No routes found');
      }
      
      const route = routes[0];
      const legs = route.legs || [];
      if (legs.length === 0) {
        throw new Error('No route legs found');
      }
      
      const leg = legs[0];
      
      // Get total distance in meters, convert to kilometers
      const distanceMeters = leg.steps.reduce((total: number, step: any) => 
        total + (step.distanceMeters || 0), 0);
      
      // Estimate duration based on walking speed (5 km/h)
      const distanceKm = distanceMeters / 1000;
      const durationMinutes = Math.round((distanceKm / 5) * 60);
      
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
      console.error('Error parsing route response:', error);
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
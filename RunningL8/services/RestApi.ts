import axios from 'axios';

// Base URL for your Spring Boot backend
const API_BASE_URL = 'http://138.197.155.224:8080/api/';

// ---------- Interfaces for Requests ----------

// For creating an account
export interface AccountRequest {
  name?: string;
  email: string;
  password?: string;
}

// For routing using detailed info
export interface RouteRequest {
  email: string;
  currentLat: number;
  currentLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: string;
  neededArrivalTime: string;
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
  email: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: string;
  neededArrivalTime: string;
}

// For ending a run (logging finish time)
export interface SaveRunRequest {
  email: string;
  timeFinished: Date | string;
}

// ---------- Interfaces for Responses ----------

// AccountResponse includes past run history.
export interface PastRunResponse {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: number;
  averagePace: string;
  date: Date;
}

export interface AccountResponse {
  name: string;
  email: string;
  pastRuns: PastRunResponse[];
}

// PaceResponse (structure to be refined as needed)
export interface PaceResponse {
  // Define the properties returned by your backend
  paceStatus?: 'ON_PACE' | 'LATE' | 'AHEAD';
  pace?: string; // e.g. "5:30 min/km"
}

// (Optional) TestResponse, if needed
export interface TestResponse {
  // Define properties if you use TestController responses
}

// ---------- API Service Class ----------
class ApiService {
  // ---------------- Account Endpoints ----------------

  /**
   * Creates a new account
   * POST /accounts/create
   */
  async createAccount(account: AccountRequest): Promise<AccountResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/accounts/create`, account);
      return response.data;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Retrieves account information by email
   * GET /accounts/get/{email}
   */
  async getAccount(email: string): Promise<AccountResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/accounts/get/${email}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching account:', error);
      throw error;
    }
  }

  // ---------------- Pace Endpoint ----------------

  /**
   * Fetches the pace information for the given email.
   * GET /pace/{email}
   */
  async getPace(email: string): Promise<PaceResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/pace/${email}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pace:', error);
      throw error;
    }
  }

  // ---------------- Route Endpoints ----------------

  /**
   * Gets a route based on detailed RouteRequest information
   * POST /route
   */
  async getRoute(request: RouteRequest): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/route`, request);
      return response.data;
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  }

  /**
   * Gets a generic route based on basic latitude and longitude information
   * POST /route/generic
   */
  async getGenericRoute(request: GenericRouteRequest): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/route/generic`, request);
      return response.data;
    } catch (error) {
      console.error('Error fetching generic route:', error);
      throw error;
    }
  }

  // ---------------- Run Logging Endpoints ----------------

  /**
   * Starts a new run
   * POST /run/start
   */
  async startRun(request: StartRunRequest): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/run/start`, request);
      return response.data;
    } catch (error) {
      console.error('Error starting run:', error);
      throw error;
    }
  }

  /**
   * Ends a run and logs its finish time
   * POST /run/end
   */
  async endRun(request: SaveRunRequest): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/run/end`, request);
      return response.data;
    } catch (error) {
      console.error('Error ending run:', error);
      throw error;
    }
  }
}

export default new ApiService();
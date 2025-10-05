// Enhanced API wrapper for aviation weather briefing frontend
import axios from "axios";

// Base URLs from environment variables
const NODE_API_BASE = import.meta.env.VITE_NODE_API_BASE || "http://localhost:5000/api";
const PYTHON_NLP_BASE = import.meta.env.VITE_PYTHON_NLP_BASE || "http://localhost:8000";

// Create axios instances for different backends
const nodeClient = axios.create({
  baseURL: NODE_API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const pythonClient = axios.create({
  baseURL: PYTHON_NLP_BASE,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request/Response interceptors for error handling
nodeClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Node API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

pythonClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Python NLP API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Flight Plan API calls
export const flightPlanAPI = {
  /**
   * Generate waypoints for flight route
   * @param {Object} payload - { origin, destination, altitude? }
   */
  generateWaypoints: async (payload) => {
    try {
      const response = await nodeClient.post('/flightplan', payload);
      return response.data;
    } catch (error) {
      console.warn('Flight plan generation failed, using fallback');
      return _generateFallbackWaypoints(payload);
    }
  },

  /**
   * Get route analysis with weather and NOTAMs
   * @param {Object} payload - { waypoints, altitude }
   */
  analyzeRoute: async (payload) => {
    try {
      const response = await nodeClient.post('/flightplan/analyze', payload);
      return response.data;
    } catch (error) {
      console.warn('Route analysis failed:', error.message);
      throw error;
    }
  }
};

// Weather API calls
export const weatherAPI = {

  /**
   * Fetch latest METAR for an airport by ICAO
   * @param {string} icao - ICAO code
   * @returns {Promise<{raw: string, ...}>}
   */
  getLatestMetar: async (icao) => {
    if (!icao || icao.length !== 4) throw new Error('Valid ICAO required');
    try {
      const response = await nodeClient.get(`/weather/current/${icao}`);
      // Return the raw METAR string for compatibility
      return response.data.current?.raw ? { raw: response.data.current.raw } : { raw: 'N/A' };
    } catch (error) {
      console.warn('getLatestMetar failed:', error.message);
      return { raw: 'N/A' };
    }
  },

  /**
   * Fetch latest TAF for an airport by ICAO
   * @param {string} icao - ICAO code
   * @returns {Promise<{raw: string, ...}>}
   */
  getLatestTaf: async (icao) => {
    if (!icao || icao.length !== 4) throw new Error('Valid ICAO required');
    try {
      const response = await nodeClient.get(`/weather/forecast/${icao}`);
      // Return the full forecast object with NLP enhancements
      return response.data.forecast ? response.data.forecast : { raw: 'N/A' };
    } catch (error) {
      console.warn('getLatestTaf failed:', error.message);
      return { raw: 'N/A' };
    }
  },

  /**
   * Decode METAR data
   * @param {Object} payload - { metarString, icao }
   */
  decodeMetar: async (payload) => {
    try {
      const response = await nodeClient.post('/weather/metar', payload);
      return response.data;
    } catch (error) {
      console.warn('METAR decode failed:', error.message);
      return _fallbackMetarDecode(payload);
    }
  },

  /**
   * Decode TAF data
   * @param {Object} payload - { tafString, icao }
   */
  decodeTaf: async (payload) => {
    try {
      const response = await nodeClient.post('/weather/taf', payload);
      return response.data;
    } catch (error) {
      console.warn('TAF decode failed:', error.message);
      return _fallbackTafDecode(payload);
    }
  },

  /**
   * Get weather along route
   * @param {Object} payload - { waypoints, radius }
   */
  getRouteWeather: async (payload) => {
    try {
      const response = await nodeClient.post('/weather/route', payload);
      return response.data;
    } catch (error) {
      console.warn('Route weather failed:', error.message);
      throw error;
    }
  },

  /**
   * Get SIGMET data
   * @param {Object} payload - { region, validTime }
   */
  getSigmets: async (payload) => {
    try {
      const response = await nodeClient.post('/weather/sigmet', payload);
      return response.data;
    } catch (error) {
      console.warn('SIGMET fetch failed:', error.message);
      return { sigmets: [], success: false };
    }
  }
};

// NOTAM API calls (through Node.js backend)
export const notamAPI = {
  /**
   * Get NOTAMs for airport
   * @param {string} icao - Airport ICAO code
   */
  getAirportNotams: async (icao) => {
    try {
      const response = await nodeClient.get(`/notam/${icao}`);
      return response.data;
    } catch (error) {
      console.warn('NOTAM fetch failed:', error.message);
      return { notams: [], success: false };
    }
  },

  /**
   * Parse single NOTAM using Python NLP service (via Node.js)
   * @param {Object} payload - { notamText, icao }
   */
  parseNotam: async (payload) => {
    try {
      const response = await nodeClient.post('/notam/parse-single', payload);
      return response.data;
    } catch (error) {
      console.warn('NOTAM parsing failed:', error.message);
      throw error;
    }
  },

  /**
   * Summarize NOTAMs and weather using Python NLP service (via Node.js)
   * @param {Object} payload - { notamText?, weatherData?, icao }
   */
  summarizeData: async (payload) => {
    try {
      const response = await nodeClient.post('/notam/summarize', payload);
      return response.data;
    } catch (error) {
      console.warn('Data summarization failed:', error.message);
      throw error;
    }
  },

  /**
   * Get critical NOTAMs for route
   * @param {Object} payload - { waypoints, filters }
   */
  getRouteCriticalNotams: async (payload) => {
    try {
      const response = await nodeClient.post('/notam/route-critical', payload);
      return response.data;
    } catch (error) {
      console.warn('Route critical NOTAMs failed:', error.message);
      return { notams: [], success: false };
    }
  }
};

// Airport API calls
export const airportAPI = {
  /**
   * Get airport coordinates by ICAO/IATA code
   * @param {string} code - Airport code (ICAO/IATA/GPS)
   */
  getCoordinates: async (code) => {
    try {
      const response = await nodeClient.get(`/airports/coordinates/${code}`);
      return response.data;
    } catch (error) {
      console.warn('Airport coordinates lookup failed:', error.message);
      throw error;
    }
  },

  /**
   * Get full airport information
   * @param {string} code - Airport code (ICAO/IATA/GPS)
   */
  getAirportInfo: async (code) => {
    try {
      const response = await nodeClient.get(`/airports/lookup/${code}`);
      return response.data;
    } catch (error) {
      console.warn('Airport lookup failed:', error.message);
      throw error;
    }
  },

  /**
   * Get coordinates for multiple airports (route planning)
   * @param {string[]} codes - Array of airport codes
   */
  getRouteCoordinates: async (codes) => {
    try {
      const response = await nodeClient.post('/airports/route-coordinates', {
        airports: codes
      });
      return response.data;
    } catch (error) {
      console.warn('Route coordinates lookup failed:', error.message);
      throw error;
    }
  },

  /**
   * Calculate distance between two airports
   * @param {string} from - Origin airport code
   * @param {string} to - Destination airport code
   */
  calculateDistance: async (from, to) => {
    try {
      const response = await nodeClient.get(`/airports/distance/${from}/${to}`);
      return response.data;
    } catch (error) {
      console.warn('Distance calculation failed:', error.message);
      throw error;
    }
  },

  /**
   * Search airports by name
   * @param {string} query - Search query
   * @param {number} limit - Maximum results (default: 10)
   */
  searchByName: async (query, limit = 10) => {
    try {
      const response = await nodeClient.get(`/airports/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.warn('Airport search failed:', error.message);
      throw error;
    }
  },

  /**
   * Find nearby airports
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radius - Radius in km (default: 50)
   * @param {number} limit - Maximum results (default: 10)
   */
  findNearby: async (lat, lon, radius = 50, limit = 10) => {
    try {
      const response = await nodeClient.get(`/airports/nearby?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.warn('Nearby airports search failed:', error.message);
      throw error;
    }
  },

  /**
   * Get airport database statistics
   */
  getStats: async () => {
    try {
      const response = await nodeClient.get('/airports/stats');
      return response.data;
    } catch (error) {
      console.warn('Airport stats failed:', error.message);
      throw error;
    }
  }
};

// Combined workflow API
export const briefingAPI = {
  /**
   * Get complete flight briefing
   * @param {Object} payload - { origin, destination, altitude, departureTime }
   */
  getFlightBriefing: async (payload) => {
    try {
      // Step 1: Generate flight plan
      const flightPlan = await flightPlanAPI.generateWaypoints(payload);
      
      // Step 2: Get weather for route
      const weather = await weatherAPI.getRouteWeather({
        waypoints: flightPlan.waypoints,
        radius: 50 // nautical miles
      });
      
      // Step 3: Get NOTAMs for airports
      const originNotams = await notamAPI.getAirportNotams(payload.origin);
      const destNotams = await notamAPI.getAirportNotams(payload.destination);
      
      // Step 4: Get route critical NOTAMs
      const routeNotams = await notamAPI.getRouteCriticalNotams({
        waypoints: flightPlan.waypoints
      });
      
      // Step 5: Get SIGMETs
      const sigmets = await weatherAPI.getSigmets({
        region: 'US', // TODO: determine from route
        validTime: payload.departureTime
      });
      
      // Step 6: Summarize all data
      const summary = await notamAPI.summarizeData({
        weatherData: weather,
        notamText: [
          ...originNotams.notams,
          ...destNotams.notams,
          ...routeNotams.notams
        ].map(n => n.text).join(' | '),
        icao: payload.origin
      });
      
      return {
        success: true,
        flightPlan,
        weather,
        notams: {
          origin: originNotams,
          destination: destNotams,
          route: routeNotams
        },
        sigmets,
        summary,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Complete briefing failed:', error);
      throw error;
    }
  }
};

// Legacy function for backward compatibility
export async function parseWeather(payload) {
  return weatherAPI.decodeMetar(payload);
}

// Fallback functions for offline/error scenarios
function _generateFallbackWaypoints(payload) {
  return {
    success: false,
    waypoints: [
      { lat: 40.6413, lon: -73.7781, name: payload.origin, type: 'departure' },
      { lat: 37.6213, lon: -122.3790, name: payload.destination, type: 'arrival' }
    ],
    distance: 2586, // approximate miles
    estimatedTime: '5h 30m',
    warning: 'Using fallback waypoints - backend unavailable'
  };
}

function _fallbackMetarDecode(payload) {
  return {
    success: false,
    raw: payload.metarString || 'N/A',
    decoded: {
      station: payload.icao || 'UNKNOWN',
      conditions: 'Backend unavailable'
    },
    humanReadable: 'Weather data processing unavailable',
    warning: 'Backend service not reachable'
  };
}

function _fallbackTafDecode(payload) {
  return {
    success: false,
    raw: payload.tafString || 'N/A',
    decoded: {
      station: payload.icao || 'UNKNOWN',
      forecast: 'Backend unavailable'
    },
    humanReadable: 'Forecast processing unavailable',
    warning: 'Backend service not reachable'
  };
}

// Export everything for easy access
export default {
  flightPlan: flightPlanAPI,
  weather: weatherAPI,
  notam: notamAPI,
  briefing: briefingAPI
};

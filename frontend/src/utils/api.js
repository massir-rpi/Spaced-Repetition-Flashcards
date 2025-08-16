// API utility for handling different deployment scenarios
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function apiUrl(endpoint) {
  // If we have a full API base URL (production), use it
  if (API_BASE_URL && (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://'))) {
    // Remove trailing slash from base URL if present
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    return `${baseUrl}${endpoint}`;
  }
  
  // Otherwise use relative URLs (development with Vite proxy)
  return endpoint;
}

export const API_ENDPOINTS = {
  // Auth endpoints
  CHECK_AUTH: '/api/auth/me',
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  LOGOUT: '/api/auth/logout',
  
  // Card endpoints
  CARDS: '/api/cards',
  NEXT_CARD: '/api/next',
  REVIEW_CARD: (id) => `/api/review/${id}`,
  DELETE_CARD: (id) => `/api/cards/${id}`,
  UPDATE_CARD: (id) => `/api/cards/${id}`
};

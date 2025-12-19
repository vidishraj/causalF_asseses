// API Configuration for different environments

const getApiBase = () => {
  // In production, use the same domain with /api path
  if (process.env.NODE_ENV === 'production') {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  
  // For development, use localhost
  return process.env.REACT_APP_API_BASE || 'http://localhost:5500/api';
};

export const API_BASE = getApiBase();

export const config = {
  API_BASE,
  TRACKING_SCRIPT_URL: process.env.NODE_ENV === 'production' 
    ? `${window.location.protocol}//${window.location.host}/tracker.js`
    : 'http://localhost:8080/tracker.js',
  
  // Feature flags
  ENABLE_REAL_TIME_UPDATES: false,
  ENABLE_EXPORT_FEATURES: true,
  
  // UI Configuration
  REFRESH_INTERVAL: 30000, // 30 seconds
  MAX_SESSIONS_DISPLAY: 100,
  MAX_EVENTS_PER_SESSION: 1000,
};
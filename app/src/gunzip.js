// Fallback for browsers without DecompressionStream (iOS < 16.4).
export { gunzipSync } from 'fflate';

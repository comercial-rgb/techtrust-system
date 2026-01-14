/**
 * Distance Calculation Utilities
 * Haversine formula for calculating distances between GPS coordinates
 */

export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Calculate distance between two locations
 * @param from Starting location
 * @param to Destination location
 * @returns Distance in kilometers
 */
export function getDistanceBetweenLocations(
  from: Location,
  to: Location
): number {
  return calculateDistance(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude
  );
}

/**
 * Format distance for display
 * @param distanceKm Distance in kilometers
 * @param locale Language for formatting (default: 'en')
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number, locale: string = 'en'): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return locale === 'en' 
      ? `${meters} m`
      : `${meters} m`;
  }
  
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Calculate travel fee based on distance
 * @param distanceKm Distance in kilometers
 * @param freeKm Free kilometers (no charge)
 * @param feePerKm Fee per extra kilometer
 * @returns Travel fee amount
 */
export function calculateTravelFee(
  distanceKm: number,
  freeKm: number = 0,
  feePerKm: number = 0
): number {
  if (distanceKm <= freeKm) {
    return 0;
  }
  
  const extraKm = distanceKm - freeKm;
  return extraKm * feePerKm;
}

/**
 * Check if location is within service radius
 * @param providerLocation Provider's base location
 * @param serviceLocation Service request location
 * @param serviceRadiusKm Maximum service radius in km
 * @returns true if within radius, false otherwise
 */
export function isWithinServiceRadius(
  providerLocation: Location,
  serviceLocation: Location,
  serviceRadiusKm: number
): boolean {
  const distance = getDistanceBetweenLocations(providerLocation, serviceLocation);
  return distance <= serviceRadiusKm;
}

/**
 * Estimate travel time based on distance
 * Assumes average speed of 30 km/h in urban areas
 * @param distanceKm Distance in kilometers
 * @param averageSpeedKmh Average speed (default: 30 km/h)
 * @returns Estimated time in minutes
 */
export function estimateTravelTime(
  distanceKm: number,
  averageSpeedKmh: number = 30
): number {
  const hours = distanceKm / averageSpeedKmh;
  const minutes = Math.round(hours * 60);
  return minutes;
}

/**
 * Format travel time for display
 * @param minutes Time in minutes
 * @param locale Language for formatting
 * @returns Formatted time string
 */
export function formatTravelTime(minutes: number, locale: string = 'en'): string {
  if (minutes < 60) {
    return locale === 'en'
      ? `${minutes} min`
      : `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return locale === 'en'
      ? `${hours} ${hours === 1 ? 'hour' : 'hours'}`
      : `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  
  return locale === 'en'
    ? `${hours}h ${remainingMinutes}min`
    : `${hours}h ${remainingMinutes}min`;
}

/**
 * Parse distance string to number
 * @param distanceStr Distance string (e.g., "3.2 km", "5 mi")
 * @returns Distance in kilometers
 */
export function parseDistanceString(distanceStr: string): number {
  const numStr = distanceStr.replace(/[^\d.]/g, '');
  const distance = parseFloat(numStr) || 0;
  
  // Convert miles to km if needed
  if (distanceStr.toLowerCase().includes('mi')) {
    return distance * 1.60934;
  }
  
  return distance;
}

/**
 * Convert kilometers to miles
 * @param km Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Convert miles to kilometers
 * @param miles Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

/**
 * Calculate the center point (midpoint) between two locations
 * @param loc1 First location
 * @param loc2 Second location
 * @returns Center location
 */
export function getCenterPoint(loc1: Location, loc2: Location): Location {
  const lat1 = toRadians(loc1.latitude);
  const lon1 = toRadians(loc1.longitude);
  const lat2 = toRadians(loc2.latitude);
  const lon2 = toRadians(loc2.longitude);
  
  const dLon = lon2 - lon1;
  
  const Bx = Math.cos(lat2) * Math.cos(dLon);
  const By = Math.cos(lat2) * Math.sin(dLon);
  
  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By)
  );
  
  const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);
  
  return {
    latitude: lat3 * (180 / Math.PI),
    longitude: lon3 * (180 / Math.PI),
  };
}

/**
 * Get compass bearing between two points
 * @param from Starting location
 * @param to Destination location
 * @returns Bearing in degrees (0-360)
 */
export function getBearing(from: Location, to: Location): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x);
  const degrees = bearing * (180 / Math.PI);
  
  return (degrees + 360) % 360;
}

/**
 * Get cardinal direction from bearing
 * @param bearing Bearing in degrees
 * @param locale Language for direction
 * @returns Direction string (N, NE, E, SE, S, SW, W, NW)
 */
export function getCardinalDirection(bearing: number, locale: string = 'en'): string {
  const directions = locale === 'en'
    ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    : ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

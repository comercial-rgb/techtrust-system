/**
 * Distance Calculation Utilities for Backend
 * Haversine formula for calculating distances between GPS coordinates
 */

export interface Location {
  latitude: number;
  longitude: number;
}

export interface DistanceCalculationResult {
  distanceKm: number;
  distanceMiles: number;
  travelFee: number;
  estimatedTimeMinutes: number;
  withinRadius: boolean;
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
 * Convert kilometers to miles
 */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Convert miles to kilometers
 */
export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

/**
 * Calculate complete distance information for service matching
 * @param providerLocation Provider's base location
 * @param serviceLocation Service request location
 * @param providerConfig Provider's service area configuration
 * @returns Complete distance calculation result
 */
export function calculateServiceDistance(
  providerLocation: Location,
  serviceLocation: Location,
  providerConfig: {
    serviceRadiusKm: number;
    freeKm?: number;
    feePerKm?: number;
    averageSpeedKmh?: number;
  }
): DistanceCalculationResult {
  const distanceKm = getDistanceBetweenLocations(providerLocation, serviceLocation);
  const distanceMiles = kmToMiles(distanceKm);
  
  const travelFee = calculateTravelFee(
    distanceKm,
    providerConfig.freeKm || 0,
    providerConfig.feePerKm || 0
  );
  
  const estimatedTimeMinutes = estimateTravelTime(
    distanceKm,
    providerConfig.averageSpeedKmh || 30
  );
  
  const withinRadius = distanceKm <= providerConfig.serviceRadiusKm;
  
  return {
    distanceKm,
    distanceMiles,
    travelFee,
    estimatedTimeMinutes,
    withinRadius,
  };
}

/**
 * Find providers within service radius of a location
 * @param serviceLocation Service request location
 * @param providers List of providers with their locations and service radius
 * @returns Providers within radius, sorted by distance
 */
export function findProvidersWithinRadius<T extends {
  baseLocation: Location;
  serviceRadiusKm: number;
  freeKm?: number;
  feePerKm?: number;
}>(
  serviceLocation: Location,
  providers: T[]
): Array<T & { distanceInfo: DistanceCalculationResult }> {
  const results = providers
    .map(provider => {
      const distanceInfo = calculateServiceDistance(
        provider.baseLocation,
        serviceLocation,
        {
          serviceRadiusKm: provider.serviceRadiusKm,
          freeKm: provider.freeKm,
          feePerKm: provider.feePerKm,
        }
      );
      
      return {
        ...provider,
        distanceInfo,
      };
    })
    .filter(item => item.distanceInfo.withinRadius)
    .sort((a, b) => a.distanceInfo.distanceKm - b.distanceInfo.distanceKm);
  
  return results;
}

/**
 * Format distance for API response
 * @param distanceKm Distance in kilometers
 * @returns Formatted distance object
 */
export function formatDistanceForAPI(distanceKm: number) {
  return {
    km: parseFloat(distanceKm.toFixed(2)),
    miles: parseFloat(kmToMiles(distanceKm).toFixed(2)),
    formatted: `${distanceKm.toFixed(1)} km`,
  };
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
 * Validate GPS coordinates
 * @param latitude Latitude value
 * @param longitude Longitude value
 * @returns true if valid coordinates
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

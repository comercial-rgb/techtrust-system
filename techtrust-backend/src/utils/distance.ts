/**
 * Distance Calculation Utilities for Backend
 * OSRM road distance (primary) + Haversine fallback
 * Calculates REAL driving distance via road network
 *
 * NOTE: Travel fees are calculated in MILES (US market).
 * Internal distance calculations use km (OSRM returns meters),
 * but travel fee functions accept miles. Use kmToMiles() to convert.
 */

import {
  calculateTravelFee as calculateTravelFeeFromRules,
} from "../config/businessRules";

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
  isRoadDistance: boolean; // true = OSRM road, false = Haversine estimate
}

/**
 * Correction factor applied to Haversine straight-line distance
 * to approximate road distance when OSRM is unavailable.
 * Urban areas typically have 1.3-1.5x straight-line distance.
 */
const HAVERSINE_ROAD_CORRECTION_FACTOR = 1.4;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate straight-line distance using Haversine formula (fallback)
 * NOTE: This does NOT consider roads. Use calculateRoadDistance() for accuracy.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
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
 * Backward-compatible synchronous distance (Haversine with correction factor)
 * For cases where async isn't possible
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return (
    calculateHaversineDistance(lat1, lon1, lat2, lon2) *
    HAVERSINE_ROAD_CORRECTION_FACTOR
  );
}

/**
 * Calculate REAL driving distance via OSRM (Open Source Routing Machine)
 * Uses the public OSRM demo server. Falls back to Haversine * correction factor.
 *
 * @returns { distanceKm, durationMinutes, isRoadDistance }
 */
export async function calculateRoadDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): Promise<{
  distanceKm: number;
  durationMinutes: number;
  isRoadDistance: boolean;
}> {
  try {
    // OSRM expects lon,lat order (opposite of lat,lon)
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}`);
    }

    const data: any = await response.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distanceKm: route.distance / 1000, // meters → km
        durationMinutes: Math.round(route.duration / 60), // seconds → minutes
        isRoadDistance: true,
      };
    }

    throw new Error(`OSRM no route: ${data.code}`);
  } catch (error: any) {
    // Fallback to Haversine with correction factor
    const haversine = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    const corrected = haversine * HAVERSINE_ROAD_CORRECTION_FACTOR;
    const estimatedMinutes = Math.round((corrected / 30) * 60); // ~30km/h urban

    console.warn(
      `[Distance] OSRM unavailable (${error.message}), using Haversine * ${HAVERSINE_ROAD_CORRECTION_FACTOR}`,
    );

    return {
      distanceKm: corrected,
      durationMinutes: estimatedMinutes,
      isRoadDistance: false,
    };
  }
}

/**
 * Calculate distance between two locations (sync, uses correction factor)
 */
export function getDistanceBetweenLocations(
  from: Location,
  to: Location,
): number {
  return calculateDistance(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude,
  );
}

/**
 * Calculate ROAD distance between two locations (async, uses OSRM)
 */
export async function getRoadDistanceBetweenLocations(
  from: Location,
  to: Location,
): Promise<{
  distanceKm: number;
  durationMinutes: number;
  isRoadDistance: boolean;
}> {
  return calculateRoadDistance(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude,
  );
}

/**
 * Calculate travel fee based on distance in kilometers (legacy)
 * @param distanceKm Distance in kilometers
 * @param freeKm Free kilometers (no charge)
 * @param feePerKm Fee per extra kilometer
 * @returns Travel fee amount
 */
export function calculateTravelFee(
  distanceKm: number,
  freeKm: number = 0,
  feePerKm: number = 0,
): number {
  if (distanceKm <= freeKm) {
    return 0;
  }

  const extraKm = distanceKm - freeKm;
  return extraKm * feePerKm;
}

/**
 * Calculate travel fee based on distance in MILES (US market — preferred).
 * Uses businessRules TRAVEL_FEE_RULES as defaults, with provider overrides.
 * @param distanceMiles Distance in miles
 * @param providerFreeMiles Provider's free miles override (default: TRAVEL_FEE_RULES.DEFAULT_FREE_MILES)
 * @param providerFeePerMile Provider's per-mile fee override (default: TRAVEL_FEE_RULES.DEFAULT_EXTRA_FEE_PER_MILE)
 * @param providerMaxFee Provider's max fee cap override (default: TRAVEL_FEE_RULES.DEFAULT_MAX_FEE)
 * @returns Travel fee amount in USD
 */
export function calculateTravelFeeMiles(
  distanceMiles: number,
  providerFreeMiles?: number,
  providerFeePerMile?: number,
  providerMaxFee?: number,
): number {
  return calculateTravelFeeFromRules(
    distanceMiles,
    providerFreeMiles,
    providerFeePerMile,
    providerMaxFee,
  );
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
  serviceRadiusKm: number,
): boolean {
  const distance = getDistanceBetweenLocations(
    providerLocation,
    serviceLocation,
  );
  return distance <= serviceRadiusKm;
}

/**
 * Estimate travel time based on distance
 * NOTE: When using OSRM (calculateRoadDistance), the duration is already included.
 * This is only used for Haversine fallback estimates.
 * @param distanceKm Distance in kilometers
 * @param averageSpeedKmh Average speed (default: 30 km/h)
 * @returns Estimated time in minutes
 */
export function estimateTravelTime(
  distanceKm: number,
  averageSpeedKmh: number = 30,
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
 * Calculate complete distance information (sync, Haversine with correction)
 * Travel fee is calculated in MILES using businessRules defaults.
 */
export function calculateServiceDistance(
  providerLocation: Location,
  serviceLocation: Location,
  providerConfig: {
    serviceRadiusKm: number;
    freeMiles?: number;
    feePerMile?: number;
    maxFee?: number;
    /** @deprecated Use freeMiles/feePerMile instead */
    freeKm?: number;
    /** @deprecated Use freeMiles/feePerMile instead */
    feePerKm?: number;
    averageSpeedKmh?: number;
  },
): DistanceCalculationResult {
  const distanceKm = getDistanceBetweenLocations(
    providerLocation,
    serviceLocation,
  );
  const distanceMiles = kmToMiles(distanceKm);

  // Prefer miles-based fee calculation; fall back to legacy km if only km params provided
  const travelFee = (providerConfig.freeMiles !== undefined || providerConfig.feePerMile !== undefined)
    ? calculateTravelFeeMiles(
        distanceMiles,
        providerConfig.freeMiles,
        providerConfig.feePerMile,
        providerConfig.maxFee,
      )
    : calculateTravelFee(
        distanceKm,
        providerConfig.freeKm || 0,
        providerConfig.feePerKm || 0,
      );

  const estimatedTimeMinutes = estimateTravelTime(
    distanceKm,
    providerConfig.averageSpeedKmh || 30,
  );

  const withinRadius = distanceKm <= providerConfig.serviceRadiusKm;

  return {
    distanceKm,
    distanceMiles,
    travelFee,
    estimatedTimeMinutes,
    withinRadius,
    isRoadDistance: false,
  };
}

/**
 * Calculate complete distance information using REAL road distance (async, OSRM)
 * Falls back to corrected Haversine if OSRM is unavailable.
 * Travel fee is calculated in MILES using businessRules defaults.
 */
export async function calculateServiceRoadDistance(
  providerLocation: Location,
  serviceLocation: Location,
  providerConfig: {
    serviceRadiusKm: number;
    freeMiles?: number;
    feePerMile?: number;
    maxFee?: number;
    /** @deprecated Use freeMiles/feePerMile instead */
    freeKm?: number;
    /** @deprecated Use freeMiles/feePerMile instead */
    feePerKm?: number;
  },
): Promise<DistanceCalculationResult> {
  const roadResult = await getRoadDistanceBetweenLocations(
    providerLocation,
    serviceLocation,
  );

  const distanceKm = roadResult.distanceKm;
  const distanceMiles = kmToMiles(distanceKm);

  // Prefer miles-based fee calculation
  const travelFee = (providerConfig.freeMiles !== undefined || providerConfig.feePerMile !== undefined)
    ? calculateTravelFeeMiles(
        distanceMiles,
        providerConfig.freeMiles,
        providerConfig.feePerMile,
        providerConfig.maxFee,
      )
    : calculateTravelFee(
        distanceKm,
        providerConfig.freeKm || 0,
        providerConfig.feePerKm || 0,
      );

  const withinRadius = distanceKm <= providerConfig.serviceRadiusKm;

  return {
    distanceKm,
    distanceMiles,
    travelFee,
    estimatedTimeMinutes: roadResult.durationMinutes,
    withinRadius,
    isRoadDistance: roadResult.isRoadDistance,
  };
}

/**
 * Find providers within service radius of a location
 * @param serviceLocation Service request location
 * @param providers List of providers with their locations and service radius
 * @returns Providers within radius, sorted by distance
 */
export function findProvidersWithinRadius<
  T extends {
    baseLocation: Location;
    serviceRadiusKm: number;
    freeMiles?: number;
    feePerMile?: number;
    maxFee?: number;
    /** @deprecated */ freeKm?: number;
    /** @deprecated */ feePerKm?: number;
  },
>(
  serviceLocation: Location,
  providers: T[],
): Array<T & { distanceInfo: DistanceCalculationResult }> {
  const results = providers
    .map((provider) => {
      const distanceInfo = calculateServiceDistance(
        provider.baseLocation,
        serviceLocation,
        {
          serviceRadiusKm: provider.serviceRadiusKm,
          freeMiles: provider.freeMiles,
          feePerMile: provider.feePerMile,
          maxFee: provider.maxFee,
          freeKm: provider.freeKm,
          feePerKm: provider.feePerKm,
        },
      );

      return {
        ...provider,
        distanceInfo,
      };
    })
    .filter((item) => item.distanceInfo.withinRadius)
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
    Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By),
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
export function isValidCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

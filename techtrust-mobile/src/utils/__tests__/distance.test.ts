/**
 * Distance Calculation Tests
 * Tests for Haversine formula and distance utilities
 */

import {
  calculateDistance,
  getDistanceBetweenLocations,
  calculateTravelFee,
  isWithinServiceRadius,
  estimateTravelTime,
  formatDistance,
  formatTravelTime,
  parseDistanceString,
  kmToMiles,
  milesToKm,
  getCenterPoint,
  getBearing,
  getCardinalDirection,
  type Location,
} from '../distance';

describe('Distance Calculations', () => {
  // São Paulo coordinates
  const saoPauloCenter: Location = {
    latitude: -23.5505,
    longitude: -46.6333,
  };
  
  // Av. Paulista
  const paulista: Location = {
    latitude: -23.5613,
    longitude: -46.6565,
  };
  
  // Morumbi
  const morumbi: Location = {
    latitude: -23.6076,
    longitude: -46.7000,
  };

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = calculateDistance(
        saoPauloCenter.latitude,
        saoPauloCenter.longitude,
        paulista.latitude,
        paulista.longitude
      );
      
      // Distance should be approximately 2-3 km
      expect(distance).toBeGreaterThan(2);
      expect(distance).toBeLessThan(4);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(
        saoPauloCenter.latitude,
        saoPauloCenter.longitude,
        saoPauloCenter.latitude,
        saoPauloCenter.longitude
      );
      
      expect(distance).toBe(0);
    });

    it('should handle large distances correctly', () => {
      // São Paulo to Rio de Janeiro (approximately 360 km)
      const rioDeJaneiro = { latitude: -22.9068, longitude: -43.1729 };
      const distance = getDistanceBetweenLocations(saoPauloCenter, rioDeJaneiro);
      
      expect(distance).toBeGreaterThan(350);
      expect(distance).toBeLessThan(370);
    });
  });

  describe('getDistanceBetweenLocations', () => {
    it('should calculate distance using Location objects', () => {
      const distance = getDistanceBetweenLocations(saoPauloCenter, paulista);
      
      expect(distance).toBeGreaterThan(2);
      expect(distance).toBeLessThan(4);
    });
  });

  describe('calculateTravelFee', () => {
    it('should return 0 when distance is within free km', () => {
      const fee = calculateTravelFee(3, 5, 8);
      expect(fee).toBe(0);
    });

    it('should calculate fee for extra km', () => {
      const fee = calculateTravelFee(12, 5, 8);
      // 12 - 5 = 7 km extra × R$ 8 = R$ 56
      expect(fee).toBe(56);
    });

    it('should handle zero free km', () => {
      const fee = calculateTravelFee(10, 0, 5);
      expect(fee).toBe(50);
    });

    it('should handle exact free km distance', () => {
      const fee = calculateTravelFee(5, 5, 8);
      expect(fee).toBe(0);
    });
  });

  describe('isWithinServiceRadius', () => {
    it('should return true when within radius', () => {
      const result = isWithinServiceRadius(saoPauloCenter, paulista, 5);
      expect(result).toBe(true);
    });

    it('should return false when outside radius', () => {
      const result = isWithinServiceRadius(saoPauloCenter, morumbi, 5);
      expect(result).toBe(false);
    });

    it('should handle exact radius distance', () => {
      const distance = getDistanceBetweenLocations(saoPauloCenter, paulista);
      const result = isWithinServiceRadius(saoPauloCenter, paulista, distance);
      expect(result).toBe(true);
    });
  });

  describe('estimateTravelTime', () => {
    it('should estimate time with default speed', () => {
      const time = estimateTravelTime(15); // 15 km at 30 km/h
      expect(time).toBe(30); // 30 minutes
    });

    it('should estimate time with custom speed', () => {
      const time = estimateTravelTime(60, 60); // 60 km at 60 km/h
      expect(time).toBe(60); // 60 minutes
    });

    it('should round to nearest minute', () => {
      const time = estimateTravelTime(5, 30); // 5 km at 30 km/h = 10 min
      expect(time).toBe(10);
    });
  });

  describe('formatDistance', () => {
    it('should format distance in meters for < 1 km', () => {
      expect(formatDistance(0.5)).toBe('500 m');
      expect(formatDistance(0.123)).toBe('123 m');
    });

    it('should format distance in km for >= 1 km', () => {
      expect(formatDistance(1.5)).toBe('1.5 km');
      expect(formatDistance(10.234)).toBe('10.2 km');
    });
  });

  describe('formatTravelTime', () => {
    it('should format minutes', () => {
      expect(formatTravelTime(30)).toBe('30 min');
      expect(formatTravelTime(45)).toBe('45 min');
    });

    it('should format hours', () => {
      expect(formatTravelTime(60)).toBe('1 hour');
      expect(formatTravelTime(120)).toBe('2 hours');
    });

    it('should format hours and minutes', () => {
      expect(formatTravelTime(90)).toBe('1h 30min');
      expect(formatTravelTime(135)).toBe('2h 15min');
    });

    it('should format in Portuguese', () => {
      expect(formatTravelTime(60, 'pt')).toBe('1 hora');
      expect(formatTravelTime(120, 'pt')).toBe('2 horas');
    });
  });

  describe('parseDistanceString', () => {
    it('should parse km strings', () => {
      expect(parseDistanceString('3.2 km')).toBe(3.2);
      expect(parseDistanceString('10 km')).toBe(10);
    });

    it('should parse miles strings and convert to km', () => {
      const distance = parseDistanceString('5 mi');
      expect(distance).toBeCloseTo(8.05, 1);
    });

    it('should handle strings with extra characters', () => {
      expect(parseDistanceString('Distance: 3.2 km')).toBe(3.2);
    });
  });

  describe('Unit Conversions', () => {
    it('should convert km to miles', () => {
      expect(kmToMiles(10)).toBeCloseTo(6.21, 2);
      expect(kmToMiles(100)).toBeCloseTo(62.14, 2);
    });

    it('should convert miles to km', () => {
      expect(milesToKm(10)).toBeCloseTo(16.09, 2);
      expect(milesToKm(100)).toBeCloseTo(160.93, 2);
    });

    it('should round-trip correctly', () => {
      const km = 50;
      const miles = kmToMiles(km);
      const backToKm = milesToKm(miles);
      expect(backToKm).toBeCloseTo(km, 5);
    });
  });

  describe('getCenterPoint', () => {
    it('should calculate midpoint between two locations', () => {
      const center = getCenterPoint(saoPauloCenter, paulista);
      
      // Center should be between the two points
      expect(center.latitude).toBeGreaterThan(Math.min(saoPauloCenter.latitude, paulista.latitude));
      expect(center.latitude).toBeLessThan(Math.max(saoPauloCenter.latitude, paulista.latitude));
      expect(center.longitude).toBeGreaterThan(Math.min(saoPauloCenter.longitude, paulista.longitude));
      expect(center.longitude).toBeLessThan(Math.max(saoPauloCenter.longitude, paulista.longitude));
    });
  });

  describe('getBearing', () => {
    it('should calculate bearing between two points', () => {
      const bearing = getBearing(saoPauloCenter, paulista);
      
      // Bearing should be a number between 0 and 360
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('getCardinalDirection', () => {
    it('should return cardinal directions', () => {
      expect(getCardinalDirection(0)).toBe('N');
      expect(getCardinalDirection(45)).toBe('NE');
      expect(getCardinalDirection(90)).toBe('E');
      expect(getCardinalDirection(180)).toBe('S');
      expect(getCardinalDirection(270)).toBe('W');
    });

    it('should return Portuguese directions', () => {
      expect(getCardinalDirection(0, 'pt')).toBe('N');
      expect(getCardinalDirection(90, 'pt')).toBe('L'); // Leste
      expect(getCardinalDirection(180, 'pt')).toBe('S');
      expect(getCardinalDirection(270, 'pt')).toBe('O'); // Oeste
    });

    it('should handle wrap-around bearings', () => {
      expect(getCardinalDirection(360)).toBe('N');
      expect(getCardinalDirection(405)).toBe('NE'); // 360 + 45
    });
  });

  describe('Real-world scenarios', () => {
    it('should calculate correct fees for typical service call', () => {
      // Provider at Paulista, customer 12 km away
      // 5 km free, R$ 8 per extra km
      const distance = 12;
      const fee = calculateTravelFee(distance, 5, 8);
      
      expect(fee).toBe(56); // (12 - 5) × 8 = 56
    });

    it('should identify available providers within radius', () => {
      const providers = [
        { location: saoPauloCenter, radius: 10 },
        { location: morumbi, radius: 5 },
      ];
      
      const customerLocation = paulista;
      
      // Check which providers can serve this location
      const available = providers.filter(p =>
        isWithinServiceRadius(p.location, customerLocation, p.radius)
      );
      
      expect(available.length).toBeGreaterThan(0);
    });
  });
});

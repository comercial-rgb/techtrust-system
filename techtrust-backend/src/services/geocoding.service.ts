/**
 * Serviço de Geocoding - Conversão de Endereços para Coordenadas GPS
 * 
 * Usa OpenStreetMap Nominatim (gratuito, sem API key necessária)
 * Limite: 1 requisição por segundo
 * 
 * Alternativa: Google Maps Geocoding API (requer chave e cobrança)
 */

import axios from 'axios';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult extends Location {
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

/**
 * Converte endereço em coordenadas GPS usando OpenStreetMap Nominatim
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    // OpenStreetMap Nominatim API (gratuito)
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        addressdetails: 1,
        limit: 1
      },
      headers: {
        'User-Agent': 'TechTrust-AutoSolutions/1.0' // Obrigatório para Nominatim
      }
    });

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const result = response.data[0];
    
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      formattedAddress: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village,
      state: result.address?.state,
      country: result.address?.country,
      zipCode: result.address?.postcode
    };
  } catch (error) {
    console.error('Erro no geocoding:', error);
    return null;
  }
}

/**
 * Geocoding reverso: converte coordenadas em endereço
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'TechTrust-AutoSolutions/1.0'
      }
    });

    if (!response.data) {
      return null;
    }

    const result = response.data;
    
    return {
      latitude,
      longitude,
      formattedAddress: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village,
      state: result.address?.state,
      country: result.address?.country,
      zipCode: result.address?.postcode
    };
  } catch (error) {
    console.error('Erro no geocoding reverso:', error);
    return null;
  }
}

/**
 * Valida se as coordenadas estão dentro de faixas válidas
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    latitude >= -90 && 
    latitude <= 90 && 
    longitude >= -180 && 
    longitude <= 180
  );
}

/**
 * Formata endereço completo a partir de componentes
 */
export function formatAddress(
  street: string,
  city: string,
  state: string,
  zipCode?: string,
  country?: string
): string {
  const parts = [street, city, state];
  
  if (zipCode) parts.push(zipCode);
  if (country) parts.push(country);
  
  return parts.filter(Boolean).join(', ');
}

/**
 * ALTERNATIVA: Geocoding com Google Maps API
 * Descomentar e adicionar GOOGLE_MAPS_API_KEY no .env se quiser usar
 */
/*
export async function geocodeAddressGoogle(address: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY não configurada');
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: apiKey
      }
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      return null;
    }

    const result = response.data.results[0];
    const location = result.geometry.location;
    
    // Extrai componentes do endereço
    const components = result.address_components;
    const getComponent = (type: string) => 
      components.find((c: any) => c.types.includes(type))?.long_name;

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
      city: getComponent('locality') || getComponent('administrative_area_level_2'),
      state: getComponent('administrative_area_level_1'),
      country: getComponent('country'),
      zipCode: getComponent('postal_code')
    };
  } catch (error) {
    console.error('Erro no geocoding (Google):', error);
    return null;
  }
}
*/

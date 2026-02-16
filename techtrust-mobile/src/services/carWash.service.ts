/**
 * Car Wash API Service
 * Handles all API calls for the Car Wash module
 */

import api from './api';
import { CarWashListItem, CarWashProfile, CarWashReview, CarWashSearchFilters } from '../types/carWash';

export const carWashService = {
  /**
   * Search nearby car washes
   */
  searchNearby: async (
    lat: number,
    lng: number,
    filters?: CarWashSearchFilters,
    page: number = 1,
    limit: number = 20,
  ) => {
    const params: any = { lat, lng, page, limit };
    if (filters?.radiusMiles) params.radiusMiles = filters.radiusMiles;
    if (filters?.type) params.type = filters.type;
    if (filters?.minRating) params.minRating = filters.minRating;
    if (filters?.openNow) params.openNow = 'true';
    if (filters?.hasMembership) params.hasMembership = 'true';
    if (filters?.hasFreeVacuum) params.hasFreeVacuum = 'true';
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.search) params.search = filters.search;

    const response = await api.get('/car-wash/nearby', { params });
    return response.data.data as {
      carWashes: CarWashListItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  },

  /**
   * Get car wash profile
   */
  getProfile: async (id: string) => {
    const response = await api.get(`/car-wash/profile/${id}`);
    return response.data.data as CarWashProfile;
  },

  /**
   * Get paginated reviews
   */
  getReviews: async (carWashId: string, page: number = 1, sortBy: string = 'recent') => {
    const response = await api.get(`/car-wash/profile/${carWashId}/reviews`, {
      params: { page, sortBy },
    });
    return response.data.data as {
      reviews: CarWashReview[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  },

  /**
   * Create a review
   */
  createReview: async (carWashId: string, rating: number, comment?: string) => {
    const response = await api.post(`/car-wash/${carWashId}/reviews`, { rating, comment });
    return response.data.data as CarWashReview;
  },

  /**
   * Toggle favorite
   */
  toggleFavorite: async (carWashId: string) => {
    const response = await api.post(`/car-wash/${carWashId}/favorite`);
    return response.data.data as { isFavorited: boolean };
  },

  /**
   * Get user favorites
   */
  getFavorites: async () => {
    const response = await api.get('/car-wash/favorites');
    return response.data.data as CarWashListItem[];
  },

  /**
   * Track action (directions, phone, website)
   */
  trackAction: async (carWashId: string, action: 'direction' | 'phone' | 'website') => {
    await api.post(`/car-wash/${carWashId}/track-action`, { action });
  },

  /**
   * Get service catalog
   */
  getServiceCatalog: async () => {
    const response = await api.get('/car-wash/catalog/services');
    return response.data.data;
  },

  /**
   * Get amenity catalog
   */
  getAmenityCatalog: async () => {
    const response = await api.get('/car-wash/catalog/amenities');
    return response.data.data;
  },

  /**
   * Get payment method catalog
   */
  getPaymentMethodCatalog: async () => {
    const response = await api.get('/car-wash/catalog/payment-methods');
    return response.data.data;
  },
};

export default carWashService;

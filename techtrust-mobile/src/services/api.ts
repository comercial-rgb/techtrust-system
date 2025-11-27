/**
 * API Service - Configuração Axios
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ALTERE ESTE IP PARA O IP DO SEU COMPUTADOR
const API_URL = 'http://192.168.0.100:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para lidar com erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado - limpar storage
      await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    }
    return Promise.reject(error);
  }
);

export default api;

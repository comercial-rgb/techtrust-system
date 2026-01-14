/**
 * ============================================
 * GEOCODING CONTROLLER
 * ============================================
 * Endpoints para conversão de endereços
 */

import { Request, Response } from 'express';
import { geocodeAddress, reverseGeocode } from '../services/geocoding.service';

/**
 * POST /api/v1/geocoding/geocode
 * Converter endereço em coordenadas
 */
export const geocode = async (req: Request, res: Response): Promise<void> => {
  const { address } = req.body;

  if (!address) {
    res.status(400).json({
      success: false,
      message: 'Endereço é obrigatório',
    });
    return;
  }

  const result = await geocodeAddress(address);

  if (!result) {
    res.status(404).json({
      success: false,
      message: 'Não foi possível geocodificar o endereço fornecido',
    });
    return;
  }

  res.json({
    success: true,
    data: result,
  });
};

/**
 * POST /api/v1/geocoding/reverse
 * Converter coordenadas em endereço
 */
export const reverse = async (req: Request, res: Response): Promise<void> => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    res.status(400).json({
      success: false,
      message: 'Latitude e longitude são obrigatórios',
    });
    return;
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const result = await reverseGeocode(lat, lng);

  if (!result) {
    res.status(404).json({
      success: false,
      message: 'Não foi possível encontrar endereço para estas coordenadas',
    });
    return;
  }

  res.json({
    success: true,
    data: result,
  });
};

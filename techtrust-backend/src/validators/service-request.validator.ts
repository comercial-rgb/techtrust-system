/**
 * ============================================
 * SERVICE REQUEST VALIDATORS
 * ============================================
 * Validações para solicitações de serviço
 */

import { body, param, query } from "express-validator";

/**
 * Validação para createServiceRequest
 */
export const createServiceRequestValidation = [
  body("vehicleId")
    .trim()
    .notEmpty()
    .withMessage("ID do veículo é obrigatório"),

  body("serviceType")
    .trim()
    .notEmpty()
    .withMessage("Tipo de serviço é obrigatório"),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Título é obrigatório")
    .isLength({ min: 3, max: 200 })
    .withMessage("Título deve ter entre 3 e 200 caracteres"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Descrição deve ter no máximo 2000 caracteres"),

  body("serviceLocationType").optional().trim(),

  body("customerAddress").optional().trim(),

  body("preferredDate").optional(),

  body("preferredTime").optional(),

  body("isUrgent")
    .optional()
    .isBoolean()
    .withMessage("isUrgent deve ser true ou false"),

  body("location").optional(),

  body("serviceLatitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude inválida"),

  body("serviceLongitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude inválida"),
];

/**
 * Validação para query params
 */
export const listServiceRequestsValidation = [
  query("status")
    .optional()
    .isIn([
      "SEARCHING_PROVIDERS",
      "QUOTES_RECEIVED",
      "QUOTE_ACCEPTED",
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ])
    .withMessage("Status inválido"),

  query("vehicleId").optional().trim(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Página deve ser um número positivo"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limite deve estar entre 1 e 50"),
];

/**
 * Validação para requestId param
 */
export const requestIdValidation = [
  param("requestId")
    .trim()
    .notEmpty()
    .withMessage("ID da solicitação é obrigatório"),
];

/**
 * Validação para cancelar
 */
export const cancelServiceRequestValidation = [
  param("requestId")
    .trim()
    .notEmpty()
    .withMessage("ID da solicitação é obrigatório"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Motivo deve ter no máximo 500 caracteres"),
];

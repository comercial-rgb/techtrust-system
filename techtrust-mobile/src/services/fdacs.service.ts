/**
 * ============================================
 * FDACS SERVICE (Mobile)
 * ============================================
 * API calls for FDACS compliance features:
 * - Appointments (diagnostic visits)
 * - Estimate Sharing (competing quotes)
 * - Repair Invoices
 */

import api from "./api";

// ============================================
// APPOINTMENT TYPES
// ============================================
export interface Appointment {
  id: string;
  appointmentNumber: string;
  customerId: string;
  providerId: string;
  vehicleId: string;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDuration?: string;
  serviceDescription: string;
  serviceType: string;
  locationType: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  diagnosticFee: number;
  travelFee: number;
  feeWaivedOnService: boolean;
  status: string;
  providerCheckedInAt?: string;
  customerConfirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  customerNotes?: string;
  providerNotes?: string;
  customer?: any;
  provider?: any;
  vehicle?: any;
  quotes?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface EstimateShare {
  id: string;
  shareNumber: string;
  originalEstimateId: string;
  customerId: string;
  shareType: string;
  targetProviderIds: string[];
  cityFilter?: string;
  stateFilter?: string;
  radiusKm?: number;
  shareOriginalProviderName: boolean;
  isActive: boolean;
  status: string;
  vehicleInfo?: string;
  originalTotal?: number;
  competingQuotesCount?: number;
  expiresAt: string;
  closedAt?: string;
  competingEstimatesCount: number;
  originalEstimate?: any;
  createdAt: string;
}

export interface RepairInvoice {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  workOrderId: string;
  customerId: string;
  customerName: string;
  customerContact?: string;
  providerId: string;
  providerName: string;
  providerBusinessName?: string;
  fdacsRegistrationNumber?: string;
  vehicleInfo: string;
  odometerReading?: number;
  originalPartsCost: number;
  originalLaborCost: number;
  originalTravelFee: number;
  originalTaxAmount: number;
  originalTotal: number;
  lineItems: any[];
  approvedSupplements: any[];
  rejectedSupplements: any[];
  supplementsTotal: number;
  finalPartsCost: number;
  finalLaborCost: number;
  finalTotal: number;
  servicePerformed?: string;
  warrantyStatement?: string;
  warrantyMonths?: number;
  warrantyMileage?: number;
  diagnosticFee: number;
  diagnosticFeeWaived: boolean;
  status: string;
  customerAcceptedAt?: string;
  customerSignature?: string;
  completedAt?: string;
  pdfUrl?: string;
  quote?: any;
  workOrder?: any;
  createdAt: string;
}

// ============================================
// APPOINTMENT API
// ============================================

export const scheduleAppointment = async (data: {
  providerId: string;
  vehicleId: string;
  serviceRequestId?: string;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDuration?: string;
  serviceDescription: string;
  serviceType?: string;
  locationType?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  diagnosticFee?: number;
  travelFee?: number;
  feeWaivedOnService?: boolean;
  customerNotes?: string;
}) => {
  const response = await api.post("/appointments", data);
  return response.data;
};

export const getMyAppointments = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get("/appointments/my", { params });
  return response.data;
};

export const getAppointment = async (id: string) => {
  const response = await api.get(`/appointments/${id}`);
  return response.data;
};

export const confirmAppointment = async (
  id: string,
  data?: {
    providerNotes?: string;
    suggestedDate?: string;
    suggestedTime?: string;
  },
) => {
  const response = await api.patch(`/appointments/${id}/confirm`, data || {});
  return response.data;
};

export const checkInAppointment = async (id: string) => {
  const response = await api.patch(`/appointments/${id}/check-in`, {});
  return response.data;
};

export const completeAppointment = async (
  id: string,
  data?: {
    providerNotes?: string;
  },
) => {
  const response = await api.patch(`/appointments/${id}/complete`, data || {});
  return response.data;
};

export const cancelAppointment = async (id: string, reason?: string) => {
  const response = await api.patch(`/appointments/${id}/cancel`, { reason });
  return response.data;
};

export const getProviderSlots = async (providerId: string, date?: string) => {
  const response = await api.get(`/appointments/provider/${providerId}/slots`, {
    params: { date },
  });
  return response.data;
};

// ============================================
// ESTIMATE SHARE API
// ============================================

export const shareEstimate = async (data: {
  estimateId: string;
  shareType?: string;
  targetProviderIds?: string[];
  cityFilter?: string;
  stateFilter?: string;
  radiusKm?: number;
  shareOriginalProviderName?: boolean;
  expiresInDays?: number;
}) => {
  const response = await api.post("/estimate-shares", data);
  return response.data;
};

export const getMySharedEstimates = async (active?: boolean) => {
  const response = await api.get("/estimate-shares/my", {
    params: active !== undefined ? { active: String(active) } : {},
  });
  return response.data;
};

export const getAvailableSharedEstimates = async (params?: {
  city?: string;
  state?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get("/estimate-shares/available", { params });
  return response.data;
};

export const getSharedEstimateDetail = async (id: string) => {
  const response = await api.get(`/estimate-shares/${id}`);
  return response.data;
};

export const submitCompetingQuote = async (
  shareId: string,
  data: {
    totalAmount: number;
    laborCost: number;
    partsCost: number;
    travelFee?: number;
    taxAmount?: number;
    warrantyMonths?: number;
    warrantyMileage?: number;
    partsList?: any[];
    laborDescription?: string;
    notes?: string;
    validDays?: number;
  },
) => {
  const response = await api.post(
    `/estimate-shares/${shareId}/submit-quote`,
    data,
  );
  return response.data;
};

export const closeSharing = async (id: string) => {
  const response = await api.patch(`/estimate-shares/${id}/close`, {});
  return response.data;
};

// ============================================
// REPAIR INVOICE API
// ============================================

export const getMyInvoices = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get("/repair-invoices/my", { params });
  return response.data;
};

export const getInvoice = async (id: string) => {
  const response = await api.get(`/repair-invoices/${id}`);
  return response.data;
};

export const updateInvoiceWork = async (
  id: string,
  data: {
    servicePerformed?: string;
    warrantyStatement?: string;
    odometerReading?: number;
  },
) => {
  const response = await api.patch(`/repair-invoices/${id}/update-work`, data);
  return response.data;
};

export const completeInvoice = async (
  id: string,
  data?: {
    servicePerformed?: string;
    warrantyStatement?: string;
  },
) => {
  const response = await api.patch(
    `/repair-invoices/${id}/complete`,
    data || {},
  );
  return response.data;
};

export const acceptInvoice = async (id: string, signature?: string) => {
  const response = await api.patch(`/repair-invoices/${id}/accept`, {
    signature,
  });
  return response.data;
};

export const disputeInvoice = async (id: string, reason?: string) => {
  const response = await api.patch(`/repair-invoices/${id}/dispute`, {
    reason,
  });
  return response.data;
};

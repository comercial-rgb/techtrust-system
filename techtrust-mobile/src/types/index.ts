/**
 * Types para o app TechTrust Mobile
 */

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "CLIENT" | "PROVIDER";
  status: string;
  language: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  currentMileage?: number;
  isPrimary: boolean;
  createdAt: string;
  photos?: string[]; // URLs or local URIs of vehicle photos
}

export interface ServiceRequest {
  id: string;
  requestNumber: string;
  vehicleId: string;
  serviceType:
    | "SCHEDULED_MAINTENANCE"
    | "REPAIR"
    | "ROADSIDE_SOS"
    | "INSPECTION"
    | "DETAILING";
  title: string;
  description: string;
  serviceLocationType: "SHOP" | "MOBILE" | "CUSTOMER_LOCATION";
  status: string;
  quotesCount: number;
  maxQuotes: number;
  createdAt: string;
  vehicle?: Vehicle;
  quotes?: Quote[];
}

export interface Quote {
  id: string;
  quoteNumber: string;
  serviceRequestId: string;
  providerId: string;
  partsCost: number;
  laborCost: number;
  additionalFees: number;
  taxAmount: number;
  totalAmount: number;
  laborDescription: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  validUntil: string;
  createdAt: string;
  provider?: {
    fullName: string;
    providerProfile?: {
      businessName: string;
      averageRating: number;
      totalReviews: number;
    };
  };
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  status:
    | "PENDING_START"
    | "IN_PROGRESS"
    | "AWAITING_APPROVAL"
    | "COMPLETED"
    | "DISPUTED";
  originalAmount: number;
  finalAmount: number;
  createdAt: string;
  serviceRequest?: ServiceRequest;
  provider?: {
    fullName: string;
    phone: string;
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface SignupData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  language: "EN" | "PT" | "ES";
}

export interface LoginData {
  email: string;
  password: string;
}

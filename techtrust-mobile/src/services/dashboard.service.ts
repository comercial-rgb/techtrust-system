/**
 * Dashboard Service - Busca dados reais do backend
 * Serviço de Dashboard - Chamadas à API
 */

import api from "./api";

// ============================================
// TIPOS
// ============================================

export interface DashboardStats {
  activeServices: number;
  pendingQuotes: number;
  completedServices: number;
  totalSpent: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color?: string;
  currentMileage?: number;
  lastService?: string;
  nextServiceDue?: string;
  isDefault: boolean;
  engineType?: string;
  fuelType?: string;
  bodyType?: string;
  trim?: string;
  driveType?: string;
  numberOfRows?: number;
  seatingCapacity?: number;
  countryOfManufacturer?: string;
  category?: string;
  vin?: string;
}

export interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  status:
    | "SEARCHING"
    | "QUOTES_RECEIVED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  quotesCount: number;
  createdAt: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

export interface ProviderStats {
  pendingRequests: number;
  activeWorkOrders: number;
  completedThisMonth: number;
  earningsThisMonth: number;
  rating: number;
  totalReviews: number;
  // D34 — Expired quotes
  expiredQuotes?: number;
  // D38 — Trends
  trends?: {
    requests: number;
    workOrders: number;
    completed: number;
    earnings: number;
  };
  // D37
  businessType?: string;
  // D39
  carWashMetrics?: {
    washesToday: number;
    activePackages: number;
    memberships: number;
  } | null;
  // D40
  partsStoreMetrics?: {
    productsListed: number;
    pendingPickups: number;
    fillRate: number;
  } | null;
}

export interface RecentActivity {
  id: string;
  type:
    | "new_request"
    | "quote_accepted"
    | "payment_received"
    | "work_completed";
  title: string;
  description: string;
  time: string;
  amount?: number;
}

export interface PendingRequest {
  id: string;
  title: string;
  vehicle: string;
  location: string;
  timeAgo: string;
  isUrgent: boolean;
}

// ============================================
// FUNÇÕES - CLIENTE
// ============================================

/**
 * Buscar estatísticas do dashboard do cliente
 */
export async function getCustomerDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await api.get("/users/dashboard-stats");
    return (
      response.data.data || {
        activeServices: 0,
        pendingQuotes: 0,
        completedServices: 0,
        totalSpent: 0,
      }
    );
  } catch (error) {
    console.error("Erro ao buscar stats do dashboard:", error);
    // Retornar dados vazios em caso de erro
    return {
      activeServices: 0,
      pendingQuotes: 0,
      completedServices: 0,
      totalSpent: 0,
    };
  }
}

/**
 * Buscar veículos do cliente
 */
export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const response = await api.get("/vehicles");
    return response.data.data || [];
  } catch (error) {
    console.error("Erro ao buscar veículos:", error);
    return [];
  }
}

/**
 * Buscar solicitações de serviço do cliente
 */
export async function getServiceRequests(): Promise<ServiceRequest[]> {
  try {
    const response = await api.get("/service-requests");
    const raw = response.data.data || response.data || {};
    const requests = raw.requests || (Array.isArray(raw) ? raw : []);

    // Mapear para formato esperado pela UI
    // Normalizar status do backend para o que a UI espera
    const normalizeStatus = (status: string) => {
      const map: Record<string, string> = {
        SEARCHING_PROVIDERS: "SEARCHING",
        QUOTE_ACCEPTED: "QUOTES_RECEIVED",
        DRAFT: "SEARCHING",
        WAITING_APPROVAL: "IN_PROGRESS",
        EXPIRED: "CANCELLED",
      };
      return map[status] || status;
    };

    return requests.map((req: any) => ({
      id: req.id,
      requestNumber: req.requestNumber,
      title:
        req.title ||
        req.description?.substring(0, 50) ||
        "Solicitação de Serviço",
      status: normalizeStatus(req.status),
      quotesCount: req._count?.quotes || req.quotesCount || 0,
      createdAt: req.createdAt,
      vehicle: req.vehicle
        ? {
            make: req.vehicle.make,
            model: req.vehicle.model,
            year: req.vehicle.year,
          }
        : { make: "N/A", model: "N/A", year: 0 },
    }));
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    return [];
  }
}

// ============================================
// FUNÇÕES - FORNECEDOR
// ============================================

/**
 * Buscar estatísticas do dashboard do fornecedor
 */
export async function getProviderDashboardStats(): Promise<ProviderStats> {
  try {
    const response = await api.get("/providers/dashboard-stats");
    return (
      response.data.data || {
        pendingRequests: 0,
        activeWorkOrders: 0,
        completedThisMonth: 0,
        earningsThisMonth: 0,
        rating: 0,
        totalReviews: 0,
        expiredQuotes: 0,
        trends: { requests: 0, workOrders: 0, completed: 0, earnings: 0 },
        businessType: 'REPAIR_SHOP',
        carWashMetrics: null,
        partsStoreMetrics: null,
      }
    );
  } catch (error) {
    console.error("Erro ao buscar stats do fornecedor:", error);
    return {
      pendingRequests: 0,
      activeWorkOrders: 0,
      completedThisMonth: 0,
      earningsThisMonth: 0,
      rating: 0,
      totalReviews: 0,
      expiredQuotes: 0,
      trends: { requests: 0, workOrders: 0, completed: 0, earnings: 0 },
      businessType: 'REPAIR_SHOP',
      carWashMetrics: null,
      partsStoreMetrics: null,
    };
  }
}

/**
 * Buscar atividade recente do fornecedor
 */
export async function getProviderRecentActivity(): Promise<RecentActivity[]> {
  try {
    const response = await api.get("/providers/recent-activity");
    return response.data.data || [];
  } catch (error) {
    console.error("Erro ao buscar atividade recente:", error);
    return [];
  }
}

/**
 * Buscar solicitações pendentes para o fornecedor
 */
export async function getProviderPendingRequests(): Promise<PendingRequest[]> {
  try {
    const response = await api.get("/providers/pending-requests");
    return response.data.data || [];
  } catch (error) {
    console.error("Erro ao buscar solicitações pendentes:", error);
    return [];
  }
}

/**
 * Buscar orçamentos do fornecedor
 */
export async function getProviderQuotes(status?: string): Promise<any[]> {
  try {
    const params = status ? { status } : {};
    const response = await api.get("/quotes", { params });
    return response.data.data || [];
  } catch (error) {
    console.error("Erro ao buscar orçamentos:", error);
    return [];
  }
}

/**
 * Buscar ordens de serviço do fornecedor
 */
export async function getProviderWorkOrders(status?: string): Promise<any[]> {
  try {
    const params = status ? { status } : {};
    const response = await api.get("/work-orders", { params });
    return response.data.data || [];
  } catch (error) {
    console.error("Erro ao buscar ordens de serviço:", error);
    return [];
  }
}

/**
 * Buscar avaliações do fornecedor
 */
export async function getProviderReviews(): Promise<any[]> {
  try {
    const response = await api.get("/providers/reviews");
    return response.data.data || [];
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
    return [];
  }
}

// ============================================
// FUNÇÕES - RELATÓRIOS
// ============================================

export interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  status: string;
  finalAmount: number;
  scheduledDate?: string;
  completedAt?: string;
  provider: {
    businessName: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

export interface PaymentMethod {
  id: string;
  type: "credit" | "debit" | "pix";
  brand?: string;
  lastFour?: string;
  isDefault: boolean;
}

/**
 * Buscar ordens de serviço do cliente
 */
export async function getWorkOrders(): Promise<WorkOrder[]> {
  try {
    const response = await api.get("/work-orders");
    const raw = response.data.data || response.data || {};
    return raw.orders || (Array.isArray(raw) ? raw : []);
  } catch (error) {
    console.error("Erro ao buscar ordens de serviço:", error);
    return [];
  }
}

/**
 * Buscar detalhes de uma ordem de serviço
 */
export async function getWorkOrderDetails(
  workOrderId: string,
): Promise<any | null> {
  try {
    const response = await api.get(`/work-orders/${workOrderId}`);
    return response.data.data || null;
  } catch (error) {
    console.error("Erro ao buscar detalhes da OS:", error);
    return null;
  }
}

/**
 * Buscar métodos de pagamento do cliente
 * First tries API, then falls back to AsyncStorage (local storage)
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    // First try to get from API
    const response = await api.get("/payment-methods");
    const apiMethods = response.data.data || [];
    if (apiMethods.length > 0) {
      return apiMethods;
    }

    // Fall back to AsyncStorage (local saved cards)
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const localMethods = await AsyncStorage.getItem(
      "@TechTrust:paymentMethods",
    );
    if (localMethods) {
      const parsed = JSON.parse(localMethods);
      return parsed.map((m: any) => ({
        id: m.id,
        type: m.type,
        brand: m.brand,
        lastFour: m.lastFour,
        holderName: m.holderName,
        expiryDate: m.expiryDate,
        isDefault: m.isDefault,
      }));
    }

    return [];
  } catch (error) {
    console.error("Erro ao buscar métodos de pagamento da API:", error);

    // Fall back to AsyncStorage on API error
    try {
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;
      const localMethods = await AsyncStorage.getItem(
        "@TechTrust:paymentMethods",
      );
      if (localMethods) {
        const parsed = JSON.parse(localMethods);
        return parsed.map((m: any) => ({
          id: m.id,
          type: m.type,
          brand: m.brand,
          lastFour: m.lastFour,
          holderName: m.holderName,
          expiryDate: m.expiryDate,
          isDefault: m.isDefault,
        }));
      }
    } catch (localError) {
      console.error(
        "Erro ao buscar métodos de pagamento do AsyncStorage:",
        localError,
      );
    }

    return [];
  }
}

/**
 * Buscar detalhes de um orçamento
 */
export async function getQuoteDetails(quoteId: string): Promise<any | null> {
  try {
    const response = await api.get(`/quotes/${quoteId}`);
    return response.data.data || null;
  } catch (error) {
    console.error("Erro ao buscar detalhes do orçamento:", error);
    return null;
  }
}

export interface ReportStats {
  totalSpent: number;
  servicesCompleted: number;
  vehiclesServiced: number;
  avgServiceCost: number;
  savings: number;
}

export interface MonthlySpending {
  month: string;
  amount: number;
}

export interface ServiceCategory {
  name: string;
  count: number;
  amount: number;
  color: string;
}

export interface VehicleSpending {
  id: string;
  name: string;
  totalSpent: number;
  servicesCount: number;
}

/**
 * Buscar relatórios do cliente
 */
export async function getCustomerReports(period: string): Promise<{
  stats: ReportStats;
  monthlySpending: MonthlySpending[];
  serviceCategories: ServiceCategory[];
  vehicleSpending: VehicleSpending[];
}> {
  try {
    const response = await api.get("/users/reports", { params: { period } });
    return (
      response.data.data || {
        stats: {
          totalSpent: 0,
          servicesCompleted: 0,
          vehiclesServiced: 0,
          avgServiceCost: 0,
          savings: 0,
        },
        monthlySpending: [],
        serviceCategories: [],
        vehicleSpending: [],
      }
    );
  } catch (error) {
    console.error("Erro ao buscar relatórios:", error);
    return {
      stats: {
        totalSpent: 0,
        servicesCompleted: 0,
        vehiclesServiced: 0,
        avgServiceCost: 0,
        savings: 0,
      },
      monthlySpending: [],
      serviceCategories: [],
      vehicleSpending: [],
    };
  }
}

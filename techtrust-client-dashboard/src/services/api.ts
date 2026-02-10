/**
 * API Service - Cliente Web Dashboard
 * Integração com Backend TechTrust
 */

import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private getHeaders(): HeadersInit {
    const token = Cookies.get("tt_client_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || data.message || "Erro na requisição" };
      }

      return { data };
    } catch (error: any) {
      console.error("API Error:", error);
      return { error: error.message || "Erro de conexão com o servidor" };
    }
  }

  // ============================================
  // AUTH
  // ============================================

  async login(email: string, password: string) {
    return this.request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...data, role: "CUSTOMER" }),
    });
  }

  async verifyOTP(phone: string, otp: string) {
    return this.request<{ token: string; user: any }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
  }

  async getProfile() {
    return this.request<any>("/users/me");
  }

  async updateProfile(
    data: Partial<{
      fullName: string;
      email: string;
      phone: string;
    }>,
  ) {
    return this.request("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // VEHICLES
  // ============================================

  async getVehicles() {
    return this.request<any[]>("/vehicles");
  }

  async getVehicle(id: string) {
    return this.request<any>(`/vehicles/${id}`);
  }

  async createVehicle(data: {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    vin?: string;
    color?: string;
    mileage?: number;
  }) {
    return this.request("/vehicles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(
    id: string,
    data: Partial<{
      mileage: number;
      color: string;
    }>,
  ) {
    return this.request(`/vehicles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteVehicle(id: string) {
    return this.request(`/vehicles/${id}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // SERVICE REQUESTS (Solicitações)
  // ============================================

  async getServiceRequests(status?: string) {
    const query = status ? `?status=${status}` : "";
    return this.request<any[]>(`/service-requests${query}`);
  }

  async getServiceRequest(id: string) {
    return this.request<any>(`/service-requests/${id}`);
  }

  async getServiceRequestById(id: string) {
    return this.request<any>(`/service-requests/${id}`);
  }

  async createServiceRequest(data: {
    vehicleId: string;
    title: string;
    description: string;
    serviceType: string;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
    preferredDate?: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  }) {
    return this.request("/service-requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async cancelServiceRequest(id: string, reason?: string) {
    return this.request(`/service-requests/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // ============================================
  // QUOTES (Orçamentos)
  // ============================================

  async getQuotesForRequest(serviceRequestId: string) {
    return this.request<any[]>(`/quotes/request/${serviceRequestId}`);
  }

  async getQuote(id: string) {
    return this.request<any>(`/quotes/${id}`);
  }

  async acceptQuote(id: string) {
    return this.request(`/quotes/${id}/accept`, {
      method: "POST",
    });
  }

  async rejectQuote(id: string, reason?: string) {
    return this.request(`/quotes/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // ============================================
  // WORK ORDERS (Ordens de Serviço)
  // ============================================

  async getWorkOrders(status?: string) {
    const query = status ? `?status=${status}` : "";
    return this.request<any[]>(`/work-orders${query}`);
  }

  async getWorkOrder(id: string) {
    return this.request<any>(`/work-orders/${id}`);
  }

  async getWorkOrderById(id: string) {
    return this.request<any>(`/work-orders/${id}`);
  }

  // ============================================
  // PAYMENTS
  // ============================================

  async getPaymentMethods() {
    return this.request<any[]>("/payments/methods");
  }

  async addPaymentMethod(data: {
    type: "CREDIT_CARD" | "DEBIT_CARD" | "PIX";
    cardNumber?: string;
    cardHolder?: string;
    expiryDate?: string;
    cvv?: string;
  }) {
    return this.request("/payments/methods", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async processPayment(
    workOrderId: string,
    data: {
      paymentMethodId: string;
      amount: number;
    },
  ) {
    return this.request(`/payments/work-order/${workOrderId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPaymentHistory() {
    return this.request<any[]>("/payments/history");
  }

  // ============================================
  // REVIEWS
  // ============================================

  async createReview(data: {
    workOrderId: string;
    providerId: string;
    rating: number;
    comment?: string;
  }) {
    return this.request("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async getNotifications() {
    return this.request<any[]>("/notifications");
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: "POST",
    });
  }

  async markAllNotificationsAsRead() {
    return this.request("/notifications/read-all", {
      method: "POST",
    });
  }

  // ============================================
  // SUBSCRIPTION
  // ============================================

  async getSubscription() {
    return this.request<any>("/subscriptions/current");
  }

  async getSubscriptionPlans() {
    return this.request<any[]>("/subscriptions/plans");
  }

  async subscribeToPlan(planId: string) {
    return this.request("/subscriptions/subscribe", {
      method: "POST",
      body: JSON.stringify({ planId }),
    });
  }

  // ============================================
  // CHAT
  // ============================================

  async getChats() {
    return this.request<any[]>("/chat/conversations");
  }

  async getChatMessages(conversationId: string) {
    return this.request<any[]>(
      `/chat/conversations/${conversationId}/messages`,
    );
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  // ============================================
  // PROVIDERS (buscar prestadores)
  // ============================================

  async searchProviders(params: {
    latitude?: number;
    longitude?: number;
    serviceType?: string;
    radius?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/providers/search?${query}`);
  }

  async getProviderDetails(id: string) {
    return this.request<any>(`/providers/${id}`);
  }

  async getProviderReviews(id: string) {
    return this.request<any[]>(`/providers/${id}/reviews`);
  }
}

// Exportar instância única
export const api = new ApiService();
export default api;

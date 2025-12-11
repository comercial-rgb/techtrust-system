/**
 * API Service - Admin Dashboard
 * Integração com Backend TechTrust
 */

import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class AdminApiService {
  private getHeaders(): HeadersInit {
    const token = Cookies.get('tt_admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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
        return { error: data.error || data.message || 'Erro na requisição' };
      }

      return { data };
    } catch (error: any) {
      console.error('API Error:', error);
      return { error: error.message || 'Erro de conexão com o servidor' };
    }
  }

  // ============================================
  // GENERIC HTTP METHODS
  // ============================================

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ============================================
  // AUTH
  // ============================================
  
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile() {
    return this.request<any>('/users/profile');
  }

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getDashboardStats() {
    return this.request<any>('/admin/dashboard');
  }

  async getRevenueStats(period?: string) {
    const query = period ? `?period=${period}` : '';
    return this.request<any>(`/admin/revenue${query}`);
  }

  // ============================================
  // USERS MANAGEMENT
  // ============================================

  async getUsers(params?: { role?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return this.request<any>(`/admin/users?${query.toString()}`);
  }

  async getUserById(id: string) {
    return this.request<any>(`/admin/users/${id}`);
  }

  async createUser(data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: 'ADMIN' | 'CUSTOMER' | 'PROVIDER';
  }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Partial<{
    fullName: string;
    email: string;
    phone: string;
    role: string;
    isActive: boolean;
  }>) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleUserStatus(id: string, isActive: boolean) {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  // ============================================
  // PROVIDERS MANAGEMENT
  // ============================================

  async getProviders(params?: { status?: string; verified?: boolean; page?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.verified !== undefined) query.append('verified', params.verified.toString());
    if (params?.page) query.append('page', params.page.toString());
    return this.request<any>(`/admin/providers?${query.toString()}`);
  }

  async getProviderById(id: string) {
    return this.request<any>(`/admin/providers/${id}`);
  }

  async approveProvider(id: string) {
    return this.request(`/admin/providers/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectProvider(id: string, reason: string) {
    return this.request(`/admin/providers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async suspendProvider(id: string, reason: string) {
    return this.request(`/admin/providers/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ============================================
  // SERVICE REQUESTS
  // ============================================

  async getServiceRequests(params?: { status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    return this.request<any>(`/admin/service-requests?${query.toString()}`);
  }

  async getServiceRequestById(id: string) {
    return this.request<any>(`/admin/service-requests/${id}`);
  }

  // ============================================
  // WORK ORDERS
  // ============================================

  async getWorkOrders(params?: { status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    return this.request<any>(`/admin/work-orders?${query.toString()}`);
  }

  async getWorkOrderById(id: string) {
    return this.request<any>(`/admin/work-orders/${id}`);
  }

  // ============================================
  // PAYMENTS
  // ============================================

  async getPayments(params?: { status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    return this.request<any>(`/admin/payments?${query.toString()}`);
  }

  async getPaymentById(id: string) {
    return this.request<any>(`/admin/payments/${id}`);
  }

  async refundPayment(id: string, reason: string) {
    return this.request(`/admin/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ============================================
  // REVIEWS
  // ============================================

  async getReviews(params?: { rating?: number; page?: number }) {
    const query = new URLSearchParams();
    if (params?.rating) query.append('rating', params.rating.toString());
    if (params?.page) query.append('page', params.page.toString());
    return this.request<any>(`/admin/reviews?${query.toString()}`);
  }

  async deleteReview(id: string, reason: string) {
    return this.request(`/admin/reviews/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  async getSubscriptions(params?: { status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    return this.request<any>(`/admin/subscriptions?${query.toString()}`);
  }

  async getSubscriptionPlans() {
    return this.request<any>('/admin/subscription-plans');
  }

  async createSubscriptionPlan(data: {
    name: string;
    description: string;
    price: number;
    features: string[];
    duration: number;
  }) {
    return this.request('/admin/subscription-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubscriptionPlan(id: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    features: string[];
    isActive: boolean;
  }>) {
    return this.request(`/admin/subscription-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // REPORTS
  // ============================================

  async getRevenueReport(startDate: string, endDate: string) {
    return this.request<any>(`/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
  }

  async getUsersReport(startDate: string, endDate: string) {
    return this.request<any>(`/admin/reports/users?startDate=${startDate}&endDate=${endDate}`);
  }

  async getServicesReport(startDate: string, endDate: string) {
    return this.request<any>(`/admin/reports/services?startDate=${startDate}&endDate=${endDate}`);
  }

  // ============================================
  // SETTINGS
  // ============================================

  async getSettings() {
    return this.request<any>('/admin/settings');
  }

  async updateSettings(data: Record<string, any>) {
    return this.request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async sendBroadcast(data: {
    title: string;
    message: string;
    targetRole?: 'ALL' | 'CUSTOMERS' | 'PROVIDERS';
  }) {
    return this.request('/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // LOGS & AUDIT
  // ============================================

  async getAuditLogs(params?: { action?: string; userId?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.userId) query.append('userId', params.userId);
    if (params?.page) query.append('page', params.page.toString());
    return this.request<any>(`/admin/audit-logs?${query.toString()}`);
  }
}

export const adminApi = new AdminApiService();

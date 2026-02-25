"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/services/api";
import {
  Search,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  Download,
  Eye,
  Filter,
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  providerName: string;
  providerBusinessName: string;
  vehicleInfo: string;
  originalTotal: number;
  finalTotal: number;
  supplementsTotal: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  pdfUrl: string | null;
}

export default function FaturasPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { translate: t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadInvoices();
    }
  }, [isAuthenticated]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const response = await api.get("/repair-invoices/my");
      const data = response.data.data;
      setInvoices(
        (data.invoices || []).map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || "",
          customerName: inv.customerName || "",
          providerName: inv.providerName || "",
          providerBusinessName: inv.providerBusinessName || "",
          vehicleInfo: inv.vehicleInfo || "",
          originalTotal: Number(inv.originalTotal) || 0,
          finalTotal: Number(inv.finalTotal) || 0,
          supplementsTotal: Number(inv.supplementsTotal) || 0,
          status: inv.status || "DRAFT",
          createdAt: inv.createdAt,
          completedAt: inv.completedAt,
          pdfUrl: inv.pdfUrl || null,
        })),
      );
    } catch (error) {
      console.error("Error loading invoices:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<
      string,
      { label: string; color: string; icon: React.ReactNode }
    > = {
      DRAFT: {
        label: t("invoices.status.draft"),
        color: "bg-gray-100 text-gray-700",
        icon: <FileText className="w-4 h-4" />,
      },
      IN_PROGRESS: {
        label: t("common.status.inProgress"),
        color: "bg-blue-100 text-blue-700",
        icon: <Clock className="w-4 h-4" />,
      },
      COMPLETED: {
        label: t("common.status.completed"),
        color: "bg-yellow-100 text-yellow-700",
        icon: <CheckCircle className="w-4 h-4" />,
      },
      APPROVED: {
        label: t("invoices.status.approved"),
        color: "bg-green-100 text-green-700",
        icon: <CheckCircle className="w-4 h-4" />,
      },
      DISPUTED: {
        label: t("common.status.disputed"),
        color: "bg-red-100 text-red-700",
        icon: <XCircle className="w-4 h-4" />,
      },
    };
    return (
      statuses[status] || {
        label: status,
        color: "bg-gray-100 text-gray-700",
        icon: <Clock className="w-4 h-4" />,
      }
    );
  };

  const filterOptions = [
    { value: "all", label: t("quotes.filters.all") },
    { value: "DRAFT", label: t("invoices.status.draft") },
    { value: "IN_PROGRESS", label: t("common.status.inProgress") },
    { value: "COMPLETED", label: t("common.status.completed") },
    { value: "APPROVED", label: t("invoices.status.approved") },
    { value: "DISPUTED", label: t("common.status.disputed") },
  ];

  const filteredInvoices = invoices.filter((inv) => {
    if (filter !== "all" && inv.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.customerName.toLowerCase().includes(query) ||
        inv.vehicleInfo.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === "DRAFT").length,
    inProgress: invoices.filter((i) => i.status === "IN_PROGRESS").length,
    completed: invoices.filter((i) => i.status === "COMPLETED").length,
    approved: invoices.filter((i) => i.status === "APPROVED").length,
    disputed: invoices.filter((i) => i.status === "DISPUTED").length,
    totalRevenue: invoices
      .filter((i) => i.status === "APPROVED")
      .reduce((sum, i) => sum + i.finalTotal, 0),
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <DashboardLayout title={t("invoices.title")}>
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">{t("invoices.stats.total")}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-blue-600">
              {stats.inProgress}
            </p>
            <p className="text-sm text-gray-500">
              {t("common.status.inProgress")}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-green-600">
              {stats.approved}
            </p>
            <p className="text-sm text-gray-500">
              {t("invoices.status.approved")}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-primary-600">
              ${stats.totalRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">
              {t("invoices.stats.revenue")}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t("invoices.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input !pl-12"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-auto min-w-[160px]"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="skeleton w-12 h-12 rounded-xl" />
                  <div className="flex-1">
                    <div className="skeleton h-5 w-48 mb-2 rounded" />
                    <div className="skeleton h-4 w-64 mb-4 rounded" />
                    <div className="flex gap-4">
                      <div className="skeleton h-4 w-24 rounded" />
                      <div className="skeleton h-4 w-24 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("invoices.empty.title")}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? t("invoices.empty.searchHint")
                : t("invoices.empty.description")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => {
              const statusInfo = getStatusInfo(invoice.status);

              return (
                <div
                  key={invoice.id}
                  className="bg-white rounded-2xl p-6 shadow-soft card-hover"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${statusInfo.color.split(" ")[0]} flex items-center justify-center flex-shrink-0`}
                    >
                      <div className={statusInfo.color.split(" ")[1]}>
                        {statusInfo.icon}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {invoice.invoiceNumber}
                            </h3>
                            <span className={`badge ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {invoice.customerName} &bull; {invoice.vehicleInfo}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-gray-900">
                            ${invoice.finalTotal.toFixed(2)}
                          </p>
                          {Number(invoice.supplementsTotal) > 0 && (
                            <p className="text-xs text-blue-600">
                              +${invoice.supplementsTotal.toFixed(2)}{" "}
                              supplements
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          {t("invoices.originalTotal")}: $
                          {invoice.originalTotal.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(invoice.createdAt)}
                        </div>
                        {invoice.completedAt && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            {t("invoices.completedOn")}:{" "}
                            {formatDate(invoice.completedAt)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                          {invoice.invoiceNumber}
                        </span>
                        <div className="flex items-center gap-3">
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-500 hover:text-primary-600 font-medium flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </a>
                          )}
                          <button
                            onClick={() =>
                              router.push(`/faturas/${invoice.id}`)
                            }
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            {t("invoices.viewDetail")}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

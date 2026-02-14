import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n";
import DashboardLayout from "../../components/DashboardLayout";
import { api } from "../../services/api";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  AlertCircle,
  DollarSign,
  Shield,
  Wrench,
  Car,
  User,
} from "lucide-react";

export default function InvoiceDetailPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { translate: t } = useI18n();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && id) loadInvoice();
  }, [isAuthenticated, id]);

  async function loadInvoice() {
    setLoading(true);
    try {
      const res = await api.getRepairInvoice(id as string);
      if (res.error) {
        setError(res.error);
      } else {
        setInvoice(res.data?.data || res.data);
      }
    } catch (err) {
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setActionLoading(true);
    try {
      const res = await api.acceptRepairInvoice(id as string);
      if (!res.error) {
        await loadInvoice();
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.disputeRepairInvoice(id as string, disputeReason);
      if (!res.error) {
        setShowDisputeModal(false);
        setDisputeReason("");
        await loadInvoice();
      }
    } finally {
      setActionLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<
      string,
      { label: string; color: string; bg: string }
    > = {
      DRAFT: { label: "Draft", color: "text-gray-700", bg: "bg-gray-100" },
      IN_PROGRESS: {
        label: "In Progress",
        color: "text-blue-700",
        bg: "bg-blue-100",
      },
      COMPLETED: {
        label: "Awaiting Your Review",
        color: "text-yellow-700",
        bg: "bg-yellow-100",
      },
      APPROVED: {
        label: "Approved",
        color: "text-green-700",
        bg: "bg-green-100",
      },
      DISPUTED: { label: "Disputed", color: "text-red-700", bg: "bg-red-100" },
    };
    return (
      statuses[status] || {
        label: status,
        color: "text-gray-700",
        bg: "bg-gray-100",
      }
    );
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatCurrency = (val: any) => `$${Number(val || 0).toFixed(2)}`;

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title={t("client.invoices.detail") || "Invoice Detail"}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
            >
              <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
              <div className="h-4 w-full bg-gray-200 rounded mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout title={t("client.invoices.detail") || "Invoice Detail"}>
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-500 mb-4">{error || "Invoice not found"}</p>
          <button
            onClick={() => router.push("/faturas")}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            &larr; Back to Invoices
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);
  const lineItems = invoice.lineItems || [];

  return (
    <DashboardLayout title={t("client.invoices.detail") || "Invoice Detail"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/faturas")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("common.back") || "Back"}
          </button>
          <div className="flex items-center gap-3">
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                {t("client.invoices.downloadPdf") || "Download PDF"}
              </a>
            )}
          </div>
        </div>

        {/* Invoice Header Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {invoice.invoiceNumber}
                </h2>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${statusInfo.bg} ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar className="w-4 h-4" />
                Created {formatDate(invoice.createdAt)}
                {invoice.completedAt && (
                  <>
                    <span className="mx-2">&bull;</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Completed {formatDate(invoice.completedAt)}
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(invoice.finalTotal)}
              </p>
              {Number(invoice.supplementsTotal) > 0 && (
                <p className="text-sm text-blue-600 mt-1">
                  Includes {formatCurrency(invoice.supplementsTotal)} in
                  supplements
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Banner for COMPLETED invoices */}
        {invoice.status === "COMPLETED" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-1">
                  {t("client.invoices.reviewRequired") || "Review Required"}
                </h3>
                <p className="text-sm text-yellow-700 mb-4">
                  {t("client.invoices.reviewDesc") ||
                    "This repair has been completed. Please review the invoice and either approve or dispute it."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t("client.invoices.approve") || "Approve Invoice"}
                  </button>
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-6 py-2.5 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {t("client.invoices.dispute") || "Dispute"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Provider & Vehicle Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
              <User className="w-5 h-5 text-primary-500" />
              {t("client.invoices.provider") || "Service Provider"}
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Name:</span>{" "}
                <span className="font-medium">{invoice.providerName}</span>
              </p>
              {invoice.providerBusinessName && (
                <p>
                  <span className="text-gray-500">Business:</span>{" "}
                  <span className="font-medium">
                    {invoice.providerBusinessName}
                  </span>
                </p>
              )}
              {invoice.providerMvrLicense && (
                <p>
                  <span className="text-gray-500">MVR License:</span>{" "}
                  <span className="font-medium">
                    {invoice.providerMvrLicense}
                  </span>
                </p>
              )}
              {invoice.providerPhone && (
                <p>
                  <span className="text-gray-500">Phone:</span>{" "}
                  <span className="font-medium">{invoice.providerPhone}</span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
              <Car className="w-5 h-5 text-primary-500" />
              {t("client.invoices.vehicle") || "Vehicle Information"}
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Vehicle:</span>{" "}
                <span className="font-medium">{invoice.vehicleInfo}</span>
              </p>
              {invoice.odometerIn && (
                <p>
                  <span className="text-gray-500">Odometer In:</span>{" "}
                  <span className="font-medium">{invoice.odometerIn} mi</span>
                </p>
              )}
              {invoice.odometerOut && (
                <p>
                  <span className="text-gray-500">Odometer Out:</span>{" "}
                  <span className="font-medium">{invoice.odometerOut} mi</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* FDACS Compliance Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
            <Shield className="w-5 h-5 text-primary-500" />
            {t("client.invoices.fdacsInfo") || "FDACS Compliance Details"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {invoice.laborChargeType && (
              <div>
                <p className="text-gray-500">Labor Charge Type</p>
                <p className="font-medium capitalize">
                  {invoice.laborChargeType.replace("_", " ").toLowerCase()}
                </p>
                {invoice.hourlyRate && (
                  <p className="text-xs text-gray-400">
                    ${invoice.hourlyRate}/hr
                  </p>
                )}
              </div>
            )}
            {Number(invoice.shopSuppliesFee) > 0 && (
              <div>
                <p className="text-gray-500">Shop Supplies Fee</p>
                <p className="font-medium">
                  {formatCurrency(invoice.shopSuppliesFee)}
                </p>
              </div>
            )}
            {Number(invoice.tireFee) > 0 && (
              <div>
                <p className="text-gray-500">Tire Fee (FS 403.718)</p>
                <p className="font-medium">{formatCurrency(invoice.tireFee)}</p>
              </div>
            )}
            {Number(invoice.batteryFee) > 0 && (
              <div>
                <p className="text-gray-500">Battery Fee (FS 403.7185)</p>
                <p className="font-medium">
                  {formatCurrency(invoice.batteryFee)}
                </p>
              </div>
            )}
            {Number(invoice.dailyStorageCharge) > 0 && (
              <div>
                <p className="text-gray-500">Daily Storage Charge</p>
                <p className="font-medium">
                  {formatCurrency(invoice.dailyStorageCharge)}/day
                </p>
                <p className="text-xs text-gray-400">After 3 working days</p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <Wrench className="w-5 h-5 text-primary-500" />
                {t("client.invoices.lineItems") || "Work Performed"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 text-sm text-gray-500">
                    <th className="text-left px-6 py-3 font-medium">Type</th>
                    <th className="text-left px-6 py-3 font-medium">
                      Description
                    </th>
                    <th className="text-left px-6 py-3 font-medium">
                      Condition
                    </th>
                    <th className="text-right px-6 py-3 font-medium">Qty</th>
                    <th className="text-right px-6 py-3 font-medium">Price</th>
                    <th className="text-right px-6 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.map((item: any, index: number) => (
                    <tr key={item.id || index} className="text-sm">
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.type === "PART"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {item.partCondition === "NEW"
                          ? "New"
                          : item.partCondition === "USED"
                            ? "Used"
                            : item.partCondition === "REBUILT"
                              ? "Rebuilt"
                              : item.partCondition === "RECONDITIONED"
                                ? "Reconditioned"
                                : "-"}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t("client.invoices.totals") || "Totals"}
          </h3>
          <div className="space-y-2 max-w-sm ml-auto text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Original Total</span>
              <span>{formatCurrency(invoice.originalTotal)}</span>
            </div>
            {Number(invoice.shopSuppliesFee) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Shop Supplies</span>
                <span>{formatCurrency(invoice.shopSuppliesFee)}</span>
              </div>
            )}
            {Number(invoice.tireFee) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tire Fee</span>
                <span>{formatCurrency(invoice.tireFee)}</span>
              </div>
            )}
            {Number(invoice.batteryFee) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Battery Fee</span>
                <span>{formatCurrency(invoice.batteryFee)}</span>
              </div>
            )}
            {Number(invoice.supplementsTotal) > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Supplements</span>
                <span>+{formatCurrency(invoice.supplementsTotal)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-lg">
              <span>Final Total</span>
              <span>{formatCurrency(invoice.finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Service Performed & Warranty */}
        {(invoice.servicePerformed || invoice.warrantyDescription) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoice.servicePerformed && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {t("client.invoices.servicePerformed") || "Service Performed"}
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {invoice.servicePerformed}
                </p>
              </div>
            )}
            {invoice.warrantyDescription && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                  <Shield className="w-4 h-4 text-green-500" />
                  {t("client.invoices.warranty") || "Warranty"}
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {invoice.warrantyDescription}
                </p>
              </div>
            )}
          </div>
        )}

        {/* FDACS Regulatory Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-xs text-blue-800">
          <h4 className="font-semibold mb-2">
            Florida Motor Vehicle Repair Act Notice
          </h4>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              Florida Statute §559.905 requires a written estimate for repairs
              over $150.
            </li>
            <li>
              You may not be charged more than 10% above the estimate without
              written authorization.
            </li>
            <li>
              Replaced parts must be returned upon request (except warranty or
              exchange parts).
            </li>
            <li>
              You have the right to inspect replaced parts before they are
              disposed of.
            </li>
          </ul>
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("client.invoices.disputeTitle") || "Dispute Invoice"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t("client.invoices.disputeDesc") ||
                "Please describe the reason for your dispute. The provider will be notified."}
            </p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder={
                t("client.invoices.disputePlaceholder") ||
                "Describe the issue..."
              }
              rows={4}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeReason("");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                {t("common.cancel") || "Cancel"}
              </button>
              <button
                onClick={handleDispute}
                disabled={!disputeReason.trim() || actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading
                  ? "Sending..."
                  : t("client.invoices.submitDispute") || "Submit Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

import { useEffect, useState } from 'react';
import { Link2, CheckCircle2, XCircle, RefreshCw, ExternalLink, FileText, AlertCircle } from 'lucide-react';

interface QBOStatus {
  connected: boolean;
  configured: boolean;
  companyName?: string;
  environment?: string;
  realmId?: string;
  error?: string;
  message?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function QuickBooksConnectionPanel() {
  const [status, setStatus] = useState<QBOStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE_URL}/quickbooks/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setStatus(json.data);
    } catch (err: any) {
      setStatus({ connected: false, configured: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    // Abre o fluxo OAuth em nova aba
    window.open(`${API_BASE_URL}/quickbooks/auth`, '_blank', 'width=800,height=700');
  }

  async function loadTaxReport() {
    setReportLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(
        `${API_BASE_URL}/quickbooks/tax-report?start=${startDate}&end=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      setReport(json.data);
    } catch (err: any) {
      alert('Erro ao carregar relatório: ' + err.message);
    } finally {
      setReportLoading(false);
    }
  }

  const stripeTaxEnabled = process.env.NEXT_PUBLIC_STRIPE_TAX_ENABLED === 'true';

  return (
    <div className="border-t border-gray-200 pt-6 mt-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Integrações de Tax Compliance
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Status das integrações que coletam e reportam o sales tax automaticamente.
        </p>
      </div>

      {/* Stripe Tax */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stripeTaxEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              {stripeTaxEnabled ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Stripe Tax</h4>
              <p className="text-sm text-gray-500 mt-0.5">
                {stripeTaxEnabled
                  ? 'Ativo — Stripe calcula o imposto com precisão por ZIP code.'
                  : 'Inativo — Sistema usa tabela manual de condados da FL (fallback).'}
              </p>
              {!stripeTaxEnabled && (
                <p className="text-xs text-amber-700 mt-2">
                  Para ativar: defina <code className="bg-amber-100 px-1 rounded">STRIPE_TAX_ENABLED=true</code> no .env do backend
                  após configurar no Stripe Dashboard.
                </p>
              )}
            </div>
          </div>
          <a
            href="https://dashboard.stripe.com/tax"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            Abrir Stripe <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* QuickBooks Online */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status?.connected ? 'bg-green-100' : 'bg-gray-100'}`}>
              {loading ? (
                <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
              ) : status?.connected ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">QuickBooks Online</h4>
              {loading ? (
                <p className="text-sm text-gray-500 mt-0.5">Verificando conexão...</p>
              ) : status?.connected ? (
                <>
                  <p className="text-sm text-green-700 mt-0.5">
                    ✓ Conectado: <strong>{status.companyName || 'QuickBooks Company'}</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Environment: {status.environment} · Realm ID: <code>{status.realmId}</code>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {status?.configured === false
                      ? 'Ainda não autorizado. Clique em "Conectar" para autorizar via OAuth.'
                      : status?.error || 'Não conectado'}
                  </p>
                  {status?.configured === false && (
                    <p className="text-xs text-amber-700 mt-2">
                      Configure antes <code className="bg-amber-100 px-1 rounded">QBO_CLIENT_ID</code> e{' '}
                      <code className="bg-amber-100 px-1 rounded">QBO_CLIENT_SECRET</code> no .env do backend
                      (obtenha em developer.intuit.com).
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium"
            >
              {status?.connected ? 'Reconectar' : 'Conectar'}
            </button>
            <button
              onClick={loadStatus}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-sm rounded-lg font-medium flex items-center gap-1 justify-center"
            >
              <RefreshCw className="w-3 h-3" /> Testar
            </button>
          </div>
        </div>
      </div>

      {/* Tax Report (DR-15) */}
      {status?.connected && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary-600" />
            <h4 className="font-semibold text-gray-900">Relatório Sales Tax — DR-15</h4>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Gere o relatório consolidado para filing do formulário DR-15 na Florida Dept. of Revenue.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={loadTaxReport}
              disabled={reportLoading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg font-medium disabled:opacity-50"
            >
              {reportLoading ? 'Gerando...' : 'Gerar Relatório'}
            </button>
          </div>

          {report && (
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">Taxable Sales</p>
                  <p className="text-xl font-bold text-blue-900">
                    ${(report.local?.taxableSales || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">Tax Collected</p>
                  <p className="text-xl font-bold text-green-900">
                    ${(report.local?.taxCollected || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-700">Transactions</p>
                  <p className="text-xl font-bold text-gray-900">
                    {report.local?.transactionCount || 0}
                  </p>
                </div>
              </div>

              {report.byCounty && report.byCounty.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Breakdown por Condado</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2">County</th>
                          <th className="text-right px-3 py-2">Taxable</th>
                          <th className="text-right px-3 py-2">Tax Collected</th>
                          <th className="text-right px-3 py-2">Txns</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {report.byCounty.map((row: any) => (
                          <tr key={row.county}>
                            <td className="px-3 py-2">{row.county}</td>
                            <td className="px-3 py-2 text-right">${row.taxable.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-semibold">${row.tax.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

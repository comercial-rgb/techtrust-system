import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  AlertCircle,
  CheckCircle,
  X,
  Wallet,
  QrCode,
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  holderName?: string;
  pixKey?: string;
  isDefault: boolean;
  createdAt: string;
}

export default function PagamentosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const stripeRef = useRef<any>(null);
  const cardElementRef = useRef<any>(null);

  // New card form
  const [newType, setNewType] = useState<'credit' | 'debit' | 'pix'>('credit');
  const [holderName, setHolderName] = useState('');
  const [pixKey, setPixKey] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadMethods();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showAddModal || newType === 'pix') {
      destroyCardElement();
      return;
    }

    let cancelled = false;
    loadStripeCardElement(cancelled);

    return () => {
      cancelled = true;
    };
  }, [showAddModal, newType]);

  async function loadMethods() {
    try {
      const response = await api.getPaymentMethods();
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
        setMethods(data.map((m: any) => ({
          id: m.id,
          type: m.type,
          cardBrand: m.cardBrand,
          cardLast4: m.cardLast4,
          cardExpMonth: m.cardExpMonth,
          cardExpYear: m.cardExpYear,
          holderName: m.holderName,
          pixKey: m.pixKey,
          isDefault: m.isDefault,
          createdAt: m.createdAt,
        })));
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setSubmitting(true);
    setError('');
    try {
      if (newType === 'pix') {
        const data: any = { type: newType };
        if (!pixKey) { setError('Enter PIX key'); setSubmitting(false); return; }
        data.pixKey = pixKey;

        const response = await api.addPaymentMethod(data);
        if (response.error) {
          setError(response.error);
        } else {
          setSuccess('Payment method added!');
          setShowAddModal(false);
          resetForm();
          loadMethods();
          setTimeout(() => setSuccess(''), 3000);
        }
        return;
      }

      if (!holderName.trim()) {
        setError('Enter cardholder name');
        return;
      }

      if (!stripeRef.current || !cardElementRef.current) {
        setError('Payment processor is still loading. Try again in a moment.');
        return;
      }

      const setupResponse = await api.createSetupIntent();
      const setupData = (setupResponse.data as any)?.data || setupResponse.data;
      const clientSecret = setupData?.clientSecret;

      if (setupResponse.error || !clientSecret) {
        setError(setupResponse.error || 'Could not prepare card verification.');
        return;
      }

      const { setupIntent, error: stripeError } = await stripeRef.current.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElementRef.current,
            billing_details: { name: holderName.trim() },
          },
        },
      );

      if (stripeError) {
        setError(stripeError.message || 'Card verification failed.');
        return;
      }

      const stripePaymentMethodId = setupIntent?.payment_method;
      if (!stripePaymentMethodId || typeof stripePaymentMethodId !== 'string') {
        setError('Stripe did not return a reusable payment method.');
        return;
      }

      const response = await api.addStripePaymentMethod(stripePaymentMethodId);
      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Payment method added!');
      setShowAddModal(false);
      resetForm();
      loadMethods();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error adding payment method');
    } finally {
      setSubmitting(false);
    }
  }

  async function loadStripeCardElement(cancelled: boolean) {
    const publishableKey = await getStripePublishableKey();
    if (!publishableKey) {
      setError('Stripe is not configured. Please contact support.');
      return;
    }

    try {
      // @ts-ignore — Stripe.js is loaded dynamically.
      if (!window.Stripe) {
        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://js.stripe.com/v3/"]');
          if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Failed to load Stripe.js')), { once: true });
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Stripe.js'));
          document.head.appendChild(script);
        });
      }

      if (cancelled || cardElementRef.current) return;

      // @ts-ignore
      stripeRef.current = window.Stripe(publishableKey);
      const elements = stripeRef.current.elements();
      const cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#111827',
            '::placeholder': { color: '#9ca3af' },
          },
        },
      });
      cardElement.mount('#stripe-card-element');
      cardElementRef.current = cardElement;
    } catch (err: any) {
      setError(err.message || 'Failed to load payment processor.');
    }
  }

  async function getStripePublishableKey() {
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    }

    const response = await api.getStripeConfig();
    const config = (response.data as any)?.data || response.data;
    return config?.publishableKey;
  }

  function destroyCardElement() {
    if (cardElementRef.current) {
      cardElementRef.current.destroy();
      cardElementRef.current = null;
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const response = await api.setDefaultPaymentMethod(id);
      if (!response.error) {
        loadMethods();
        setSuccess('Default payment method updated');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error setting default:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this payment method?')) return;
    try {
      const response = await api.deletePaymentMethod(id);
      if (!response.error) {
        loadMethods();
        setSuccess('Payment method removed');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  }

  function resetForm() {
    setNewType('credit');
    setHolderName('');
    setPixKey('');
    setError('');
  }

  function getCardIcon(brand?: string) {
    switch (brand?.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'amex': return '💳';
      default: return '💳';
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'credit': return 'Credit Card';
      case 'debit': return 'Debit Card';
      case 'pix': return 'PIX';
      default: return type;
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Payment Methods">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl"></div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payment Methods">
      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
          <p className="text-gray-500">Manage your cards and payment options</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="btn btn-primary"
        >
          <Plus className="w-5 h-5" />
          Add Method
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-soft text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {methods.filter(m => m.type === 'credit' || m.type === 'debit').length}
          </p>
          <p className="text-sm text-gray-500">Cards</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft text-center">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <QrCode className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {methods.filter(m => m.type === 'pix').length}
          </p>
          <p className="text-sm text-gray-500">PIX</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft text-center">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Wallet className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{methods.length}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
      </div>

      {/* Methods list */}
      {methods.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-soft">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-4">No payment methods yet</p>
          <p className="text-sm text-gray-400 mb-6">
            Add a card or PIX key to make payments. Methods added in the app will also appear here.
          </p>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5" />
            Add Payment Method
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {methods.map((method) => (
            <div
              key={method.id}
              className={`bg-white rounded-xl p-5 shadow-soft border-2 transition-colors ${
                method.isDefault ? 'border-primary-300 bg-primary-50/30' : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  method.type === 'pix' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {method.type === 'pix' ? (
                    <QrCode className="w-7 h-7 text-green-600" />
                  ) : (
                    <CreditCard className="w-7 h-7 text-blue-600" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {method.type === 'pix'
                        ? 'PIX'
                        : `${method.cardBrand || 'Card'} •••• ${method.cardLast4}`}
                    </h3>
                    {method.isDefault && (
                      <span className="flex items-center gap-1 bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {method.type === 'pix'
                      ? method.pixKey
                      : `${getTypeLabel(method.type)} • Expires ${String(method.cardExpMonth).padStart(2, '0')}/${method.cardExpYear}`}
                  </p>
                  {method.holderName && (
                    <p className="text-xs text-gray-400 mt-0.5">{method.holderName}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-600 transition-colors"
                      title="Set as default"
                    >
                      <Star className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Payment Method</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { value: 'credit' as const, label: 'Credit Card', icon: CreditCard },
                { value: 'debit' as const, label: 'Debit Card', icon: Wallet },
                { value: 'pix' as const, label: 'PIX', icon: QrCode },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setNewType(opt.value)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      newType === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${
                      newType === opt.value ? 'text-primary-600' : 'text-gray-400'
                    }`} />
                    <p className="text-xs font-medium">{opt.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Card form */}
            {newType !== 'pix' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Details</label>
                  <div
                    id="stripe-card-element"
                    className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Card data is verified and stored by Stripe. TechTrust only saves the reusable Stripe payment method ID.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIX Key</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Email, phone, CPF, or random key"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 btn btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="flex-1 btn btn-primary py-3 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Method'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

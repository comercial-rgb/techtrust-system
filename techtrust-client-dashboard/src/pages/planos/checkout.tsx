import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import { unwrapApiData } from '../../utils/unwrapApiData';
import '../../types/stripe-js';
import { Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';

export default function CheckoutPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { secret, plan, type } = router.query;
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const getStripePublishableKey = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    }

    const response = await api.getStripeConfig();
    const config = unwrapApiData<Record<string, unknown>>(response.data);
    const pk = config?.publishableKey;
    return typeof pk === "string" ? pk : undefined;
  }, []);

  const initStripe = useCallback(
    async (publishableKey: string, clientSecret: string) => {
      try {
        const StripeCtor = window.Stripe;
        if (!StripeCtor) throw new Error('Stripe.js failed to load');
        const stripe = StripeCtor(publishableKey);

        setStatus('ready');

        const elements = stripe.elements({ clientSecret });
        const paymentElement = elements.create('payment');

        const container = document.getElementById('payment-element');
        if (container) {
          paymentElement.mount(container);
        }

        const form = document.getElementById('payment-form');
        if (form) {
          form.addEventListener('submit', async (e: Event) => {
            e.preventDefault();
            setStatus('loading');

            const returnUrl = `${window.location.origin}/planos/checkout?status=success&plan=${plan}`;
            const confirmation =
              type === 'setup' || clientSecret.startsWith('seti_')
                ? await stripe.confirmSetup({
                    elements,
                    confirmParams: { return_url: returnUrl },
                  })
                : await stripe.confirmPayment({
                    elements,
                    confirmParams: { return_url: returnUrl },
                  });

            const { error } = confirmation;

            if (error) {
              setStatus('error');
              setMessage(error.message || 'Payment failed.');
            }
          });
        }
      } catch (err: unknown) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to initialize payment.');
      }
    },
    [plan, type],
  );

  const loadStripeAndConfirm = useCallback(
    async (publishableKey: string, clientSecret: string) => {
      try {
        if (!window.Stripe) {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.async = true;
          script.onload = () => {
            void initStripe(publishableKey, clientSecret);
          };
          script.onerror = () => {
            setStatus('error');
            setMessage('Failed to load payment processor.');
          };
          document.head.appendChild(script);
        } else {
          void initStripe(publishableKey, clientSecret);
        }
      } catch (err) {
        setStatus('error');
        setMessage('An error occurred loading the payment page.');
      }
    },
    [initStripe],
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!secret) return;

    void (async () => {
      const publishableKey = await getStripePublishableKey();
      if (!publishableKey) {
        setStatus('error');
        setMessage('Stripe is not configured. Please contact support.');
        return;
      }

      const clientSecret = Array.isArray(secret) ? secret[0] : secret;
      if (!clientSecret || typeof clientSecret !== "string") return;
      await loadStripeAndConfirm(publishableKey, clientSecret);
    })();
  }, [secret, getStripePublishableKey, loadStripeAndConfirm]);

  // Handle return from Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnStatus = urlParams.get('status');
    const redirectStatus = urlParams.get('redirect_status');

    if (returnStatus === 'success' || redirectStatus === 'succeeded') {
      setStatus('success');
    } else if (redirectStatus === 'failed') {
      setStatus('error');
      setMessage('Payment was not successful. Please try again.');
    }
  }, []);

  if (authLoading) {
    return (
      <DashboardLayout title="Checkout">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <DashboardLayout title="Checkout">
        <Head><title>Payment Successful - TechTrust</title></Head>
        <div className="max-w-md mx-auto mt-20 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {type === 'setup' ? 'Trial Started!' : 'Payment Successful!'}
          </h1>
          <p className="text-gray-500 mb-6">
            Your {(plan as string)?.charAt(0).toUpperCase()}{(plan as string)?.slice(1)} plan is now active.
          </p>
          <button
            onClick={() => router.push('/planos')}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            View My Plan
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <DashboardLayout title="Checkout">
        <Head><title>Payment Error - TechTrust</title></Head>
        <div className="max-w-md mx-auto mt-20 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p className="text-gray-500 mb-6">{message || 'Something went wrong.'}</p>
          <button
            onClick={() => router.push('/planos')}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Payment form
  return (
    <DashboardLayout title="Checkout">
      <Head><title>Checkout - TechTrust</title></Head>
      <div className="max-w-lg mx-auto mt-10 px-4">
        <div className="text-center mb-8">
          <CreditCard className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">
            {type === 'setup' ? 'Start Your Trial' : 'Complete Your Subscription'}
          </h1>
          <p className="text-gray-500 mt-1">
            {plan && `Subscribing to the ${(plan as string).charAt(0).toUpperCase()}${(plan as string).slice(1)} plan`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <form id="payment-form">
            <div id="payment-element" className="mb-6">
              {status === 'loading' && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                  <span className="ml-2 text-gray-500">Loading payment form...</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                type === 'setup' ? 'Save Card & Start Trial' : 'Subscribe Now'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Secure payment processed by Stripe. We accept credit cards, debit cards, Apple Pay, Google Pay, and bank transfers.
          <br />7-day free trial on paid plans. You can cancel anytime.
        </p>
      </div>
    </DashboardLayout>
  );
}

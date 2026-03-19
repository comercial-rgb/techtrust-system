import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import { Check, Star, Zap, Shield, Crown, Loader2 } from 'lucide-react';

interface Plan {
  id: string;
  planKey: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  vehicleLimit: number;
  serviceRequestsPerMonth: number | null;
  features: string[];
  isFeatured: boolean;
}

interface Subscription {
  plan: string;
  status: string;
  price: number;
  currentPeriodEnd: string;
}

const planIcons: Record<string, any> = {
  free: Shield,
  starter: Zap,
  pro: Star,
  enterprise: Crown,
};

const planColors: Record<string, string> = {
  free: 'border-gray-200',
  starter: 'border-primary-300',
  pro: 'border-primary-500 ring-2 ring-primary-100',
  enterprise: 'border-accent-400',
};

const planButtonStyles: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  starter: 'bg-primary-600 text-white hover:bg-primary-700',
  pro: 'bg-primary-600 text-white hover:bg-primary-700',
  enterprise: 'bg-accent-600 text-white hover:bg-accent-700',
};

export default function PlanosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) loadData();
  }, [authLoading, isAuthenticated]);

  async function loadData() {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.getSubscriptionPlans(),
        api.getMySubscription(),
      ]);
      if (plansRes.data) {
        const planData = Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data as any)?.data;
        if (planData) setPlans(planData);
      }
      if (subRes.data) {
        const subData = subRes.data.data || subRes.data;
        setCurrentSub(subData);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(planKey: string) {
    if (subscribing) return;

    const currentPlan = currentSub?.plan?.toLowerCase();
    if (currentPlan === planKey) return;

    if (planKey === 'free') {
      if (!confirm('Are you sure you want to downgrade to the Free plan? You will lose access to premium features.')) return;
    }

    setSubscribing(planKey);
    try {
      const res = await api.subscribeToPlan(planKey, billingPeriod);
      if (res.error) {
        alert(res.error);
        return;
      }

      const data = res.data?.data || res.data;

      // If Stripe returns a clientSecret, redirect to checkout
      if (data?.clientSecret) {
        router.push(`/planos/checkout?secret=${encodeURIComponent(data.clientSecret)}&plan=${planKey}`);
        return;
      }

      // Otherwise plan was applied directly (e.g. FREE downgrade)
      alert(res.data?.message || 'Plan updated successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update plan');
    } finally {
      setSubscribing(null);
    }
  }

  function getButtonLabel(planKey: string): string {
    const currentPlan = currentSub?.plan?.toLowerCase() || 'free';
    if (currentPlan === planKey) return 'Current Plan';

    const planOrder = ['free', 'starter', 'pro', 'enterprise'];
    const currentIdx = planOrder.indexOf(currentPlan);
    const targetIdx = planOrder.indexOf(planKey);

    if (targetIdx > currentIdx) return 'Upgrade';
    return 'Downgrade';
  }

  function isCurrentPlan(planKey: string): boolean {
    return (currentSub?.plan?.toLowerCase() || 'free') === planKey;
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Plans">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Subscription Plans">
      <Head>
        <title>Plans - TechTrust</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Plan</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            From basic coverage to full fleet management. Pick the plan that fits
            your needs and upgrade anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              billingPeriod === 'yearly' ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                billingPeriod === 'yearly' ? 'translate-x-7' : ''
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
            Yearly
          </span>
          {billingPeriod === 'yearly' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Save ~17%
            </span>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = planIcons[plan.planKey] || Shield;
            const isCurrent = isCurrentPlan(plan.planKey);
            const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const period = billingPeriod === 'monthly' ? '/mo' : '/yr';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-shadow hover:shadow-lg ${
                  planColors[plan.planKey] || 'border-gray-200'
                } ${isCurrent ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
              >
                {plan.isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    CURRENT
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${plan.isFeatured ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Icon className={`w-6 h-6 ${plan.isFeatured ? 'text-primary-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
                  </span>
                  {price > 0 && (
                    <span className="text-gray-500 text-sm">{period}</span>
                  )}
                </div>

                <ul className="flex-1 space-y-3 mb-6">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.planKey)}
                  disabled={isCurrent || subscribing !== null}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-500 cursor-default'
                      : planButtonStyles[plan.planKey] || 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {subscribing === plan.planKey ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    getButtonLabel(plan.planKey)
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Current plan info */}
        {currentSub && currentSub.plan !== 'FREE' && (
          <div className="mt-10 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Current: {currentSub.plan} Plan
                </h3>
                <p className="text-sm text-gray-500">
                  ${Number(currentSub.price).toFixed(2)}/period — renews{' '}
                  {new Date(currentSub.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Cancel your subscription? You can downgrade to the Free plan.')) {
                    handleSelectPlan('free');
                  }
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

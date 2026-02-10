import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  ChevronLeft,
  Car,
  AlertCircle,
  CheckCircle,
  Search,
} from 'lucide-react';

export default function NovoVeiculoPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vin, setVin] = useState('');
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState('');
  const [vinDecoding, setVinDecoding] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  async function handleVinDecode() {
    if (!vin || vin.length < 17) {
      setError('VIN must be 17 characters');
      return;
    }
    setVinDecoding(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/vehicles/decode-vin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin }),
      });
      const data = await response.json();
      if (data.data) {
        const v = data.data;
        if (v.make) setMake(v.make);
        if (v.model) setModel(v.model);
        if (v.year) setYear(String(v.year));
        if (v.engineType) setColor(v.color || '');
      }
    } catch (err) {
      console.error('VIN decode error:', err);
    } finally {
      setVinDecoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!make || !model || !year) {
      setError('Make, Model, and Year are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.createVehicle({
        make,
        model,
        year: parseInt(year),
        plateNumber,
        vin: vin || undefined,
        color: color || undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/veiculos'), 1500);
    } catch (err: any) {
      setError(err.message || 'Error adding vehicle');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout title="Add Vehicle">
        <div className="max-w-2xl mx-auto">
          <div className="h-64 skeleton rounded-xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (success) {
    return (
      <DashboardLayout title="Add Vehicle">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-soft text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vehicle Added!</h2>
            <p className="text-gray-500">Redirecting to your vehicles...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add Vehicle">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <Car className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Vehicle</h2>
              <p className="text-gray-500">Vehicles added here will also appear in the app</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* VIN Decode */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">VIN (optional - auto-fill)</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                maxLength={17}
                placeholder="Enter 17-character VIN"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={handleVinDecode}
                disabled={vinDecoding || vin.length < 17}
                className="btn btn-secondary px-4 disabled:opacity-50"
              >
                {vinDecoding ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter the VIN to auto-fill make, model, and year</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="e.g. Toyota"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Camry"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  placeholder="2024"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Black"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                <input
                  type="text"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value.replace(/\D/g, ''))}
                  placeholder="45000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ABC-1234"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 btn btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn btn-primary py-3 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

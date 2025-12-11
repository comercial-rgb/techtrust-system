import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { Search, Star, User, Building2, Trash2, Flag, MessageSquare } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  customer: { fullName: string };
  provider: { companyName: string };
  workOrder: { orderNumber: string; title: string };
  createdAt: string;
  isReported: boolean;
}

export default function AvaliacoesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  async function loadData() {
    setReviews([
      { id: '1', rating: 5, comment: 'Excelente serviço! Muito profissional e pontual.', customer: { fullName: 'João Silva' }, provider: { companyName: 'Auto Center Express' }, workOrder: { orderNumber: 'WO-2024-001', title: 'Revisão 30k' }, createdAt: '2024-12-01T15:00:00Z', isReported: false },
      { id: '2', rating: 4, comment: 'Bom atendimento, preço justo.', customer: { fullName: 'Maria Santos' }, provider: { companyName: 'Mecânica do Zé' }, workOrder: { orderNumber: 'WO-2024-002', title: 'Troca de freios' }, createdAt: '2024-11-30T10:00:00Z', isReported: false },
      { id: '3', rating: 2, comment: 'Demorou muito para entregar o carro.', customer: { fullName: 'Pedro Oliveira' }, provider: { companyName: 'Fast Car' }, workOrder: { orderNumber: 'WO-2024-003', title: 'Alinhamento' }, createdAt: '2024-11-28T14:00:00Z', isReported: true },
      { id: '4', rating: 5, comment: 'Perfeito! Recomendo a todos.', customer: { fullName: 'Ana Costa' }, provider: { companyName: 'Auto Center Express' }, workOrder: { orderNumber: 'WO-2024-004', title: 'Troca de óleo' }, createdAt: '2024-11-25T11:00:00Z', isReported: false },
    ]);
    setLoading(false);
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const filtered = reviews.filter((r) => {
    if (ratingFilter === 'low' && r.rating >= 3) return false;
    if (ratingFilter === 'high' && r.rating < 4) return false;
    if (ratingFilter === 'reported' && !r.isReported) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.comment.toLowerCase().includes(q) || r.customer.fullName.toLowerCase().includes(q) || r.provider.companyName.toLowerCase().includes(q);
    }
    return true;
  });

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
      ))}
    </div>
  );

  if (authLoading || loading) return <AdminLayout title="Avaliações"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div></AdminLayout>;

  return (
    <AdminLayout title="Avaliações">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-900">{reviews.length}</p><p className="text-sm text-gray-500">Total</p></div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Star className="w-6 h-6 text-yellow-400 fill-current" />
            <p className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
          </div>
          <p className="text-sm text-gray-500">Média Geral</p>
        </div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{reviews.filter(r => r.rating >= 4).length}</p><p className="text-sm text-gray-500">Positivas (4-5★)</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-red-600">{reviews.filter(r => r.isReported).length}</p><p className="text-sm text-gray-500">Reportadas</p></div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar por comentário, cliente ou fornecedor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" />
          </div>
          <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="input w-auto">
            <option value="all">Todas</option>
            <option value="high">Positivas (4-5★)</option>
            <option value="low">Negativas (1-3★)</option>
            <option value="reported">Reportadas</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((review) => (
          <div key={review.id} className={`card p-6 ${review.isReported ? 'border-l-4 border-red-500' : ''}`}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  {renderStars(review.rating)}
                  <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString('pt-BR')}</span>
                  {review.isReported && <span className="badge badge-danger flex items-center gap-1"><Flag className="w-3 h-3" />Reportada</span>}
                </div>
                <p className="text-gray-700 mb-3">{review.comment}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><User className="w-4 h-4" />{review.customer.fullName}</span>
                  <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{review.provider.companyName}</span>
                  <span>#{review.workOrder.orderNumber} - {review.workOrder.title}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

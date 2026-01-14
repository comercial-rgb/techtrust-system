import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { 
  Image as ImageIcon, 
  Tag, 
  FileText, 
  AlertCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff,
  Calendar,
  Clock,
  Link as LinkIcon,
  Percent,
  DollarSign,
  X,
  Upload,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';
import { adminApi as api } from '../../services/api';

// Types
interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: string;
  isActive: boolean;
  position: number;
  startDate?: string;
  endDate?: string;
  targetAudience: string;
  createdAt: string;
}

interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  discountType: string;
  discountValue?: number;
  discountLabel: string;
  originalPrice?: number;
  discountedPrice?: number;
  imageUrl?: string;
  validFrom?: string;
  validUntil?: string;
  promoCode?: string;
  isActive: boolean;
  isFeatured: boolean;
  position: number;
  createdAt: string;
  // Service type restrictions
  serviceType?: string;
  vehicleTypes?: string[];
  fuelTypes?: string[];
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  category: string;
  readTime?: string;
  isPublished: boolean;
  isFeatured: boolean;
  position: number;
  publishedAt?: string;
  createdAt: string;
}

interface Notice {
  id: string;
  title: string;
  message: string;
  type: string;
  icon?: string;
  isActive: boolean;
  isPinned: boolean;
  position: number;
  startDate?: string;
  endDate?: string;
  targetAudience: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: string;
}

type ContentType = 'banners' | 'offers' | 'articles' | 'notices';

const tabs: { key: ContentType; label: string; icon: any }[] = [
  { key: 'banners', label: 'Banners', icon: ImageIcon },
  { key: 'offers', label: 'Ofertas', icon: Tag },
  { key: 'articles', label: 'Artigos', icon: FileText },
  { key: 'notices', label: 'Avisos', icon: AlertCircle },
];

export default function ConteudoPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContentType>('banners');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  // Form states
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    linkType: 'none',
    isActive: true,
    position: 0,
    startDate: '',
    endDate: '',
    targetAudience: 'all',
  });

  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    discountLabel: '',
    originalPrice: 0,
    discountedPrice: 0,
    imageUrl: '',
    validFrom: '',
    validUntil: '',
    promoCode: '',
    isActive: true,
    isFeatured: false,
    position: 0,
    // New fields for service type restrictions
    serviceType: '',
    vehicleTypes: [] as string[],
    fuelTypes: [] as string[],
  });

  const [articleForm, setArticleForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    imageUrl: '',
    category: 'tips',
    readTime: '5 min read',
    isPublished: false,
    isFeatured: false,
    position: 0,
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    message: '',
    type: 'info',
    icon: '',
    isActive: true,
    isPinned: false,
    position: 0,
    startDate: '',
    endDate: '',
    targetAudience: 'all',
    actionLabel: '',
    actionUrl: '',
  });

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  async function loadData() {
    try {
      const [bannersRes, offersRes, articlesRes, noticesRes] = await Promise.all([
        api.get('/admin/content/banners').catch(() => ({ data: [] })),
        api.get('/admin/content/offers').catch(() => ({ data: [] })),
        api.get('/admin/content/articles').catch(() => ({ data: [] })),
        api.get('/admin/content/notices').catch(() => ({ data: [] })),
      ]);

      setBanners((bannersRes.data || []) as Banner[]);
      setOffers((offersRes.data || []) as SpecialOffer[]);
      setArticles((articlesRes.data || []) as Article[]);
      setNotices((noticesRes.data || []) as Notice[]);
    } catch (error) {
      console.error('Error loading content:', error);
        setBanners(((bannersRes as any).data || []) as Banner[]);
        setOffers(((offersRes as any).data || []) as SpecialOffer[]);
        setArticles(((articlesRes as any).data || []) as Article[]);
        setNotices(((noticesRes as any).data || []) as Notice[]);
  // CRUD Functions
  async function handleSaveBanner(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/admin/content/banners/${editingItem.id}`, bannerForm);
      } else {
        await api.post('/admin/content/banners', bannerForm);
      }
      loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  }

  async function handleSaveOffer(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/admin/content/offers/${editingItem.id}`, offerForm);
      } else {
        await api.post('/admin/content/offers', offerForm);
      }
      loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving offer:', error);
    }
  }

  async function handleSaveArticle(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/admin/content/articles/${editingItem.id}`, articleForm);
      } else {
        await api.post('/admin/content/articles', articleForm);
      }
      loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving article:', error);
    }
  }

  async function handleSaveNotice(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/admin/content/notices/${editingItem.id}`, noticeForm);
      } else {
        await api.post('/admin/content/notices', noticeForm);
      }
      loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving notice:', error);
    }
  }

  async function handleDelete(type: ContentType, id: string) {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await api.delete(`/admin/content/${type}/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }

  async function handleToggleActive(type: ContentType, item: any) {
    try {
      const field = type === 'articles' ? 'isPublished' : 'isActive';
      await api.put(`/admin/content/${type}/${item.id}`, { [field]: !item[field] });
      loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  }

  function openCreateModal() {
    setEditingItem(null);
    resetForms();
    setShowModal(true);
  }

  function openEditModal(item: any) {
    setEditingItem(item);
    if (activeTab === 'banners') {
      setBannerForm({
        title: item.title || '',
        subtitle: item.subtitle || '',
        imageUrl: item.imageUrl || '',
        linkUrl: item.linkUrl || '',
        linkType: item.linkType || 'none',
        isActive: item.isActive ?? true,
        position: item.position || 0,
        startDate: item.startDate ? item.startDate.split('T')[0] : '',
        endDate: item.endDate ? item.endDate.split('T')[0] : '',
        targetAudience: item.targetAudience || 'all',
      });
    } else if (activeTab === 'offers') {
      setOfferForm({
        title: item.title || '',
        description: item.description || '',
        discountType: item.discountType || 'percentage',
        discountValue: item.discountValue || 0,
        discountLabel: item.discountLabel || '',
        originalPrice: item.originalPrice || 0,
        discountedPrice: item.discountedPrice || 0,
        imageUrl: item.imageUrl || '',
        validFrom: item.validFrom ? item.validFrom.split('T')[0] : '',
        validUntil: item.validUntil ? item.validUntil.split('T')[0] : '',
        promoCode: item.promoCode || '',
        isActive: item.isActive ?? true,
        isFeatured: item.isFeatured ?? false,
        position: item.position || 0,
        serviceType: item.serviceType || '',
        vehicleTypes: item.vehicleTypes || [],
        fuelTypes: item.fuelTypes || [],
      });
    } else if (activeTab === 'articles') {
      setArticleForm({
        title: item.title || '',
        slug: item.slug || '',
        excerpt: item.excerpt || '',
        content: item.content || '',
        imageUrl: item.imageUrl || '',
        category: item.category || 'tips',
        readTime: item.readTime || '5 min read',
        isPublished: item.isPublished ?? false,
        isFeatured: item.isFeatured ?? false,
        position: item.position || 0,
      });
    } else if (activeTab === 'notices') {
      setNoticeForm({
        title: item.title || '',
        message: item.message || '',
        type: item.type || 'info',
        icon: item.icon || '',
        isActive: item.isActive ?? true,
        isPinned: item.isPinned ?? false,
        position: item.position || 0,
        startDate: item.startDate ? item.startDate.split('T')[0] : '',
        endDate: item.endDate ? item.endDate.split('T')[0] : '',
        targetAudience: item.targetAudience || 'all',
        actionLabel: item.actionLabel || '',
        actionUrl: item.actionUrl || '',
      });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingItem(null);
    resetForms();
  }

  function resetForms() {
    setBannerForm({ title: '', subtitle: '', imageUrl: '', linkUrl: '', linkType: 'none', isActive: true, position: 0, startDate: '', endDate: '', targetAudience: 'all' });
    setOfferForm({ title: '', description: '', discountType: 'percentage', discountValue: 0, discountLabel: '', originalPrice: 0, discountedPrice: 0, imageUrl: '', validFrom: '', validUntil: '', promoCode: '', isActive: true, isFeatured: false, position: 0, serviceType: '', vehicleTypes: [], fuelTypes: [] });
    setArticleForm({ title: '', slug: '', excerpt: '', content: '', imageUrl: '', category: 'tips', readTime: '5 min read', isPublished: false, isFeatured: false, position: 0 });
    setNoticeForm({ title: '', message: '', type: 'info', icon: '', isActive: true, isPinned: false, position: 0, startDate: '', endDate: '', targetAudience: 'all', actionLabel: '', actionUrl: '' });
  }

  const getNoticeTypeStyle = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'alert': return 'bg-red-100 text-red-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getNoticeTypeLabel = (type: string) => {
    switch (type) {
      case 'success': return 'Sucesso';
      case 'warning': return 'Atenção';
      case 'alert': return 'Alerta';
      default: return 'Informativo';
    }
  };

  if (authLoading || loading) return (
    <AdminLayout title="Conteúdo">
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Conteúdo">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{banners.length}</p>
              <p className="text-sm text-gray-500">Banners</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{offers.length}</p>
              <p className="text-sm text-gray-500">Ofertas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{articles.length}</p>
              <p className="text-sm text-gray-500">Artigos</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{notices.length}</p>
              <p className="text-sm text-gray-500">Avisos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-admin-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <button onClick={openCreateModal} className="btn-primary whitespace-nowrap">
          <Plus className="w-5 h-5" />
          {activeTab === 'banners' && 'Novo Banner'}
          {activeTab === 'offers' && 'Nova Oferta'}
          {activeTab === 'articles' && 'Novo Artigo'}
          {activeTab === 'notices' && 'Novo Aviso'}
        </button>
      </div>

      {/* Content Lists */}
      <div className="space-y-4">
        {/* Banners List */}
        {activeTab === 'banners' && banners.map(banner => (
          <div key={banner.id} className="card p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{banner.title}</h3>
                {banner.subtitle && <p className="text-sm text-gray-500 truncate">{banner.subtitle}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(banner.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  {banner.linkUrl && (
                    <span className="flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      Com link
                    </span>
                  )}
                  <span className="bg-gray-100 px-2 py-0.5 rounded">{banner.targetAudience}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive('banners', banner)}
                  className={`p-2 rounded-lg ${banner.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                  title={banner.isActive ? 'Desativar' : 'Ativar'}
                >
                  {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEditModal(banner)}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete('banners', banner.id)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Offers List */}
        {activeTab === 'offers' && offers.map(offer => (
          <div key={offer.id} className="card p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-green-600">{offer.discountLabel || `${offer.discountValue || 0}%`}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{offer.title}</h3>
                  {offer.isFeatured && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">Destaque</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{offer.description}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {offer.validUntil && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Válido até {new Date(offer.validUntil).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {offer.promoCode && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{offer.promoCode}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive('offers', offer)}
                  className={`p-2 rounded-lg ${offer.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                  title={offer.isActive ? 'Desativar' : 'Ativar'}
                >
                  {offer.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEditModal(offer)}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete('offers', offer.id)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Articles List */}
        {activeTab === 'articles' && articles.map(article => (
          <div key={article.id} className="card p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {article.imageUrl ? (
                  <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{article.title}</h3>
                  {article.isFeatured && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">Destaque</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{article.excerpt}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">{article.category}</span>
                  {article.readTime && <span>{article.readTime}</span>}
                  <span className="text-gray-300">/{article.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive('articles', article)}
                  className={`p-2 rounded-lg ${article.isPublished ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                  title={article.isPublished ? 'Despublicar' : 'Publicar'}
                >
                  {article.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEditModal(article)}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete('articles', article.id)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Notices List */}
        {activeTab === 'notices' && notices.map(notice => (
          <div key={notice.id} className="card p-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getNoticeTypeStyle(notice.type)}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{notice.title}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getNoticeTypeStyle(notice.type)}`}>
                    {getNoticeTypeLabel(notice.type)}
                  </span>
                  {notice.isPinned && (
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">Fixado</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{notice.message}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">{notice.targetAudience}</span>
                  {notice.endDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Até {new Date(notice.endDate).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive('notices', notice)}
                  className={`p-2 rounded-lg ${notice.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                  title={notice.isActive ? 'Desativar' : 'Ativar'}
                >
                  {notice.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEditModal(notice)}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete('notices', notice.id)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty States */}
        {activeTab === 'banners' && banners.length === 0 && (
          <div className="card p-12 text-center">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum banner cadastrado</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> Criar Banner
            </button>
          </div>
        )}
        {activeTab === 'offers' && offers.length === 0 && (
          <div className="card p-12 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma oferta cadastrada</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> Criar Oferta
            </button>
          </div>
        )}
        {activeTab === 'articles' && articles.length === 0 && (
          <div className="card p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum artigo cadastrado</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> Criar Artigo
            </button>
          </div>
        )}
        {activeTab === 'notices' && notices.length === 0 && (
          <div className="card p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum aviso cadastrado</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> Criar Aviso
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Editar' : 'Criar'}{' '}
                {activeTab === 'banners' && 'Banner'}
                {activeTab === 'offers' && 'Oferta'}
                {activeTab === 'articles' && 'Artigo'}
                {activeTab === 'notices' && 'Aviso'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner Form */}
            {activeTab === 'banners' && (
              <form onSubmit={handleSaveBanner} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                  <input
                    type="text"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subtítulo</label>
                  <input
                    type="text"
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL da Imagem *</label>
                  <input
                    type="url"
                    value={bannerForm.imageUrl}
                    onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                    className="input"
                    placeholder="https://..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL do Link</label>
                    <input
                      type="url"
                      value={bannerForm.linkUrl}
                      onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Link</label>
                    <select
                      value={bannerForm.linkType}
                      onChange={(e) => setBannerForm({ ...bannerForm, linkType: e.target.value })}
                      className="input"
                    >
                      <option value="none">Nenhum</option>
                      <option value="internal">Interno</option>
                      <option value="external">Externo</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                    <input
                      type="date"
                      value={bannerForm.startDate}
                      onChange={(e) => setBannerForm({ ...bannerForm, startDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                    <input
                      type="date"
                      value={bannerForm.endDate}
                      onChange={(e) => setBannerForm({ ...bannerForm, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Posição</label>
                    <input
                      type="number"
                      value={bannerForm.position}
                      onChange={(e) => setBannerForm({ ...bannerForm, position: parseInt(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Audiência</label>
                    <select
                      value={bannerForm.targetAudience}
                      onChange={(e) => setBannerForm({ ...bannerForm, targetAudience: e.target.value })}
                      className="input"
                    >
                      <option value="all">Todos</option>
                      <option value="customers">Clientes</option>
                      <option value="providers">Fornecedores</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bannerForm.isActive}
                        onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Ativo</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingItem ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            )}

            {/* Offer Form */}
            {activeTab === 'offers' && (
              <form onSubmit={handleSaveOffer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                  <input
                    type="text"
                    value={offerForm.title}
                    onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                  <textarea
                    value={offerForm.description}
                    onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                    className="input"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Desconto</label>
                    <select
                      value={offerForm.discountType}
                      onChange={(e) => setOfferForm({ ...offerForm, discountType: e.target.value })}
                      className="input"
                    >
                      <option value="percentage">Porcentagem</option>
                      <option value="fixed">Valor Fixo</option>
                      <option value="free">Grátis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor do Desconto</label>
                    <input
                      type="number"
                      value={offerForm.discountValue}
                      onChange={(e) => setOfferForm({ ...offerForm, discountValue: parseFloat(e.target.value) })}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Label do Desconto *</label>
                    <input
                      type="text"
                      value={offerForm.discountLabel}
                      onChange={(e) => setOfferForm({ ...offerForm, discountLabel: e.target.value })}
                      className="input"
                      placeholder="Ex: 15% OFF, FREE"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço Original</label>
                    <input
                      type="number"
                      value={offerForm.originalPrice}
                      onChange={(e) => setOfferForm({ ...offerForm, originalPrice: parseFloat(e.target.value) })}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço com Desconto</label>
                    <input
                      type="number"
                      value={offerForm.discountedPrice}
                      onChange={(e) => setOfferForm({ ...offerForm, discountedPrice: parseFloat(e.target.value) })}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL da Imagem</label>
                    <input
                      type="url"
                      value={offerForm.imageUrl}
                      onChange={(e) => setOfferForm({ ...offerForm, imageUrl: e.target.value })}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Código Promocional</label>
                    <input
                      type="text"
                      value={offerForm.promoCode}
                      onChange={(e) => setOfferForm({ ...offerForm, promoCode: e.target.value })}
                      className="input"
                      placeholder="Ex: PROMO2025"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Válido de *</label>
                    <input
                      type="date"
                      value={offerForm.validFrom}
                      onChange={(e) => setOfferForm({ ...offerForm, validFrom: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Válido até *</label>
                    <input
                      type="date"
                      value={offerForm.validUntil}
                      onChange={(e) => setOfferForm({ ...offerForm, validUntil: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                </div>
                
                {/* Service Type Selection */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-admin-100 rounded-full flex items-center justify-center text-admin-600 text-xs">🔧</span>
                    Restrições do Serviço
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Define para quais tipos de serviço, veículo e combustível essa oferta se aplica.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Serviço *</label>
                      <select
                        value={offerForm.serviceType}
                        onChange={(e) => setOfferForm({ ...offerForm, serviceType: e.target.value })}
                        className="input"
                        required
                      >
                        <option value="">Selecione um serviço</option>
                        <option value="oil">Oil Change (Troca de Óleo)</option>
                        <option value="brake">Brakes (Freios)</option>
                        <option value="tire">Tires (Pneus)</option>
                        <option value="engine">Engine (Motor)</option>
                        <option value="electric">Electrical (Elétrica)</option>
                        <option value="ac">A/C (Ar Condicionado)</option>
                        <option value="suspension">Suspension (Suspensão)</option>
                        <option value="transmission">Transmission (Transmissão)</option>
                        <option value="inspection">Inspection (Inspeção)</option>
                        <option value="detailing">Detailing (Estética)</option>
                        <option value="towing">Towing (Reboque)</option>
                        <option value="roadside">Roadside Assist (Assistência)</option>
                        <option value="battery">Battery (Bateria)</option>
                        <option value="lockout">Lockout (Chaveiro)</option>
                        <option value="other">Other (Outros)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipos de Veículo Elegíveis</label>
                      <div className="flex flex-wrap gap-2">
                        {['Car', 'SUV', 'Pickup', 'Van', 'Light Truck'].map(type => (
                          <label key={type} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={offerForm.vehicleTypes.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setOfferForm({ ...offerForm, vehicleTypes: [...offerForm.vehicleTypes, type] });
                                } else {
                                  setOfferForm({ ...offerForm, vehicleTypes: offerForm.vehicleTypes.filter(t => t !== type) });
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                            />
                            <span className="text-sm text-gray-700">{type}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Deixe vazio para aplicar a todos os tipos</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipos de Combustível Elegíveis</label>
                      <div className="flex flex-wrap gap-2">
                        {['Gasoline', 'Diesel', 'Hybrid', 'Electric'].map(fuel => (
                          <label key={fuel} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={offerForm.fuelTypes.includes(fuel)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setOfferForm({ ...offerForm, fuelTypes: [...offerForm.fuelTypes, fuel] });
                                } else {
                                  setOfferForm({ ...offerForm, fuelTypes: offerForm.fuelTypes.filter(f => f !== fuel) });
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                            />
                            <span className="text-sm text-gray-700">{fuel}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Deixe vazio para aplicar a todos os tipos</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Posição</label>
                  <input
                    type="number"
                    value={offerForm.position}
                    onChange={(e) => setOfferForm({ ...offerForm, position: parseInt(e.target.value) })}
                    className="input"
                    min="0"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offerForm.isActive}
                      onChange={(e) => setOfferForm({ ...offerForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offerForm.isFeatured}
                      onChange={(e) => setOfferForm({ ...offerForm, isFeatured: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Destaque</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingItem ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            )}

            {/* Article Form */}
            {activeTab === 'articles' && (
              <form onSubmit={handleSaveArticle} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                    <input
                      type="text"
                      value={articleForm.title}
                      onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
                    <input
                      type="text"
                      value={articleForm.slug}
                      onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      className="input"
                      placeholder="url-amigavel"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resumo *</label>
                  <textarea
                    value={articleForm.excerpt}
                    onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                    className="input"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo *</label>
                  <textarea
                    value={articleForm.content}
                    onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                    className="input"
                    rows={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL da Imagem</label>
                  <input
                    type="url"
                    value={articleForm.imageUrl}
                    onChange={(e) => setArticleForm({ ...articleForm, imageUrl: e.target.value })}
                    className="input"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
                    <select
                      value={articleForm.category}
                      onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="tips">Dicas</option>
                      <option value="maintenance">Manutenção</option>
                      <option value="news">Notícias</option>
                      <option value="safety">Segurança</option>
                      <option value="technology">Tecnologia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo de Leitura</label>
                    <input
                      type="text"
                      value={articleForm.readTime}
                      onChange={(e) => setArticleForm({ ...articleForm, readTime: e.target.value })}
                      className="input"
                      placeholder="5 min read"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Posição</label>
                    <input
                      type="number"
                      value={articleForm.position}
                      onChange={(e) => setArticleForm({ ...articleForm, position: parseInt(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={articleForm.isPublished}
                      onChange={(e) => setArticleForm({ ...articleForm, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Publicado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={articleForm.isFeatured}
                      onChange={(e) => setArticleForm({ ...articleForm, isFeatured: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Destaque</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingItem ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            )}

            {/* Notice Form */}
            {activeTab === 'notices' && (
              <form onSubmit={handleSaveNotice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                  <input
                    type="text"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem *</label>
                  <textarea
                    value={noticeForm.message}
                    onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                    className="input"
                    rows={4}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                    <select
                      value={noticeForm.type}
                      onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value })}
                      className="input"
                    >
                      <option value="info">Informativo</option>
                      <option value="success">Sucesso</option>
                      <option value="warning">Atenção</option>
                      <option value="alert">Alerta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ícone</label>
                    <input
                      type="text"
                      value={noticeForm.icon}
                      onChange={(e) => setNoticeForm({ ...noticeForm, icon: e.target.value })}
                      className="input"
                      placeholder="Ex: alert-circle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Posição</label>
                    <input
                      type="number"
                      value={noticeForm.position}
                      onChange={(e) => setNoticeForm({ ...noticeForm, position: parseInt(e.target.value) })}
                      className="input"
                      min="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                    <input
                      type="date"
                      value={noticeForm.startDate}
                      onChange={(e) => setNoticeForm({ ...noticeForm, startDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                    <input
                      type="date"
                      value={noticeForm.endDate}
                      onChange={(e) => setNoticeForm({ ...noticeForm, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Audiência</label>
                    <select
                      value={noticeForm.targetAudience}
                      onChange={(e) => setNoticeForm({ ...noticeForm, targetAudience: e.target.value })}
                      className="input"
                    >
                      <option value="all">Todos</option>
                      <option value="customers">Clientes</option>
                      <option value="providers">Fornecedores</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Label do Botão</label>
                    <input
                      type="text"
                      value={noticeForm.actionLabel}
                      onChange={(e) => setNoticeForm({ ...noticeForm, actionLabel: e.target.value })}
                      className="input"
                      placeholder="Ex: Ver mais"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL do Botão</label>
                  <input
                    type="url"
                    value={noticeForm.actionUrl}
                    onChange={(e) => setNoticeForm({ ...noticeForm, actionUrl: e.target.value })}
                    className="input"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeForm.isActive}
                      onChange={(e) => setNoticeForm({ ...noticeForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeForm.isPinned}
                      onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Fixado</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingItem ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

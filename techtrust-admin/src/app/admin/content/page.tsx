'use client';

/**
 * Content Management - Gerenciamento de Conteúdo
 * Banners, Ofertas, Artigos, Avisos
 */

import { useState, useEffect } from 'react';
import { 
  MdAnnouncement, MdLocalOffer, MdArticle, MdNotifications,
  MdAdd, MdEdit, MdDelete, MdVisibility, MdVisibilityOff,
  MdImage, MdLink, MdSchedule, MdPushPin, MdRefresh
} from 'react-icons/md';

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: string;
  position: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  targetAudience: string;
}

interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  discountType: string;
  discountValue?: number;
  discountLabel: string;
  originalPrice?: number;
  discountedPrice?: number;
  validFrom?: string;
  validUntil?: string;
  promoCode?: string;
  position: number;
  isActive: boolean;
  isFeatured: boolean;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  category: string;
  tags: string[];
  readTime?: string;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  publishedAt?: string;
  author?: { fullName: string };
}

interface Notice {
  id: string;
  title: string;
  message: string;
  type: string;
  icon?: string;
  isActive: boolean;
  isPinned: boolean;
  startDate?: string;
  endDate?: string;
  targetAudience: string;
  actionLabel?: string;
  actionUrl?: string;
}

type ContentTab = 'banners' | 'offers' | 'articles' | 'notices';

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState<ContentTab>('banners');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    banners: { total: 0, active: 0 },
    offers: { total: 0, active: 0 },
    articles: { total: 0, published: 0 },
    notices: { total: 0, active: 0 }
  });
  
  // Data states
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalType, setModalType] = useState<ContentTab>('banners');

  useEffect(() => {
    loadStats();
    loadContent(activeTab);
  }, [activeTab]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const loadStats = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/content/stats', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadContent = async (tab: ContentTab) => {
    setLoading(true);
    try {
      const endpoint = tab === 'offers' ? 'offers' : tab;
      const res = await fetch(`http://localhost:3000/api/v1/admin/content/${endpoint}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        switch (tab) {
          case 'banners': setBanners(data); break;
          case 'offers': setOffers(data); break;
          case 'articles': setArticles(data); break;
          case 'notices': setNotices(data); break;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setModalType(activeTab);
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalType(activeTab);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    
    try {
      const endpoint = activeTab === 'offers' ? 'offers' : activeTab;
      const res = await fetch(`http://localhost:3000/api/v1/admin/content/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        loadContent(activeTab);
        loadStats();
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, type: ContentTab) => {
    try {
      const endpoint = type === 'offers' ? 'offers' : type;
      const field = type === 'articles' ? 'isPublished' : 'isActive';
      
      const res = await fetch(`http://localhost:3000/api/v1/admin/content/${endpoint}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ [field]: !currentStatus })
      });
      if (res.ok) {
        loadContent(activeTab);
        loadStats();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const endpoint = modalType === 'offers' ? 'offers' : modalType;
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem 
        ? `http://localhost:3000/api/v1/admin/content/${endpoint}/${editingItem.id}`
        : `http://localhost:3000/api/v1/admin/content/${endpoint}`;
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowModal(false);
        loadContent(activeTab);
        loadStats();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const tabs = [
    { id: 'banners' as ContentTab, label: 'Banners/Ads', icon: MdAnnouncement, count: stats.banners.active },
    { id: 'offers' as ContentTab, label: 'Special Offers', icon: MdLocalOffer, count: stats.offers.active },
    { id: 'articles' as ContentTab, label: 'Articles', icon: MdArticle, count: stats.articles.published },
    { id: 'notices' as ContentTab, label: 'Notices', icon: MdNotifications, count: stats.notices.active }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Content Management</h1>
          <p className="text-gray-600">Manage landing page content: ads, offers, articles, and notices</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadStats(); loadContent(activeTab); }}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <MdRefresh className="w-5 h-5" />
            Refresh
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <MdAdd className="w-5 h-5" />
            Add New
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <MdAnnouncement className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.banners.active}/{stats.banners.total}</p>
              <p className="text-sm text-gray-500">Active Banners</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <MdLocalOffer className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.offers.active}/{stats.offers.total}</p>
              <p className="text-sm text-gray-500">Active Offers</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MdArticle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.articles.published}/{stats.articles.total}</p>
              <p className="text-sm text-gray-500">Published Articles</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <MdNotifications className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.notices.active}/{stats.notices.total}</p>
              <p className="text-sm text-gray-500">Active Notices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Banners Tab */}
            {activeTab === 'banners' && (
              <div className="divide-y">
                {banners.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MdAnnouncement className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No banners yet. Click "Add New" to create one.</p>
                  </div>
                ) : (
                  banners.map(banner => (
                    <div key={banner.id} className="flex items-center p-4 hover:bg-gray-50">
                      <div className="w-24 h-16 bg-gray-200 rounded-lg overflow-hidden mr-4">
                        {banner.imageUrl && (
                          <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{banner.title}</h3>
                        {banner.subtitle && <p className="text-sm text-gray-500">{banner.subtitle}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {banner.linkUrl && <span className="flex items-center gap-1"><MdLink /> {banner.linkType}</span>}
                          <span>Audience: {banner.targetAudience}</span>
                          <span>Position: {banner.position}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(banner.id, banner.isActive, 'banners')}
                          className={`p-2 rounded-lg ${banner.isActive ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                          title={banner.isActive ? 'Active' : 'Inactive'}
                        >
                          {banner.isActive ? <MdVisibility /> : <MdVisibilityOff />}
                        </button>
                        <button onClick={() => handleEdit(banner)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <MdEdit />
                        </button>
                        <button onClick={() => handleDelete(banner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <MdDelete />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="divide-y">
                {offers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MdLocalOffer className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No offers yet. Click "Add New" to create one.</p>
                  </div>
                ) : (
                  offers.map(offer => (
                    <div key={offer.id} className="flex items-center p-4 hover:bg-gray-50">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden mr-4 flex-shrink-0">
                        {offer.imageUrl ? (
                          <img src={offer.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MdLocalOffer className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-800">{offer.title}</h3>
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">{offer.discountLabel}</span>
                          {offer.isFeatured && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded">Featured</span>}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{offer.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {offer.originalPrice && (
                            <span className="text-gray-400 line-through">${Number(offer.originalPrice).toFixed(2)}</span>
                          )}
                          {offer.discountedPrice && (
                            <span className="text-green-600 font-bold">${Number(offer.discountedPrice).toFixed(2)}</span>
                          )}
                          {offer.validUntil && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <MdSchedule className="w-4 h-4" />
                              Until {new Date(offer.validUntil).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(offer.id, offer.isActive, 'offers')}
                          className={`p-2 rounded-lg ${offer.isActive ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                        >
                          {offer.isActive ? <MdVisibility /> : <MdVisibilityOff />}
                        </button>
                        <button onClick={() => handleEdit(offer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <MdEdit />
                        </button>
                        <button onClick={() => handleDelete(offer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <MdDelete />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Articles Tab */}
            {activeTab === 'articles' && (
              <div className="divide-y">
                {articles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MdArticle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No articles yet. Click "Add New" to create one.</p>
                  </div>
                ) : (
                  articles.map(article => (
                    <div key={article.id} className="flex items-center p-4 hover:bg-gray-50">
                      <div className="w-24 h-16 bg-gray-200 rounded-lg overflow-hidden mr-4">
                        {article.imageUrl ? (
                          <img src={article.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MdArticle className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-800">{article.title}</h3>
                          {article.isFeatured && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded">Featured</span>}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{article.excerpt}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{article.category}</span>
                          {article.readTime && <span>{article.readTime}</span>}
                          <span>{article.viewCount} views</span>
                          {article.publishedAt && <span>Published {new Date(article.publishedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(article.id, article.isPublished, 'articles')}
                          className={`p-2 rounded-lg ${article.isPublished ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                          title={article.isPublished ? 'Published' : 'Draft'}
                        >
                          {article.isPublished ? <MdVisibility /> : <MdVisibilityOff />}
                        </button>
                        <button onClick={() => handleEdit(article)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <MdEdit />
                        </button>
                        <button onClick={() => handleDelete(article.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <MdDelete />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Notices Tab */}
            {activeTab === 'notices' && (
              <div className="divide-y">
                {notices.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MdNotifications className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No notices yet. Click "Add New" to create one.</p>
                  </div>
                ) : (
                  notices.map(notice => (
                    <div key={notice.id} className="flex items-center p-4 hover:bg-gray-50">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                        notice.type === 'warning' ? 'bg-amber-100' :
                        notice.type === 'alert' ? 'bg-red-100' :
                        notice.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <MdNotifications className={`w-6 h-6 ${
                          notice.type === 'warning' ? 'text-amber-600' :
                          notice.type === 'alert' ? 'text-red-600' :
                          notice.type === 'success' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-800">{notice.title}</h3>
                          {notice.isPinned && <MdPushPin className="w-4 h-4 text-amber-500" />}
                          <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                            notice.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                            notice.type === 'alert' ? 'bg-red-100 text-red-600' :
                            notice.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>{notice.type}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notice.message}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>Audience: {notice.targetAudience}</span>
                          {notice.actionLabel && <span className="text-blue-500">Action: {notice.actionLabel}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(notice.id, notice.isActive, 'notices')}
                          className={`p-2 rounded-lg ${notice.isActive ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                        >
                          {notice.isActive ? <MdVisibility /> : <MdVisibilityOff />}
                        </button>
                        <button onClick={() => handleEdit(notice)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <MdEdit />
                        </button>
                        <button onClick={() => handleDelete(notice.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <MdDelete />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ContentModal
          type={modalType}
          item={editingItem}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// Modal Component
function ContentModal({ type, item, onClose, onSave }: {
  type: ContentTab;
  item: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState<any>(item || getDefaultData(type));
  const [saving, setSaving] = useState(false);

  function getDefaultData(t: ContentTab) {
    switch (t) {
      case 'banners':
        return { title: '', subtitle: '', imageUrl: '', linkUrl: '', linkType: 'none', position: 0, isActive: true, targetAudience: 'all' };
      case 'offers':
        return { title: '', description: '', imageUrl: '', discountType: 'percentage', discountValue: 0, discountLabel: '', originalPrice: '', discountedPrice: '', promoCode: '', position: 0, isActive: true, isFeatured: false };
      case 'articles':
        return { title: '', slug: '', excerpt: '', content: '', imageUrl: '', category: 'tips', tags: [], readTime: '', isPublished: false, isFeatured: false };
      case 'notices':
        return { title: '', message: '', type: 'info', icon: '', isActive: true, isPinned: false, targetAudience: 'all', actionLabel: '', actionUrl: '' };
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const titles = {
    banners: item ? 'Edit Banner' : 'New Banner',
    offers: item ? 'Edit Offer' : 'New Offer',
    articles: item ? 'Edit Article' : 'New Article',
    notices: item ? 'Edit Notice' : 'New Notice'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{titles[type]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Banner Fields */}
          {type === 'banners' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                  <input
                    type="url"
                    value={formData.linkUrl || ''}
                    onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Type</label>
                  <select
                    value={formData.linkType || 'none'}
                    onChange={e => setFormData({ ...formData, linkType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="customers">Customers Only</option>
                    <option value="providers">Providers Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="number"
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bannerActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="bannerActive" className="text-sm text-gray-700">Active</label>
              </div>
            </>
          )}

          {/* Offer Fields */}
          {type === 'offers' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl || ''}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={formData.discountValue || ''}
                    onChange={e => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Label *</label>
                  <input
                    type="text"
                    value={formData.discountLabel}
                    onChange={e => setFormData({ ...formData, discountLabel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 15% OFF, FREE"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.originalPrice || ''}
                    onChange={e => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discounted Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discountedPrice || ''}
                    onChange={e => setFormData({ ...formData, discountedPrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={formData.validUntil ? formData.validUntil.split('T')[0] : ''}
                    onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                  <input
                    type="text"
                    value={formData.promoCode || ''}
                    onChange={e => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., SAVE15"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
              </div>
            </>
          )}

          {/* Article Fields */}
          {type === 'articles' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="auto-generated if empty"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt *</label>
                <textarea
                  value={formData.excerpt}
                  onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl || ''}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="tips">Tips & How-to</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="news">News</option>
                    <option value="safety">Safety</option>
                    <option value="technology">Technology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Read Time</label>
                  <input
                    type="text"
                    value={formData.readTime || ''}
                    onChange={e => setFormData({ ...formData, readTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 5 min read"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={e => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Published</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
              </div>
            </>
          )}

          {/* Notice Fields */}
          {type === 'notices' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="alert">Alert</option>
                    <option value="success">Success</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="customers">Customers Only</option>
                    <option value="providers">Providers Only</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Label</label>
                  <input
                    type="text"
                    value={formData.actionLabel || ''}
                    onChange={e => setFormData({ ...formData, actionLabel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Learn More"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action URL</label>
                  <input
                    type="url"
                    value={formData.actionUrl || ''}
                    onChange={e => setFormData({ ...formData, actionUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Pinned</span>
                </label>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import api from "./api";

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: string;
}

export interface SpecialOffer {
  id: string;
  title: string;
  description?: string;
  // API fields
  discountLabel?: string;
  discountValue?: number;
  discountType?: string;
  promoCode?: string;
  // Legacy fields
  discount?: number | string;
  imageUrl?: string;
  image?: string; // Legacy support
  code?: string;
  originalPrice?: string | number;
  discountedPrice?: string | number;
  regularPrice?: number;
  specialPrice?: number;
  validUntil?: string;
  serviceType?: string;
  vehicleTypes?: string[];
  fuelTypes?: string[];
}

export interface Article {
  id: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  slug: string;
  publishDate: string;
}

export interface FeaturedProvider {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  businessName?: string;
  businessType?: string;
  city?: string;
  state?: string;
  averageRating: number;
  totalReviews: number;
  imageUrl?: string;
  services?: Array<{ id: string; name: string }>;
}

export interface HomeData {
  banners: Banner[];
  offers: SpecialOffer[];
  articles: Article[];
  notices: any[];
  featuredProviders: FeaturedProvider[];
}

/**
 * Busca todos os dados da página home
 */
export const getHomeData = async (): Promise<HomeData> => {
  try {
    const response = await api.get("/content/home-data");
    return response.data.data;
  } catch (error: any) {
    console.error("Erro ao buscar dados da home:", error);
    throw error;
  }
};

/**
 * Busca apenas banners
 */
export const getBanners = async (): Promise<Banner[]> => {
  try {
    const response = await api.get("/content/banners");
    return response.data?.data ?? response.data;
  } catch (error: any) {
    console.error("Erro ao buscar banners:", error);
    throw error;
  }
};

/**
 * Busca apenas ofertas especiais
 */
export const getOffers = async (): Promise<SpecialOffer[]> => {
  try {
    const response = await api.get("/content/offers");
    return response.data?.data ?? response.data;
  } catch (error: any) {
    console.error("Erro ao buscar ofertas:", error);
    throw error;
  }
};

/**
 * Busca apenas fornecedores em destaque
 */
export const getFeaturedProviders = async (): Promise<FeaturedProvider[]> => {
  try {
    const response = await api.get("/content/featured-providers");
    return response.data.data;
  } catch (error: any) {
    console.error("Erro ao buscar fornecedores em destaque:", error);
    throw error;
  }
};

/**
 * Busca apenas artigos
 */
export const getArticles = async (): Promise<Article[]> => {
  try {
    const response = await api.get("/content/articles");
    if (response.data?.data) return response.data.data;
    if (Array.isArray(response.data?.articles)) return response.data.articles;
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar artigos:", error);
    throw error;
  }
};

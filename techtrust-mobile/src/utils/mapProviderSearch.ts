/**
 * Normalizes a row from GET /providers/search into the shape used by
 * Landing / Dashboard provider cards.
 */
export type ProviderSearchCard = {
  id: string;
  name: string;
  city: string;
  state: string;
  services: string[];
  rating: number;
  reviews: number;
  specialOffers: string[];
  phone?: string;
  email?: string;
  address?: string;
  languages?: string[];
};

export function mapProviderSearchApiRow(
  p: Record<string, unknown>,
): ProviderSearchCard {
  const servicesOffered = p.servicesOffered;
  const services = p.services;
  const svc: string[] = Array.isArray(servicesOffered)
    ? (servicesOffered as string[])
    : Array.isArray(services)
      ? (services as string[])
      : [];
  return {
    id: String(p.id ?? ""),
    name: String(p.businessName ?? p.name ?? ""),
    city: String(p.city ?? ""),
    state: String(p.state ?? ""),
    services: svc,
    rating: Number(p.averageRating ?? p.rating ?? 0),
    reviews: Number(p.totalReviews ?? p.reviews ?? 0),
    specialOffers: (p.specialOffers as string[]) || [],
    phone: p.phone != null ? String(p.phone) : undefined,
    email: p.email != null ? String(p.email) : undefined,
    address: p.address != null ? String(p.address) : undefined,
    languages: Array.isArray(p.languages) ? (p.languages as string[]) : undefined,
  };
}

/**
 * Car Wash Types
 * TypeScript interfaces for the Car Wash module
 */

export interface CarWashListItem {
  id: string;
  businessName: string;
  carWashTypes: string[];
  logoUrl: string | null;
  primaryPhoto: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  estimatedDriveMinutes: number;
  averageRating: number;
  totalReviews: number;
  isOpenNow: boolean;
  opensAt: string | null;
  closesAt: string | null;
  priceFrom: number | null;
  hasMembershipPlans: boolean;
  hasFreeVacuum: boolean;
  isFeatured: boolean;
  isPromoted: boolean;
  isEcoFriendly: boolean;
}

export interface CarWashPhoto {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CarWashOperatingHours {
  id: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  is24Hours: boolean;
}

export interface CarWashService {
  id: string;
  key: string;
  category: string;
  name: string;
  description: string | null;
}

export interface CarWashPackageService {
  id: string;
  service: CarWashService;
}

export interface CarWashPackage {
  id: string;
  name: string;
  priceBase: number;
  priceSUV: number | null;
  isMostPopular: boolean;
  sortOrder: number;
  isActive: boolean;
  services: CarWashPackageService[];
}

export interface CarWashMembershipPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  packageLevel: string;
  multiLocation: boolean;
  description: string | null;
}

export interface CarWashAddOn {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export interface CarWashAmenity {
  id: string;
  amenity: {
    id: string;
    key: string;
    name: string;
    icon: string | null;
  };
}

export interface CarWashPaymentMethod {
  id: string;
  paymentMethod: {
    id: string;
    key: string;
    name: string;
    icon: string | null;
  };
}

export interface CarWashReview {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  responseAt: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface CarWashProfile {
  id: string;
  businessName: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  phoneNumber: string | null;
  email: string | null;
  carWashTypes: string[];
  address: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  accessInstructions: string | null;
  numberOfTunnels: number;
  numberOfBays: number;
  maxVehicleHeight: number | null;
  acceptsLargeVehicles: boolean;
  equipmentType: string | null;
  yearEstablished: number | null;
  isEcoFriendly: boolean;
  averageRating: number;
  totalReviews: number;
  isFeatured: boolean;
  isPromoted: boolean;
  isOpenNow: boolean;
  closesAt: string | null;
  isFavorited: boolean;
  ratingDistribution: Record<number, number>;
  photos: CarWashPhoto[];
  operatingHours: CarWashOperatingHours[];
  holidayHours: any[];
  packages: CarWashPackage[];
  membershipPlans: CarWashMembershipPlan[];
  addOnServices: CarWashAddOn[];
  amenities: CarWashAmenity[];
  paymentMethods: CarWashPaymentMethod[];
  reviews: CarWashReview[];
}

export interface CarWashSearchFilters {
  type?: string;
  minRating?: number;
  openNow?: boolean;
  hasMembership?: boolean;
  hasFreeVacuum?: boolean;
  minPrice?: number;
  maxPrice?: number;
  radiusMiles?: number;
  sortBy?: 'distance' | 'rating' | 'price' | 'name';
  search?: string;
}

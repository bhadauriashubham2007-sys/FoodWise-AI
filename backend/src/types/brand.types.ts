import { PlatformType, CouponRule, PriceProvenance } from './index.js';

export type BrandCategory = 
  | 'Pizza'
  | 'Burgers'
  | 'Chicken'
  | 'Sandwiches'
  | 'Coffee & Beverages'
  | 'Indian Food Chains';

export type BrandMatchingStatus = 
  | 'exact_match_verified'
  | 'similar_item'
  | 'not_available'
  | 'availability_not_verified'
  | 'demo_data';

export interface LocationContext {
  city: string;
  pincode: string;
  state?: string;
  distanceKm?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  category: BrandCategory;
  cuisine: string;
  tagline: string;
  logoUrl: string;
  bannerUrl: string;
  outletCountIndia: string;
  menuItemCount: number;
  popularItems: string[];
  isDemoData?: boolean;
  brandColor: string;
}

export interface BrandItemVariant {
  name: string; // e.g. "Regular", "Medium", "Large" or "Single", "Meal"
  pricePaise: number;
}

export interface BrandMenuItem {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  category: string;
  dietary: 'veg' | 'non-veg' | 'egg' | 'vegan';
  description: string;
  imageUrl: string;
  servingSize?: string;
  variants?: BrandItemVariant[];
  tags: string[];
  basePricesPaise: {
    zomato: number;
    swiggy: number;
    toing?: number;
  };
  isDemoData?: boolean;
}

export interface BrandPlatformQuote {
  platform: PlatformType;
  platformDisplayName: string;
  platformColor: string;
  platformLogoUrl?: string;

  // Identity and matching
  brandId: string;
  brandName: string;
  itemId: string;
  itemName: string;
  selectedVariant?: string;

  // Matching & Availability
  matchingStatus: BrandMatchingStatus;
  matchingStatusLabel: string;
  isAvailable: boolean;
  unavailabilityReason?: string;

  // Pricing (Integer Paise)
  basePricePaise: number;
  isUserEnteredPrice?: boolean;
  priceProvenance?: PriceProvenance;
  priceProvenanceLabel?: string;
  packagingFeePaise: number | null;
  deliveryFeePaise: number | null;
  platformFeePaise: number | null;
  taxesPaise: number | null;
  surgeFeePaise: number | null;

  hasEstimatedFees?: boolean;
  estimatedFeeLabels?: string[];

  appliedCoupon: CouponRule | null;
  couponDiscountPaise: number;

  knownFeesTotalPaise: number;
  hasUnknownFees: boolean;
  unknownFeeLabels: string[];
  isProvisional?: boolean;

  finalPricePaise: number;
  deliveryTimeMinutes: number | null;

  // Deep-link / Direct URL
  directOrderUrl: string;
  linkType: 'exact_dish' | 'restaurant_fallback' | 'search_fallback';
  linkTypeLabel: string;

  dataSource: 'live_api' | 'demo_catalog' | 'manual_verification';
}

export interface BrandComparisonResult {
  brand: Brand;
  menuItem: BrandMenuItem;
  selectedVariant?: BrandItemVariant;
  location: LocationContext;
  quotes: BrandPlatformQuote[];
  cheapestQuote: BrandPlatformQuote;
  highestQuote: BrandPlatformQuote;
  savingsPaise: number;
  recommendationReason: string;
  isDefinitiveCheapest: boolean;
  isDemoData?: boolean;
  comparedAt: string;
}

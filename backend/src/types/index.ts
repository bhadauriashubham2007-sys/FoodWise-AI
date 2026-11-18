/**
 * FoodWise AI Core Types
 * 
 * Important Rules:
 * 1. All monetary values are strictly in integer PAISE (1 INR = 100 Paise).
 *    Example: 25000 Paise = ₹250.00.
 * 2. Missing or undisclosed fees MUST be represented as `null` (Unknown), NOT `0` (Free).
 * 3. Never invent live prices; all mock/demo data is explicitly marked.
 */

export type PlatformType = 'zomato' | 'swiggy' | 'toing';

export type DietaryType = 'veg' | 'non-veg' | 'egg' | 'vegan';

export type LinkType = 'exact_dish' | 'restaurant_fallback' | 'search_fallback';

export type PriceProvenance = 'demo_catalogue' | 'live_verified' | 'user_entered' | 'rule_estimated' | 'unknown';

export interface CouponRule {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValuePaise?: number; // For flat discount
  discountPercentage?: number; // e.g. 50 for 50%
  maxDiscountPaise?: number;
  minOrderPaise: number;
  terms: string[];
  isAvailable: boolean;
}

export interface PlatformPriceQuote {
  platform: PlatformType;
  platformDisplayName: string;
  platformColor: string;
  platformLogoUrl?: string;
  
  // Exact item and restaurant identity
  itemId: string;
  itemName: string;
  restaurantId: string;
  restaurantName: string;

  // Link Classification & Verified Source
  linkType: LinkType;
  linkTypeLabel: string;
  directOrderUrl: string;
  sourceUrl?: string;

  // Base item pricing
  basePricePaise: number;
  isUserEnteredPrice?: boolean;
  priceProvenance?: PriceProvenance;
  priceProvenanceLabel?: string;
  
  // Fees - null means UNKNOWN (not disclosed before checkout), 0 means Free
  packagingFeePaise: number | null;
  deliveryFeePaise: number | null;
  platformFeePaise: number | null;
  taxesPaise: number | null;
  surgeFeePaise: number | null;
  
  // Fee provenance indicators
  hasEstimatedFees?: boolean;
  estimatedFeeLabels?: string[];
  
  // Applied Coupon (if any)
  appliedCoupon: CouponRule | null;
  couponDiscountPaise: number;
  
  // Calculated Subtotals & Totals
  knownFeesTotalPaise: number;
  hasUnknownFees: boolean;
  unknownFeeLabels: string[];
  isProvisional?: boolean;
  
  // Final calculated price in integer paise
  finalPricePaise: number;
  
  // Delivery estimation - null means unknown/undisclosed, positive integer > 0 if known
  deliveryTimeMinutes: number | null;

  // Official Destination & App Links
  appLinks?: {
    web: string;
    android?: string;
    ios?: string;
  };

  // Informational note if dish-specific deep link is unsupported
  listingUnavailableMessage?: string;
  
  // Availability status
  isAvailable: boolean;
  unavailabilityReason?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  cuisine: string;
  dietary: DietaryType;
  description: string;
  imageUrl: string;
  restaurantId: string;
  restaurantName: string;
  restaurantRating: number;
  ratingCount: number;
  distanceKm: number;
  city?: string;
  isDemoData?: boolean; // Supports both true (demo catalog) and false (live production records)
  dataProvenance?: 'demo_catalogue' | 'live_verified' | 'unknown';
  quotes: PlatformPriceQuote[];
  cheapestPlatform?: PlatformType;
  cheapestPricePaise?: number;
  maxSavingsPaise?: number;
  isDefinitiveCheapest?: boolean;
  isPriceTie?: boolean;
}

export interface ComparisonResult {
  foodItem: FoodItem;
  cheapestQuote: PlatformPriceQuote;
  highestQuote: PlatformPriceQuote;
  savingsPaise: number;
  comparisonTimestamp: string;
  isDemoData?: boolean; // Supports both true (demo) and false (live records)
  dataProvenance?: 'demo_catalogue' | 'live_verified' | 'unknown';
  recommendationReason: string;
  isDefinitiveCheapest: boolean;
  isPriceTie: boolean;
  tiedPlatforms?: PlatformType[];
  isCityMismatch?: boolean;
  locationMessage?: string;
}

export interface SearchIntent {
  foodKeywords: string[];
  rawQuery: string;
  category?: string;
  cuisine?: string;
  dietary?: DietaryType | 'all';
  maxBudgetRupees?: number;
  maxDistanceKm?: number;
  minRating?: number;
  sortBy?: 'cheapest' | 'rating' | 'fastest' | 'distance' | 'relevance';
  preferredPlatform?: PlatformType | 'all';
  city?: string;
  explanation?: string;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  cuisine?: string;
  dietary?: string;
  maxBudgetPaise?: number;
  platform?: PlatformType | 'all';
  minRating?: number;
  maxDistanceKm?: number;
  sortBy?: 'cheapest' | 'rating' | 'fastest' | 'distance' | 'relevance';
  city?: string;
}

export interface AISearchRequest {
  message: string;
  dietary?: DietaryType | 'all';
  budgetRupees?: number;
  category?: string;
  platform?: PlatformType | 'all';
  sortBy?: 'cheapest' | 'rating' | 'fastest' | 'distance' | 'relevance';
  city?: string;
}

export interface AISearchResponse {
  answer: string;
  intent?: SearchIntent;
  suggestedItems: FoodItem[];
  appliedFilters: {
    budgetPaise?: number;
    dietary?: DietaryType | 'all';
    cuisine?: string;
    category?: string;
    platform?: string;
    sortBy?: string;
  };
  matchedCoupons: CouponRule[];
}

export type LinkDataSource = 'url_parsed' | 'manual_fallback' | 'demo_catalog_match';

export interface LinkExtractionResult {
  url: string;
  sourcePlatform: PlatformType | 'unknown';
  isValidDomain: boolean;
  isAccessible: boolean;
  foodName?: string;
  restaurantName?: string;
  originalPriceRupees?: number;
  confidence: 'high' | 'medium' | 'fallback_required';
  dataSource: LinkDataSource;
  extractionNotes: string;
}

export interface CompareByLinkResponse {
  success: boolean;
  extraction: LinkExtractionResult;
  needsManualInput?: boolean;
  matchedFoodItem?: FoodItem;
  comparison?: ComparisonResult;
  equivalentItems: FoodItem[];
  cheapestQuote?: PlatformPriceQuote;
  highestQuote?: PlatformPriceQuote;
  savingsPaise?: number;
  message: string;
}

export * from './brand.types.js';



export type PlatformType = 'zomato' | 'swiggy' | 'toing';

export type DietaryType = 'veg' | 'non-veg' | 'egg' | 'vegan';

export type LinkType = 'exact_dish' | 'restaurant_fallback' | 'search_fallback';

export type PriceProvenance = 'demo_catalogue' | 'live_verified' | 'user_entered' | 'rule_estimated' | 'unknown';

export interface CouponRule {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValuePaise?: number;
  discountPercentage?: number;
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
  appLinks?: {
    web: string;
    android?: string;
    ios?: string;
  };
  listingUnavailableMessage?: string;
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
  savedDealId?: string;
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

export interface CouponGroup {
  platform: PlatformType;
  coupons: CouponRule[];
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
  explanation?: string;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  cuisine?: string;
  dietary?: string;
  maxBudget?: number;
  platform?: PlatformType | 'all';
  minRating?: number;
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

export type LinkDataSource = 'metadata_scraped' | 'url_parsed' | 'manual_fallback' | 'demo_catalog_match';

export type MatchType = 'exact' | 'close_equivalent' | 'category_match' | 'none';

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
  resolvedUrl?: string;
  isOpaqueAppDeepLink?: boolean;
  isGenericLandingPage?: boolean;
}

export interface CompareByLinkResponse {
  success: boolean;
  extraction: LinkExtractionResult;
  needsManualInput?: boolean;
  matchedFoodItem?: FoodItem;
  matchType?: MatchType;
  matchScore?: number;
  comparison?: ComparisonResult;
  equivalentItems: FoodItem[];
  cheapestQuote?: PlatformPriceQuote;
  highestQuote?: PlatformPriceQuote;
  savingsPaise?: number;
  message: string;
  dataProvenance?: 'demo_catalogue';
  disclosureNote?: string;
}

export interface SavedDeal {
  id: string;
  foodItem: FoodItem;
  cheapestQuote: PlatformPriceQuote;
  savedAt: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  dietaryPreference: 'all' | 'veg' | 'non-veg' | 'egg' | 'vegan';
  preferredPlatform: 'all' | 'zomato' | 'swiggy' | 'toing';
  defaultCity?: string;
  defaultPincode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileUpdateInput {
  fullName?: string;
  dietaryPreference?: 'all' | 'veg' | 'non-veg' | 'egg' | 'vegan';
  preferredPlatform?: 'all' | 'zomato' | 'swiggy' | 'toing';
  defaultCity?: string;
  defaultPincode?: string;
}

export interface SaveDealInput {
  foodItemId: string;
  cheapestPlatformCode: PlatformType;
  cheapestPricePaise: number;
  maxSavingsPaise: number;
  directOrderUrl?: string;
  notes?: string;
}

export interface BackendSavedDeal {
  id: string;
  cheapest_price_paise: number;
  max_savings_paise: number;
  direct_order_url?: string;
  notes?: string;
  created_at: string;
  food_items: {
    id: string;
    slug?: string;
    name: string;
    category: string;
    cuisine: string;
    dietary: string;
    description: string;
    image_url: string;
    restaurants?: {
      name: string;
    };
  };
  platforms: {
    code: PlatformType;
    display_name: string;
    theme_color: string;
  };
}

export * from './brand.types';



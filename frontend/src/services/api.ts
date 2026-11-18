import {
  FoodItem,
  PlatformPriceQuote,
  ComparisonResult,
  CouponGroup,
  SearchFilters,
  AISearchResponse,
  CompareByLinkResponse,
  Brand,
  BrandMenuItem,
  BrandComparisonResult,
  LocationContext,
  UserProfile,
  ProfileUpdateInput,
  SaveDealInput,
  BackendSavedDeal,
} from '../types';

const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
const API_BASE = env?.VITE_API_BASE_URL || '/api';

export async function fetchFoods(filters: SearchFilters = {}, signal?: AbortSignal): Promise<FoodItem[]> {
  const params = new URLSearchParams();
  if (filters.query) params.append('q', filters.query);
  if (filters.category && filters.category !== 'All') params.append('category', filters.category);
  if (filters.cuisine && filters.cuisine !== 'all') params.append('cuisine', filters.cuisine);
  if (filters.dietary && filters.dietary !== 'all') params.append('dietary', filters.dietary);
  if (typeof filters.maxBudget === 'number' && filters.maxBudget > 0) {
    params.append('maxBudget', filters.maxBudget.toString());
  }
  if (filters.platform && filters.platform !== 'all') params.append('platform', filters.platform);
  if (typeof filters.minRating === 'number' && filters.minRating > 0) {
    params.append('minRating', filters.minRating.toString());
  }
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.city) params.append('city', filters.city);

  const res = await fetch(`${API_BASE}/foods?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error('Failed to fetch food items');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchComparison(
  itemId: string,
  coupons?: { zomato?: string; swiggy?: string; toing?: string },
  city?: string,
  signal?: AbortSignal
): Promise<ComparisonResult> {
  const params = new URLSearchParams();
  if (coupons?.zomato) params.append('zomatoCoupon', coupons.zomato);
  if (coupons?.swiggy) params.append('swiggyCoupon', coupons.swiggy);
  if (coupons?.toing) params.append('toingCoupon', coupons.toing);
  if (city) params.append('city', city);

  const res = await fetch(`${API_BASE}/foods/${itemId}/compare?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error('Failed to fetch comparison');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchCoupons(): Promise<CouponGroup[]> {
  const res = await fetch(`${API_BASE}/coupons`);
  if (!res.ok) {
    throw new Error('Failed to fetch coupons');
  }
  const json = await res.json();
  return json.data;
}

export async function queryAI(
  message: string,
  options: {
    dietary?: string;
    budgetRupees?: number;
    category?: string;
    platform?: string;
    sortBy?: string;
    city?: string;
  } = {},
  signal?: AbortSignal
): Promise<AISearchResponse & { aiProvider?: string }> {
  const res = await fetch(`${API_BASE}/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      dietary: options.dietary,
      budgetRupees: options.budgetRupees,
      category: options.category,
      platform: options.platform,
      sortBy: options.sortBy,
      city: options.city,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error('Failed to get AI recommendation');
  }
  const json = await res.json();
  return {
    ...json.data,
    aiProvider: json.aiProvider,
  };
}

export async function compareByLink(
  url: string,
  manualFoodName?: string,
  manualPriceRupees?: number,
  city?: string
): Promise<CompareByLinkResponse> {
  const res = await fetch(`${API_BASE}/compare-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, manualFoodName, manualPriceRupees, city }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || 'Failed to analyze food link');
  }

  return res.json();
}

export async function fetchBrands(category?: string, query?: string): Promise<Brand[]> {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (query) params.append('q', query);

  const res = await fetch(`${API_BASE}/brands?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch food brands');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchBrandById(brandId: string): Promise<Brand> {
  const res = await fetch(`${API_BASE}/brands/${brandId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch brand details');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchBrandMenu(
  brandId: string,
  category?: string,
  query?: string
): Promise<{ brand: Brand; items: BrandMenuItem[] }> {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (query) params.append('q', query);

  const res = await fetch(`${API_BASE}/brands/${brandId}/menu?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch brand menu');
  }
  const json = await res.json();
  return { brand: json.brand, items: json.data };
}

export async function fetchBrandItemComparison(
  brandId: string,
  itemId: string,
  variant?: string,
  location?: LocationContext
): Promise<BrandComparisonResult> {
  const params = new URLSearchParams();
  if (variant) params.append('variant', variant);
  if (location?.city) params.append('city', location.city);
  if (location?.pincode) params.append('pincode', location.pincode);
  if (location?.distanceKm) params.append('distanceKm', location.distanceKm.toString());

  const res = await fetch(
    `${API_BASE}/brands/${brandId}/items/${itemId}/compare?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error('Failed to compare brand item');
  }
  const json = await res.json();
  return json.data;
}

// ============================================================================
// Authenticated User Profile Endpoints
// ============================================================================

export async function getUserProfile(userId: string, token: string): Promise<UserProfile | null> {
  if (!userId || !token) {
    throw new Error('User ID and Bearer authentication token are required to fetch user profile.');
  }

  const res = await fetch(`${API_BASE}/database/profile/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to fetch profile (status: ${res.status})`);
  }

  const json = await res.json();
  const data = json.data;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    dietaryPreference: data.dietary_preference || 'all',
    preferredPlatform: data.preferred_platform || 'all',
    defaultCity: data.default_city,
    defaultPincode: data.default_pincode,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateUserProfile(
  userId: string,
  updates: ProfileUpdateInput,
  token: string
): Promise<UserProfile> {
  if (!userId || !token) {
    throw new Error('User ID and Bearer authentication token are required to update user profile.');
  }

  const res = await fetch(`${API_BASE}/database/profile/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to update profile (status: ${res.status})`);
  }

  const json = await res.json();
  const data = json.data;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    dietaryPreference: data.dietary_preference || 'all',
    preferredPlatform: data.preferred_platform || 'all',
    defaultCity: data.default_city,
    defaultPincode: data.default_pincode,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ============================================================================
// Authenticated Saved Deals Endpoints
// ============================================================================

export async function getSavedDeals(userId: string, token: string): Promise<BackendSavedDeal[]> {
  if (!userId || !token) {
    throw new Error('User ID and Bearer authentication token are required to fetch saved deals.');
  }

  const res = await fetch(`${API_BASE}/database/deals/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to fetch saved deals (status: ${res.status})`);
  }

  const json = await res.json();
  return json.data || [];
}

export async function saveDeal(
  userId: string,
  deal: SaveDealInput,
  token: string
): Promise<BackendSavedDeal> {
  if (!userId || !token) {
    throw new Error('User ID and Bearer authentication token are required to save deal.');
  }

  const res = await fetch(`${API_BASE}/database/deals/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deal),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to save deal bookmark (status: ${res.status})`);
  }

  const json = await res.json();
  return json.data;
}

export async function deleteSavedDeal(
  userId: string,
  dealId: string,
  token: string
): Promise<boolean> {
  if (!userId || !dealId || !token) {
    throw new Error(
      'User ID, deal ID, and Bearer authentication token are required to delete saved deal.'
    );
  }

  const res = await fetch(
    `${API_BASE}/database/deals/${encodeURIComponent(userId)}/${encodeURIComponent(dealId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Failed to delete saved deal (status: ${res.status})`);
  }

  const json = await res.json();
  return Boolean(json.success);
}

/**
 * Transforms a backend database saved_deal record into a frontend FoodItem.
 */
export function backendDealToFoodItem(deal: BackendSavedDeal): FoodItem {
  const cheapestPlatform = deal.platforms?.code || 'zomato';
  const platformName =
    deal.platforms?.display_name ||
    (cheapestPlatform === 'swiggy' ? 'Swiggy' : cheapestPlatform === 'toing' ? 'Toing' : 'Zomato');
  const platformColor =
    deal.platforms?.theme_color ||
    (cheapestPlatform === 'swiggy' ? '#FC8019' : cheapestPlatform === 'toing' ? '#00B159' : '#E23744');

  const foodItemData = deal.food_items || ({} as any);
  const resolvedFoodId = foodItemData.slug || foodItemData.id || deal.id;

  const quote: PlatformPriceQuote = {
    platform: cheapestPlatform,
    platformDisplayName: platformName,
    platformColor: platformColor,
    itemId: foodItemData.id || resolvedFoodId,
    itemName: foodItemData.name || 'Saved Dish',
    restaurantId: 'rest-default',
    restaurantName: foodItemData.restaurants?.name || 'Restaurant',
    linkType: 'exact_dish',
    linkTypeLabel: 'Direct Link',
    directOrderUrl: deal.direct_order_url || '#',
    basePricePaise: deal.cheapest_price_paise,
    packagingFeePaise: 0,
    deliveryFeePaise: 0,
    platformFeePaise: 0,
    taxesPaise: 0,
    surgeFeePaise: 0,
    appliedCoupon: null,
    couponDiscountPaise: 0,
    knownFeesTotalPaise: 0,
    hasUnknownFees: false,
    unknownFeeLabels: [],
    finalPricePaise: deal.cheapest_price_paise,
    deliveryTimeMinutes: 30,
    isAvailable: true,
  };

  return {
    id: resolvedFoodId,
    name: foodItemData.name || 'Saved Dish',
    category: foodItemData.category || 'General',
    cuisine: foodItemData.cuisine || 'Multi-cuisine',
    dietary: (foodItemData.dietary as any) || 'veg',
    description: foodItemData.description || '',
    imageUrl:
      foodItemData.image_url ||
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    restaurantId: 'rest-default',
    restaurantName: foodItemData.restaurants?.name || 'Restaurant',
    restaurantRating: 4.5,
    ratingCount: 100,
    distanceKm: 2.0,
    quotes: [quote],
    cheapestPlatform: cheapestPlatform,
    cheapestPricePaise: deal.cheapest_price_paise,
    maxSavingsPaise: deal.max_savings_paise || 0,
    savedDealId: deal.id,
  };
}

import {
  getSupabaseClient,
  getSupabaseAdminClient,
  isSupabaseConfigured,
  getSafeEnvVerification,
} from '../config/supabase.js';
import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { DEMO_FOOD_ITEMS } from '../data/demoData.js';
import {
  isKnownCatalogueSlug,
  isKnownCatalogueUuid,
  getCatalogueMappingBySlug,
  getCatalogueMappingByUuid,
} from '../data/catalogueRegistry.js';
import { INDIAN_BRANDS } from '../data/brandCatalog.js';
import { PlatformType, Brand } from '../types/index.js';

export const EXPECTED_SCHEMA_TABLES = [
  'profiles',
  'platforms',
  'restaurants',
  'food_items',
  'price_snapshots',
  'coupons',
  'coupon_rules',
  'search_sessions',
  'comparisons',
  'comparison_items',
  'saved_deals',
] as const;

export type SchemaTableName = (typeof EXPECTED_SCHEMA_TABLES)[number];

export interface DetailedHealthStatus {
  connected: boolean;
  status: 'connected' | 'unconfigured' | 'connection_error' | 'tables_missing';
  mode: 'supabase' | 'in_memory_fallback';
  message: string;
  latencyMs: number | null;
  timestamp: string;
  env: {
    envFile: string;
    supabaseUrlPresent: boolean;
    anonKeyPresent: boolean;
    serviceRoleKeyPresent: boolean;
    isConfigured: boolean;
  };
  tables: {
    totalExpected: number;
    existingCount: number;
    missingCount: number;
    existingTables: string[];
    missingTables: string[];
    allTablesPresent: boolean;
  };
}

export interface SaveDealInput {
  foodItemId: string;
  cheapestPlatformCode: PlatformType;
  cheapestPricePaise: number;
  maxSavingsPaise: number;
  directOrderUrl?: string;
  notes?: string;
}

export interface RecordComparisonInput {
  sessionId?: string;
  foodItemId: string;
  cheapestPlatformCode: PlatformType;
  cheapestPricePaise: number;
  highestPricePaise: number;
  savingsPaise: number;
  recommendationReason?: string;
  quotes: Array<{
    platform: PlatformType;
    basePricePaise: number;
    packagingFeePaise: number | null;
    deliveryFeePaise: number | null;
    platformFeePaise: number | null;
    taxesPaise: number | null;
    surgeFeePaise: number | null;
    couponDiscountPaise: number;
    knownFeesTotalPaise: number;
    finalPricePaise: number;
    deliveryTimeMinutes?: number | null;
    directOrderUrl: string;
    linkType: string;
    isAvailable: boolean;
  }>;
}

export class DatabaseService {
  /**
   * Safely probes each of the 11 expected schema tables using .select('*').limit(0).
   * Does NOT fetch or expose database records.
   * Reports exact names of any missing tables.
   */
  async verifyTables(client: SupabaseClient): Promise<{
    existingTables: string[];
    missingTables: string[];
    allTablesPresent: boolean;
  }> {
    const existingTables: string[] = [];
    const missingTables: string[] = [];

    await Promise.all(
      EXPECTED_SCHEMA_TABLES.map(async (tableName) => {
        try {
          const { error } = await client.from(tableName).select('*').limit(0);
          if (error) {
            const msg = (error.message || '').toLowerCase();
            const code = error.code || '';
            if (
              code === '42P01' ||
              code === 'PGRST200' ||
              code === 'PGRST204' ||
              msg.includes('relation') ||
              msg.includes('does not exist') ||
              msg.includes('could not find')
            ) {
              missingTables.push(tableName);
            } else {
              // If error is an RLS check or permission, the table exists
              existingTables.push(tableName);
            }
          } else {
            existingTables.push(tableName);
          }
        } catch {
          missingTables.push(tableName);
        }
      })
    );

    existingTables.sort();
    missingTables.sort();

    return {
      existingTables,
      missingTables,
      allTablesPresent: missingTables.length === 0,
    };
  }

  /**
   * Performs a comprehensive, safe health check.
   * Tests database connectivity without exposing secrets or data records.
   * Inspects and reports missing tables.
   */
  async healthCheck(): Promise<DetailedHealthStatus> {
    const timestamp = new Date().toISOString();
    const envVerification = getSafeEnvVerification();

    const envSummary = {
      envFile: envVerification.envFilePath,
      supabaseUrlPresent: envVerification.supabaseUrl.present,
      anonKeyPresent: envVerification.supabaseAnonKey.present,
      serviceRoleKeyPresent: envVerification.supabaseServiceRoleKey.present,
      isConfigured: envVerification.isReadyForConnection,
    };

    if (!isSupabaseConfigured()) {
      return {
        connected: false,
        status: 'unconfigured',
        mode: 'in_memory_fallback',
        message:
          'Supabase credentials in backend/.env are unconfigured or placeholders. Operating in local demo dataset mode.',
        latencyMs: null,
        timestamp,
        env: envSummary,
        tables: {
          totalExpected: EXPECTED_SCHEMA_TABLES.length,
          existingCount: 0,
          missingCount: EXPECTED_SCHEMA_TABLES.length,
          existingTables: [],
          missingTables: [...EXPECTED_SCHEMA_TABLES],
          allTablesPresent: false,
        },
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        connected: false,
        status: 'unconfigured',
        mode: 'in_memory_fallback',
        message: 'Supabase client instance not available.',
        latencyMs: null,
        timestamp,
        env: envSummary,
        tables: {
          totalExpected: EXPECTED_SCHEMA_TABLES.length,
          existingCount: 0,
          missingCount: EXPECTED_SCHEMA_TABLES.length,
          existingTables: [],
          missingTables: [...EXPECTED_SCHEMA_TABLES],
          allTablesPresent: false,
        },
      };
    }

    try {
      const startTime = Date.now();
      const { existingTables, missingTables, allTablesPresent } = await this.verifyTables(client);
      const latencyMs = Date.now() - startTime;

      if (existingTables.length === 0 && missingTables.length === EXPECTED_SCHEMA_TABLES.length) {
        // Test if this is a connection/auth failure rather than missing tables
        const { error: pingError } = await client.from('platforms').select('*').limit(0);
        const msg = (pingError?.message || '').toLowerCase();
        const isAuthOrNetworkError =
          pingError &&
          !msg.includes('relation') &&
          !msg.includes('does not exist') &&
          !msg.includes('could not find');

        if (isAuthOrNetworkError) {
          return {
            connected: false,
            status: 'connection_error',
            mode: 'in_memory_fallback',
            message: `Database connection failed: ${pingError?.message}`,
            latencyMs,
            timestamp,
            env: envSummary,
            tables: {
              totalExpected: EXPECTED_SCHEMA_TABLES.length,
              existingCount: 0,
              missingCount: EXPECTED_SCHEMA_TABLES.length,
              existingTables: [],
              missingTables: [...EXPECTED_SCHEMA_TABLES],
              allTablesPresent: false,
            },
          };
        }
      }

      if (allTablesPresent) {
        return {
          connected: true,
          status: 'connected',
          mode: 'supabase',
          message: `Successfully connected to Supabase! All ${EXPECTED_SCHEMA_TABLES.length} schema tables verified.`,
          latencyMs,
          timestamp,
          env: envSummary,
          tables: {
            totalExpected: EXPECTED_SCHEMA_TABLES.length,
            existingCount: existingTables.length,
            missingCount: 0,
            existingTables,
            missingTables: [],
            allTablesPresent: true,
          },
        };
      } else {
        return {
          connected: true,
          status: 'tables_missing',
          mode: 'supabase',
          message: `Connected to Supabase, but ${missingTables.length} table(s) are missing. Run database/schema.sql in the Supabase SQL Editor.`,
          latencyMs,
          timestamp,
          env: envSummary,
          tables: {
            totalExpected: EXPECTED_SCHEMA_TABLES.length,
            existingCount: existingTables.length,
            missingCount: missingTables.length,
            existingTables,
            missingTables,
            allTablesPresent: false,
          },
        };
      }
    } catch (err: any) {
      return {
        connected: false,
        status: 'connection_error',
        mode: 'in_memory_fallback',
        message: `Database connection error: ${err.message || 'Unknown network error'}`,
        latencyMs: null,
        timestamp,
        env: envSummary,
        tables: {
          totalExpected: EXPECTED_SCHEMA_TABLES.length,
          existingCount: 0,
          missingCount: EXPECTED_SCHEMA_TABLES.length,
          existingTables: [],
          missingTables: [...EXPECTED_SCHEMA_TABLES],
          allTablesPresent: false,
        },
      };
    }
  }

  /**
   * Retrieves active delivery platforms (Zomato, Swiggy, Toing).
   */
  async getPlatforms() {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (!error && data && data.length > 0) {
        return data;
      }
    }

    // Fallback to verified platform definitions
    return [
      {
        code: 'zomato',
        display_name: 'Zomato',
        theme_color: '#E23744',
        website_url: 'https://www.zomato.com/',
        base_delivery_fee_paise: 3500,
        default_platform_fee_paise: 600,
      },
      {
        code: 'swiggy',
        display_name: 'Swiggy',
        theme_color: '#FC8019',
        website_url: 'https://www.swiggy.com/',
        base_delivery_fee_paise: 4000,
        default_platform_fee_paise: 700,
      },
      {
        code: 'toing',
        display_name: 'Toing',
        theme_color: '#00B159',
        website_url: 'https://www.toingit.com/',
        base_delivery_fee_paise: null,
        default_platform_fee_paise: null,
      },
    ];
  }

  /**
   * Retrieves restaurants or brand chains.
   */
  async getRestaurants(options?: { city?: string; isBrand?: boolean }) {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      let query = client.from('restaurants').select('*');
      if (options?.city) {
        query = query.ilike('city', `%${options.city}%`);
      }
      if (options?.isBrand !== undefined) {
        query = query.eq('is_brand', options.isBrand);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    }

    return INDIAN_BRANDS.map((b: Brand) => ({
      slug: b.id,
      name: b.name,
      cuisine: b.category,
      rating: 4.4,
      city: 'Bengaluru',
      is_brand: true,
      outlet_count_india: b.outletCountIndia,
    }));
  }

  /**
   * Logs an AI search query along with its Gemini-extracted intent for session analytics.
   */
  async recordSearchSession(data: {
    rawQuery: string;
    extractedIntent?: any;
    matchedKeywords?: string[];
    dietaryFilter?: string;
    budgetPaise?: number;
    selectedPlatform?: string;
    resultsCount: number;
    userId?: string;
  }) {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data: record, error } = await client
        .from('search_sessions')
        .insert({
          user_id: data.userId || null,
          raw_query: data.rawQuery,
          extracted_intent: data.extractedIntent || {},
          matched_keywords: data.matchedKeywords || [],
          dietary_filter: data.dietaryFilter || null,
          budget_paise: data.budgetPaise || null,
          selected_platform: data.selectedPlatform || null,
          results_count: data.resultsCount,
        })
        .select()
        .single();

      if (error) {
        console.warn('[DatabaseService] Failed to record search session:', error.message);
        return null;
      }
      return record;
    } catch (err: any) {
      console.warn('[DatabaseService] Error recording search session:', err.message);
      return null;
    }
  }

  /**
   * Records a completed multi-platform comparison and its constituent platform quotes.
   */
  async recordComparison(input: RecordComparisonInput) {
    const admin = getSupabaseAdminClient() || getSupabaseClient();
    if (!admin || !isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data: platformData } = await admin
        .from('platforms')
        .select('id')
        .eq('code', input.cheapestPlatformCode)
        .maybeSingle();

      const { data: comparison, error: compErr } = await admin
        .from('comparisons')
        .insert({
          session_id: input.sessionId || null,
          food_item_id: input.foodItemId,
          cheapest_platform_id: platformData?.id || null,
          cheapest_price_paise: input.cheapestPricePaise,
          highest_price_paise: input.highestPricePaise,
          savings_paise: input.savingsPaise,
          recommendation_reason: input.recommendationReason || null,
          is_demo_data: true,
        })
        .select()
        .single();

      if (compErr || !comparison) {
        console.warn('[DatabaseService] Error creating comparison:', compErr?.message);
        return null;
      }

      const { data: allPlatforms } = await admin.from('platforms').select('id, code');
      const platformMap = new Map((allPlatforms || []).map((p: any) => [p.code, p.id]));

      const itemsToInsert = input.quotes
        .filter((q) => platformMap.has(q.platform))
        .map((q) => ({
          comparison_id: comparison.id,
          platform_id: platformMap.get(q.platform),
          base_price_paise: q.basePricePaise,
          packaging_fee_paise: q.packagingFeePaise,
          delivery_fee_paise: q.deliveryFeePaise,
          platform_fee_paise: q.platformFeePaise,
          taxes_paise: q.taxesPaise,
          surge_fee_paise: q.surgeFeePaise,
          coupon_discount_paise: q.couponDiscountPaise,
          known_fees_total_paise: q.knownFeesTotalPaise,
          final_price_paise: q.finalPricePaise,
          delivery_time_minutes: (q.deliveryTimeMinutes && q.deliveryTimeMinutes > 0) ? q.deliveryTimeMinutes : null,
          link_type: q.linkType,
          direct_order_url: q.directOrderUrl,
          is_available: q.isAvailable,
        }));

      if (itemsToInsert.length > 0) {
        await admin.from('comparison_items').insert(itemsToInsert);
      }

      return comparison;
    } catch (err: any) {
      console.warn('[DatabaseService] Error recording comparison quotes:', err.message);
      return null;
    }
  }

  /**
   * Retrieves all saved deals for an authenticated user.
   * Requires a valid user-scoped Supabase client. Fails closed if missing.
   * Never falls back to anonymous or admin clients.
   */
  async getSavedDeals(userId: string, userClient: SupabaseClient) {
    if (!userClient) {
      throw new Error('Authentication required: A valid user-scoped Supabase client must be provided for getSavedDeals.');
    }
    if (!userId) {
      return [];
    }

    try {
      const { data, error } = await userClient
        .from('saved_deals')
        .select(`
          id,
          cheapest_price_paise,
          max_savings_paise,
          direct_order_url,
          notes,
          created_at,
          food_items (
            id,
            slug,
            name,
            category,
            cuisine,
            dietary,
            description,
            image_url,
            restaurants (
              name
            )
          ),
          platforms (
            code,
            display_name,
            theme_color
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[DatabaseService] Error fetching saved deals:', error.message);
        return [];
      }
      return data || [];
    } catch (err: any) {
      console.warn('[DatabaseService] Error in getSavedDeals:', err.message);
      return [];
    }
  }

  /**
   * Resolves a catalogue identifier (slug or UUID) to a verified database food_items record.
   * Guarantees that:
   * 1. Slugs are resolved to actual database UUIDs.
   * 2. Raw slug strings are never passed into UUID columns.
   * 3. Fake UUIDs are never created for nonexistent food records.
   * 4. Unknown catalogue items or unseeded database items fail with clear, descriptive errors.
   */
  async resolveFoodItem(
    identifier: string,
    userClient: SupabaseClient
  ): Promise<{ id: string; slug: string; name: string }> {
    if (!userClient) {
      throw new Error('Authentication required: A valid user-scoped Supabase client must be provided for resolveFoodItem.');
    }
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Missing required field: foodItemId');
    }

    const trimmed = identifier.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    // 1. If identifier is a UUID format, query database primary key `id`
    if (isUuid) {
      const { data, error } = await userClient
        .from('food_items')
        .select('id, slug, name')
        .eq('id', trimmed)
        .maybeSingle();

      if (!error && data) {
        return { id: data.id, slug: data.slug, name: data.name };
      }
    }

    // 2. Query database by `slug`
    const { data: bySlug, error: slugErr } = await userClient
      .from('food_items')
      .select('id, slug, name')
      .eq('slug', trimmed)
      .maybeSingle();

    if (!slugErr && bySlug) {
      return { id: bySlug.id, slug: bySlug.slug, name: bySlug.name };
    }

    // 3. Not found in database: verify whether it is a known catalogue item
    const isKnown = isKnownCatalogueSlug(trimmed) || (isUuid && isKnownCatalogueUuid(trimmed));

    if (!isKnown) {
      throw new Error(`Catalogue item '${trimmed}' was not found in the FoodWise catalogue.`);
    }

    // Known in catalogue, but missing from database food_items table
    const mapping = getCatalogueMappingBySlug(trimmed) || (isUuid ? getCatalogueMappingByUuid(trimmed) : undefined);
    const itemName = mapping ? ` (${mapping.name})` : '';
    throw new Error(
      `Database record missing: Food item '${trimmed}'${itemName} exists in the catalogue but has not been seeded into the database food_items table. Please run the seed migration.`
    );
  }

  /**
   * Saves or bookmarks a deal for an authenticated user.
   * Requires a valid user-scoped Supabase client. Fails closed if missing.
   * Never falls back to anonymous or admin clients.
   */
  async saveDeal(userId: string, input: SaveDealInput, userClient: SupabaseClient) {
    if (!userClient) {
      throw new Error('Authentication required: A valid user-scoped Supabase client must be provided for saveDeal.');
    }
    if (!userId) {
      return null;
    }

    try {
      // 1. Resolve catalogue slug or UUID to a verified database record
      const foodItem = await this.resolveFoodItem(input.foodItemId, userClient);

      // 2. Look up platform record
      const { data: platform } = await userClient
        .from('platforms')
        .select('id')
        .eq('code', input.cheapestPlatformCode)
        .single();

      if (!platform) {
        throw new Error(`Platform code '${input.cheapestPlatformCode}' not found`);
      }

      // 3. Upsert bookmark using verified database UUID
      const { data, error } = await userClient
        .from('saved_deals')
        .upsert(
          {
            user_id: userId,
            food_item_id: foodItem.id, // Strictly verified database UUID
            cheapest_platform_id: platform.id,
            cheapest_price_paise: input.cheapestPricePaise,
            max_savings_paise: input.maxSavingsPaise || 0,
            direct_order_url: input.directOrderUrl || null,
            notes: input.notes || null,
          },
          { onConflict: 'user_id, food_item_id' }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err: any) {
      console.error('[DatabaseService] Error saving deal:', err.message);
      throw err;
    }
  }

  /**
   * Deletes a saved deal for an authenticated user.
   * Requires a valid user-scoped Supabase client. Fails closed if missing.
   * Never falls back to anonymous or admin clients.
   */
  async deleteSavedDeal(userId: string, dealId: string, userClient: SupabaseClient): Promise<boolean> {
    if (!userClient) {
      throw new Error('Authentication required: A valid user-scoped Supabase client must be provided for deleteSavedDeal.');
    }
    if (!userId || !dealId) {
      return false;
    }

    try {
      const { error } = await userClient
        .from('saved_deals')
        .delete()
        .eq('id', dealId)
        .eq('user_id', userId);

      return !error;
    } catch (err: any) {
      console.error('[DatabaseService] Error deleting saved deal:', err.message);
      return false;
    }
  }

  /**
   * Retrieves user delivery and dietary profile.
   * Requires a valid user-scoped Supabase client. Fails closed if missing.
   * Never falls back to anonymous or admin clients.
   */
  async getUserProfile(userId: string, userClient: SupabaseClient) {
    if (!userClient) {
      throw new Error('Authentication required: A valid user-scoped Supabase client must be provided for getUserProfile.');
    }
    if (!userId) {
      return null;
    }

    try {
      const { data, error } = await userClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[DatabaseService] Error fetching user profile:', error.message);
        return null;
      }

      if (data) {
        return data;
      }

      // If profile row doesn't exist yet, lazily create it from auth metadata
      try {
        if (typeof userClient.auth?.getUser === 'function') {
          const { data: authData } = await userClient.auth.getUser();
          const user = authData?.user;
          if (user && user.id === userId) {
            const fallbackName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'Foodie Friend';

            const { data: createdProfile, error: insertError } = await userClient
              .from('profiles')
              .upsert(
                {
                  id: userId,
                  email: user.email,
                  full_name: fallbackName,
                  avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                  dietary_preference: 'all',
                  preferred_platform: 'all',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
              )
              .select()
              .single();

            if (!insertError && createdProfile) {
              return createdProfile;
            }
          }
        }
      } catch (err: any) {
        console.warn('[DatabaseService] Lazy profile provisioning failed:', err.message);
      }

      return null;
    } catch (err: any) {
      console.warn('[DatabaseService] Error in getUserProfile:', err.message);
      return null;
    }
  }

  /**
   * Updates user delivery preferences using atomic upsert.
   * Ensures missing profile rows are created instead of throwing 0-row update errors.
   * Requires a valid user-scoped Supabase client. Fails closed if missing.
   * Never falls back to anonymous or admin clients.
   */
  async updateUserProfile(
    userId: string,
    updates: {
      fullName?: string;
      dietaryPreference?: 'all' | 'veg' | 'non-veg' | 'egg' | 'vegan';
      preferredPlatform?: 'all' | 'zomato' | 'swiggy' | 'toing';
      defaultCity?: string;
      defaultPincode?: string;
    },
    userClient: SupabaseClient
  ) {
    if (!userClient) {
      throw new Error('Authentication required: A valid user-scoped Supabase client must be provided for updateUserProfile.');
    }
    if (!userId) {
      return null;
    }

    try {
      const payload: Record<string, any> = {
        id: userId,
        updated_at: new Date().toISOString(),
      };

      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.dietaryPreference !== undefined) payload.dietary_preference = updates.dietaryPreference;
      if (updates.preferredPlatform !== undefined) payload.preferred_platform = updates.preferredPlatform;
      if (updates.defaultCity !== undefined) payload.default_city = updates.defaultCity;
      if (updates.defaultPincode !== undefined) payload.default_pincode = updates.defaultPincode;

      const { data, error } = await userClient
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err: any) {
      console.error('[DatabaseService] Error updating user profile:', err.message);
      throw err;
    }
  }

  /**
   * Generates a cryptographically secure random share token with 256 bits of entropy.
   * Produces 64 hexadecimal characters.
   */
  generateSecureShareToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Retrieves a shared comparison and its items using secure 256-bit token RPC v2 functions.
   * Exclusively uses getSupabaseAdminClient() with the service_role key to prevent rate-limit bypass.
   * Direct invocation via anonymous/authenticated clients is blocked at the database level.
   * Never exposes private creator UUIDs, session IDs, or share tokens.
   */
  async getSharedComparison(token: string): Promise<{
    comparison: any | null;
    items: any[];
  } | null> {
    // Validate 256 bits of entropy: exactly 64 hexadecimal characters.
    // Do not trim: strictly reject leading or trailing whitespace rather than silently accepting it.
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return null;
    }

    const admin = getSupabaseAdminClient();
    if (admin && isSupabaseConfigured()) {
      try {
        const { data: compData, error: compErr } = await admin.rpc(
          'get_comparison_by_share_token_v2',
          { p_token: token }
        );

        if (compErr || !compData || compData.length === 0) {
          return null;
        }

        const { data: itemsData, error: itemsErr } = await admin.rpc(
          'get_comparison_items_by_share_token_v2',
          { p_token: token }
        );

        return {
          comparison: compData[0],
          items: itemsErr ? [] : (itemsData || []),
        };
      } catch (err: any) {
        console.warn('[DatabaseService] Error calling share token RPC v2 via service_role:', err.message);
        return null;
      }
    }

    return null;
  }
}

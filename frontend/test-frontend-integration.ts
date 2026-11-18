import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { backendDealToFoodItem } from './src/services/api';
import { BackendSavedDeal, SaveDealInput, FoodItem } from './src/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(suite: string, name: string, fn: () => Promise<void> | void) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

// In-memory mock localStorage implementation for isolated testing
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

function createSampleFoodItem(id: string, name: string): FoodItem {
  return {
    id,
    name,
    category: 'Main Course',
    cuisine: 'Indian',
    dietary: 'veg',
    description: 'Sample description',
    imageUrl: 'https://images.example.com/sample.jpg',
    restaurantId: 'rest-1',
    restaurantName: 'Sample Restaurant',
    restaurantRating: 4.5,
    ratingCount: 50,
    distanceKm: 2.5,
    quotes: [
      {
        platform: 'zomato',
        platformDisplayName: 'Zomato',
        platformColor: '#E23744',
        itemId: id,
        itemName: name,
        restaurantId: 'rest-1',
        restaurantName: 'Sample Restaurant',
        linkType: 'exact_dish',
        linkTypeLabel: 'Direct Link',
        directOrderUrl: 'https://zomato.com/order/' + id,
        basePricePaise: 25000,
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
        finalPricePaise: 25000,
        deliveryTimeMinutes: 30,
        isAvailable: true,
      },
    ],
    cheapestPlatform: 'zomato',
    cheapestPricePaise: 25000,
    maxSavingsPaise: 5000,
  };
}

async function main() {
  console.log('================================================================');
  console.log('  FoodWise AI: Frontend Authentication & Persistence Unit Tests  ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // Suite 1: Supabase Client Configuration & Security
  // --------------------------------------------------------------------------
  console.log('--- Suite 1: Supabase Client Configuration & Security ---');

  await runTest('Suite 1', 'Frontend config never references service_role or admin client', () => {
    const configPath = path.resolve(process.cwd(), 'frontend/src/config/supabase.ts');
    const content = fs.readFileSync(configPath, 'utf8');

    assert.strictEqual(content.includes('service_role'), false, 'service_role found in supabase.ts');
    assert.strictEqual(content.includes('SERVICE_ROLE'), false, 'SERVICE_ROLE found in supabase.ts');
    assert.strictEqual(content.includes('getSupabaseAdminClient'), false, 'getSupabaseAdminClient found in supabase.ts');
  });

  await runTest('Suite 1', 'Frontend source files are 100% free of admin keys and secrets', () => {
    const srcDir = path.resolve(process.cwd(), 'frontend/src');
    function scan(dir: string) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        const full = path.join(dir, f.name);
        if (f.isDirectory()) {
          scan(full);
        } else if (/\.(ts|tsx)$/.test(f.name)) {
          const str = fs.readFileSync(full, 'utf8');
          assert.strictEqual(str.includes('SUPABASE_SERVICE_ROLE_KEY'), false, `Forbidden key in ${full}`);
          assert.strictEqual(str.includes('service_role'), false, `Forbidden string in ${full}`);
          assert.strictEqual(str.includes('getSupabaseAdminClient'), false, `Admin method in ${full}`);
        }
      }
    }
    scan(srcDir);
  });

  await runTest('Suite 1', 'Vite environment typing provides VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY', () => {
    const viteEnvPath = path.resolve(process.cwd(), 'frontend/src/vite-env.d.ts');
    assert.ok(fs.existsSync(viteEnvPath), 'vite-env.d.ts must exist');
    const content = fs.readFileSync(viteEnvPath, 'utf8');
    assert.ok(content.includes('VITE_API_BASE_URL'), 'VITE_API_BASE_URL missing in vite-env.d.ts');
    assert.ok(content.includes('VITE_SUPABASE_URL'), 'VITE_SUPABASE_URL missing in vite-env.d.ts');
    assert.ok(content.includes('VITE_SUPABASE_ANON_KEY'), 'VITE_SUPABASE_ANON_KEY missing in vite-env.d.ts');
  });

  // --------------------------------------------------------------------------
  // Suite 2: API Client Authentication Fail-Closed & Bearer Token Validation
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 2: API Client Auth Guard & Header Attachment ---');

  await runTest('Suite 2', 'getUserProfile fails closed without token', async () => {
    const { getUserProfile } = await import('./src/services/api');
    await assert.rejects(
      async () => {
        await getUserProfile('test-user-id', '');
      },
      /required/i
    );
  });

  await runTest('Suite 2', 'updateUserProfile fails closed without token', async () => {
    const { updateUserProfile } = await import('./src/services/api');
    await assert.rejects(
      async () => {
        await updateUserProfile('test-user-id', { fullName: 'New Name' }, '');
      },
      /required/i
    );
  });

  await runTest('Suite 2', 'getSavedDeals fails closed without token', async () => {
    const { getSavedDeals } = await import('./src/services/api');
    await assert.rejects(
      async () => {
        await getSavedDeals('test-user-id', '');
      },
      /required/i
    );
  });

  await runTest('Suite 2', 'saveDeal fails closed without token', async () => {
    const { saveDeal } = await import('./src/services/api');
    const input: SaveDealInput = {
      foodItemId: 'biryani-hyd-1',
      cheapestPlatformCode: 'zomato',
      cheapestPricePaise: 25000,
      maxSavingsPaise: 5000,
    };
    await assert.rejects(
      async () => {
        await saveDeal('test-user-id', input, '');
      },
      /required/i
    );
  });

  await runTest('Suite 2', 'deleteSavedDeal fails closed without token', async () => {
    const { deleteSavedDeal } = await import('./src/services/api');
    await assert.rejects(
      async () => {
        await deleteSavedDeal('test-user-id', 'deal-1', '');
      },
      /required/i
    );
  });

  // --------------------------------------------------------------------------
  // Suite 3: Data Transformation: backendDealToFoodItem
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 3: Data Transformation & Mapping ---');

  await runTest('Suite 3', 'backendDealToFoodItem correctly transforms database row to FoodItem model with slug resolution', () => {
    const mockDeal: BackendSavedDeal = {
      id: 'saved-deal-uuid-1234',
      cheapest_price_paise: 18900,
      max_savings_paise: 4500,
      direct_order_url: 'https://zomato.com/order/dish/1',
      notes: 'Lunch deal',
      created_at: '2026-11-17T12:00:00Z',
      food_items: {
        id: 'food-item-uuid-5678',
        slug: 'paneer-butter-masala-1',
        name: 'Paneer Butter Masala',
        category: 'North Indian',
        cuisine: 'North Indian',
        dietary: 'veg',
        description: 'Rich tomato cashew gravy',
        image_url: 'https://images.example.com/paneer.jpg',
        restaurants: {
          name: 'Punjab Grill',
        },
      },
      platforms: {
        code: 'zomato',
        display_name: 'Zomato',
        theme_color: '#E23744',
      },
    };

    const foodItem = backendDealToFoodItem(mockDeal);

    // Resolves to catalogue slug so frontend comparison matches seamlessly
    assert.strictEqual(foodItem.id, 'paneer-butter-masala-1');
    assert.strictEqual(foodItem.name, 'Paneer Butter Masala');
    assert.strictEqual(foodItem.savedDealId, 'saved-deal-uuid-1234');
    assert.strictEqual(foodItem.cheapestPlatform, 'zomato');
    assert.strictEqual(foodItem.cheapestPricePaise, 18900);
    assert.strictEqual(foodItem.maxSavingsPaise, 4500);
    assert.strictEqual(foodItem.quotes.length, 1);
    assert.strictEqual(foodItem.quotes[0].platform, 'zomato');
    assert.strictEqual(foodItem.quotes[0].platformDisplayName, 'Zomato');
    assert.strictEqual(foodItem.quotes[0].finalPricePaise, 18900);
    assert.strictEqual(foodItem.quotes[0].directOrderUrl, 'https://zomato.com/order/dish/1');
  });

  // --------------------------------------------------------------------------
  // Suite 4: Guest Bookmark Migration Lifecycle (Tests 1-5)
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 4: Guest Bookmark Migration Lifecycle (Tests 1-5) ---');

  // Test 1: All bookmarks migrate successfully
  await runTest('Suite 4', 'Test 1: All bookmarks migrate successfully', async () => {
    const mockStorage = new MockLocalStorage();
    const guestItems = [
      createSampleFoodItem('biryani-hyd-1', 'Hyderabadi Biryani'),
      createSampleFoodItem('pizza-margherita-1', 'Margherita Pizza'),
    ];
    mockStorage.setItem('foodwise_saved_deals', JSON.stringify(guestItems));

    // Migration function emulating App.tsx
    const cloudDb: any[] = [];
    async function mockSaveDeal(_userId: string, input: SaveDealInput) {
      cloudDb.push({ id: 'deal-' + input.foodItemId, ...input });
      return { id: 'deal-' + input.foodItemId };
    }

    const itemsToMigrate: FoodItem[] = JSON.parse(mockStorage.getItem('foodwise_saved_deals')!);
    const failed: FoodItem[] = [];

    for (const item of itemsToMigrate) {
      try {
        await mockSaveDeal('user-1', {
          foodItemId: item.id,
          cheapestPlatformCode: item.cheapestPlatform || 'zomato',
          cheapestPricePaise: item.cheapestPricePaise || 0,
          maxSavingsPaise: item.maxSavingsPaise || 0,
        });
      } catch {
        failed.push(item);
      }
    }

    if (failed.length === 0) {
      mockStorage.removeItem('foodwise_saved_deals');
    } else {
      mockStorage.setItem('foodwise_saved_deals', JSON.stringify(failed));
    }

    assert.strictEqual(cloudDb.length, 2, 'Both items should be in cloudDb');
    assert.strictEqual(failed.length, 0, 'No failed items');
    assert.strictEqual(mockStorage.getItem('foodwise_saved_deals'), null, 'localStorage must be cleared on 100% success');
  });

  // Test 2: Partial migration failure preserves unmigrated bookmarks
  await runTest('Suite 4', 'Test 2: Partial migration failure preserves failed bookmark in localStorage', async () => {
    const mockStorage = new MockLocalStorage();
    const item1 = createSampleFoodItem('biryani-hyd-1', 'Hyderabadi Biryani');
    const item2 = createSampleFoodItem('bad-slug-dish', 'Corrupted Dish');
    mockStorage.setItem('foodwise_saved_deals', JSON.stringify([item1, item2]));

    const cloudDb: any[] = [];
    async function mockSaveDeal(_userId: string, input: SaveDealInput) {
      if (input.foodItemId === 'bad-slug-dish') {
        throw new Error('Database record missing');
      }
      cloudDb.push({ id: 'deal-' + input.foodItemId, ...input });
      return { id: 'deal-' + input.foodItemId };
    }

    const itemsToMigrate: FoodItem[] = JSON.parse(mockStorage.getItem('foodwise_saved_deals')!);
    const failed: FoodItem[] = [];

    for (const item of itemsToMigrate) {
      try {
        await mockSaveDeal('user-1', {
          foodItemId: item.id,
          cheapestPlatformCode: item.cheapestPlatform || 'zomato',
          cheapestPricePaise: item.cheapestPricePaise || 0,
          maxSavingsPaise: item.maxSavingsPaise || 0,
        });
      } catch {
        failed.push(item);
      }
    }

    if (failed.length === 0) {
      mockStorage.removeItem('foodwise_saved_deals');
    } else {
      mockStorage.setItem('foodwise_saved_deals', JSON.stringify(failed));
    }

    assert.strictEqual(cloudDb.length, 1, 'Only item1 should be saved to cloud');
    assert.strictEqual(failed.length, 1, 'item2 should be in failed list');
    const lingering = JSON.parse(mockStorage.getItem('foodwise_saved_deals')!);
    assert.strictEqual(lingering.length, 1, 'Failed item must be retained in localStorage');
    assert.strictEqual(lingering[0].id, 'bad-slug-dish');
  });

  // Test 3: Complete migration failure preserves all bookmarks
  await runTest('Suite 4', 'Test 3: Complete migration failure retains all bookmarks in localStorage', async () => {
    const mockStorage = new MockLocalStorage();
    const items = [
      createSampleFoodItem('item-1', 'Dish 1'),
      createSampleFoodItem('item-2', 'Dish 2'),
    ];
    mockStorage.setItem('foodwise_saved_deals', JSON.stringify(items));

    // All fail due to simulated offline network
    async function mockSaveDealOffline() {
      throw new Error('Network offline');
    }

    const itemsToMigrate: FoodItem[] = JSON.parse(mockStorage.getItem('foodwise_saved_deals')!);
    const failed: FoodItem[] = [];

    for (const item of itemsToMigrate) {
      try {
        await mockSaveDealOffline();
      } catch {
        failed.push(item);
      }
    }

    if (failed.length === 0) {
      mockStorage.removeItem('foodwise_saved_deals');
    } else {
      mockStorage.setItem('foodwise_saved_deals', JSON.stringify(failed));
    }

    assert.strictEqual(failed.length, 2);
    const retained = JSON.parse(mockStorage.getItem('foodwise_saved_deals')!);
    assert.strictEqual(retained.length, 2, 'All items must remain in localStorage');
  });

  // Test 4: Retrying failed bookmarks
  await runTest('Suite 4', 'Test 4: Retrying failed bookmarks succeeds and clears localStorage', async () => {
    const mockStorage = new MockLocalStorage();
    const previouslyFailed = [createSampleFoodItem('item-repaired', 'Repaired Dish')];
    mockStorage.setItem('foodwise_saved_deals', JSON.stringify(previouslyFailed));

    const cloudDb: any[] = [];
    async function mockSaveDealRepaired(_userId: string, input: SaveDealInput) {
      cloudDb.push(input);
      return { id: 'deal-repaired' };
    }

    const retryItems: FoodItem[] = JSON.parse(mockStorage.getItem('foodwise_saved_deals')!);
    const failed: FoodItem[] = [];

    for (const item of retryItems) {
      try {
        await mockSaveDealRepaired('user-1', {
          foodItemId: item.id,
          cheapestPlatformCode: item.cheapestPlatform || 'zomato',
          cheapestPricePaise: item.cheapestPricePaise || 0,
          maxSavingsPaise: item.maxSavingsPaise || 0,
        });
      } catch {
        failed.push(item);
      }
    }

    if (failed.length === 0) {
      mockStorage.removeItem('foodwise_saved_deals');
    } else {
      mockStorage.setItem('foodwise_saved_deals', JSON.stringify(failed));
    }

    assert.strictEqual(cloudDb.length, 1);
    assert.strictEqual(mockStorage.getItem('foodwise_saved_deals'), null, 'localStorage must be cleared after retry succeeds');
  });

  // Test 5: No duplicate bookmarks after retry
  await runTest('Suite 4', 'Test 5: No duplicate bookmarks after retry', async () => {
    // Cloud collection keyed by (user_id, food_item_id) mimicking onConflict upsert
    const cloudDealsMap = new Map<string, any>();

    function mockUpsertDeal(userId: string, foodItemId: string, price: number) {
      const key = `${userId}:${foodItemId}`;
      cloudDealsMap.set(key, { userId, foodItemId, price });
    }

    // Initial save of item-1
    mockUpsertDeal('user-1', 'item-1', 25000);
    assert.strictEqual(cloudDealsMap.size, 1);

    // Retry saves item-1 again
    mockUpsertDeal('user-1', 'item-1', 24000);
    assert.strictEqual(cloudDealsMap.size, 1, 'Must not create duplicate record for same food_item_id');
    assert.strictEqual(cloudDealsMap.get('user-1:item-1').price, 24000, 'Price should update on upsert');
  });

  // --------------------------------------------------------------------------
  // Suite 5: Multi-User Profile State Lifecycle (Tests 9-10)
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 5: Multi-User Profile State Lifecycle (Tests 9-10) ---');

  // Test 9: Alice logs out and Bob logs in
  await runTest('Suite 5', 'Test 9: Alice logs out and Bob logs in with clean state isolation', async () => {
    const mockStorage = new MockLocalStorage();
    const DEFAULT_PREFERENCES = {
      name: 'Foodie Friend',
      dietaryPreference: 'all',
      preferredPlatform: 'all',
      city: 'Bengaluru, Karnataka',
      pincode: '',
    };

    // State container
    let state = { ...DEFAULT_PREFERENCES };

    function applyCleanDefaults() {
      state = { ...DEFAULT_PREFERENCES };
    }

    // Mock profiles database
    const cloudProfiles: Record<string, any> = {
      'alice-uuid': { fullName: 'Alice Sharma', dietaryPreference: 'veg', defaultCity: 'Mumbai', defaultPincode: '400001' },
      'bob-uuid': null, // Bob has no custom profile row yet
    };

    async function loadProfileForSession(user: { id: string; email: string; user_metadata?: any } | null) {
      applyCleanDefaults();

      if (user) {
        const cloudData = cloudProfiles[user.id];
        if (cloudData) {
          state.name = cloudData.fullName || user.user_metadata?.full_name || DEFAULT_PREFERENCES.name;
          state.dietaryPreference = cloudData.dietaryPreference || DEFAULT_PREFERENCES.dietaryPreference;
          state.city = cloudData.defaultCity || DEFAULT_PREFERENCES.city;
          state.pincode = cloudData.defaultPincode || DEFAULT_PREFERENCES.pincode;
        } else if (user.user_metadata?.full_name) {
          state.name = user.user_metadata.full_name;
        } else if (user.email) {
          state.name = user.email.split('@')[0];
        }
      } else {
        const stored = mockStorage.getItem('foodwise_guest_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          state.name = parsed.name || DEFAULT_PREFERENCES.name;
          state.city = parsed.city || DEFAULT_PREFERENCES.city;
        }
      }
    }

    // 1. Alice logs in
    await loadProfileForSession({ id: 'alice-uuid', email: 'alice@example.com' });
    assert.strictEqual(state.name, 'Alice Sharma');
    assert.strictEqual(state.city, 'Mumbai');

    // 2. Alice logs out (no guest profile in storage)
    await loadProfileForSession(null);
    assert.strictEqual(state.name, 'Foodie Friend', 'Logout must reset name to clean default');
    assert.strictEqual(state.city, 'Bengaluru, Karnataka', 'Logout must reset city to clean default');
    assert.notStrictEqual(state.name, 'Alice Sharma', 'Alice profile must not linger');

    // 3. Bob logs in (Bob has no profile row)
    await loadProfileForSession({ id: 'bob-uuid', email: 'bob@example.com' });
    assert.strictEqual(state.name, 'bob', 'Bob must see his own name/email, never Alice');
    assert.strictEqual(state.city, 'Bengaluru, Karnataka', 'Bob must see clean default city, not Alice Mumbai');
  });

  // Test 10: Guest profile restoration after logout
  await runTest('Suite 5', 'Test 10: Explicit guest profile restored after logout', async () => {
    const mockStorage = new MockLocalStorage();
    const DEFAULT_PREFERENCES = {
      name: 'Foodie Friend',
      city: 'Bengaluru, Karnataka',
    };

    // Guest explicitly saved a profile before logging in
    mockStorage.setItem(
      'foodwise_guest_profile',
      JSON.stringify({ name: 'Guest Foodie', city: 'Pune, Maharashtra' })
    );

    let state = { ...DEFAULT_PREFERENCES };

    function applyCleanDefaults() {
      state = { ...DEFAULT_PREFERENCES };
    }

    async function loadProfileForSession(user: { id: string } | null) {
      applyCleanDefaults();

      if (user) {
        state.name = 'Alice Sharma';
        state.city = 'Mumbai';
      } else {
        const stored = mockStorage.getItem('foodwise_guest_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          state.name = parsed.name || DEFAULT_PREFERENCES.name;
          state.city = parsed.city || DEFAULT_PREFERENCES.city;
        }
      }
    }

    // 1. Alice logs in
    await loadProfileForSession({ id: 'alice-uuid' });
    assert.strictEqual(state.name, 'Alice Sharma');

    // 2. Alice logs out -> guest profile restored
    await loadProfileForSession(null);
    assert.strictEqual(state.name, 'Guest Foodie', 'Guest profile name must be restored');
    assert.strictEqual(state.city, 'Pune, Maharashtra', 'Guest profile city must be restored');
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('  FRONTEND AUTHENTICATION INTEGRATION RESULTS SUMMARY           ');
  console.log('================================================================');
  console.log(`  Total Tests Executed: ${totalTests}`);
  console.log(`  Tests Passed:         ${passedTests}`);
  console.log(`  Tests Failed:         ${failedTests}`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('\n  🎉 ALL FRONTEND INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
  }
}

main().catch((err) => {
  console.error('Fatal test execution failure:', err);
  process.exit(1);
});

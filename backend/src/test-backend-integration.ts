import http from 'node:http';
import type { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { createCorsMiddleware } from './config/cors.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// Import route modules (matching server.ts exactly without modifying server.ts)
import foodRoutes from './routes/food.routes.js';
import couponRoutes from './routes/coupons.routes.js';
import aiRoutes from './routes/ai.routes.js';
import linkRoutes from './routes/link.routes.js';
import brandRoutes from './routes/brand.routes.js';
import databaseRoutes from './routes/database.routes.js';
import { isSupabaseConfigured, supabaseConfig, getSafeEnvVerification, getSupabaseAdminClient, setAuthVerifierForTesting } from './config/supabase.js';
import { DatabaseService, EXPECTED_SCHEMA_TABLES } from './services/database.service.js';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(suite: string, testName: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      suite,
      testName,
      passed: true,
      durationMs: Date.now() - start,
    });
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err: any) {
    const errDetail = err.cause ? `${err.message} (${err.cause})` : (err.message || String(err));
    results.push({
      suite,
      testName,
      passed: false,
      error: errDetail,
      durationMs: Date.now() - start,
    });
    console.error(`  ❌ [FAIL] ${testName}: ${errDetail}`);
  }
}

// Global collector for HTTP responses to verify zero secret leakage
const collectedHttpResponses: string[] = [];

async function main() {
  console.log('================================================================');
  console.log('  FoodWise AI: Tier A In-Process Backend Integration Test Suite ');
  console.log('================================================================\n');

  // ============================================================================
  // CONTROLLED TEST IDENTITIES & MOCK CLIENT
  // ============================================================================
  const TEST_USERS = {
    alice: {
      token: 'test-token-alice-uuid-1',
      id: 'test-user-uuid-1',
      email: 'alice@example.com',
    },
    bob: {
      token: 'test-token-bob-uuid-2',
      id: 'test-user-uuid-2',
      email: 'bob@example.com',
    },
  };

  interface MockClientOptions {
    seededSlugs?: Set<string>;
    seededUuids?: Set<string>;
  }

  function createMockUserClient(userId: string, options?: MockClientOptions): any {
    const seededSlugs = options?.seededSlugs ?? new Set(['biryani-hyd-1']);
    const seededUuids = options?.seededUuids ?? new Set(['09b52c75-da15-585f-9d5a-44f91f28f4c4']);

    return {
      from: (table: string) => ({
        select: (_cols?: string) => ({
          eq: (field: string, val: any) => ({
            maybeSingle: async () => {
              if (table === 'profiles') {
                return {
                  data: { id: userId, full_name: 'Test User', dietary_preference: 'veg', preferred_platform: 'zomato' },
                  error: null,
                };
              }
              if (table === 'food_items') {
                if (field === 'slug' && seededSlugs.has(val)) {
                  return {
                    data: {
                      id: '09b52c75-da15-585f-9d5a-44f91f28f4c4',
                      slug: val,
                      name: 'Hyderabadi Chicken Dum Biryani',
                    },
                    error: null,
                  };
                }
                if (field === 'id' && seededUuids.has(val)) {
                  return {
                    data: {
                      id: val,
                      slug: 'biryani-hyd-1',
                      name: 'Hyderabadi Chicken Dum Biryani',
                    },
                    error: null,
                  };
                }
                return { data: null, error: null };
              }
              if (table === 'platforms') {
                return {
                  data: { id: 'platform-uuid-zomato', code: val || 'zomato' },
                  error: null,
                };
              }
              return {
                data: { id: userId, full_name: 'Test User', dietary_preference: 'veg', preferred_platform: 'zomato' },
                error: null,
              };
            },
            single: async () => {
              if (table === 'platforms') {
                return {
                  data: { id: 'platform-uuid-zomato', code: val || 'zomato' },
                  error: null,
                };
              }
              return {
                data: { id: 'test-deal-uuid-1', user_id: userId, food_item_id: '09b52c75-da15-585f-9d5a-44f91f28f4c4' },
                error: null,
              };
            },
            order: (_col: string, _opts: any) => ({
              data: [{ id: 'test-deal-uuid-1', user_id: userId, food_item_id: '09b52c75-da15-585f-9d5a-44f91f28f4c4' }],
              error: null,
            }),
          }),
        }),
        update: (updates: any) => ({
          eq: (_field: string, _val: any) => ({
            select: () => ({
              single: async () => ({
                data: { id: userId, ...updates },
                error: null,
              }),
            }),
          }),
        }),
        upsert: (record: any) => ({
          select: () => ({
            single: async () => ({
              data: { id: 'test-deal-uuid-1', ...record },
              error: null,
            }),
          }),
        }),
        delete: () => ({
          eq: (_f1: string, _v1: any) => ({
            eq: (_f2: string, _v2: any) => ({
              error: null,
            }),
          }),
        }),
      }),
    };
  }

  // ============================================================================
  // SUITE 1: ENVIRONMENT & CONFIGURATION SAFEGUARDS
  // ============================================================================
  console.log('--- Suite 1: Environment & Safe Configuration Verification ---');

  await runTest('Suite 1', 'Environment discovery across candidate paths', async () => {
    const envStatus = getSafeEnvVerification();
    assert.ok(envStatus.envFileLoaded, 'Expected an environment file to be discovered');
    assert.ok(envStatus.envFilePath.length > 0, 'Expected non-empty envFilePath');
  });

  await runTest('Suite 1', 'Safe environment verification leaks zero secret strings', async () => {
    const envStatus = getSafeEnvVerification();
    const serialized = JSON.stringify(envStatus);

    // Assert that serialized verification object contains only metadata booleans
    assert.strictEqual(serialized.includes('eyJ'), false, 'JWT token detected in verification output');
    assert.strictEqual(serialized.includes('your-anon-key'), false, 'Secret key substring detected');
    assert.strictEqual(serialized.includes('your-service-role-key'), false, 'Admin key substring detected');
    assert.ok('isReadyForConnection' in envStatus, 'Expected isReadyForConnection boolean property');
  });

  await runTest('Suite 1', 'Graceful fallback handling when Supabase is unconfigured / placeholder', async () => {
    const dbService = new DatabaseService();
    const health = await dbService.healthCheck();
    assert.ok(health.status === 'connected' || health.status === 'unconfigured', `Unexpected health status: ${health.status}`);
    assert.ok(health.mode === 'supabase' || health.mode === 'in_memory_fallback', `Unexpected mode: ${health.mode}`);
    assert.strictEqual(health.tables.totalExpected, EXPECTED_SCHEMA_TABLES.length, 'Total expected tables mismatch');
  });

  // ============================================================================
  // SUITE 2: CRYPTOGRAPHIC SHARE TOKEN & ENTROPY SECURITY
  // ============================================================================
  console.log('\n--- Suite 2: Cryptographic Share Token & Entropy Security ---');

  await runTest('Suite 2', 'generateSecureShareToken produces exactly 64 hexadecimal characters', async () => {
    const dbService = new DatabaseService();
    const token = dbService.generateSecureShareToken();
    assert.strictEqual(token.length, 64, `Expected 64 characters, got ${token.length}`);
    assert.match(token, /^[a-f0-9]{64}$/, 'Token does not match exact lowercase hexadecimal pattern');
  });

  await runTest('Suite 2', '100 sample tokens verify zero collision and 256-bit hex consistency', async () => {
    const dbService = new DatabaseService();
    const tokenSet = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const t = dbService.generateSecureShareToken();
      assert.strictEqual(t.length, 64);
      assert.match(t, /^[a-f0-9]{64}$/);
      tokenSet.add(t);
    }
    assert.strictEqual(tokenSet.size, 100, 'Collision detected in generated tokens');
  });

  await runTest('Suite 2', 'Service accepts valid lowercase, uppercase, and mixed-case 64-hex tokens', async () => {
    const dbService = new DatabaseService();
    const hex = dbService.generateSecureShareToken();
    assert.strictEqual(hex.length, 64);
    assert.match(hex, /^[a-f0-9]{64}$/i);

    // Pass valid lowercase, uppercase, and mixed-case tokens
    // These pass format validation and safely return null (or data) from the DB layer without format rejection
    const lowerRes = await dbService.getSharedComparison(hex.toLowerCase());
    assert.strictEqual(lowerRes, null);
    const upperRes = await dbService.getSharedComparison(hex.toUpperCase());
    assert.strictEqual(upperRes, null);
    const mixed = hex.slice(0, 32).toUpperCase() + hex.slice(32).toLowerCase();
    const mixedRes = await dbService.getSharedComparison(mixed);
    assert.strictEqual(mixedRes, null);
  });

  await runTest('Suite 2', 'Service rejects empty, short, and 63-character tokens (<64 hex chars)', async () => {
    const dbService = new DatabaseService();
    assert.strictEqual(await dbService.getSharedComparison(''), null);
    assert.strictEqual(await dbService.getSharedComparison('   '), null);
    assert.strictEqual(await dbService.getSharedComparison('short123'), null);
    assert.strictEqual(await dbService.getSharedComparison('12345678'), null);
    assert.strictEqual(await dbService.getSharedComparison('a'.repeat(63)), null);
  });

  await runTest('Suite 2', 'Service strictly rejects leading or trailing whitespace (no trimming)', async () => {
    const dbService = new DatabaseService();
    const validHex = dbService.generateSecureShareToken();
    assert.strictEqual(await dbService.getSharedComparison(' ' + validHex), null, 'Leading space must be rejected');
    assert.strictEqual(await dbService.getSharedComparison(validHex + ' '), null, 'Trailing space must be rejected');
    assert.strictEqual(await dbService.getSharedComparison('\t' + validHex), null, 'Leading tab must be rejected');
    assert.strictEqual(await dbService.getSharedComparison(validHex + '\n'), null, 'Trailing newline must be rejected');
    assert.strictEqual(await dbService.getSharedComparison('   ' + validHex + '   '), null, 'Enclosing spaces must be rejected');
  });

  await runTest('Suite 2', 'Service rejects 64-character non-hexadecimal tokens', async () => {
    const dbService = new DatabaseService();
    assert.strictEqual(await dbService.getSharedComparison('z'.repeat(64)), null, 'Non-hex "z" must be rejected');
    assert.strictEqual(await dbService.getSharedComparison('g'.repeat(64)), null, 'Non-hex "g" must be rejected');
    const almostHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg';
    assert.strictEqual(await dbService.getSharedComparison(almostHex), null, 'Trailing "g" must be rejected');
    const hyphenHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde-';
    assert.strictEqual(await dbService.getSharedComparison(hyphenHex), null, 'Trailing hyphen must be rejected');
  });

  await runTest('Suite 2', 'Service rejects legacy Base64URL tokens', async () => {
    const dbService = new DatabaseService();
    assert.strictEqual(await dbService.getSharedComparison('A'.repeat(43)), null, '43-char Base64URL must be rejected');
    assert.strictEqual(await dbService.getSharedComparison('B'.repeat(44)), null, '44-char Base64URL must be rejected');
    assert.strictEqual(await dbService.getSharedComparison('-'.repeat(64)), null, 'Base64URL hyphens must be rejected');
    assert.strictEqual(await dbService.getSharedComparison('_'.repeat(64)), null, 'Base64URL underscores must be rejected');
  });

  await runTest('Suite 2', 'Service rejects 65-character (oversized) tokens', async () => {
    const dbService = new DatabaseService();
    assert.strictEqual(await dbService.getSharedComparison('a'.repeat(65)), null, '65 "a" chars must be rejected');
    const validHex = dbService.generateSecureShareToken();
    assert.strictEqual(await dbService.getSharedComparison(validHex + 'f'), null, '65-char token must be rejected');
  });

  await runTest('Suite 2', 'Confirmation that invalid tokens never invoke the database RPC', async () => {
    const dbService = new DatabaseService();
    const admin = getSupabaseAdminClient();
    let rpcCallCount = 0;

    if (admin && typeof (admin as any).rpc === 'function') {
      const origRpc = (admin as any).rpc;
      (admin as any).rpc = (...args: any[]) => {
        rpcCallCount++;
        return origRpc.apply(admin, args);
      };

      try {
        const invalidInputs = [
          '',
          '   ',
          'short123',
          'a'.repeat(63),
          'z'.repeat(64),
          'g'.repeat(64),
          'A'.repeat(43),
          'B'.repeat(44),
          'a'.repeat(65),
          ' ' + dbService.generateSecureShareToken(),
          dbService.generateSecureShareToken() + ' ',
        ];

        for (const input of invalidInputs) {
          const res = await dbService.getSharedComparison(input);
          assert.strictEqual(res, null);
        }

        assert.strictEqual(rpcCallCount, 0, `Security invariant violated: RPC was invoked ${rpcCallCount} times for invalid tokens!`);
      } finally {
        (admin as any).rpc = origRpc;
      }
    }

    // Structural AST confirmation: verify getSharedComparison early-returns on regex failure before admin.rpc
    const projectRoot = process.cwd().endsWith('backend') ? path.resolve(process.cwd(), '..') : process.cwd();
    const serviceContent = fs.readFileSync(path.resolve(projectRoot, 'backend/src/services/database.service.ts'), 'utf8');
    const methodIdx = serviceContent.indexOf('async getSharedComparison(');
    assert.ok(methodIdx !== -1, 'getSharedComparison method not found in database.service.ts');
    const methodSlice = serviceContent.slice(methodIdx, methodIdx + 1200);

    const regexIdx = methodSlice.indexOf('/^[a-f0-9]{64}$/i');
    const rpcIdx = methodSlice.search(/admin\.rpc\(\s*['"]get_comparison_by_share_token_v2['"]/);

    assert.ok(regexIdx !== -1, 'Enforced regex /^[a-f0-9]{64}$/i missing from getSharedComparison');
    assert.ok(rpcIdx !== -1, 'admin.rpc call missing from getSharedComparison');
    assert.ok(regexIdx < rpcIdx, 'Format validation regex MUST strictly precede admin.rpc call');
    assert.strictEqual(methodSlice.includes('.trim()'), false, 'getSharedComparison must NOT trim the token before validation');
  });

  await runTest('Suite 2', 'getUserProfile fails closed when userClient is missing', async () => {
    const dbService = new DatabaseService();
    await assert.rejects(
      async () => dbService.getUserProfile('test-user-uuid-1', null as any),
      /Authentication required/i
    );
  });

  await runTest('Suite 2', 'updateUserProfile fails closed when userClient is missing', async () => {
    const dbService = new DatabaseService();
    await assert.rejects(
      async () => dbService.updateUserProfile('test-user-uuid-1', { fullName: 'New Name' }, null as any),
      /Authentication required/i
    );
  });

  await runTest('Suite 2', 'getSavedDeals fails closed when userClient is missing', async () => {
    const dbService = new DatabaseService();
    await assert.rejects(
      async () => dbService.getSavedDeals('test-user-uuid-1', null as any),
      /Authentication required/i
    );
  });

  await runTest('Suite 2', 'saveDeal fails closed when userClient is missing', async () => {
    const dbService = new DatabaseService();
    await assert.rejects(
      async () => dbService.saveDeal('test-user-uuid-1', { foodItemId: 'item-1', cheapestPlatformCode: 'zomato', cheapestPricePaise: 100, maxSavingsPaise: 50 }, null as any),
      /Authentication required/i
    );
  });

  await runTest('Suite 2', 'deleteSavedDeal fails closed when userClient is missing', async () => {
    const dbService = new DatabaseService();
    await assert.rejects(
      async () => dbService.deleteSavedDeal('test-user-uuid-1', 'deal-1', null as any),
      /Authentication required/i
    );
  });

  // ============================================================================
  // SUITE 2b: CATALOGUE ID RESOLUTION & DATABASE COMPATIBILITY (TESTS 6-8)
  // ============================================================================
  console.log('\n--- Suite 2b: Catalogue ID Resolution & Database Compatibility ---');

  const mockUserClient = createMockUserClient('test-user-uuid-1');

  await runTest('Suite 2b', 'Test 6: Invalid catalogue slug is rejected with descriptive error', async () => {
    const dbService = new DatabaseService();
    await assert.rejects(
      async () => dbService.resolveFoodItem('non-existent-food-slug-12345', mockUserClient),
      (err: any) => {
        assert.match(err.message, /Catalogue item '.*' was not found in the FoodWise catalogue/i);
        return true;
      }
    );
  });

  await runTest('Suite 2b', 'Test 7: Valid slug-to-database-UUID resolution succeeds with verified DB record', async () => {
    const dbService = new DatabaseService();
    // Resolving by valid catalogue slug
    const resolvedBySlug = await dbService.resolveFoodItem('biryani-hyd-1', mockUserClient);
    assert.strictEqual(resolvedBySlug.id, '09b52c75-da15-585f-9d5a-44f91f28f4c4');
    assert.strictEqual(resolvedBySlug.slug, 'biryani-hyd-1');
    assert.strictEqual(resolvedBySlug.name, 'Hyderabadi Chicken Dum Biryani');

    // Also verify resolution by database UUID directly
    const resolvedByUuid = await dbService.resolveFoodItem('09b52c75-da15-585f-9d5a-44f91f28f4c4', mockUserClient);
    assert.strictEqual(resolvedByUuid.id, '09b52c75-da15-585f-9d5a-44f91f28f4c4');
    assert.strictEqual(resolvedByUuid.slug, 'biryani-hyd-1');
  });

  await runTest('Suite 2b', 'Test 8: Known catalogue item missing from database returns honest unseeded error', async () => {
    const dbService = new DatabaseService();
    // 'biryani-luck-2' is a valid item in DEMO_FOOD_ITEMS / catalogueRegistry, but mockUserClient has not seeded it in food_items
    await assert.rejects(
      async () => dbService.resolveFoodItem('biryani-luck-2', mockUserClient),
      (err: any) => {
        assert.match(err.message, /Database record missing: Food item 'biryani-luck-2'.*exists in the catalogue but has not been seeded/i);
        return true;
      }
    );
  });

  // ============================================================================
  // SUITE 3: IN-PROCESS EXPRESS HTTP ROUTE TESTS
  // ============================================================================
  console.log('\n--- Suite 3: In-Process Express Route & Status Code Tests ---');

  // Build the in-process Express application identical to server.ts
  const app = express();
  app.use(createCorsMiddleware());
  app.use(express.json());

  // Health endpoint matching server.ts lines 28-43
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'FoodWise AI Backend',
      timestamp: new Date().toISOString(),
      supportedPlatforms: ['Zomato', 'Swiggy', 'Toing'],
      currencyModel: 'Integer Paise (100 Paise = ₹1.00)',
      missingFeesPolicy: 'Explicit null (Unknown), never misrepresented as 0',
      database: {
        isConfigured: isSupabaseConfigured(),
        isAdminConfigured: supabaseConfig.isAdminConfigured,
        mode: supabaseConfig.mode,
        url: supabaseConfig.url ? `${supabaseConfig.url.slice(0, 20)}...` : 'Not configured',
      },
    });
  });

  // Mount application route modules
  app.use('/api/foods', foodRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/compare-link', linkRoutes);
  app.use('/api/brands', brandRoutes);
  app.use('/api/database', databaseRoutes);

  // 404 handler matching server.ts lines 53-56
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
  });

  // Global Express Error-Handling Middleware (Must be registered last)
  app.use(globalErrorHandler);

  // Start in-process server on ephemeral loopback port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`  [HTTP Harness] Ephemeral test server active at ${baseUrl}\n`);

  try {
    // 3.1 Health Endpoint
    await runTest('Suite 3', 'GET /api/health returns 200 with platform and currency metadata', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.status, 'ok');
      assert.deepStrictEqual(body.supportedPlatforms, ['Zomato', 'Swiggy', 'Toing']);
      assert.match(body.currencyModel, /Integer Paise/i);
    });

    // 3.2 Database Health Endpoint
    await runTest('Suite 3', 'GET /api/database/health returns 200 with schema tables structure', async () => {
      const res = await fetch(`${baseUrl}/api/database/health`);
      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, true);
      assert.ok('isConfigured' in body.config);
      assert.ok('tables' in body.status);
      assert.strictEqual(body.status.tables.totalExpected, 11);
    });

    // 3.3 Platforms Directory Endpoint
    await runTest('Suite 3', 'GET /api/database/platforms returns 200 and exactly 3 platforms', async () => {
      const res = await fetch(`${baseUrl}/api/database/platforms`);
      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.count, 3);
      const codes = body.data.map((p: any) => p.code).sort();
      assert.deepStrictEqual(codes, ['swiggy', 'toing', 'zomato']);
    });

    setAuthVerifierForTesting(async (token: string) => {
      if (token === TEST_USERS.alice.token) {
        return {
          user: { id: TEST_USERS.alice.id, email: TEST_USERS.alice.email },
          error: null,
          userClient: createMockUserClient(TEST_USERS.alice.id),
        };
      }
      if (token === TEST_USERS.bob.token) {
        return {
          user: { id: TEST_USERS.bob.id, email: TEST_USERS.bob.email },
          error: null,
          userClient: createMockUserClient(TEST_USERS.bob.id),
        };
      }
      if (token === 'test-token-expired') {
        return {
          user: null,
          error: new Error('Token has expired'),
          userClient: null,
        };
      }
      if (token === 'test-token-invalid') {
        return {
          user: null,
          error: new Error('Invalid token signature'),
          userClient: null,
        };
      }
      return {
        user: null,
        error: new Error('Unrecognized test token'),
        userClient: null,
      };
    });

    // 3.4a User Profile - Missing Authorization Header
    await runTest('Suite 3', 'GET /api/database/profile/:userId returns 401 when Authorization header is missing', async () => {
      const res = await fetch(`${baseUrl}/api/database/profile/${TEST_USERS.alice.id}`);
      assert.strictEqual(res.status, 401);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Missing Authorization header/i);
    });

    // 3.4b User Profile - Malformed Scheme (non-Bearer)
    await runTest('Suite 3', 'GET /api/database/profile/:userId returns 401 on non-Bearer Authorization scheme', async () => {
      const res = await fetch(`${baseUrl}/api/database/profile/${TEST_USERS.alice.id}`, {
        headers: { Authorization: `Basic dXNlcjpwYXNz` },
      });
      assert.strictEqual(res.status, 401);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Malformed Authorization header/i);
    });

    // 3.4c User Profile - Expired Token
    await runTest('Suite 3', 'GET /api/database/profile/:userId returns 401 when Bearer token is expired', async () => {
      const res = await fetch(`${baseUrl}/api/database/profile/${TEST_USERS.alice.id}`, {
        headers: { Authorization: 'Bearer test-token-expired' },
      });
      assert.strictEqual(res.status, 401);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /expired/i);
    });

    // 3.4d User Profile - Invalid Token
    await runTest('Suite 3', 'GET /api/database/profile/:userId returns 401 when Bearer token signature is invalid', async () => {
      const res = await fetch(`${baseUrl}/api/database/profile/${TEST_USERS.alice.id}`, {
        headers: { Authorization: 'Bearer test-token-invalid' },
      });
      assert.strictEqual(res.status, 401);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Invalid/i);
    });

    // 3.4e User Profile - IDOR Prevention (Alice tries to access Bob's profile)
    await runTest('Suite 3', 'GET /api/database/profile/:userId returns 403 Forbidden on IDOR user ID mismatch', async () => {
      const res = await fetch(`${baseUrl}/api/database/profile/${TEST_USERS.bob.id}`, {
        headers: { Authorization: `Bearer ${TEST_USERS.alice.token}` },
      });
      assert.strictEqual(res.status, 403);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    // 3.4f User Profile - Valid Authenticated Retrieval
    await runTest('Suite 3', 'GET /api/database/profile/:userId returns 200 with profile on valid authenticated request', async () => {
      const res = await fetch(`${baseUrl}/api/database/profile/${TEST_USERS.alice.id}`, {
        headers: { Authorization: `Bearer ${TEST_USERS.alice.token}` },
      });
      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, TEST_USERS.alice.id);
    });

    // 3.5a User Profile Update - IDOR Prevention (Alice tries to update Bob's profile)
    await runTest('Suite 3', 'PUT /api/database/profile/:userId returns 403 Forbidden when updating another user profile', async () => {
      const res = await fetch(`${baseUrl}/api/database/profile/${TEST_USERS.bob.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${TEST_USERS.alice.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName: 'Malicious Update' }),
      });
      assert.strictEqual(res.status, 403);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    // 3.5b User Profile Update - Valid Authenticated Update
    await runTest('Suite 3', 'PUT /api/database/profile/:userId returns 200 on valid authenticated profile update', async () => {
      const res = await fetch(`${baseUrl}/api/database/profile/${TEST_USERS.alice.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${TEST_USERS.alice.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: 'Alice Updated',
          dietaryPreference: 'veg',
          preferredPlatform: 'zomato',
        }),
      });
      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, true);
    });

    // 3.6a Saved Deals - Missing Authorization Header
    await runTest('Suite 3', 'GET /api/database/deals/:userId returns 401 when Authorization header is missing', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.alice.id}`);
      assert.strictEqual(res.status, 401);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Missing Authorization header/i);
    });

    // 3.6b Saved Deals - IDOR Prevention (Alice tries to read Bob's saved deals)
    await runTest('Suite 3', 'GET /api/database/deals/:userId returns 403 Forbidden when accessing another user deals', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.bob.id}`, {
        headers: { Authorization: `Bearer ${TEST_USERS.alice.token}` },
      });
      assert.strictEqual(res.status, 403);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    // 3.6c Saved Deals - Valid Authenticated Retrieval
    await runTest('Suite 3', 'GET /api/database/deals/:userId returns 200 with array on valid authenticated request', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.alice.id}`, {
        headers: { Authorization: `Bearer ${TEST_USERS.alice.token}` },
      });
      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data));
    });

    // 3.7a Saved Deal Creation - IDOR Prevention (Alice tries to save deal for Bob)
    await runTest('Suite 3', 'POST /api/database/deals/:userId returns 403 Forbidden when saving deal for another user', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.bob.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_USERS.alice.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodItemId: 'biryani-hyd-1',
          cheapestPlatformCode: 'zomato',
          cheapestPricePaise: 25000,
        }),
      });
      assert.strictEqual(res.status, 403);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    // 3.7b Saved Deal Validation - Missing Required Fields
    await runTest('Suite 3', 'POST /api/database/deals/:userId rejects incomplete deal input with 400', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.alice.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_USERS.alice.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodItemId: 'biryani-hyd-1',
          // missing cheapestPlatformCode and cheapestPricePaise
        }),
      });
      assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Missing required fields/i);
    });

    // 3.7c Saved Deal Creation - Valid Authenticated Creation with Verified UUID Resolution
    await runTest('Suite 3', 'POST /api/database/deals/:userId returns 201 on valid authenticated deal bookmark', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.alice.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_USERS.alice.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodItemId: 'biryani-hyd-1',
          cheapestPlatformCode: 'zomato',
          cheapestPricePaise: 25000,
        }),
      });
      assert.strictEqual(res.status, 201);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.food_item_id, '09b52c75-da15-585f-9d5a-44f91f28f4c4', 'food_item_id must be resolved database UUID');
    });

    // 3.7d Saved Deal Creation - Test 6: Rejection of Invalid Catalogue Slug via HTTP
    await runTest('Suite 3', 'POST /api/database/deals/:userId rejects invalid catalogue slug with 400', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.alice.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_USERS.alice.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodItemId: 'non-existent-food-slug-12345',
          cheapestPlatformCode: 'zomato',
          cheapestPricePaise: 25000,
        }),
      });
      assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Catalogue item '.*' was not found in the FoodWise catalogue/i);
    });

    // 3.7e Saved Deal Creation - Test 8: Rejection of Unseeded Catalogue Item via HTTP
    await runTest('Suite 3', 'POST /api/database/deals/:userId rejects unseeded catalogue item with 400 and honest error', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.alice.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_USERS.alice.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodItemId: 'biryani-luck-2',
          cheapestPlatformCode: 'zomato',
          cheapestPricePaise: 25000,
        }),
      });
      assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Database record missing: Food item 'biryani-luck-2'.*exists in the catalogue but has not been seeded/i);
    });

    // 3.8a Saved Deal Deletion - IDOR Prevention (Alice tries to delete Bob's deal)
    await runTest('Suite 3', 'DELETE /api/database/deals/:userId/:dealId returns 403 Forbidden when deleting another user deal', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.bob.id}/deal-uuid-1`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TEST_USERS.alice.token}` },
      });
      assert.strictEqual(res.status, 403);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    // 3.8b Saved Deal Deletion - Valid Authenticated Deletion
    await runTest('Suite 3', 'DELETE /api/database/deals/:userId/:dealId returns 200 on valid authenticated deal deletion', async () => {
      const res = await fetch(`${baseUrl}/api/database/deals/${TEST_USERS.alice.id}/deal-uuid-1`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TEST_USERS.alice.token}` },
      });
      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.ok('success' in body);
      assert.ok('message' in body);
    });

    // 3.9 Share Token Rejection - Short Token
    await runTest('Suite 3', 'GET /api/database/share/short123 returns 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/database/share/short123`);
      assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Invalid share token format. Token must be exactly 64 hexadecimal characters (256-bit entropy).');
    });

    // 3.10 Share Token Rejection - 8-character Token
    await runTest('Suite 3', 'GET /api/database/share/12345678 returns 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/database/share/12345678`);
      assert.strictEqual(res.status, 400);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Invalid share token format. Token must be exactly 64 hexadecimal characters (256-bit entropy).');
    });

    // 3.10a Share Token Rejection - 64-character Non-Hexadecimal Token
    await runTest('Suite 3', 'GET /api/database/share/:token rejects 64-character non-hex token with 400', async () => {
      const nonHexToken = 'z'.repeat(64);
      const res = await fetch(`${baseUrl}/api/database/share/${nonHexToken}`);
      assert.strictEqual(res.status, 400);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Invalid share token format. Token must be exactly 64 hexadecimal characters (256-bit entropy).');
    });

    // 3.10b Share Token Rejection - Legacy Base64URL Token
    await runTest('Suite 3', 'GET /api/database/share/:token rejects legacy Base64URL token with 400', async () => {
      const base64UrlToken = 'A'.repeat(43);
      const res = await fetch(`${baseUrl}/api/database/share/${base64UrlToken}`);
      assert.strictEqual(res.status, 400);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Invalid share token format. Token must be exactly 64 hexadecimal characters (256-bit entropy).');
    });

    // 3.10c Share Token Rejection - 65-character Oversized Token
    await runTest('Suite 3', 'GET /api/database/share/:token rejects 65-character token with 400', async () => {
      const longToken = 'a'.repeat(65);
      const res = await fetch(`${baseUrl}/api/database/share/${longToken}`);
      assert.strictEqual(res.status, 400);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'Invalid share token format. Token must be exactly 64 hexadecimal characters (256-bit entropy).');
    });

    // 3.10d Share Token Rejection - Leading / Trailing Whitespace
    await runTest('Suite 3', 'GET /api/database/share/:token rejects whitespace-padded tokens with 400', async () => {
      const validHexToken = crypto.randomBytes(32).toString('hex');
      const leadingRes = await fetch(`${baseUrl}/api/database/share/%20${validHexToken}`);
      assert.strictEqual(leadingRes.status, 400);
      const leadingBody: any = await leadingRes.json();
      collectedHttpResponses.push(JSON.stringify(leadingBody));
      assert.strictEqual(leadingBody.success, false);
      assert.strictEqual(leadingBody.message, 'Invalid share token format. Token must be exactly 64 hexadecimal characters (256-bit entropy).');

      const trailingRes = await fetch(`${baseUrl}/api/database/share/${validHexToken}%20`);
      assert.strictEqual(trailingRes.status, 400);
      const trailingBody: any = await trailingRes.json();
      collectedHttpResponses.push(JSON.stringify(trailingBody));
      assert.strictEqual(trailingBody.success, false);
      assert.strictEqual(trailingBody.message, 'Invalid share token format. Token must be exactly 64 hexadecimal characters (256-bit entropy).');
    });

    // 3.10e Share Token Acceptance - Valid Lowercase and Uppercase 64-hex Tokens
    await runTest('Suite 3', 'GET /api/database/share/:token accepts valid lowercase and uppercase 64-hex tokens', async () => {
      const lowerToken = crypto.randomBytes(32).toString('hex').toLowerCase();
      const upperToken = crypto.randomBytes(32).toString('hex').toUpperCase();

      const lowerRes = await fetch(`${baseUrl}/api/database/share/${lowerToken}`);
      // Must not be 400 Bad Request; passes validation and returns 404 since token is not in DB
      assert.strictEqual(lowerRes.status, 404);
      const lowerBody: any = await lowerRes.json();
      collectedHttpResponses.push(JSON.stringify(lowerBody));
      assert.strictEqual(lowerBody.success, false);
      assert.match(lowerBody.message, /not found or expired/i);

      const upperRes = await fetch(`${baseUrl}/api/database/share/${upperToken}`);
      assert.strictEqual(upperRes.status, 404);
      const upperBody: any = await upperRes.json();
      collectedHttpResponses.push(JSON.stringify(upperBody));
      assert.strictEqual(upperBody.success, false);
      assert.match(upperBody.message, /not found or expired/i);
    });

    // 3.11 Share Token Rate Limiter Enforcement
    await runTest('Suite 3', 'GET /api/database/share/:token enforces sliding-window IP rate limit (10 req/min)', async () => {
      const testIp = '198.51.100.99';
      // Create a syntactically valid 64-hex token
      const validHexToken = crypto.randomBytes(32).toString('hex');

      // Send 10 rapid requests from the test IP
      for (let i = 1; i <= 10; i++) {
        const res = await fetch(`${baseUrl}/api/database/share/${validHexToken}`, {
          headers: { 'x-forwarded-for': testIp },
        });
        // Each should be evaluated (returns 404 because token does not exist in DB, not rate limited)
        assert.notStrictEqual(res.status, 429, `Request ${i} should not be rate limited`);
      }

      // 11th request from the same IP MUST trigger HTTP 429
      const rateLimitedRes = await fetch(`${baseUrl}/api/database/share/${validHexToken}`, {
        headers: { 'x-forwarded-for': testIp },
      });
      assert.strictEqual(rateLimitedRes.status, 429, `Expected HTTP 429 on 11th request, got ${rateLimitedRes.status}`);
      const body: any = await rateLimitedRes.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Rate limit exceeded/i);
    });

    // 3.12 Wildcard 404 Route Handler
    await runTest('Suite 3', 'GET /api/unmapped-endpoint triggers custom 404 JSON handler', async () => {
      const res = await fetch(`${baseUrl}/api/unmapped-endpoint-xyz`);
      assert.strictEqual(res.status, 404);
      const body: any = await res.json();
      collectedHttpResponses.push(JSON.stringify(body));
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, 'API Endpoint Not Found');
    });
  } finally {
    setAuthVerifierForTesting(null);
    // Guaranteed shutdown of the test HTTP server
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    console.log('\n  [HTTP Harness] Ephemeral test server closed cleanly.');
  }

  // ============================================================================
  // SUITE 4: SERVICE-ROLE SECURITY & PRIVILEGE ISOLATION AUDIT
  // ============================================================================
  console.log('\n--- Suite 4: Service-Role Security & Privilege Isolation Audit ---');

  await runTest('Suite 4', 'User CRUD methods in database.service.ts never invoke getSupabaseAdminClient or getSupabaseClient', async () => {
    const projectRoot = process.cwd().endsWith('backend') ? path.resolve(process.cwd(), '..') : process.cwd();
    const serviceFilePath = path.resolve(projectRoot, 'backend/src/services/database.service.ts');
    const content = fs.readFileSync(serviceFilePath, 'utf8');

    function extractMethodBody(source: string, methodName: string): string {
      const methodStart = source.indexOf(`${methodName}(`);
      if (methodStart === -1) return '';
      const paramStart = source.indexOf('(', methodStart);
      let paramDepth = 1;
      let p = paramStart + 1;
      while (paramDepth > 0 && p < source.length) {
        if (source[p] === '(') paramDepth++;
        else if (source[p] === ')') paramDepth--;
        p++;
      }
      const openBrace = source.indexOf('{', p);
      if (openBrace === -1) return '';
      let depth = 1;
      let pos = openBrace + 1;
      while (depth > 0 && pos < source.length) {
        if (source[pos] === '{') depth++;
        else if (source[pos] === '}') depth--;
        pos++;
      }
      return source.slice(openBrace, pos);
    }

    const userCrudMethods = [
      'getSavedDeals',
      'saveDeal',
      'deleteSavedDeal',
      'getUserProfile',
      'updateUserProfile',
    ];

    for (const method of userCrudMethods) {
      const methodBody = extractMethodBody(content, method);
      assert.ok(methodBody.length > 0, `Could not accurately extract body for method ${method}`);

      assert.strictEqual(
        methodBody.includes('getSupabaseAdminClient'),
        false,
        `SECURITY VIOLATION: User CRUD method ${method} references getSupabaseAdminClient!`
      );
      assert.strictEqual(
        methodBody.includes('getSupabaseClient'),
        false,
        `SECURITY VIOLATION: User CRUD method ${method} references getSupabaseClient!`
      );
      assert.ok(
        methodBody.includes('userClient'),
        `FAIL CLOSED REQUIREMENT: User CRUD method ${method} must require userClient!`
      );
    }

    const publicMethods = [
      'getPlatforms',
      'getRestaurants',
      'recordSearchSession',
    ];

    for (const method of publicMethods) {
      const methodBody = extractMethodBody(content, method);
      assert.ok(methodBody.length > 0, `Could not accurately extract body for method ${method}`);

      assert.strictEqual(
        methodBody.includes('getSupabaseAdminClient'),
        false,
        `SECURITY VIOLATION: Public method ${method} references getSupabaseAdminClient!`
      );
    }
  });

  await runTest('Suite 4', 'Frontend source code (frontend/src) is 100% free of service_role keys or admin references', async () => {
    const projectRoot = process.cwd().endsWith('backend') ? path.resolve(process.cwd(), '..') : process.cwd();
    const frontendSrcDir = path.resolve(projectRoot, 'frontend/src');

    function scanDirectory(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (/\.(ts|tsx|js|jsx|json|html)$/.test(entry.name)) {
          const fileContent = fs.readFileSync(fullPath, 'utf8');
          assert.strictEqual(
            fileContent.includes('service_role'),
            false,
            `SECURITY VIOLATION: 'service_role' found in frontend file: ${fullPath}`
          );
          assert.strictEqual(
            fileContent.includes('SERVICE_ROLE'),
            false,
            `SECURITY VIOLATION: 'SERVICE_ROLE' found in frontend file: ${fullPath}`
          );
          assert.strictEqual(
            fileContent.includes('getSupabaseAdminClient'),
            false,
            `SECURITY VIOLATION: 'getSupabaseAdminClient' found in frontend file: ${fullPath}`
          );
          // Pages, components, and services must never directly import @supabase/supabase-js
          // (Only frontend auth configuration and context may initialize or interact with the client)
          if (entry.name !== 'supabase.ts' && entry.name !== 'AuthContext.tsx') {
            assert.strictEqual(
              fileContent.includes('@supabase/supabase-js'),
              false,
              `SECURITY VIOLATION: Direct Supabase client import found in unauthorized frontend file: ${fullPath}`
            );
          }
        }
      }
    }

    scanDirectory(frontendSrcDir);
  });

  await runTest('Suite 4', 'Zero secret leakage across all generated HTTP response payloads', async () => {
    const allResponsesJson = collectedHttpResponses.join('\n');
    assert.strictEqual(allResponsesJson.includes('eyJ'), false, 'JWT token detected in HTTP responses');
    assert.strictEqual(allResponsesJson.includes('service_role'), false, 'service_role string detected in HTTP responses');
    assert.strictEqual(allResponsesJson.includes('SUPABASE_'), false, 'Environment variable name leaked in HTTP responses');
  });

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log('\n================================================================');
  console.log('  TIER A BACKEND INTEGRATION TEST RESULTS SUMMARY               ');
  console.log('================================================================');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n  Total Tests Executed: ${total}`);
  console.log(`  Tests Passed:         ${passed}`);
  console.log(`  Tests Failed:         ${failed}`);

  if (failed > 0) {
    console.log('\n  ❌ Failed Test Summary:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`    - [${r.suite}] ${r.testName}: ${r.error}`);
      });
    process.exitCode = 1;
  } else {
    console.log('\n  🎉 ALL TIER A BACKEND INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('\nFatal test runner crash:', err);
  process.exit(1);
});

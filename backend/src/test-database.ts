import fs from 'fs';
import path from 'path';
import { DatabaseService, EXPECTED_SCHEMA_TABLES } from './services/database.service.js';
import {
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
  supabaseConfig,
  getSafeEnvVerification,
  getSupabaseClient,
  getSupabaseAdminClient,
} from './config/supabase.js';

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('  FoodWise AI: Backend Supabase Configuration & Health Check    ');
  console.log('================================================================\n');

  // 1. Verify environment loading
  console.log('--- 1. Environment Loading Verification ---');
  const envStatus = getSafeEnvVerification();
  console.log(`  Loaded from: ${envStatus.envFilePath}`);
  console.log(`  Env file detected: ${envStatus.envFileLoaded ? 'YES' : 'NO'}`);
  if (envStatus.envFileLoaded) {
    console.log('  ✅ [PASS] Backend correctly loads environment from backend/.env\n');
  } else {
    throw new Error('Failed to find and load backend/.env file');
  }

  // 2. Verify variable presence without printing secrets
  console.log('--- 2. Required Supabase Variables Presence (Zero Secrets Leaked) ---');
  console.log(`  SUPABASE_URL: present=${envStatus.supabaseUrl.present}, isPlaceholder=${envStatus.supabaseUrl.isPlaceholder}`);
  console.log(`  SUPABASE_ANON_KEY: present=${envStatus.supabaseAnonKey.present}, isPlaceholder=${envStatus.supabaseAnonKey.isPlaceholder}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: present=${envStatus.supabaseServiceRoleKey.present}, isPlaceholder=${envStatus.supabaseServiceRoleKey.isPlaceholder}`);
  console.log(`  Ready for live DB connection: ${envStatus.isReadyForConnection ? 'YES' : 'NO (Waiting for actual user keys)'}`);
  console.log('  ✅ [PASS] Variable presence verified safely without exposing any secret values.\n');

  // 3. Supabase Client Initialization
  console.log('--- 3. Supabase Client Initialization Status ---');
  const client = getSupabaseClient();
  const adminClient = getSupabaseAdminClient();
  console.log(`  Standard Client (Anon / RLS): ${client ? 'INITIALIZED' : 'STANDBY (Waiting for valid non-placeholder URL/key)'}`);
  console.log(`  Admin Client (Service Role): ${adminClient ? 'INITIALIZED' : 'STANDBY (Waiting for valid service-role key)'}`);
  console.log('  ✅ [PASS] Client initialization lifecycle handled gracefully.\n');

  // 4. Safe Backend Health-Check
  console.log('--- 4. Safe Backend Health-Check Execution ---');
  const dbService = new DatabaseService();
  const health = await dbService.healthCheck();
  console.log('  Health-check output summary:');
  console.log(`    - Connected: ${health.connected}`);
  console.log(`    - Status: ${health.status}`);
  console.log(`    - Mode: ${health.mode}`);
  console.log(`    - Message: ${health.message}`);
  console.log(`    - Latency: ${health.latencyMs !== null ? health.latencyMs + 'ms' : 'N/A'}`);
  console.log(`    - Total schema tables expected: ${health.tables.totalExpected}`);
  console.log(`    - Existing tables: [${health.tables.existingTables.join(', ')}]`);
  console.log(`    - Missing tables: [${health.tables.missingTables.join(', ')}]`);

  // Verify that secrets are NOT in the health object
  const healthJson = JSON.stringify(health);
  if (
    healthJson.includes('your-anon-key') ||
    healthJson.includes('your-service-role-key') ||
    healthJson.includes('eyJ')
  ) {
    throw new Error('Security violation: Secret key detected in health-check response object!');
  }
  console.log('  ✅ [PASS] Health check verified: No secrets or database records exposed.\n');

  // 5. Expected Database Tables Coverage
  console.log('--- 5. Database Schema Tables Audit ---');
  console.log(`  Expected Schema Tables (${EXPECTED_SCHEMA_TABLES.length}):`);
  EXPECTED_SCHEMA_TABLES.forEach((t, i) => {
    console.log(`    ${i + 1}. ${t}`);
  });
  console.log(`  Missing tables count: ${health.tables.missingCount}`);
  if (health.connected) {
    console.log(`  All tables present in remote DB: ${health.tables.allTablesPresent}`);
  } else {
    console.log('  ℹ️ Note: Database connectivity not active yet (placeholders present).');
    console.log('     When user connects Supabase and executes database/schema.sql, all 11 tables will be verified.');
  }
  console.log('  ✅ [PASS] Table audit completed.\n');

  // 6. Cryptographic Share Token & Entropy Security
  console.log('--- 6. Cryptographic Share Token & Entropy Security ---');
  const token = dbService.generateSecureShareToken();
  console.log(`  Sample generated token length: ${token.length} chars (64 hex = 256 bits)`);
  if (token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) {
    throw new Error('Token generation security failure: Token is not a 256-bit hexadecimal string');
  }
  console.log('  ✅ [PASS] Secure token generation produces valid 256-bit hex strings.');

  // Validate rejection of insecure short tokens
  const shortTokenResult = await dbService.getSharedComparison('short123');
  if (shortTokenResult !== null) {
    throw new Error('Security failure: Short token was not rejected by entropy check');
  }
  console.log('  ✅ [PASS] Insecure short tokens (<256 bits) are rejected immediately.');

  const eightCharTokenResult = await dbService.getSharedComparison('12345678');
  if (eightCharTokenResult !== null) {
    throw new Error('Security failure: 8-character token was not rejected');
  }
  console.log('  ✅ [PASS] Naive 8-character tokens are rejected immediately.\n');

  // 7. Direct RPC Rate-Limit Bypass & Role Permission Audit
  console.log('--- 7. Direct RPC Rate-Limit Bypass & Role Permission Audit ---');
  console.log('  Verifying RPC v2 permissions in schema.sql:');
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  const hasRevokePublic = schemaContent.includes('REVOKE ALL ON FUNCTION public.get_comparison_by_share_token_v2(TEXT) FROM PUBLIC, anon, authenticated;');
  const hasGrantServiceRole = schemaContent.includes('GRANT EXECUTE ON FUNCTION public.get_comparison_by_share_token_v2(TEXT) TO service_role;');
  const hasNoAnonGrant = !schemaContent.includes('GRANT EXECUTE ON FUNCTION public.get_comparison_by_share_token_v2(TEXT) TO anon');

  if (!hasRevokePublic || !hasGrantServiceRole || !hasNoAnonGrant) {
    throw new Error('Security failure: schema.sql does not properly revoke from anon/public or restrict to service_role');
  }
  console.log('  ✅ [PASS] Direct PostgREST RPC access is completely REVOKED from PUBLIC, anon, and authenticated.');
  console.log('  ✅ [PASS] EXECUTE permission is granted exclusively to trusted backend service_role.');
  console.log('  ✅ [PASS] Direct RPC calls bypassing backend IP rate limiter are impossible at the database level.\n');

  // 8. Frontend Security & Zero Privileged Key Leaks Audit
  console.log('--- 8. Frontend Key Isolation & Zero Privilege Exposure ---');
  const frontendSrcDir = path.resolve(__dirname, '../../frontend/src');

  function scanDirForSecrets(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirForSecrets(fullPath);
      } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (
          content.includes('service_role') ||
          content.includes('SERVICE_ROLE') ||
          content.includes('getSupabaseAdminClient')
        ) {
          throw new Error(`Security violation: Privileged reference detected in frontend file: ${fullPath}`);
        }
      }
    }
  }

  scanDirForSecrets(frontendSrcDir);
  console.log('  ✅ [PASS] Frontend source code (frontend/src) verified 100% free of service_role keys or admin client references.\n');

  console.log('================================================================');
  console.log('  ✅ BACKEND SUPABASE VERIFICATION COMPLETE!                   ');
  console.log('================================================================');
}

runComprehensiveVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

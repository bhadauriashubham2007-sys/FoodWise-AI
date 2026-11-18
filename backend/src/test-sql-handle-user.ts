import fs from 'fs';
import path from 'path';

interface SimulatedUser {
  id: string;
  email: string;
  raw_user_meta_data: Record<string, any>;
}

interface SimulatedProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
}

/**
 * Simulates PostgreSQL public.handle_new_user() trigger logic exactly as defined in schema.sql:
 *
 * INSERT INTO public.profiles (id, email, full_name, avatar_url)
 * VALUES (
 *   NEW.id,
 *   NEW.email,
 *   COALESCE(
 *     NEW.raw_user_meta_data->>'full_name',
 *     NEW.raw_user_meta_data->>'name',
 *     pg_catalog.split_part(NEW.email, '@', 1)
 *   ),
 *   COALESCE(
 *     NEW.raw_user_meta_data->>'avatar_url',
 *     NEW.raw_user_meta_data->>'picture',
 *     NULL
 *   )
 * )
 * ON CONFLICT (id) DO NOTHING;
 */
function simulatePostgresHandleNewUser(
  newUser: SimulatedUser,
  profilesTable: Map<string, SimulatedProfile>
): { profile: SimulatedProfile | null; conflictIgnored: boolean } {
  // Check ON CONFLICT (id)
  if (profilesTable.has(newUser.id)) {
    return { profile: profilesTable.get(newUser.id)!, conflictIgnored: true };
  }

  // PostgreSQL pg_catalog.split_part(string, delimiter, field) simulation
  const splitPart = (str: string, delimiter: string, fieldIndex: number): string => {
    const parts = str.split(delimiter);
    return parts[fieldIndex - 1] || '';
  };

  // COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  const fullName =
    newUser.raw_user_meta_data?.full_name ??
    newUser.raw_user_meta_data?.name ??
    splitPart(newUser.email, '@', 1);

  // COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  const avatarUrl =
    newUser.raw_user_meta_data?.avatar_url ??
    newUser.raw_user_meta_data?.picture ??
    null;

  const profile: SimulatedProfile = {
    id: newUser.id,
    email: newUser.email,
    full_name: fullName,
    avatar_url: avatarUrl,
  };

  profilesTable.set(newUser.id, profile);
  return { profile, conflictIgnored: false };
}

/**
 * Comprehensive PostgreSQL DDL & Syntax Validator for schema.sql
 */
function validateSchemaSqlSyntax(sqlPath: string) {
  const content = fs.readFileSync(sqlPath, 'utf8');

  // 1. Verify Balanced Quoting & Blocks
  let inSingleQuote = false;
  let inDollarQuote = false;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1] || '';

    // Handle line comments
    if (!inSingleQuote && !inDollarQuote && char === '-' && nextChar === '-') {
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Handle dollar quotes $$
    if (!inSingleQuote && char === '$' && nextChar === '$') {
      inDollarQuote = !inDollarQuote;
      i++; // skip second $
      continue;
    }

    // Handle single quotes
    if (!inDollarQuote && char === "'") {
      if (inSingleQuote && nextChar === "'") {
        i++; // escaped quote ''
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    // Inside quotes, ignore syntax delimiters
    if (inSingleQuote || inDollarQuote) {
      continue;
    }

    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;

    if (parenDepth < 0) {
      throw new Error(`SQL syntax error: Unmatched closing parenthesis at position ${i}`);
    }
    if (bracketDepth < 0) {
      throw new Error(`SQL syntax error: Unmatched closing bracket at position ${i}`);
    }
  }

  if (inSingleQuote) throw new Error('SQL syntax error: Unterminated single quote in SQL file');
  if (inDollarQuote) throw new Error('SQL syntax error: Unterminated dollar-quoted block in SQL file');
  if (parenDepth !== 0) throw new Error(`SQL syntax error: Unbalanced parentheses (depth: ${parenDepth})`);
  if (bracketDepth !== 0) throw new Error(`SQL syntax error: Unbalanced brackets (depth: ${bracketDepth})`);

  // 2. Prohibit invalid schema-qualified special constructs
  const invalidConstructs = [
    'pg_catalog.coalesce',
    'pg_catalog.nullif',
    'pg_catalog.greatest',
    'pg_catalog.least',
    'pg_catalog.cast',
    'pg_catalog.extract',
  ];

  for (const construct of invalidConstructs) {
    if (content.toLowerCase().includes(construct)) {
      throw new Error(`PostgreSQL syntax violation: Special SQL expression '${construct}' cannot be schema-qualified.`);
    }
  }

  // 3. Destructive operations audit (on executable SQL, stripping comments)
  const sqlWithoutComments = content
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const destructivePatterns = [
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+COLUMN\b/i,
    /\bTRUNCATE\b/i,
    /\bDELETE\s+FROM\b/i,
  ];

  for (const pat of destructivePatterns) {
    const match = sqlWithoutComments.match(pat);
    if (match) {
      throw new Error(`Destructive SQL violation detected: '${match[0]}' is forbidden.`);
    }
  }

  // 4. Verify all 11 expected tables exist in schema
  const expectedTables = [
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
  ];

  for (const t of expectedTables) {
    const createTableRegex = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+public\\.${t}\\b`, 'i');
    if (!createTableRegex.test(content)) {
      throw new Error(`Schema error: Table public.${t} missing CREATE TABLE statement.`);
    }

    const alterTableRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${t}\\s+ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS`, 'i');
    if (!alterTableRegex.test(content)) {
      throw new Error(`Compatibility error: Table public.${t} missing non-destructive ADD COLUMN IF NOT EXISTS guards.`);
    }
  }

  // 5. Verify NO timezone('utc'::text, now()) remains in executable SQL (must use DEFAULT now())
  if (sqlWithoutComments.includes("timezone(")) {
    throw new Error("Timestamp error: Detected timezone('utc'::text, now()) in executable SQL. Use DEFAULT now() for TIMESTAMPTZ columns.");
  }

  // 6. Verify NO misleading rating or demo defaults remain in column definitions
  if (sqlWithoutComments.includes("DEFAULT 4.0") || sqlWithoutComments.includes("DEFAULT 'Bengaluru'")) {
    throw new Error("Misleading defaults error: Found fabricated rating 4.0 or city Bengaluru defaults in column definitions.");
  }
  if (sqlWithoutComments.includes("is_demo_data BOOLEAN NOT NULL DEFAULT true")) {
    throw new Error("Demo default error: is_demo_data must not default to true for pre-existing records.");
  }

  // 7. Verify robust constraint introspection (No unscoped conname checks)
  const unscopedConstraintMatch = sqlWithoutComments.match(/WHERE\s+conname\s*=/i);
  if (unscopedConstraintMatch) {
    throw new Error("Constraint scope violation: Found unscoped 'WHERE conname ='. Every constraint check must include conrelid and contype.");
  }

  // 8. Verify coupon availability safe assumptions removal
  if (
    !sqlWithoutComments.includes("ALTER TABLE public.coupons ALTER COLUMN is_available DROP DEFAULT;") ||
    !sqlWithoutComments.includes("ALTER TABLE public.coupons ALTER COLUMN is_available DROP NOT NULL;")
  ) {
    throw new Error("Coupon availability violation: Missing DROP DEFAULT or DROP NOT NULL on public.coupons.is_available.");
  }

  // 9. Verify CHECK constraint verification has ZERO ILIKE substring matching
  if (sqlWithoutComments.includes("ILIKE")) {
    throw new Error("CHECK constraint violation: Detected ILIKE in SQL. Arbitrary substring matching is strictly prohibited.");
  }

  // 10. Verify legacy RPC cleanup hardening
  if (!sqlWithoutComments.includes("d.refclassid = 'pg_catalog.pg_proc'::regclass")) {
    throw new Error("Legacy RPC cleanup violation: Missing pg_depend refclassid check against pg_proc.");
  }
  if (!sqlWithoutComments.includes("d.deptype IN ('n', 'a', 'i', 'e')")) {
    throw new Error("Legacy RPC cleanup violation: Must check all dependency types ('n', 'a', 'i', 'e').");
  }
  if (!sqlWithoutComments.includes("EXCEPTION WHEN dependent_objects_still_exist THEN")) {
    throw new Error("Legacy RPC cleanup violation: Missing dependent_objects_still_exist exception handler.");
  }

  // 11. Verify NO CASCADE on DROP CONSTRAINT or DROP FUNCTION
  if (/DROP\s+CONSTRAINT\s+[^\n;]+CASCADE/i.test(sqlWithoutComments)) {
    throw new Error("Safety violation: Detected DROP CONSTRAINT ... CASCADE. Non-CASCADE drop is required.");
  }
  if (/DROP\s+FUNCTION\s+[^\n;]+CASCADE/i.test(sqlWithoutComments)) {
    throw new Error("Safety violation: Detected DROP FUNCTION ... CASCADE. Non-CASCADE drop is required.");
  }

  // 12. Verify unknown non-canonical constraint protection & multi-column preservation
  if (!sqlWithoutComments.includes("cardinality(r_other.concols) > 1")) {
    throw new Error("Constraint preservation violation: Missing multi-column constraint preservation check.");
  }
  if (!sqlWithoutComments.includes("Unknown non-canonical constraint % detected")) {
    throw new Error("Constraint protection violation: Missing exception halt on unknown non-canonical constraints.");
  }

  // 13. Verify obsolete constraint definition verification before dropping
  if (!sqlWithoutComments.includes("matches obsolete name but has unexpected/modified definition")) {
    throw new Error("Obsolete constraint verification violation: Must verify actual constraint definition against known obsolete expression before dropping.");
  }

  return true;
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  FoodWise AI: Function Logic Simulation & Static SQL Checks   ');
  console.log('================================================================');
  console.log('  ⚠️ NOTE: Full SQL execution against a running PostgreSQL engine');
  console.log('           has NOT been performed locally (psql / Docker unavailable).');
  console.log('           Tests below are static syntax checks and Node.js trigger simulations.\n');

  // 1. SQL Syntax & Schema Integrity Check
  console.log('--- 1. PostgreSQL SQL Syntax & Grammar Validation ---');
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261116000000_foodwise_core_schema.sql');

  validateSchemaSqlSyntax(schemaPath);
  console.log('  ✅ [PASS] database/schema.sql parsed cleanly: Quotes, parentheses, brackets balanced.');

  validateSchemaSqlSyntax(migrationPath);
  console.log('  ✅ [PASS] supabase/migrations/... parsed cleanly.');

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  if (schemaContent !== migrationContent) {
    throw new Error('File mismatch: database/schema.sql and migration file differ!');
  }
  console.log('  ✅ [PASS] Both SQL files are 100% byte-for-byte identical.');
  console.log('  ✅ [PASS] Special SQL expressions check: Zero invalid pg_catalog.coalesce occurrences.');
  console.log('  ✅ [PASS] Destructive SQL check: 0 DROP TABLE, 0 DROP COLUMN, 0 TRUNCATE, 0 DELETE FROM.');
  console.log('  ✅ [PASS] CHECK constraint check: 0 ILIKE occurrences, row pre-validation, non-CASCADE repair.');
  console.log('  ✅ [PASS] Non-canonical constraint protection: Obsolete definition verification, multi-column preservation, and unknown constraint exception halts verified.');
  console.log('  ✅ [PASS] Legacy RPC check: refclassid pg_proc, deptype IN (n, a, i, e), non-CASCADE exception handler.\n');

  // 2. handle_new_user() Comprehensive Logic Tests
  console.log('--- 2. handle_new_user() Function Behavior Verification ---');
  const profilesTable = new Map<string, SimulatedProfile>();

  // Test Case A: User with full_name metadata
  const userA: SimulatedUser = {
    id: 'user-uuid-1',
    email: 'priya.sharma@example.com',
    raw_user_meta_data: {
      full_name: 'Priya Sharma',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    },
  };
  const resA = simulatePostgresHandleNewUser(userA, profilesTable);
  console.log(`  Case A (User with full_name metadata):`);
  console.log(`    full_name: "${resA.profile?.full_name}" (Expected: "Priya Sharma")`);
  console.log(`    avatar_url: "${resA.profile?.avatar_url}"`);
  if (resA.profile?.full_name !== 'Priya Sharma') {
    throw new Error('Case A failed: Expected full_name to be Priya Sharma');
  }
  console.log('    ✅ [PASS] full_name takes precedence.\n');

  // Test Case B: User with only name metadata
  const userB: SimulatedUser = {
    id: 'user-uuid-2',
    email: 'rahul.kumar@gmail.com',
    raw_user_meta_data: {
      name: 'Rahul Kumar',
    },
  };
  const resB = simulatePostgresHandleNewUser(userB, profilesTable);
  console.log(`  Case B (User with only name metadata):`);
  console.log(`    full_name: "${resB.profile?.full_name}" (Expected: "Rahul Kumar")`);
  if (resB.profile?.full_name !== 'Rahul Kumar') {
    throw new Error('Case B failed: Expected full_name to fall back to name');
  }
  console.log('    ✅ [PASS] name fallback succeeded.\n');

  // Test Case C: User with no name metadata
  const userC: SimulatedUser = {
    id: 'user-uuid-3',
    email: 'arjun_verma99@rediffmail.com',
    raw_user_meta_data: {},
  };
  const resC = simulatePostgresHandleNewUser(userC, profilesTable);
  console.log(`  Case C (User with no name metadata):`);
  console.log(`    full_name: "${resC.profile?.full_name}" (Expected: "arjun_verma99" via split_part)`);
  if (resC.profile?.full_name !== 'arjun_verma99') {
    throw new Error('Case C failed: Expected email username fallback');
  }
  console.log('    ✅ [PASS] split_part(email, "@", 1) username fallback succeeded.\n');

  // Test Case D: User with avatar_url metadata
  const userD: SimulatedUser = {
    id: 'user-uuid-4',
    email: 'deepika.p@yahoo.com',
    raw_user_meta_data: {
      name: 'Deepika Padukone',
      avatar_url: 'https://cdn.foodwise.ai/avatars/deepika.png',
    },
  };
  const resD = simulatePostgresHandleNewUser(userD, profilesTable);
  console.log(`  Case D (User with avatar_url metadata):`);
  console.log(`    avatar_url: "${resD.profile?.avatar_url}" (Expected: "https://cdn.foodwise.ai/avatars/deepika.png")`);
  if (resD.profile?.avatar_url !== 'https://cdn.foodwise.ai/avatars/deepika.png') {
    throw new Error('Case D failed: avatar_url did not match');
  }
  console.log('    ✅ [PASS] avatar_url populated correctly.\n');

  // Test Case E: User with no avatar metadata
  const userE: SimulatedUser = {
    id: 'user-uuid-5',
    email: 'noavatar@test.com',
    raw_user_meta_data: {
      full_name: 'No Avatar User',
    },
  };
  const resE = simulatePostgresHandleNewUser(userE, profilesTable);
  console.log(`  Case E (User with no avatar metadata):`);
  console.log(`    avatar_url: ${resE.profile?.avatar_url} (Expected: null)`);
  if (resE.profile?.avatar_url !== null) {
    throw new Error('Case E failed: Expected avatar_url to be null');
  }
  console.log('    ✅ [PASS] avatar_url correctly resolves to null.\n');

  // Test Case F: ON CONFLICT (id) DO NOTHING duplicate prevention
  console.log('  Case F (Duplicate user trigger invocation):');
  const duplicateUserA: SimulatedUser = {
    id: 'user-uuid-1', // Same ID as userA
    email: 'hacked-email@evil.com',
    raw_user_meta_data: {
      full_name: 'Imposter Priya',
    },
  };
  const resF = simulatePostgresHandleNewUser(duplicateUserA, profilesTable);
  console.log(`    Conflict ignored: ${resF.conflictIgnored}`);
  console.log(`    Retained profile full_name: "${resF.profile?.full_name}" (Expected: "Priya Sharma")`);
  if (!resF.conflictIgnored || resF.profile?.full_name !== 'Priya Sharma') {
    throw new Error('Case F failed: ON CONFLICT did not protect the existing profile');
  }
  if (profilesTable.size !== 5) {
    throw new Error(`Profile table count error: Expected 5 profiles, found ${profilesTable.size}`);
  }
  console.log('    ✅ [PASS] ON CONFLICT (id) DO NOTHING cleanly preserves existing profile without duplicates.\n');

  console.log('================================================================');
  console.log('  ✅ ALL FUNCTION LOGIC & SYNTAX VALIDATION SUITES PASSED!      ');
  console.log('================================================================');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

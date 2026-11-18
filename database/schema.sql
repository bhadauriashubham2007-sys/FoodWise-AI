-- ==============================================================================
-- FoodWise AI — Complete Supabase PostgreSQL Database Schema (Final Hardened)
-- Migration File: 20261116000000_foodwise_core_schema.sql
-- ==============================================================================
-- Architecture & Security Guarantees:
-- 1. Integer PAISE for all money values (1 INR = 100 Paise).
-- 2. Unknown or dynamic fees are stored strictly as NULL, never assumed defaults.
-- 3. No Misleading / Fabricated Defaults:
--    - Restaurant ratings, cities, delivery times, and availabilities are NULL if unknown.
--    - Live user records are NOT automatically stamped as demo data (is_demo_* DEFAULT false).
-- 4. Native TIMESTAMPTZ with DEFAULT now():
--    - Eliminates timezone('utc'::text, now()) conversion artifacts that lose timezone context.
-- 5. Full Existing-Database Repair:
--    - Idempotent ADD COLUMN IF NOT EXISTS guards for all columns.
--    - Comprehensive constraint repair (PK, FK, UNIQUE, CHECK) via pg_constraint introspection.
--    - Safe DROP DEFAULT / DROP NOT NULL for pre-existing assumed defaults.
-- 6. RPC Rate-Limit Protection:
--    - RPC execution granted exclusively to backend service_role; REVOKED from PUBLIC, anon, and authenticated.
-- 7. Versioned Functions (_v2) with dependency-inspected legacy cleanup for 100% PostgreSQL compatibility.
-- 8. 100% Non-destructive: NO DROP TABLE, NO DROP COLUMN, NO TRUNCATE, NO DELETE FROM.
-- ==============================================================================

-- Enable UUID & Cryptographic extensions (standard on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. HARDENED UTILITY FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Automatically update updated_at column on row modification
-- Hardened: search_path explicitly locked to empty string, native now() preserves timestamptz instant
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ==============================================================================
-- 2. PROFILES TABLE
-- ==============================================================================
-- Extends Supabase auth.users with FoodWise delivery & dietary preferences
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  dietary_preference TEXT NOT NULL DEFAULT 'all' 
    CHECK (dietary_preference IN ('all', 'veg', 'non-veg', 'egg', 'vegan')),
  preferred_platform TEXT NOT NULL DEFAULT 'all' 
    CHECK (preferred_platform IN ('all', 'zomato', 'swiggy', 'toing')),
  default_city TEXT,
  default_pincode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_preference TEXT NOT NULL DEFAULT 'all' CHECK (dietary_preference IN ('all', 'veg', 'non-veg', 'egg', 'vegan'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_platform TEXT NOT NULL DEFAULT 'all' CHECK (preferred_platform IN ('all', 'zomato', 'swiggy', 'toing'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_pincode TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_profiles_dietary on dietary_preference
  -- Canonical rule: (dietary_preference IS NULL OR dietary_preference IN ('all', 'veg', 'non-veg', 'egg', 'vegan'))
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.profiles
  WHERE NOT (dietary_preference IS NULL OR dietary_preference IN ('all', 'veg', 'non-veg', 'egg', 'vegan'));

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_profiles_dietary', 'public.profiles', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving dietary_preference
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.profiles'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_profiles_dietary'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'dietary_preference'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.profiles', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((dietary_preference IS NULL) OR (dietary_preference = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text]))))',
      'CHECK ((dietary_preference IS NULL OR (dietary_preference = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text]))))',
      'CHECK ((dietary_preference IS NULL OR dietary_preference = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text])))',
      'CHECK (dietary_preference IS NULL OR dietary_preference IN (''all'', ''veg'', ''non-veg'', ''egg'', ''vegan''))'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.profiles', 'dietary_preference', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['profiles_dietary_preference_check', 'chk_profiles_dietary_old', 'profiles_dietary_check']::text[]) AND r_other.condef IN (
        'CHECK (((dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''both''::text]))))',
        'CHECK ((dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''both''::text])))',
        'CHECK (dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''both''::text]))',
        'CHECK (dietary_preference IN (''veg'', ''non-veg'', ''both''))',
        'CHECK (((dietary_preference IS NULL) OR (dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''both''::text]))))',
        'CHECK ((dietary_preference IS NULL OR (dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''both''::text]))))',
        'CHECK (dietary_preference IS NULL OR dietary_preference IN (''veg'', ''non-veg'', ''both''))',
        'CHECK (((dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text]))))',
        'CHECK ((dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text])))',
        'CHECK (dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text]))',
        'CHECK (dietary_preference IN (''veg'', ''non-veg''))',
        'CHECK (((dietary_preference IS NULL) OR (dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text]))))',
        'CHECK ((dietary_preference IS NULL OR (dietary_preference = ANY (ARRAY[''veg''::text, ''non-veg''::text]))))',
        'CHECK (dietary_preference IS NULL OR dietary_preference IN (''veg'', ''non-veg''))',
        'CHECK (((dietary_preference)::text = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text])))',
        'CHECK ((dietary_preference = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text])))',
        'CHECK (dietary_preference = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text]))',
        'CHECK (dietary_preference IN (''all'', ''veg'', ''non-veg'', ''egg'', ''vegan''))'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.profiles', 'dietary_preference', r_other.condef;
      EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['profiles_dietary_preference_check', 'chk_profiles_dietary_old', 'profiles_dietary_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.profiles', 'dietary_preference', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.profiles', 'dietary_preference', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.profiles'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_profiles_dietary'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['dietary_preference'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((dietary_preference IS NULL) OR (dietary_preference = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text]))))',
      'CHECK ((dietary_preference IS NULL OR (dietary_preference = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text]))))',
      'CHECK ((dietary_preference IS NULL OR dietary_preference = ANY (ARRAY[''all''::text, ''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text])))',
      'CHECK (dietary_preference IS NULL OR dietary_preference IN (''all'', ''veg'', ''non-veg'', ''egg'', ''vegan''))'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_profiles_dietary', 'public.profiles', 'dietary_preference', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_profiles_dietary', 'public.profiles', v_con_def;
      ALTER TABLE public.profiles DROP CONSTRAINT chk_profiles_dietary;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.profiles'::regclass AND c.conname = 'chk_profiles_dietary'
    ) THEN
      ALTER TABLE public.profiles DROP CONSTRAINT chk_profiles_dietary;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_dietary 
      CHECK (dietary_preference IS NULL OR dietary_preference IN ('all', 'veg', 'non-veg', 'egg', 'vegan'));
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_profiles_platform on preferred_platform
  -- Canonical rule: (preferred_platform IS NULL OR preferred_platform IN ('all', 'zomato', 'swiggy', 'toing'))
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.profiles
  WHERE NOT (preferred_platform IS NULL OR preferred_platform IN ('all', 'zomato', 'swiggy', 'toing'));

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_profiles_platform', 'public.profiles', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving preferred_platform
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.profiles'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_profiles_platform'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'preferred_platform'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.profiles', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((preferred_platform IS NULL) OR (preferred_platform = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text]))))',
      'CHECK ((preferred_platform IS NULL OR (preferred_platform = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text]))))',
      'CHECK ((preferred_platform IS NULL OR preferred_platform = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text])))',
      'CHECK (preferred_platform IS NULL OR preferred_platform IN (''all'', ''zomato'', ''swiggy'', ''toing''))'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.profiles', 'preferred_platform', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['profiles_preferred_platform_check', 'chk_profiles_platform_old', 'profiles_platform_check']::text[]) AND r_other.condef IN (
        'CHECK (((preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text, ''cheapest''::text]))))',
        'CHECK ((preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text, ''cheapest''::text])))',
        'CHECK (preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text, ''cheapest''::text]))',
        'CHECK (preferred_platform IN (''zomato'', ''swiggy'', ''toing'', ''cheapest''))',
        'CHECK (((preferred_platform IS NULL) OR (preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text, ''cheapest''::text]))))',
        'CHECK ((preferred_platform IS NULL OR (preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text, ''cheapest''::text]))))',
        'CHECK (preferred_platform IS NULL OR preferred_platform IN (''zomato'', ''swiggy'', ''toing'', ''cheapest''))',
        'CHECK (((preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text]))))',
        'CHECK ((preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text])))',
        'CHECK (preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text]))',
        'CHECK (preferred_platform IN (''zomato'', ''swiggy'', ''toing''))',
        'CHECK (((preferred_platform IS NULL) OR (preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text]))))',
        'CHECK ((preferred_platform IS NULL OR (preferred_platform = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text]))))',
        'CHECK (preferred_platform IS NULL OR preferred_platform IN (''zomato'', ''swiggy'', ''toing''))',
        'CHECK (((preferred_platform)::text = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text])))',
        'CHECK ((preferred_platform = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text])))',
        'CHECK (preferred_platform = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text]))',
        'CHECK (preferred_platform IN (''all'', ''zomato'', ''swiggy'', ''toing''))'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.profiles', 'preferred_platform', r_other.condef;
      EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['profiles_preferred_platform_check', 'chk_profiles_platform_old', 'profiles_platform_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.profiles', 'preferred_platform', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.profiles', 'preferred_platform', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.profiles'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_profiles_platform'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['preferred_platform'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((preferred_platform IS NULL) OR (preferred_platform = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text]))))',
      'CHECK ((preferred_platform IS NULL OR (preferred_platform = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text]))))',
      'CHECK ((preferred_platform IS NULL OR preferred_platform = ANY (ARRAY[''all''::text, ''zomato''::text, ''swiggy''::text, ''toing''::text])))',
      'CHECK (preferred_platform IS NULL OR preferred_platform IN (''all'', ''zomato'', ''swiggy'', ''toing''))'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_profiles_platform', 'public.profiles', 'preferred_platform', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_profiles_platform', 'public.profiles', v_con_def;
      ALTER TABLE public.profiles DROP CONSTRAINT chk_profiles_platform;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.profiles'::regclass AND c.conname = 'chk_profiles_platform'
    ) THEN
      ALTER TABLE public.profiles DROP CONSTRAINT chk_profiles_platform;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_platform 
      CHECK (preferred_platform IS NULL OR preferred_platform IN ('all', 'zomato', 'swiggy', 'toing'));
  END IF;
END $$;

-- Remove misleading defaults if pre-existing
ALTER TABLE public.profiles ALTER COLUMN default_city DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN default_pincode DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT now();

-- Trigger: auto-sync auth.users to public.profiles
-- Hardened: search_path locked to empty string, COALESCE standard SQL syntax, split_part schema-qualified
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      pg_catalog.split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Attach trigger to auth.users (guarded if auth schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. PLATFORMS TABLE
-- ==============================================================================
-- Directory of food delivery platforms: Zomato, Swiggy, Toing
-- Fee columns are strictly NULL by default (dynamic live fees calculated per order at checkout)
CREATE TABLE IF NOT EXISTS public.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('zomato', 'swiggy', 'toing')),
  display_name TEXT NOT NULL,
  theme_color TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT NOT NULL,
  android_app_url TEXT,
  ios_app_url TEXT,
  base_delivery_fee_paise INTEGER CHECK (base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0),
  distance_surge_rate_paise_per_km INTEGER CHECK (distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0),
  default_platform_fee_paise INTEGER CHECK (default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0),
  fees_are_estimated BOOLEAN NOT NULL DEFAULT true,
  fee_disclosure_note TEXT DEFAULT 'Dynamic live fees calculated per restaurant and delivery location at platform checkout.',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS theme_color TEXT;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS android_app_url TEXT;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS ios_app_url TEXT;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS base_delivery_fee_paise INTEGER CHECK (base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0);
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS distance_surge_rate_paise_per_km INTEGER CHECK (distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0);
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS default_platform_fee_paise INTEGER CHECK (default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0);
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS fees_are_estimated BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS fee_disclosure_note TEXT DEFAULT 'Dynamic live fees calculated per restaurant and delivery location at platform checkout.';
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.platforms'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'uq_platforms_code'
        OR (
          SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ) = ARRAY['code']
      )
  ) THEN
    ALTER TABLE public.platforms ADD CONSTRAINT uq_platforms_code UNIQUE (code);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_platforms_code on code
  -- Canonical rule: (code IN ('zomato', 'swiggy', 'toing'))
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.platforms
  WHERE NOT (code IN ('zomato', 'swiggy', 'toing'));

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_platforms_code', 'public.platforms', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving code
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.platforms'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_platforms_code'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'code'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.platforms', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((code)::text = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text])))',
      'CHECK ((code = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text])))',
      'CHECK (code = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text]))',
      'CHECK (code IN (''zomato'', ''swiggy'', ''toing''))'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.platforms', 'code', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['platforms_code_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.platforms', 'code', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.platforms', 'code', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.platforms'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_platforms_code'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['code'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((code)::text = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text])))',
      'CHECK ((code = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text])))',
      'CHECK (code = ANY (ARRAY[''zomato''::text, ''swiggy''::text, ''toing''::text]))',
      'CHECK (code IN (''zomato'', ''swiggy'', ''toing''))'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_platforms_code', 'public.platforms', 'code', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_platforms_code', 'public.platforms', v_con_def;
      ALTER TABLE public.platforms DROP CONSTRAINT chk_platforms_code;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.platforms'::regclass AND c.conname = 'chk_platforms_code'
    ) THEN
      ALTER TABLE public.platforms DROP CONSTRAINT chk_platforms_code;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.platforms ADD CONSTRAINT chk_platforms_code CHECK (code IN ('zomato', 'swiggy', 'toing'));
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_platforms_delivery_fee on base_delivery_fee_paise
  -- Canonical rule: (base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.platforms
  WHERE NOT (base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_platforms_delivery_fee', 'public.platforms', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving base_delivery_fee_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.platforms'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_platforms_delivery_fee'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'base_delivery_fee_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.platforms', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((base_delivery_fee_paise IS NULL) OR (base_delivery_fee_paise >= 0)))',
      'CHECK ((base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0))',
      'CHECK (base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.platforms', 'base_delivery_fee_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['platforms_base_delivery_fee_paise_check']::text[]) AND r_other.condef IN (
        'CHECK ((base_delivery_fee_paise >= 0))',
        'CHECK (base_delivery_fee_paise >= 0)'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.platforms', 'base_delivery_fee_paise', r_other.condef;
      EXECUTE 'ALTER TABLE public.platforms DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['platforms_base_delivery_fee_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.platforms', 'base_delivery_fee_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.platforms', 'base_delivery_fee_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.platforms'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_platforms_delivery_fee'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['base_delivery_fee_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((base_delivery_fee_paise IS NULL) OR (base_delivery_fee_paise >= 0)))',
      'CHECK ((base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0))',
      'CHECK (base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_platforms_delivery_fee', 'public.platforms', 'base_delivery_fee_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_platforms_delivery_fee', 'public.platforms', v_con_def;
      ALTER TABLE public.platforms DROP CONSTRAINT chk_platforms_delivery_fee;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.platforms'::regclass AND c.conname = 'chk_platforms_delivery_fee'
    ) THEN
      ALTER TABLE public.platforms DROP CONSTRAINT chk_platforms_delivery_fee;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.platforms ADD CONSTRAINT chk_platforms_delivery_fee CHECK (base_delivery_fee_paise IS NULL OR base_delivery_fee_paise >= 0);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_platforms_surge_rate on distance_surge_rate_paise_per_km
  -- Canonical rule: (distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.platforms
  WHERE NOT (distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_platforms_surge_rate', 'public.platforms', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving distance_surge_rate_paise_per_km
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.platforms'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_platforms_surge_rate'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'distance_surge_rate_paise_per_km'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.platforms', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((distance_surge_rate_paise_per_km IS NULL) OR (distance_surge_rate_paise_per_km >= 0)))',
      'CHECK ((distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0))',
      'CHECK (distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.platforms', 'distance_surge_rate_paise_per_km', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['platforms_distance_surge_rate_paise_per_km_check']::text[]) AND r_other.condef IN (
        'CHECK ((distance_surge_rate_paise_per_km >= 0))',
        'CHECK (distance_surge_rate_paise_per_km >= 0)'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.platforms', 'distance_surge_rate_paise_per_km', r_other.condef;
      EXECUTE 'ALTER TABLE public.platforms DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['platforms_distance_surge_rate_paise_per_km_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.platforms', 'distance_surge_rate_paise_per_km', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.platforms', 'distance_surge_rate_paise_per_km', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.platforms'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_platforms_surge_rate'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['distance_surge_rate_paise_per_km'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((distance_surge_rate_paise_per_km IS NULL) OR (distance_surge_rate_paise_per_km >= 0)))',
      'CHECK ((distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0))',
      'CHECK (distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_platforms_surge_rate', 'public.platforms', 'distance_surge_rate_paise_per_km', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_platforms_surge_rate', 'public.platforms', v_con_def;
      ALTER TABLE public.platforms DROP CONSTRAINT chk_platforms_surge_rate;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.platforms'::regclass AND c.conname = 'chk_platforms_surge_rate'
    ) THEN
      ALTER TABLE public.platforms DROP CONSTRAINT chk_platforms_surge_rate;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.platforms ADD CONSTRAINT chk_platforms_surge_rate CHECK (distance_surge_rate_paise_per_km IS NULL OR distance_surge_rate_paise_per_km >= 0);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_platforms_platform_fee on default_platform_fee_paise
  -- Canonical rule: (default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.platforms
  WHERE NOT (default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_platforms_platform_fee', 'public.platforms', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving default_platform_fee_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.platforms'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_platforms_platform_fee'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'default_platform_fee_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.platforms', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((default_platform_fee_paise IS NULL) OR (default_platform_fee_paise >= 0)))',
      'CHECK ((default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0))',
      'CHECK (default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.platforms', 'default_platform_fee_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['platforms_default_platform_fee_paise_check']::text[]) AND r_other.condef IN (
        'CHECK ((default_platform_fee_paise >= 0))',
        'CHECK (default_platform_fee_paise >= 0)'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.platforms', 'default_platform_fee_paise', r_other.condef;
      EXECUTE 'ALTER TABLE public.platforms DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['platforms_default_platform_fee_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.platforms', 'default_platform_fee_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.platforms', 'default_platform_fee_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.platforms'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_platforms_platform_fee'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['default_platform_fee_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((default_platform_fee_paise IS NULL) OR (default_platform_fee_paise >= 0)))',
      'CHECK ((default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0))',
      'CHECK (default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_platforms_platform_fee', 'public.platforms', 'default_platform_fee_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_platforms_platform_fee', 'public.platforms', v_con_def;
      ALTER TABLE public.platforms DROP CONSTRAINT chk_platforms_platform_fee;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.platforms'::regclass AND c.conname = 'chk_platforms_platform_fee'
    ) THEN
      ALTER TABLE public.platforms DROP CONSTRAINT chk_platforms_platform_fee;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.platforms ADD CONSTRAINT chk_platforms_platform_fee CHECK (default_platform_fee_paise IS NULL OR default_platform_fee_paise >= 0);
  END IF;
END $$;

-- Safe removal of unverified fee defaults
ALTER TABLE public.platforms ALTER COLUMN base_delivery_fee_paise DROP DEFAULT;
ALTER TABLE public.platforms ALTER COLUMN distance_surge_rate_paise_per_km DROP DEFAULT;
ALTER TABLE public.platforms ALTER COLUMN default_platform_fee_paise DROP DEFAULT;
ALTER TABLE public.platforms ALTER COLUMN base_delivery_fee_paise DROP NOT NULL;
ALTER TABLE public.platforms ALTER COLUMN distance_surge_rate_paise_per_km DROP NOT NULL;
ALTER TABLE public.platforms ALTER COLUMN default_platform_fee_paise DROP NOT NULL;
ALTER TABLE public.platforms ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.platforms ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS set_platforms_updated_at ON public.platforms;
CREATE TRIGGER set_platforms_updated_at
  BEFORE UPDATE ON public.platforms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. RESTAURANTS TABLE
-- ==============================================================================
-- Standalone food outlets, kitchens and national brand chains
-- Ratings, counts, and cities are NULL if unknown (no fabricated 4.0 or Bengaluru defaults)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cuisine TEXT,
  rating NUMERIC(3, 2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5.0)),
  rating_count INTEGER CHECK (rating_count IS NULL OR rating_count >= 0),
  image_url TEXT,
  city TEXT,
  address TEXT,
  pincode TEXT,
  is_brand BOOLEAN NOT NULL DEFAULT false,
  brand_id TEXT,
  outlet_count_india TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS cuisine TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5.0));
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS rating_count INTEGER CHECK (rating_count IS NULL OR rating_count >= 0);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_brand BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS brand_id TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS outlet_count_india TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.restaurants'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'uq_restaurants_slug'
        OR (
          SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ) = ARRAY['slug']
      )
  ) THEN
    ALTER TABLE public.restaurants ADD CONSTRAINT uq_restaurants_slug UNIQUE (slug);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_restaurants_rating on rating
  -- Canonical rule: (rating IS NULL OR (rating >= 0 AND rating <= 5.0))
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.restaurants
  WHERE NOT (rating IS NULL OR (rating >= 0 AND rating <= 5.0));

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_restaurants_rating', 'public.restaurants', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving rating
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.restaurants'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_restaurants_rating'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'rating'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.restaurants', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((rating IS NULL) OR ((rating >= (0)::numeric) AND (rating <= 5.0))))',
      'CHECK (((rating IS NULL) OR ((rating >= 0::numeric) AND (rating <= 5.0))))',
      'CHECK (((rating IS NULL) OR ((rating >= (0)::numeric) AND (rating <= (5.0)::numeric))))',
      'CHECK (((rating IS NULL) OR ((rating >= 0) AND (rating <= 5.0))))',
      'CHECK ((rating IS NULL OR (rating >= 0 AND rating <= 5.0)))',
      'CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5.0))'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.restaurants', 'rating', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['restaurants_rating_check']::text[]) AND r_other.condef IN (
        'CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))',
        'CHECK (((rating >= (0)::numeric) AND (rating <= 5.0)))',
        'CHECK (((rating >= (0)::numeric) AND (rating <= (5.0)::numeric)))',
        'CHECK (((rating >= 0::numeric) AND (rating <= 5.0)))',
        'CHECK ((rating >= 0 AND rating <= 5))',
        'CHECK ((rating >= 0 AND rating <= 5.0))',
        'CHECK (rating >= 0 AND rating <= 5)',
        'CHECK (rating >= 0 AND rating <= 5.0)'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.restaurants', 'rating', r_other.condef;
      EXECUTE 'ALTER TABLE public.restaurants DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['restaurants_rating_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.restaurants', 'rating', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.restaurants', 'rating', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.restaurants'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_restaurants_rating'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['rating'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((rating IS NULL) OR ((rating >= (0)::numeric) AND (rating <= 5.0))))',
      'CHECK (((rating IS NULL) OR ((rating >= 0::numeric) AND (rating <= 5.0))))',
      'CHECK (((rating IS NULL) OR ((rating >= (0)::numeric) AND (rating <= (5.0)::numeric))))',
      'CHECK (((rating IS NULL) OR ((rating >= 0) AND (rating <= 5.0))))',
      'CHECK ((rating IS NULL OR (rating >= 0 AND rating <= 5.0)))',
      'CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5.0))'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_restaurants_rating', 'public.restaurants', 'rating', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_restaurants_rating', 'public.restaurants', v_con_def;
      ALTER TABLE public.restaurants DROP CONSTRAINT chk_restaurants_rating;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.restaurants'::regclass AND c.conname = 'chk_restaurants_rating'
    ) THEN
      ALTER TABLE public.restaurants DROP CONSTRAINT chk_restaurants_rating;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.restaurants ADD CONSTRAINT chk_restaurants_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5.0));
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_restaurants_rating_count on rating_count
  -- Canonical rule: (rating_count IS NULL OR rating_count >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.restaurants
  WHERE NOT (rating_count IS NULL OR rating_count >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_restaurants_rating_count', 'public.restaurants', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving rating_count
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.restaurants'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_restaurants_rating_count'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'rating_count'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.restaurants', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((rating_count IS NULL) OR (rating_count >= 0)))',
      'CHECK ((rating_count IS NULL OR rating_count >= 0))',
      'CHECK (rating_count IS NULL OR rating_count >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.restaurants', 'rating_count', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['restaurants_rating_count_check']::text[]) AND r_other.condef IN (
        'CHECK ((rating_count >= 0))',
        'CHECK (rating_count >= 0)'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.restaurants', 'rating_count', r_other.condef;
      EXECUTE 'ALTER TABLE public.restaurants DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['restaurants_rating_count_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.restaurants', 'rating_count', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.restaurants', 'rating_count', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.restaurants'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_restaurants_rating_count'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['rating_count'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((rating_count IS NULL) OR (rating_count >= 0)))',
      'CHECK ((rating_count IS NULL OR rating_count >= 0))',
      'CHECK (rating_count IS NULL OR rating_count >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_restaurants_rating_count', 'public.restaurants', 'rating_count', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_restaurants_rating_count', 'public.restaurants', v_con_def;
      ALTER TABLE public.restaurants DROP CONSTRAINT chk_restaurants_rating_count;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.restaurants'::regclass AND c.conname = 'chk_restaurants_rating_count'
    ) THEN
      ALTER TABLE public.restaurants DROP CONSTRAINT chk_restaurants_rating_count;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.restaurants ADD CONSTRAINT chk_restaurants_rating_count CHECK (rating_count IS NULL OR rating_count >= 0);
  END IF;
END $$;

-- Remove misleading defaults if pre-existing
ALTER TABLE public.restaurants ALTER COLUMN rating DROP DEFAULT;
ALTER TABLE public.restaurants ALTER COLUMN rating DROP NOT NULL;
ALTER TABLE public.restaurants ALTER COLUMN rating_count DROP DEFAULT;
ALTER TABLE public.restaurants ALTER COLUMN rating_count DROP NOT NULL;
ALTER TABLE public.restaurants ALTER COLUMN city DROP DEFAULT;
ALTER TABLE public.restaurants ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.restaurants ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.restaurants ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS set_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER set_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. FOOD ITEMS TABLE
-- ==============================================================================
-- Dishes and food products catalogue
-- Default for is_demo_data is strictly false; availability is nullable if undisclosed
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  cuisine TEXT,
  dietary TEXT NOT NULL CHECK (dietary IN ('veg', 'non-veg', 'egg', 'vegan')),
  description TEXT,
  image_url TEXT,
  serving_size TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_available BOOLEAN,
  is_demo_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_restaurant_food_slug UNIQUE (restaurant_id, slug)
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS cuisine TEXT;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS dietary TEXT CHECK (dietary IN ('veg', 'non-veg', 'egg', 'vegan'));
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS serving_size TEXT;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS is_demo_data BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.food_items'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'uq_restaurant_food_slug'
        OR (
          SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ) = ARRAY['restaurant_id', 'slug']
      )
  ) THEN
    ALTER TABLE public.food_items ADD CONSTRAINT uq_restaurant_food_slug UNIQUE (restaurant_id, slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.food_items'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_food_items_restaurant'
        OR (
          c.confrelid = 'public.restaurants'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['restaurant_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.food_items ADD CONSTRAINT fk_food_items_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_food_items_dietary on dietary
  -- Canonical rule: (dietary IN ('veg', 'non-veg', 'egg', 'vegan'))
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.food_items
  WHERE NOT (dietary IN ('veg', 'non-veg', 'egg', 'vegan'));

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_food_items_dietary', 'public.food_items', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving dietary
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.food_items'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_food_items_dietary'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'dietary'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.food_items', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((dietary)::text = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text])))',
      'CHECK ((dietary = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text])))',
      'CHECK (dietary = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text]))',
      'CHECK (dietary IN (''veg'', ''non-veg'', ''egg'', ''vegan''))'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.food_items', 'dietary', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['food_items_dietary_check']::text[]) AND r_other.condef IN (
        'CHECK (((dietary)::text = ANY (ARRAY[''veg''::text, ''non-veg''::text])))',
        'CHECK ((dietary = ANY (ARRAY[''veg''::text, ''non-veg''::text])))',
        'CHECK (dietary = ANY (ARRAY[''veg''::text, ''non-veg''::text]))',
        'CHECK (dietary IN (''veg'', ''non-veg''))'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.food_items', 'dietary', r_other.condef;
      EXECUTE 'ALTER TABLE public.food_items DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['food_items_dietary_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.food_items', 'dietary', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.food_items', 'dietary', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.food_items'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_food_items_dietary'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['dietary'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((dietary)::text = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text])))',
      'CHECK ((dietary = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text])))',
      'CHECK (dietary = ANY (ARRAY[''veg''::text, ''non-veg''::text, ''egg''::text, ''vegan''::text]))',
      'CHECK (dietary IN (''veg'', ''non-veg'', ''egg'', ''vegan''))'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_food_items_dietary', 'public.food_items', 'dietary', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_food_items_dietary', 'public.food_items', v_con_def;
      ALTER TABLE public.food_items DROP CONSTRAINT chk_food_items_dietary;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.food_items'::regclass AND c.conname = 'chk_food_items_dietary'
    ) THEN
      ALTER TABLE public.food_items DROP CONSTRAINT chk_food_items_dietary;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.food_items ADD CONSTRAINT chk_food_items_dietary CHECK (dietary IN ('veg', 'non-veg', 'egg', 'vegan'));
  END IF;
END $$;

-- Adjust existing column defaults safely
ALTER TABLE public.food_items ALTER COLUMN is_available DROP DEFAULT;
ALTER TABLE public.food_items ALTER COLUMN is_available DROP NOT NULL;
ALTER TABLE public.food_items ALTER COLUMN is_demo_data SET DEFAULT false;
ALTER TABLE public.food_items ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.food_items ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS set_food_items_updated_at ON public.food_items;
CREATE TRIGGER set_food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. PRICE SNAPSHOTS TABLE
-- ==============================================================================
-- Point-in-time pricing quotes captured across delivery platforms
-- Delivery time and availability are NULL if unknown (no assumed 30 mins or true)
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  base_price_paise INTEGER NOT NULL CHECK (base_price_paise >= 0),
  packaging_fee_paise INTEGER CHECK (packaging_fee_paise IS NULL OR packaging_fee_paise >= 0),
  delivery_fee_paise INTEGER CHECK (delivery_fee_paise IS NULL OR delivery_fee_paise >= 0),
  platform_fee_paise INTEGER CHECK (platform_fee_paise IS NULL OR platform_fee_paise >= 0),
  taxes_paise INTEGER CHECK (taxes_paise IS NULL OR taxes_paise >= 0),
  surge_fee_paise INTEGER CHECK (surge_fee_paise IS NULL OR surge_fee_paise >= 0),
  known_fees_total_paise INTEGER NOT NULL CHECK (known_fees_total_paise >= 0),
  final_price_paise INTEGER NOT NULL CHECK (final_price_paise >= 0),
  delivery_time_minutes INTEGER CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0),
  link_type TEXT NOT NULL DEFAULT 'search_fallback' 
    CHECK (link_type IN ('exact_dish', 'restaurant_fallback', 'search_fallback')),
  direct_order_url TEXT NOT NULL,
  source_url TEXT,
  is_available BOOLEAN,
  unavailability_reason TEXT,
  snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE;
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS platform_id UUID REFERENCES public.platforms(id) ON DELETE CASCADE;
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS base_price_paise INTEGER CHECK (base_price_paise >= 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS packaging_fee_paise INTEGER CHECK (packaging_fee_paise IS NULL OR packaging_fee_paise >= 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS delivery_fee_paise INTEGER CHECK (delivery_fee_paise IS NULL OR delivery_fee_paise >= 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS platform_fee_paise INTEGER CHECK (platform_fee_paise IS NULL OR platform_fee_paise >= 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS taxes_paise INTEGER CHECK (taxes_paise IS NULL OR taxes_paise >= 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS surge_fee_paise INTEGER CHECK (surge_fee_paise IS NULL OR surge_fee_paise >= 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS known_fees_total_paise INTEGER CHECK (known_fees_total_paise >= 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS final_price_paise INTEGER CHECK (final_price_paise >= 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS delivery_time_minutes INTEGER CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0);
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'search_fallback' CHECK (link_type IN ('exact_dish', 'restaurant_fallback', 'search_fallback'));
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS direct_order_url TEXT;
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS is_available BOOLEAN;
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS unavailability_reason TEXT;
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.price_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.price_snapshots'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_price_snapshots_food_item'
        OR (
          c.confrelid = 'public.food_items'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['food_item_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.price_snapshots ADD CONSTRAINT fk_price_snapshots_food_item FOREIGN KEY (food_item_id) REFERENCES public.food_items(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.price_snapshots'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_price_snapshots_platform'
        OR (
          c.confrelid = 'public.platforms'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['platform_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.price_snapshots ADD CONSTRAINT fk_price_snapshots_platform FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_price_snapshots_base_price on base_price_paise
  -- Canonical rule: (base_price_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.price_snapshots
  WHERE NOT (base_price_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_price_snapshots_base_price', 'public.price_snapshots', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving base_price_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.price_snapshots'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_price_snapshots_base_price'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'base_price_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.price_snapshots', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK ((base_price_paise >= 0))',
      'CHECK (base_price_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.price_snapshots', 'base_price_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['price_snapshots_base_price_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.price_snapshots', 'base_price_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.price_snapshots', 'base_price_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.price_snapshots'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_price_snapshots_base_price'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['base_price_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK ((base_price_paise >= 0))',
      'CHECK (base_price_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_price_snapshots_base_price', 'public.price_snapshots', 'base_price_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_price_snapshots_base_price', 'public.price_snapshots', v_con_def;
      ALTER TABLE public.price_snapshots DROP CONSTRAINT chk_price_snapshots_base_price;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.price_snapshots'::regclass AND c.conname = 'chk_price_snapshots_base_price'
    ) THEN
      ALTER TABLE public.price_snapshots DROP CONSTRAINT chk_price_snapshots_base_price;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.price_snapshots ADD CONSTRAINT chk_price_snapshots_base_price CHECK (base_price_paise >= 0);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_price_snapshots_final_price on final_price_paise
  -- Canonical rule: (final_price_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.price_snapshots
  WHERE NOT (final_price_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_price_snapshots_final_price', 'public.price_snapshots', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving final_price_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.price_snapshots'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_price_snapshots_final_price'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'final_price_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.price_snapshots', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK ((final_price_paise >= 0))',
      'CHECK (final_price_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.price_snapshots', 'final_price_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['price_snapshots_final_price_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.price_snapshots', 'final_price_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.price_snapshots', 'final_price_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.price_snapshots'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_price_snapshots_final_price'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['final_price_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK ((final_price_paise >= 0))',
      'CHECK (final_price_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_price_snapshots_final_price', 'public.price_snapshots', 'final_price_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_price_snapshots_final_price', 'public.price_snapshots', v_con_def;
      ALTER TABLE public.price_snapshots DROP CONSTRAINT chk_price_snapshots_final_price;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.price_snapshots'::regclass AND c.conname = 'chk_price_snapshots_final_price'
    ) THEN
      ALTER TABLE public.price_snapshots DROP CONSTRAINT chk_price_snapshots_final_price;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.price_snapshots ADD CONSTRAINT chk_price_snapshots_final_price CHECK (final_price_paise >= 0);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_price_snapshots_delivery_time on delivery_time_minutes
  -- Canonical rule: (delivery_time_minutes IS NULL OR delivery_time_minutes > 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.price_snapshots
  WHERE NOT (delivery_time_minutes IS NULL OR delivery_time_minutes > 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_price_snapshots_delivery_time', 'public.price_snapshots', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving delivery_time_minutes
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.price_snapshots'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_price_snapshots_delivery_time'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'delivery_time_minutes'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.price_snapshots', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((delivery_time_minutes IS NULL) OR (delivery_time_minutes > 0)))',
      'CHECK ((delivery_time_minutes IS NULL OR delivery_time_minutes > 0))',
      'CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.price_snapshots', 'delivery_time_minutes', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['price_snapshots_delivery_time_minutes_check', 'chk_price_snapshots_delivery_time_old']::text[]) AND r_other.condef IN (
        'CHECK ((delivery_time_minutes >= 0))',
        'CHECK (delivery_time_minutes >= 0)',
        'CHECK (((delivery_time_minutes IS NULL) OR (delivery_time_minutes >= 0)))',
        'CHECK ((delivery_time_minutes IS NULL OR delivery_time_minutes >= 0))',
        'CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes >= 0)',
        'CHECK ((delivery_time_minutes > 0))',
        'CHECK (delivery_time_minutes > 0)'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.price_snapshots', 'delivery_time_minutes', r_other.condef;
      EXECUTE 'ALTER TABLE public.price_snapshots DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['price_snapshots_delivery_time_minutes_check', 'chk_price_snapshots_delivery_time_old']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.price_snapshots', 'delivery_time_minutes', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.price_snapshots', 'delivery_time_minutes', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.price_snapshots'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_price_snapshots_delivery_time'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['delivery_time_minutes'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((delivery_time_minutes IS NULL) OR (delivery_time_minutes > 0)))',
      'CHECK ((delivery_time_minutes IS NULL OR delivery_time_minutes > 0))',
      'CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_price_snapshots_delivery_time', 'public.price_snapshots', 'delivery_time_minutes', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_price_snapshots_delivery_time', 'public.price_snapshots', v_con_def;
      ALTER TABLE public.price_snapshots DROP CONSTRAINT chk_price_snapshots_delivery_time;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.price_snapshots'::regclass AND c.conname = 'chk_price_snapshots_delivery_time'
    ) THEN
      ALTER TABLE public.price_snapshots DROP CONSTRAINT chk_price_snapshots_delivery_time;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.price_snapshots ADD CONSTRAINT chk_price_snapshots_delivery_time CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0);
  END IF;
END $$;

-- Remove misleading defaults if pre-existing
ALTER TABLE public.price_snapshots ALTER COLUMN delivery_time_minutes DROP DEFAULT;
ALTER TABLE public.price_snapshots ALTER COLUMN delivery_time_minutes DROP NOT NULL;
ALTER TABLE public.price_snapshots ALTER COLUMN is_available DROP DEFAULT;
ALTER TABLE public.price_snapshots ALTER COLUMN is_available DROP NOT NULL;
ALTER TABLE public.price_snapshots ALTER COLUMN snapshot_timestamp SET DEFAULT now();
ALTER TABLE public.price_snapshots ALTER COLUMN created_at SET DEFAULT now();

-- ==============================================================================
-- 7. COUPONS TABLE
-- ==============================================================================
-- Promotional coupon codes
-- Pre-existing records are NOT defaulted to demo (is_demo_coupon DEFAULT false)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  is_available BOOLEAN,
  is_demo_coupon BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_platform_coupon_code UNIQUE (platform_id, code)
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS platform_id UUID REFERENCES public.platforms(id) ON DELETE CASCADE;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_available BOOLEAN;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_demo_coupon BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.coupons'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'uq_platform_coupon_code'
        OR (
          SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ) = ARRAY['platform_id', 'code']
      )
  ) THEN
    ALTER TABLE public.coupons ADD CONSTRAINT uq_platform_coupon_code UNIQUE (platform_id, code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.coupons'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_coupons_platform'
        OR (
          c.confrelid = 'public.platforms'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['platform_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.coupons ADD CONSTRAINT fk_coupons_platform FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adjust existing column defaults safely
ALTER TABLE public.coupons ALTER COLUMN is_available DROP DEFAULT;
ALTER TABLE public.coupons ALTER COLUMN is_available DROP NOT NULL;
ALTER TABLE public.coupons ALTER COLUMN is_demo_coupon SET DEFAULT false;
ALTER TABLE public.coupons ALTER COLUMN valid_from SET DEFAULT now();
ALTER TABLE public.coupons ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.coupons ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS set_coupons_updated_at ON public.coupons;
CREATE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. COUPON RULES TABLE
-- ==============================================================================
-- Exact mathematical discount rules and eligibility thresholds
CREATE TABLE IF NOT EXISTS public.coupon_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_percentage INTEGER CHECK (discount_percentage IS NULL OR (discount_percentage > 0 AND discount_percentage <= 100)),
  discount_value_paise INTEGER CHECK (discount_value_paise IS NULL OR discount_value_paise > 0),
  max_discount_paise INTEGER CHECK (max_discount_paise IS NULL OR max_discount_paise > 0),
  min_order_paise INTEGER NOT NULL DEFAULT 0 CHECK (min_order_paise >= 0),
  terms TEXT[] NOT NULL DEFAULT '{}',
  is_demo_rule BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE;
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'flat'));
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS discount_percentage INTEGER CHECK (discount_percentage IS NULL OR (discount_percentage > 0 AND discount_percentage <= 100));
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS discount_value_paise INTEGER CHECK (discount_value_paise IS NULL OR discount_value_paise > 0);
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS max_discount_paise INTEGER CHECK (max_discount_paise IS NULL OR max_discount_paise > 0);
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS min_order_paise INTEGER NOT NULL DEFAULT 0 CHECK (min_order_paise >= 0);
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS terms TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS is_demo_rule BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.coupon_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.coupon_rules'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_coupon_rules_coupon'
        OR (
          c.confrelid = 'public.coupons'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['coupon_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.coupon_rules ADD CONSTRAINT fk_coupon_rules_coupon FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_coupon_rules_type on discount_type
  -- Canonical rule: (discount_type IN ('percentage', 'flat'))
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.coupon_rules
  WHERE NOT (discount_type IN ('percentage', 'flat'));

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_coupon_rules_type', 'public.coupon_rules', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving discount_type
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.coupon_rules'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_coupon_rules_type'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'discount_type'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.coupon_rules', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((discount_type)::text = ANY (ARRAY[''percentage''::text, ''flat''::text])))',
      'CHECK ((discount_type = ANY (ARRAY[''percentage''::text, ''flat''::text])))',
      'CHECK (discount_type = ANY (ARRAY[''percentage''::text, ''flat''::text]))',
      'CHECK (discount_type IN (''percentage'', ''flat''))'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.coupon_rules', 'discount_type', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['coupon_rules_discount_type_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.coupon_rules', 'discount_type', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.coupon_rules', 'discount_type', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.coupon_rules'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_coupon_rules_type'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['discount_type'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((discount_type)::text = ANY (ARRAY[''percentage''::text, ''flat''::text])))',
      'CHECK ((discount_type = ANY (ARRAY[''percentage''::text, ''flat''::text])))',
      'CHECK (discount_type = ANY (ARRAY[''percentage''::text, ''flat''::text]))',
      'CHECK (discount_type IN (''percentage'', ''flat''))'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_coupon_rules_type', 'public.coupon_rules', 'discount_type', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_coupon_rules_type', 'public.coupon_rules', v_con_def;
      ALTER TABLE public.coupon_rules DROP CONSTRAINT chk_coupon_rules_type;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.coupon_rules'::regclass AND c.conname = 'chk_coupon_rules_type'
    ) THEN
      ALTER TABLE public.coupon_rules DROP CONSTRAINT chk_coupon_rules_type;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.coupon_rules ADD CONSTRAINT chk_coupon_rules_type CHECK (discount_type IN ('percentage', 'flat'));
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_coupon_rules_min_order on min_order_paise
  -- Canonical rule: (min_order_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.coupon_rules
  WHERE NOT (min_order_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_coupon_rules_min_order', 'public.coupon_rules', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving min_order_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.coupon_rules'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_coupon_rules_min_order'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'min_order_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.coupon_rules', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK ((min_order_paise >= 0))',
      'CHECK (min_order_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.coupon_rules', 'min_order_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['coupon_rules_min_order_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.coupon_rules', 'min_order_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.coupon_rules', 'min_order_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.coupon_rules'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_coupon_rules_min_order'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['min_order_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK ((min_order_paise >= 0))',
      'CHECK (min_order_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_coupon_rules_min_order', 'public.coupon_rules', 'min_order_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_coupon_rules_min_order', 'public.coupon_rules', v_con_def;
      ALTER TABLE public.coupon_rules DROP CONSTRAINT chk_coupon_rules_min_order;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.coupon_rules'::regclass AND c.conname = 'chk_coupon_rules_min_order'
    ) THEN
      ALTER TABLE public.coupon_rules DROP CONSTRAINT chk_coupon_rules_min_order;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.coupon_rules ADD CONSTRAINT chk_coupon_rules_min_order CHECK (min_order_paise >= 0);
  END IF;
END $$;

-- Adjust existing column defaults safely
ALTER TABLE public.coupon_rules ALTER COLUMN is_demo_rule SET DEFAULT false;
ALTER TABLE public.coupon_rules ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.coupon_rules ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS set_coupon_rules_updated_at ON public.coupon_rules;
CREATE TRIGGER set_coupon_rules_updated_at
  BEFORE UPDATE ON public.coupon_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. SEARCH SESSIONS TABLE
-- ==============================================================================
-- Audit log of user queries & Gemini intent extraction
-- Hardened Privacy: Anonymous search queries cannot be read by clients
CREATE TABLE IF NOT EXISTS public.search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  raw_query TEXT NOT NULL,
  extracted_intent JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_keywords TEXT[] NOT NULL DEFAULT '{}',
  dietary_filter TEXT,
  budget_paise INTEGER,
  selected_platform TEXT,
  results_count INTEGER NOT NULL DEFAULT 0,
  ip_address_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS raw_query TEXT;
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS extracted_intent JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS matched_keywords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS dietary_filter TEXT;
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS budget_paise INTEGER;
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS selected_platform TEXT;
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS results_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS ip_address_hash TEXT;
ALTER TABLE public.search_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.search_sessions'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_search_sessions_user'
        OR (
          c.confrelid = 'public.profiles'::regclass
          AND c.confdeltype = 'n'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['user_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.search_sessions ADD CONSTRAINT fk_search_sessions_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_search_sessions_budget on budget_paise
  -- Canonical rule: (budget_paise IS NULL OR budget_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.search_sessions
  WHERE NOT (budget_paise IS NULL OR budget_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_search_sessions_budget', 'public.search_sessions', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving budget_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.search_sessions'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_search_sessions_budget'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'budget_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.search_sessions', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((budget_paise IS NULL) OR (budget_paise >= 0)))',
      'CHECK ((budget_paise IS NULL OR budget_paise >= 0))',
      'CHECK (budget_paise IS NULL OR budget_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.search_sessions', 'budget_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['search_sessions_budget_paise_check']::text[]) AND r_other.condef IN (
        'CHECK ((budget_paise >= 0))',
        'CHECK (budget_paise >= 0)'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.search_sessions', 'budget_paise', r_other.condef;
      EXECUTE 'ALTER TABLE public.search_sessions DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['search_sessions_budget_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.search_sessions', 'budget_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.search_sessions', 'budget_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.search_sessions'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_search_sessions_budget'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['budget_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((budget_paise IS NULL) OR (budget_paise >= 0)))',
      'CHECK ((budget_paise IS NULL OR budget_paise >= 0))',
      'CHECK (budget_paise IS NULL OR budget_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_search_sessions_budget', 'public.search_sessions', 'budget_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_search_sessions_budget', 'public.search_sessions', v_con_def;
      ALTER TABLE public.search_sessions DROP CONSTRAINT chk_search_sessions_budget;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.search_sessions'::regclass AND c.conname = 'chk_search_sessions_budget'
    ) THEN
      ALTER TABLE public.search_sessions DROP CONSTRAINT chk_search_sessions_budget;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.search_sessions ADD CONSTRAINT chk_search_sessions_budget CHECK (budget_paise IS NULL OR budget_paise >= 0);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_search_sessions_results on results_count
  -- Canonical rule: (results_count >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.search_sessions
  WHERE NOT (results_count >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_search_sessions_results', 'public.search_sessions', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving results_count
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.search_sessions'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_search_sessions_results'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'results_count'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.search_sessions', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK ((results_count >= 0))',
      'CHECK (results_count >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.search_sessions', 'results_count', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['search_sessions_results_count_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.search_sessions', 'results_count', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.search_sessions', 'results_count', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.search_sessions'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_search_sessions_results'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['results_count'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK ((results_count >= 0))',
      'CHECK (results_count >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_search_sessions_results', 'public.search_sessions', 'results_count', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_search_sessions_results', 'public.search_sessions', v_con_def;
      ALTER TABLE public.search_sessions DROP CONSTRAINT chk_search_sessions_results;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.search_sessions'::regclass AND c.conname = 'chk_search_sessions_results'
    ) THEN
      ALTER TABLE public.search_sessions DROP CONSTRAINT chk_search_sessions_results;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.search_sessions ADD CONSTRAINT chk_search_sessions_results CHECK (results_count >= 0);
  END IF;
END $$;

ALTER TABLE public.search_sessions ALTER COLUMN created_at SET DEFAULT now();

-- ==============================================================================
-- 10. COMPARISONS TABLE
-- ==============================================================================
-- Master record of a multi-platform price comparison with secure sharing
CREATE TABLE IF NOT EXISTS public.comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.search_sessions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  cheapest_platform_id UUID REFERENCES public.platforms(id) ON DELETE SET NULL,
  cheapest_price_paise INTEGER NOT NULL CHECK (cheapest_price_paise >= 0),
  highest_price_paise INTEGER NOT NULL CHECK (highest_price_paise >= 0),
  savings_paise INTEGER NOT NULL CHECK (savings_paise >= 0),
  recommendation_reason TEXT,
  is_public_share BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE,
  is_demo_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.search_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS cheapest_platform_id UUID REFERENCES public.platforms(id) ON DELETE SET NULL;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS cheapest_price_paise INTEGER CHECK (cheapest_price_paise >= 0);
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS highest_price_paise INTEGER CHECK (highest_price_paise >= 0);
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS savings_paise INTEGER CHECK (savings_paise >= 0);
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS recommendation_reason TEXT;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS is_public_share BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS is_demo_data BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparisons'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_comparisons_session'
        OR (
          c.confrelid = 'public.search_sessions'::regclass
          AND c.confdeltype = 'n'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['session_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.comparisons ADD CONSTRAINT fk_comparisons_session FOREIGN KEY (session_id) REFERENCES public.search_sessions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparisons'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_comparisons_creator'
        OR (
          c.confrelid = 'public.profiles'::regclass
          AND c.confdeltype = 'n'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['created_by']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.comparisons ADD CONSTRAINT fk_comparisons_creator FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparisons'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_comparisons_food_item'
        OR (
          c.confrelid = 'public.food_items'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['food_item_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.comparisons ADD CONSTRAINT fk_comparisons_food_item FOREIGN KEY (food_item_id) REFERENCES public.food_items(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparisons'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_comparisons_cheapest_plat'
        OR (
          c.confrelid = 'public.platforms'::regclass
          AND c.confdeltype = 'n'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['cheapest_platform_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.comparisons ADD CONSTRAINT fk_comparisons_cheapest_plat FOREIGN KEY (cheapest_platform_id) REFERENCES public.platforms(id) ON DELETE SET NULL;
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_comparisons_cheapest_price on cheapest_price_paise
  -- Canonical rule: (cheapest_price_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.comparisons
  WHERE NOT (cheapest_price_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_comparisons_cheapest_price', 'public.comparisons', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving cheapest_price_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparisons'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_comparisons_cheapest_price'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'cheapest_price_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.comparisons', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK ((cheapest_price_paise >= 0))',
      'CHECK (cheapest_price_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.comparisons', 'cheapest_price_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['comparisons_cheapest_price_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.comparisons', 'cheapest_price_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.comparisons', 'cheapest_price_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.comparisons'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_comparisons_cheapest_price'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['cheapest_price_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK ((cheapest_price_paise >= 0))',
      'CHECK (cheapest_price_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_comparisons_cheapest_price', 'public.comparisons', 'cheapest_price_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_comparisons_cheapest_price', 'public.comparisons', v_con_def;
      ALTER TABLE public.comparisons DROP CONSTRAINT chk_comparisons_cheapest_price;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.comparisons'::regclass AND c.conname = 'chk_comparisons_cheapest_price'
    ) THEN
      ALTER TABLE public.comparisons DROP CONSTRAINT chk_comparisons_cheapest_price;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.comparisons ADD CONSTRAINT chk_comparisons_cheapest_price CHECK (cheapest_price_paise >= 0);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_comparisons_savings on savings_paise
  -- Canonical rule: (savings_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.comparisons
  WHERE NOT (savings_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_comparisons_savings', 'public.comparisons', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving savings_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparisons'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_comparisons_savings'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'savings_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.comparisons', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK ((savings_paise >= 0))',
      'CHECK (savings_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.comparisons', 'savings_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['comparisons_savings_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.comparisons', 'savings_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.comparisons', 'savings_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.comparisons'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_comparisons_savings'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['savings_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK ((savings_paise >= 0))',
      'CHECK (savings_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_comparisons_savings', 'public.comparisons', 'savings_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_comparisons_savings', 'public.comparisons', v_con_def;
      ALTER TABLE public.comparisons DROP CONSTRAINT chk_comparisons_savings;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.comparisons'::regclass AND c.conname = 'chk_comparisons_savings'
    ) THEN
      ALTER TABLE public.comparisons DROP CONSTRAINT chk_comparisons_savings;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.comparisons ADD CONSTRAINT chk_comparisons_savings CHECK (savings_paise >= 0);
  END IF;
END $$;

ALTER TABLE public.comparisons ALTER COLUMN is_demo_data SET DEFAULT false;
ALTER TABLE public.comparisons ALTER COLUMN created_at SET DEFAULT now();

-- ==============================================================================
-- 11. COMPARISON ITEMS TABLE
-- ==============================================================================
-- Detailed platform quotes breakdown belonging to a comparison
-- Delivery time and availability are NULL if undisclosed
CREATE TABLE IF NOT EXISTS public.comparison_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID NOT NULL REFERENCES public.comparisons(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  base_price_paise INTEGER NOT NULL CHECK (base_price_paise >= 0),
  packaging_fee_paise INTEGER CHECK (packaging_fee_paise IS NULL OR packaging_fee_paise >= 0),
  delivery_fee_paise INTEGER CHECK (delivery_fee_paise IS NULL OR delivery_fee_paise >= 0),
  platform_fee_paise INTEGER CHECK (platform_fee_paise IS NULL OR platform_fee_paise >= 0),
  taxes_paise INTEGER CHECK (taxes_paise IS NULL OR taxes_paise >= 0),
  surge_fee_paise INTEGER CHECK (surge_fee_paise IS NULL OR surge_fee_paise >= 0),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_discount_paise INTEGER NOT NULL DEFAULT 0 CHECK (coupon_discount_paise >= 0),
  known_fees_total_paise INTEGER NOT NULL CHECK (known_fees_total_paise >= 0),
  final_price_paise INTEGER NOT NULL CHECK (final_price_paise >= 0),
  delivery_time_minutes INTEGER CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0),
  link_type TEXT NOT NULL DEFAULT 'search_fallback' 
    CHECK (link_type IN ('exact_dish', 'restaurant_fallback', 'search_fallback')),
  direct_order_url TEXT NOT NULL,
  is_available BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_comparison_platform UNIQUE (comparison_id, platform_id)
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS comparison_id UUID REFERENCES public.comparisons(id) ON DELETE CASCADE;
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS platform_id UUID REFERENCES public.platforms(id) ON DELETE CASCADE;
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS base_price_paise INTEGER CHECK (base_price_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS packaging_fee_paise INTEGER CHECK (packaging_fee_paise IS NULL OR packaging_fee_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS delivery_fee_paise INTEGER CHECK (delivery_fee_paise IS NULL OR delivery_fee_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS platform_fee_paise INTEGER CHECK (platform_fee_paise IS NULL OR platform_fee_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS taxes_paise INTEGER CHECK (taxes_paise IS NULL OR taxes_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS surge_fee_paise INTEGER CHECK (surge_fee_paise IS NULL OR surge_fee_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS coupon_discount_paise INTEGER NOT NULL DEFAULT 0 CHECK (coupon_discount_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS known_fees_total_paise INTEGER CHECK (known_fees_total_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS final_price_paise INTEGER CHECK (final_price_paise >= 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS delivery_time_minutes INTEGER CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0);
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'search_fallback' CHECK (link_type IN ('exact_dish', 'restaurant_fallback', 'search_fallback'));
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS direct_order_url TEXT;
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN;
ALTER TABLE public.comparison_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
DECLARE
  v_violating_count BIGINT;
  r_other RECORD;
  v_con_def TEXT;
  v_needs_add BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparison_items'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'uq_comparison_platform'
        OR (
          SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ) = ARRAY['comparison_id', 'platform_id']
      )
  ) THEN
    ALTER TABLE public.comparison_items ADD CONSTRAINT uq_comparison_platform UNIQUE (comparison_id, platform_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparison_items'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_comparison_items_comp'
        OR (
          c.confrelid = 'public.comparisons'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['comparison_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.comparison_items ADD CONSTRAINT fk_comparison_items_comp FOREIGN KEY (comparison_id) REFERENCES public.comparisons(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparison_items'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_comparison_items_plat'
        OR (
          c.confrelid = 'public.platforms'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['platform_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.comparison_items ADD CONSTRAINT fk_comparison_items_plat FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_comp_items_base_price on base_price_paise
  -- Canonical rule: (base_price_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.comparison_items
  WHERE NOT (base_price_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_comp_items_base_price', 'public.comparison_items', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving base_price_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparison_items'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_comp_items_base_price'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'base_price_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.comparison_items', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK ((base_price_paise >= 0))',
      'CHECK (base_price_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.comparison_items', 'base_price_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['comparison_items_base_price_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.comparison_items', 'base_price_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.comparison_items', 'base_price_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.comparison_items'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_comp_items_base_price'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['base_price_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK ((base_price_paise >= 0))',
      'CHECK (base_price_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_comp_items_base_price', 'public.comparison_items', 'base_price_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_comp_items_base_price', 'public.comparison_items', v_con_def;
      ALTER TABLE public.comparison_items DROP CONSTRAINT chk_comp_items_base_price;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.comparison_items'::regclass AND c.conname = 'chk_comp_items_base_price'
    ) THEN
      ALTER TABLE public.comparison_items DROP CONSTRAINT chk_comp_items_base_price;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.comparison_items ADD CONSTRAINT chk_comp_items_base_price CHECK (base_price_paise >= 0);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_comp_items_final_price on final_price_paise
  -- Canonical rule: (final_price_paise >= 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.comparison_items
  WHERE NOT (final_price_paise >= 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_comp_items_final_price', 'public.comparison_items', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving final_price_paise
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparison_items'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_comp_items_final_price'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'final_price_paise'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.comparison_items', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK ((final_price_paise >= 0))',
      'CHECK (final_price_paise >= 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.comparison_items', 'final_price_paise', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['comparison_items_final_price_paise_check']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.comparison_items', 'final_price_paise', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.comparison_items', 'final_price_paise', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.comparison_items'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_comp_items_final_price'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['final_price_paise'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK ((final_price_paise >= 0))',
      'CHECK (final_price_paise >= 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_comp_items_final_price', 'public.comparison_items', 'final_price_paise', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_comp_items_final_price', 'public.comparison_items', v_con_def;
      ALTER TABLE public.comparison_items DROP CONSTRAINT chk_comp_items_final_price;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.comparison_items'::regclass AND c.conname = 'chk_comp_items_final_price'
    ) THEN
      ALTER TABLE public.comparison_items DROP CONSTRAINT chk_comp_items_final_price;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.comparison_items ADD CONSTRAINT chk_comp_items_final_price CHECK (final_price_paise >= 0);
  END IF;

  -- --------------------------------------------------------------------------
  -- CHECK constraint: chk_comp_items_delivery_time on delivery_time_minutes
  -- Canonical rule: (delivery_time_minutes IS NULL OR delivery_time_minutes > 0)
  -- --------------------------------------------------------------------------
  -- 1. Pre-validation: verify all existing rows satisfy canonical expression
  SELECT count(*) INTO v_violating_count
  FROM public.comparison_items
  WHERE NOT (delivery_time_minutes IS NULL OR delivery_time_minutes > 0);

  IF v_violating_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce constraint % on %: % existing row(s) violate required values. Pre-migration data remediation is required.', 'chk_comp_items_delivery_time', 'public.comparison_items', v_violating_count;
  END IF;

  -- 2. Inspect all other CHECK constraints involving delivery_time_minutes
  -- Preserve intentional multi-column constraints.
  -- Preserve already-canonical definitions without dropping.
  -- Drop ONLY verified genuinely obsolete constraint definitions.
  -- Halt migration on unexpected or modified custom constraints.
  FOR r_other IN (
    SELECT
      c.conname,
      pg_catalog.pg_get_constraintdef(c.oid) AS condef,
      (
        SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) AS concols
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.comparison_items'::regclass
      AND c.contype = 'c'
      AND c.conname <> 'chk_comp_items_delivery_time'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'delivery_time_minutes'
      )
  ) LOOP
    IF pg_catalog.cardinality(r_other.concols) > 1 THEN
      -- Multi-column constraint involving this column: preserve intentionally, never remove or ignore
      RAISE NOTICE 'Preserving intentional multi-column constraint % on % (columns: %): %',
        r_other.conname, 'public.comparison_items', r_other.concols, r_other.condef;

    ELSIF r_other.condef IN (
      'CHECK (((delivery_time_minutes IS NULL) OR (delivery_time_minutes > 0)))',
      'CHECK ((delivery_time_minutes IS NULL OR delivery_time_minutes > 0))',
      'CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0)'
    ) THEN
      -- Definition is already canonical and correct: preserve intentionally without dropping
      RAISE NOTICE 'Preserving existing constraint % on %(%): definition is already canonical and correct (%).',
        r_other.conname, 'public.comparison_items', 'delivery_time_minutes', r_other.condef;

    ELSIF r_other.conname = ANY(ARRAY['comparison_items_delivery_time_minutes_check', 'chk_comp_items_delivery_time_old']::text[]) AND r_other.condef IN (
        'CHECK ((delivery_time_minutes >= 0))',
        'CHECK (delivery_time_minutes >= 0)',
        'CHECK (((delivery_time_minutes IS NULL) OR (delivery_time_minutes >= 0)))',
        'CHECK ((delivery_time_minutes IS NULL OR delivery_time_minutes >= 0))',
        'CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes >= 0)',
        'CHECK ((delivery_time_minutes > 0))',
        'CHECK (delivery_time_minutes > 0)'
    ) THEN
      -- Genuinely obsolete constraint: name is allowlisted AND definition matches verified obsolete expression
      RAISE NOTICE 'Removing verified obsolete constraint % on %(%): %',
        r_other.conname, 'public.comparison_items', 'delivery_time_minutes', r_other.condef;
      EXECUTE 'ALTER TABLE public.comparison_items DROP CONSTRAINT ' || pg_catalog.quote_ident(r_other.conname);
    ELSIF r_other.conname = ANY(ARRAY['comparison_items_delivery_time_minutes_check', 'chk_comp_items_delivery_time_old']::text[]) THEN
      -- Name matches allowlist, but definition is modified / custom: halt migration
      RAISE EXCEPTION 'Constraint % on %(%) matches obsolete name but has unexpected/modified definition: %. Migration halted to prevent dropping custom rules. Manual review required.',
        r_other.conname, 'public.comparison_items', 'delivery_time_minutes', r_other.condef;

    ELSE
      -- Unknown constraint on this column: halt immediately with name and definition to avoid silent deletion of custom rules
      RAISE EXCEPTION 'Unknown non-canonical constraint % detected on %(%): %. Migration halted to prevent unintended deletion of custom business rules. Manual DBA review required.',
        r_other.conname, 'public.comparison_items', 'delivery_time_minutes', r_other.condef;
    END IF;
  END LOOP;

  -- 3. Verify canonical constraint table, type, columns and exact definition
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_con_def
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.comparison_items'::regclass
    AND c.contype = 'c'
    AND c.conname = 'chk_comp_items_delivery_time'
    AND (
      SELECT pg_catalog.array_agg(a.attname::text ORDER BY pg_catalog.array_position(c.conkey, a.attnum))
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    ) = ARRAY['delivery_time_minutes'];

  IF v_con_def IS NOT NULL THEN
    IF v_con_def IN (
      'CHECK (((delivery_time_minutes IS NULL) OR (delivery_time_minutes > 0)))',
      'CHECK ((delivery_time_minutes IS NULL OR delivery_time_minutes > 0))',
      'CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0)'
    ) THEN
      -- Canonical constraint is already correct: preserve without dropping and recreating
      RAISE NOTICE 'Preserving existing canonical constraint % on %(%): already correct (%).',
        'chk_comp_items_delivery_time', 'public.comparison_items', 'delivery_time_minutes', v_con_def;
      v_needs_add := false;
    ELSE
      RAISE NOTICE 'Canonical constraint % on % has outdated/incorrect definition (%). Replacing without CASCADE.', 'chk_comp_items_delivery_time', 'public.comparison_items', v_con_def;
      ALTER TABLE public.comparison_items DROP CONSTRAINT chk_comp_items_delivery_time;
      v_needs_add := true;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = 'public.comparison_items'::regclass AND c.conname = 'chk_comp_items_delivery_time'
    ) THEN
      ALTER TABLE public.comparison_items DROP CONSTRAINT chk_comp_items_delivery_time;
    END IF;
    v_needs_add := true;
  END IF;

  IF v_needs_add THEN
    ALTER TABLE public.comparison_items ADD CONSTRAINT chk_comp_items_delivery_time CHECK (delivery_time_minutes IS NULL OR delivery_time_minutes > 0);
  END IF;
END $$;

-- Remove misleading defaults if pre-existing
ALTER TABLE public.comparison_items ALTER COLUMN delivery_time_minutes DROP DEFAULT;
ALTER TABLE public.comparison_items ALTER COLUMN delivery_time_minutes DROP NOT NULL;
ALTER TABLE public.comparison_items ALTER COLUMN is_available DROP DEFAULT;
ALTER TABLE public.comparison_items ALTER COLUMN is_available DROP NOT NULL;
ALTER TABLE public.comparison_items ALTER COLUMN created_at SET DEFAULT now();

-- ==============================================================================
-- 12. SAVED DEALS TABLE
-- ==============================================================================
-- User personal deal bookmarks & watchlists
CREATE TABLE IF NOT EXISTS public.saved_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  cheapest_platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  cheapest_price_paise INTEGER NOT NULL CHECK (cheapest_price_paise >= 0),
  max_savings_paise INTEGER NOT NULL DEFAULT 0 CHECK (max_savings_paise >= 0),
  direct_order_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_saved_food_item UNIQUE (user_id, food_item_id)
);

-- Safe non-destructive column additions for existing installations
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE;
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS cheapest_platform_id UUID REFERENCES public.platforms(id) ON DELETE CASCADE;
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS cheapest_price_paise INTEGER CHECK (cheapest_price_paise >= 0);
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS max_savings_paise INTEGER NOT NULL DEFAULT 0 CHECK (max_savings_paise >= 0);
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS direct_order_url TEXT;
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.saved_deals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Safe constraint repair for existing installations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.saved_deals'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'uq_user_saved_food_item'
        OR (
          SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        ) = ARRAY['user_id', 'food_item_id']
      )
  ) THEN
    ALTER TABLE public.saved_deals ADD CONSTRAINT uq_user_saved_food_item UNIQUE (user_id, food_item_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.saved_deals'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_saved_deals_user'
        OR (
          c.confrelid = 'public.profiles'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['user_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.saved_deals ADD CONSTRAINT fk_saved_deals_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.saved_deals'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_saved_deals_food_item'
        OR (
          c.confrelid = 'public.food_items'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['food_item_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.saved_deals ADD CONSTRAINT fk_saved_deals_food_item FOREIGN KEY (food_item_id) REFERENCES public.food_items(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.saved_deals'::regclass
      AND c.contype = 'f'
      AND (
        c.conname = 'fk_saved_deals_platform'
        OR (
          c.confrelid = 'public.platforms'::regclass
          AND c.confdeltype = 'c'
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          ) = ARRAY['cheapest_platform_id']
          AND (
            SELECT array_agg(a.attname::text ORDER BY array_position(c.confkey, a.attnum))
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey)
          ) = ARRAY['id']
        )
      )
  ) THEN
    ALTER TABLE public.saved_deals ADD CONSTRAINT fk_saved_deals_platform FOREIGN KEY (cheapest_platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.saved_deals ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.saved_deals ALTER COLUMN updated_at SET DEFAULT now();

DROP TRIGGER IF EXISTS set_saved_deals_updated_at ON public.saved_deals;
CREATE TRIGGER set_saved_deals_updated_at
  BEFORE UPDATE ON public.saved_deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 13. INDEXES FOR HIGH-PERFORMANCE SEARCH & FILTERING
-- ==============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_dietary ON public.profiles(dietary_preference);
CREATE INDEX IF NOT EXISTS idx_profiles_platform ON public.profiles(preferred_platform);

-- Restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON public.restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON public.restaurants(rating DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_brand ON public.restaurants(is_brand, brand_id);

-- Food Items
CREATE INDEX IF NOT EXISTS idx_food_items_restaurant_id ON public.food_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_items_slug ON public.food_items(slug);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON public.food_items(category);
CREATE INDEX IF NOT EXISTS idx_food_items_dietary ON public.food_items(dietary);
CREATE INDEX IF NOT EXISTS idx_food_items_tags ON public.food_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_food_items_name_trgm ON public.food_items USING gin(to_tsvector('english', name));

-- Price Snapshots
CREATE INDEX IF NOT EXISTS idx_price_snapshots_food_item ON public.price_snapshots(food_item_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_platform ON public.price_snapshots(platform_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_timestamp ON public.price_snapshots(snapshot_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_final_price ON public.price_snapshots(final_price_paise ASC);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_platform_code ON public.coupons(platform_id, code);
CREATE INDEX IF NOT EXISTS idx_coupons_available ON public.coupons(is_available, is_demo_coupon);
CREATE INDEX IF NOT EXISTS idx_coupon_rules_coupon ON public.coupon_rules(coupon_id);

-- Search Sessions
CREATE INDEX IF NOT EXISTS idx_search_sessions_user ON public.search_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_search_sessions_created ON public.search_sessions(created_at DESC);

-- Comparisons & Items
CREATE INDEX IF NOT EXISTS idx_comparisons_food_item ON public.comparisons(food_item_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_session ON public.comparisons(session_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_creator ON public.comparisons(created_by);
CREATE INDEX IF NOT EXISTS idx_comparisons_share ON public.comparisons(is_public_share, share_token);
CREATE INDEX IF NOT EXISTS idx_comparisons_savings ON public.comparisons(savings_paise DESC);
CREATE INDEX IF NOT EXISTS idx_comparison_items_comp ON public.comparison_items(comparison_id);
CREATE INDEX IF NOT EXISTS idx_comparison_items_platform ON public.comparison_items(platform_id);

-- Saved Deals
CREATE INDEX IF NOT EXISTS idx_saved_deals_user ON public.saved_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deals_food_item ON public.saved_deals(food_item_id);
CREATE INDEX IF NOT EXISTS idx_saved_deals_created ON public.saved_deals(created_at DESC);

-- ==============================================================================
-- 14. HARDENED ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all 11 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_deals ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Profiles RLS: Strictly isolated to authenticated record owner
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- B. Public Catalogue RLS: Platforms, Restaurants, Food Items, Prices, Coupons
-- Readable by anyone (anonymous and authenticated); writeable ONLY by backend service_role
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read platforms" ON public.platforms;
CREATE POLICY "Public read platforms"
  ON public.platforms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read restaurants" ON public.restaurants;
CREATE POLICY "Public read restaurants"
  ON public.restaurants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read food items" ON public.food_items;
CREATE POLICY "Public read food items"
  ON public.food_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read price snapshots" ON public.price_snapshots;
CREATE POLICY "Public read price snapshots"
  ON public.price_snapshots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read coupons" ON public.coupons;
CREATE POLICY "Public read coupons"
  ON public.coupons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read coupon rules" ON public.coupon_rules;
CREATE POLICY "Public read coupon rules"
  ON public.coupon_rules FOR SELECT
  USING (true);

-- ------------------------------------------------------------------------------
-- C. Search Sessions RLS: Privacy-Hardened
-- Authenticated users can read ONLY their own searches (auth.uid() = user_id)
-- Anonymous searches (user_id IS NULL) CANNOT be read by any client (write-only for analytics)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create search sessions" ON public.search_sessions;
CREATE POLICY "Anyone can create search sessions"
  ON public.search_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own search sessions" ON public.search_sessions;
CREATE POLICY "Users can read own search sessions"
  ON public.search_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- D. Comparisons & Comparison Items RLS: Secure Sharing & Spam Prevention
-- 1. Comparisons are readable ONLY if explicitly marked public OR by authenticated creator
-- 2. Client insertion strictly requires authenticated user who owns the record
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read comparisons" ON public.comparisons;
DROP POLICY IF EXISTS "Controlled read comparisons" ON public.comparisons;
CREATE POLICY "Controlled read comparisons"
  ON public.comparisons FOR SELECT
  USING (
    is_public_share = true
    OR (auth.uid() IS NOT NULL AND auth.uid() = created_by)
  );

DROP POLICY IF EXISTS "Anyone can insert comparisons" ON public.comparisons;
DROP POLICY IF EXISTS "Authenticated users can create comparisons" ON public.comparisons;
CREATE POLICY "Authenticated users can create comparisons"
  ON public.comparisons FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Public read comparison items" ON public.comparison_items;
DROP POLICY IF EXISTS "Controlled read comparison items" ON public.comparison_items;
CREATE POLICY "Controlled read comparison items"
  ON public.comparison_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.comparisons c
      WHERE c.id = comparison_items.comparison_id
      AND (
        c.is_public_share = true
        OR (auth.uid() IS NOT NULL AND auth.uid() = c.created_by)
      )
    )
  );

DROP POLICY IF EXISTS "Anyone can insert comparison items" ON public.comparison_items;
DROP POLICY IF EXISTS "Authenticated users can insert comparison items" ON public.comparison_items;
CREATE POLICY "Authenticated users can insert comparison items"
  ON public.comparison_items FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.comparisons c
      WHERE c.id = comparison_items.comparison_id
      AND c.created_by = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- E. Saved Deals RLS: Strictly isolated per authenticated user
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own saved deals" ON public.saved_deals;
CREATE POLICY "Users can read own saved deals"
  ON public.saved_deals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved deals" ON public.saved_deals;
CREATE POLICY "Users can insert own saved deals"
  ON public.saved_deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved deals" ON public.saved_deals;
CREATE POLICY "Users can update own saved deals"
  ON public.saved_deals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved deals" ON public.saved_deals;
CREATE POLICY "Users can delete own saved deals"
  ON public.saved_deals FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 15. SECURE TOKEN-BASED SHARING FUNCTIONS (RPC v2)
-- ==============================================================================
-- Security & Compatibility Hardening:
-- 1. Versioned functions (_v2) prevent PostgreSQL return-type collision on existing databases
--    (eliminates "ERROR: cannot change return type of existing function").
-- 2. Safe Legacy Deprecation: Inspects pg_depend before dropping legacy functions;
--    if dependencies exist, revokes all permissions instead of dropping.
-- 3. Rate-Limit Bypass Prevention: REVOKE ALL from PUBLIC, anon, and authenticated.
--    Direct Supabase PostgREST RPC is blocked. Only trusted backend service_role can execute.
-- 4. Validates 256 bits of entropy (64 hex characters or 43-64 Base64URL characters).
-- 5. Returns ONLY explicitly projected public-safe fields in RETURNS TABLE (...).
--    NEVER exposes share_token, session_id, or created_by user UUID.
-- 6. search_path = '' with fully schema-qualified object references.

-- Safe Legacy Function Inspection & Cleanup Block
-- Enforces exact signature inspection: get_comparison_by_share_token(text) and get_comparison_items_by_share_token(text)
-- Validates pg_depend with refclassid = 'pg_catalog.pg_proc'::regclass across all dependency types ('n', 'a', 'i', 'e')
-- Revokes public execution permissions upfront so endpoints are never left exposed
-- Uses strictly non-CASCADE deletion wrapped in dependent_objects_still_exist exception handler
DO $$
DECLARE
  v_dep_count INT;
BEGIN
  -- 1. Inspect and clean up get_comparison_by_share_token(text)
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_comparison_by_share_token'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text'
  ) THEN
    -- Revoke public execution permissions upfront: never leave exposed regardless of drop outcome
    REVOKE ALL ON FUNCTION public.get_comparison_by_share_token(text) FROM PUBLIC, anon, authenticated;

    SELECT count(*) INTO v_dep_count
    FROM pg_catalog.pg_depend d
    JOIN pg_catalog.pg_proc p ON d.refobjid = p.oid
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_comparison_by_share_token'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text'
      AND d.refclassid = 'pg_catalog.pg_proc'::regclass
      AND d.deptype IN ('n', 'a', 'i', 'e');

    IF v_dep_count = 0 THEN
      BEGIN
        DROP FUNCTION IF EXISTS public.get_comparison_by_share_token(text);
      EXCEPTION WHEN dependent_objects_still_exist THEN
        RAISE NOTICE 'Legacy function public.get_comparison_by_share_token(text) has dependent objects and cannot be dropped without CASCADE. Public permissions have been revoked.';
      END;
    ELSE
      RAISE NOTICE 'Legacy function public.get_comparison_by_share_token(text) has % dependent object(s). Revoked public execution permissions instead of dropping.', v_dep_count;
    END IF;
  END IF;

  -- 2. Inspect and clean up get_comparison_items_by_share_token(text)
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_comparison_items_by_share_token'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text'
  ) THEN
    -- Revoke public execution permissions upfront: never leave exposed regardless of drop outcome
    REVOKE ALL ON FUNCTION public.get_comparison_items_by_share_token(text) FROM PUBLIC, anon, authenticated;

    SELECT count(*) INTO v_dep_count
    FROM pg_catalog.pg_depend d
    JOIN pg_catalog.pg_proc p ON d.refobjid = p.oid
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_comparison_items_by_share_token'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text'
      AND d.refclassid = 'pg_catalog.pg_proc'::regclass
      AND d.deptype IN ('n', 'a', 'i', 'e');

    IF v_dep_count = 0 THEN
      BEGIN
        DROP FUNCTION IF EXISTS public.get_comparison_items_by_share_token(text);
      EXCEPTION WHEN dependent_objects_still_exist THEN
        RAISE NOTICE 'Legacy function public.get_comparison_items_by_share_token(text) has dependent objects and cannot be dropped without CASCADE. Public permissions have been revoked.';
      END;
    ELSE
      RAISE NOTICE 'Legacy function public.get_comparison_items_by_share_token(text) has % dependent object(s). Revoked public execution permissions instead of dropping.', v_dep_count;
    END IF;
  END IF;
END $$;

-- Versioned Function: get_comparison_by_share_token_v2
CREATE OR REPLACE FUNCTION public.get_comparison_by_share_token_v2(p_token TEXT)
RETURNS TABLE (
  id UUID,
  food_item_id UUID,
  cheapest_platform_id UUID,
  cheapest_price_paise INTEGER,
  highest_price_paise INTEGER,
  savings_paise INTEGER,
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Strict format check: 64 hexadecimal characters (256 bits) or 43-64 Base64URL characters
  IF p_token IS NULL OR NOT (p_token ~ '^[a-f0-9]{64}$' OR p_token ~ '^[A-Za-z0-9_-]{43,64}$') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.food_item_id,
    c.cheapest_platform_id,
    c.cheapest_price_paise,
    c.highest_price_paise,
    c.savings_paise,
    c.recommendation_reason,
    c.created_at
  FROM public.comparisons c
  WHERE c.share_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Versioned Function: get_comparison_items_by_share_token_v2
CREATE OR REPLACE FUNCTION public.get_comparison_items_by_share_token_v2(p_token TEXT)
RETURNS TABLE (
  id UUID,
  platform_id UUID,
  base_price_paise INTEGER,
  packaging_fee_paise INTEGER,
  delivery_fee_paise INTEGER,
  platform_fee_paise INTEGER,
  taxes_paise INTEGER,
  surge_fee_paise INTEGER,
  coupon_discount_paise INTEGER,
  known_fees_total_paise INTEGER,
  final_price_paise INTEGER,
  delivery_time_minutes INTEGER,
  link_type TEXT,
  direct_order_url TEXT,
  is_available BOOLEAN
) AS $$
BEGIN
  -- Strict format check: 64 hexadecimal characters (256 bits) or 43-64 Base64URL characters
  IF p_token IS NULL OR NOT (p_token ~ '^[a-f0-9]{64}$' OR p_token ~ '^[A-Za-z0-9_-]{43,64}$') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ci.id,
    ci.platform_id,
    ci.base_price_paise,
    ci.packaging_fee_paise,
    ci.delivery_fee_paise,
    ci.platform_fee_paise,
    ci.taxes_paise,
    ci.surge_fee_paise,
    ci.coupon_discount_paise,
    ci.known_fees_total_paise,
    ci.final_price_paise,
    ci.delivery_time_minutes,
    ci.link_type,
    ci.direct_order_url,
    ci.is_available
  FROM public.comparison_items ci
  INNER JOIN public.comparisons c ON c.id = ci.comparison_id
  WHERE c.share_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Explicit Execution Permissions Configuration:
-- Revoke all permissions from PUBLIC, anon, and authenticated to prevent direct rate-limit bypass
REVOKE ALL ON FUNCTION public.get_comparison_by_share_token_v2(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_comparison_items_by_share_token_v2(TEXT) FROM PUBLIC, anon, authenticated;

-- Grant EXECUTE exclusively to trusted backend service_role.
-- Anonymous and client requests must go through the Express backend rate limiter (/api/database/share/:token).
GRANT EXECUTE ON FUNCTION public.get_comparison_by_share_token_v2(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_comparison_items_by_share_token_v2(TEXT) TO service_role;

-- ==============================================================================
-- 16. SEED DATA: PLATFORM IDENTITIES & DEMO SIMULATION COUPONS
-- ==============================================================================
-- All fee columns are strictly NULL (unknown / dynamic live fees determined per checkout).
-- Zero hardcoded assumptions. Toing platform fee is NULL (unverified without merchant quote).

INSERT INTO public.platforms (
  code,
  display_name,
  theme_color,
  website_url,
  android_app_url,
  ios_app_url,
  base_delivery_fee_paise,
  distance_surge_rate_paise_per_km,
  default_platform_fee_paise,
  fees_are_estimated,
  fee_disclosure_note
)
VALUES
  (
    'zomato',
    'Zomato',
    '#E23744',
    'https://www.zomato.com/',
    'https://play.google.com/store/apps/details?id=com.application.zomato',
    'https://apps.apple.com/in/app/zomato-food-delivery-dining/id434613896',
    NULL,
    NULL,
    NULL,
    true,
    'Zomato fees vary dynamically based on restaurant partner, location, and demand.'
  ),
  (
    'swiggy',
    'Swiggy',
    '#FC8019',
    'https://www.swiggy.com/',
    'https://play.google.com/store/apps/details?id=in.swiggy.android',
    'https://apps.apple.com/in/app/swiggy-food-grocery-delivery/id989587045',
    NULL,
    NULL,
    NULL,
    true,
    'Swiggy fees vary dynamically based on restaurant partner, location, and demand.'
  ),
  (
    'toing',
    'Toing',
    '#00B159',
    'https://www.toingit.com/',
    'https://play.google.com/store/apps/details?id=in.swiggy.android.toing',
    'https://apps.apple.com/in/app/toing-food-delivery/id6748918399',
    NULL,
    NULL,
    NULL,
    true,
    'Toing delivery and packaging fees vary dynamically based on merchant partner.'
  )
ON CONFLICT (code) DO NOTHING;

-- Seed clearly-marked DEMO coupons (is_demo_coupon = true explicitly set in seed, not column default)
-- Flagged so pricing engines never treat them as verified live tender without merchant confirmation.
DO $$
DECLARE
  v_zomato_id UUID;
  v_swiggy_id UUID;
  v_toing_id UUID;
  v_coupon_id UUID;
BEGIN
  SELECT id INTO v_zomato_id FROM public.platforms WHERE code = 'zomato';
  SELECT id INTO v_swiggy_id FROM public.platforms WHERE code = 'swiggy';
  SELECT id INTO v_toing_id FROM public.platforms WHERE code = 'toing';

  -- Zomato Demo Coupons
  IF v_zomato_id IS NOT NULL THEN
    -- ZOMATO50 (DEMO)
    SELECT id INTO v_coupon_id FROM public.coupons WHERE platform_id = v_zomato_id AND code = 'ZOMATO50';
    IF v_coupon_id IS NULL THEN
      INSERT INTO public.coupons (platform_id, code, description, is_demo_coupon, is_available)
      VALUES (v_zomato_id, 'ZOMATO50', '[DEMO SIMULATION] 50% OFF up to ₹100 on orders above ₹199 (Sample UI Preview)', true, true)
      RETURNING id INTO v_coupon_id;

      INSERT INTO public.coupon_rules (coupon_id, discount_type, discount_percentage, max_discount_paise, min_order_paise, terms, is_demo_rule)
      VALUES (v_coupon_id, 'percentage', 50, 10000, 19900, ARRAY['[DEMO] Simulated promotion for price comparison demonstration only', 'Check Zomato app for live validity'], true);
    END IF;

    -- GOLDDEL (DEMO)
    SELECT id INTO v_coupon_id FROM public.coupons WHERE platform_id = v_zomato_id AND code = 'GOLDDEL';
    IF v_coupon_id IS NULL THEN
      INSERT INTO public.coupons (platform_id, code, description, is_demo_coupon, is_available)
      VALUES (v_zomato_id, 'GOLDDEL', '[DEMO SIMULATION] Free delivery on orders above ₹199 with Gold (Sample UI Preview)', true, true)
      RETURNING id INTO v_coupon_id;

      INSERT INTO public.coupon_rules (coupon_id, discount_type, discount_value_paise, min_order_paise, terms, is_demo_rule)
      VALUES (v_coupon_id, 'flat', 3500, 19900, ARRAY['[DEMO] For Zomato Gold demonstration preview', 'Live membership verification required on platform'], true);
    END IF;
  END IF;

  -- Swiggy Demo Coupons
  IF v_swiggy_id IS NOT NULL THEN
    -- SWIGGYIT (DEMO)
    SELECT id INTO v_coupon_id FROM public.coupons WHERE platform_id = v_swiggy_id AND code = 'SWIGGYIT';
    IF v_coupon_id IS NULL THEN
      INSERT INTO public.coupons (platform_id, code, description, is_demo_coupon, is_available)
      VALUES (v_swiggy_id, 'SWIGGYIT', '[DEMO SIMULATION] Flat ₹50 OFF on orders above ₹199 (Sample UI Preview)', true, true)
      RETURNING id INTO v_coupon_id;

      INSERT INTO public.coupon_rules (coupon_id, discount_type, discount_value_paise, min_order_paise, terms, is_demo_rule)
      VALUES (v_coupon_id, 'flat', 5000, 19900, ARRAY['[DEMO] Simulated promotion for preview', 'Subject to live restaurant eligibility on Swiggy'], true);
    END IF;

    -- SWIGGYONE (DEMO)
    SELECT id INTO v_coupon_id FROM public.coupons WHERE platform_id = v_swiggy_id AND code = 'SWIGGYONE';
    IF v_coupon_id IS NULL THEN
      INSERT INTO public.coupons (platform_id, code, description, is_demo_coupon, is_available)
      VALUES (v_swiggy_id, 'SWIGGYONE', '[DEMO SIMULATION] Free delivery preview for Swiggy One subscribers', true, true)
      RETURNING id INTO v_coupon_id;

      INSERT INTO public.coupon_rules (coupon_id, discount_type, discount_value_paise, min_order_paise, terms, is_demo_rule)
      VALUES (v_coupon_id, 'flat', 4000, 14900, ARRAY['[DEMO] Swiggy One demonstration preview', 'Subject to active Swiggy One account'], true);
    END IF;
  END IF;

  -- Toing Demo Coupons
  IF v_toing_id IS NOT NULL THEN
    -- TOINGFIRST (DEMO)
    SELECT id INTO v_coupon_id FROM public.coupons WHERE platform_id = v_toing_id AND code = 'TOINGFIRST';
    IF v_coupon_id IS NULL THEN
      INSERT INTO public.coupons (platform_id, code, description, is_demo_coupon, is_available)
      VALUES (v_toing_id, 'TOINGFIRST', '[DEMO SIMULATION] Flat ₹60 OFF first direct order preview', true, true)
      RETURNING id INTO v_coupon_id;

      INSERT INTO public.coupon_rules (coupon_id, discount_type, discount_value_paise, min_order_paise, terms, is_demo_rule)
      VALUES (v_coupon_id, 'flat', 6000, 14900, ARRAY['[DEMO] Simulated direct restaurant discount preview', 'Verify live coupon in Toing app'], true);
    END IF;
  END IF;
END $$;

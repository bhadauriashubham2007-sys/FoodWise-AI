import crypto from 'crypto';

/**
 * Server-controlled authorized live integration providers.
 * Only integration pipelines registered here can ever produce live_verified records.
 * Client-controlled strings or unauthorized adapters are strictly rejected.
 */
export const AUTHORIZED_LIVE_PROVIDERS = new Set<string>([
  'official_zomato_partner_feed',
  'official_swiggy_partner_feed',
  'official_ondc_network_gateway',
]);

/**
 * Maximum verification validity TTL (1 hour).
 * Live quotes must be refreshed; stale verification evidence is rejected.
 */
export const MAX_VERIFICATION_AGE_MS = 60 * 60 * 1000;

/**
 * Maximum future clock skew allowance (60 seconds).
 */
export const MAX_CLOCK_SKEW_MS = 60 * 1000;

/**
 * Internal server master key used for HMAC-SHA256 verification in development mode.
 * Never exposed to frontend or client requests.
 */
export const DEFAULT_SERVER_PROVENANCE_KEY = 'foodwise_internal_live_provenance_master_key_2026';

/**
 * Retrieves the server provenance signing key.
 * In production (NODE_ENV === 'production'), strictly refuses to fall back to the development default.
 */
export function getServerProvenanceKey(): string {
  const secret = process.env.PROVENANCE_SIGNING_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[Security Exception] Fatal: PROVENANCE_SIGNING_SECRET must be configured in production environments. Never use development fallback secrets in production.'
      );
    }
    return DEFAULT_SERVER_PROVENANCE_KEY;
  }
  return secret.trim();
}

/**
 * Validates that PROVENANCE_SIGNING_SECRET is explicitly configured with strong entropy in production.
 * Production server must refuse to start if the secret is missing or using the default fallback.
 */
export function validateProductionProvenanceConfiguration(nodeEnv?: string): void {
  const currentEnv = nodeEnv !== undefined ? nodeEnv : (process.env.NODE_ENV || 'development');
  if (currentEnv.toLowerCase() === 'production') {
    const secret = process.env.PROVENANCE_SIGNING_SECRET;
    if (!secret || secret.trim() === '' || secret === DEFAULT_SERVER_PROVENANCE_KEY) {
      throw new Error(
        '[Security Exception] Fatal: Production startup rejected. PROVENANCE_SIGNING_SECRET is missing or using default development fallback. Configure a strong secret in production.'
      );
    }
  }
}

export interface LiveVerificationProof {
  isVerifiedLiveSource?: boolean;
  provider: string;
  verifiedAt: string;
  nonce?: string;
  signature?: string;
}

export interface ProofVerificationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Constructs the canonical message string for cryptographic signing.
 */
export function buildCanonicalProofPayload(
  itemId: string,
  provider: string,
  verifiedAt: string,
  nonce: string
): string {
  return `foodwise:provenance:v1:${itemId}:${provider}:${verifiedAt}:${nonce}`;
}

/**
 * Signs verification evidence using HMAC-SHA256 with the server's private secret.
 */
export function signLiveVerificationProof(
  itemId: string,
  provider: string,
  verifiedAt: string,
  nonce: string,
  secretKey: string = getServerProvenanceKey()
): string {
  const payload = buildCanonicalProofPayload(itemId, provider, verifiedAt, nonce);
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
}

/**
 * Generates an authentic server-signed live verification proof.
 * Used exclusively by authorized server-side data ingestion feeds and test harnesses.
 */
export function createServerLiveVerificationProof(
  itemId: string,
  provider: string,
  options?: {
    verifiedAt?: string;
    nonce?: string;
    secretKey?: string;
  }
): LiveVerificationProof {
  const verifiedAt = options?.verifiedAt || new Date().toISOString();
  const nonce = options?.nonce || crypto.randomBytes(16).toString('hex');
  const signature = signLiveVerificationProof(itemId, provider, verifiedAt, nonce, options?.secretKey);

  return {
    isVerifiedLiveSource: true,
    provider,
    verifiedAt,
    nonce,
    signature,
  };
}

/**
 * Validates actual server-side verification evidence with cryptographic HMAC-SHA256 signature verification.
 * Rejects forged, expired, malformed, unauthorized, or client-fabricated proofs.
 */
export function verifyLiveProvenanceProof(
  itemId: string,
  proof: unknown,
  secretKey: string = getServerProvenanceKey()
): ProofVerificationResult {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    return { isValid: false, reason: 'Proof object missing or malformed' };
  }

  const p = proof as Record<string, unknown>;

  // 1. Provider authorization check
  if (typeof p.provider !== 'string' || !p.provider.trim()) {
    return { isValid: false, reason: 'Provider missing or malformed' };
  }
  if (!AUTHORIZED_LIVE_PROVIDERS.has(p.provider)) {
    return { isValid: false, reason: `Unauthorized provider: "${p.provider}". Only server-whitelisted providers are permitted.` };
  }

  // 2. Timestamp validity and expiration checks
  if (typeof p.verifiedAt !== 'string' || !p.verifiedAt.trim()) {
    return { isValid: false, reason: 'verifiedAt timestamp missing or empty' };
  }
  const timestamp = Date.parse(p.verifiedAt);
  if (isNaN(timestamp)) {
    return { isValid: false, reason: 'verifiedAt timestamp is not a valid ISO 8601 date string' };
  }

  const now = Date.now();
  if (now - timestamp > MAX_VERIFICATION_AGE_MS) {
    return {
      isValid: false,
      reason: `Verification evidence expired (${Math.round((now - timestamp) / 1000)}s old; max TTL is ${MAX_VERIFICATION_AGE_MS / 1000}s)`,
    };
  }
  if (timestamp - now > MAX_CLOCK_SKEW_MS) {
    return { isValid: false, reason: 'Verification timestamp is in the future' };
  }

  // 3. Signature existence and format checks
  if (typeof p.signature !== 'string' || !p.signature.trim()) {
    return { isValid: false, reason: 'Cryptographic signature missing (self-attested booleans are strictly rejected)' };
  }
  if (!/^[0-9a-fA-F]{64}$/.test(p.signature)) {
    return { isValid: false, reason: 'Signature is not a valid 64-character hexadecimal HMAC-SHA256 string' };
  }

  const nonce = typeof p.nonce === 'string' ? p.nonce : '';

  // 4. Constant-time cryptographic HMAC-SHA256 signature verification
  const expectedSignature = signLiveVerificationProof(itemId, p.provider, p.verifiedAt, nonce, secretKey);
  const sigBuf = Buffer.from(p.signature.toLowerCase(), 'hex');
  const expBuf = Buffer.from(expectedSignature.toLowerCase(), 'hex');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { isValid: false, reason: 'Cryptographic signature mismatch (untrusted signature or invalid signing key)' };
  }

  return { isValid: true };
}

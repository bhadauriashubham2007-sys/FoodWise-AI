import crypto from 'crypto';
import { DEMO_FOOD_ITEMS, RawFoodTemplate } from './demoData.js';

/**
 * Deterministically derives an RFC 4122 v5 UUID from a unique catalogue string.
 * This guarantees a consistent, collision-free UUID mapping across all application restarts.
 */
export function generateStableCatalogueUuid(uniqueKey: string): string {
  const hash = crypto
    .createHash('sha1')
    .update('foodwise:catalogue:' + uniqueKey.toLowerCase().trim())
    .digest('hex');

  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') +
      hash.substring(18, 20),
    hash.substring(20, 32),
  ].join('-');
}

export interface CatalogueItemMapping {
  slug: string;
  stableUuid: string;
  name: string;
  category: string;
  cuisine: string;
  dietary: 'veg' | 'non-veg' | 'egg' | 'vegan';
  restaurantSlug: string;
  restaurantStableUuid: string;
  restaurantName: string;
  item: RawFoodTemplate;
}

// In-memory stable registries
const SLUG_TO_MAPPING = new Map<string, CatalogueItemMapping>();
const UUID_TO_MAPPING = new Map<string, CatalogueItemMapping>();

for (const item of DEMO_FOOD_ITEMS) {
  const slug = item.id;
  const stableUuid = generateStableCatalogueUuid(slug);
  const restaurantSlug =
    item.restaurantId ||
    ('rest-' + item.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  const restaurantStableUuid = generateStableCatalogueUuid(restaurantSlug);

  const mapping: CatalogueItemMapping = {
    slug,
    stableUuid,
    name: item.name,
    category: item.category,
    cuisine: item.cuisine,
    dietary: item.dietary,
    restaurantSlug,
    restaurantStableUuid,
    restaurantName: item.restaurantName,
    item,
  };

  SLUG_TO_MAPPING.set(slug.toLowerCase(), mapping);
  UUID_TO_MAPPING.set(stableUuid.toLowerCase(), mapping);
}

/**
 * Checks if a slug belongs to the known FoodWise food catalogue.
 */
export function isKnownCatalogueSlug(slug: string): boolean {
  if (!slug) return false;
  return SLUG_TO_MAPPING.has(slug.toLowerCase().trim());
}

/**
 * Checks if a UUID corresponds to a mapped catalogue item.
 */
export function isKnownCatalogueUuid(uuid: string): boolean {
  if (!uuid) return false;
  return UUID_TO_MAPPING.has(uuid.toLowerCase().trim());
}

/**
 * Retrieves the stable mapping for a given catalogue slug.
 */
export function getCatalogueMappingBySlug(slug: string): CatalogueItemMapping | undefined {
  if (!slug) return undefined;
  return SLUG_TO_MAPPING.get(slug.toLowerCase().trim());
}

/**
 * Retrieves the stable mapping for a given catalogue UUID.
 */
export function getCatalogueMappingByUuid(uuid: string): CatalogueItemMapping | undefined {
  if (!uuid) return undefined;
  return UUID_TO_MAPPING.get(uuid.toLowerCase().trim());
}

/**
 * Returns all mapped catalogue items.
 */
export function getAllCatalogueMappings(): CatalogueItemMapping[] {
  return Array.from(SLUG_TO_MAPPING.values());
}

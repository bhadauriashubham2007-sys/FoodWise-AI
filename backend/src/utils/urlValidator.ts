import { URL } from 'node:url';
import { PlatformType, LinkType } from '../types/index.js';

export const ALLOWED_PLATFORM_DOMAINS = {
  zomato: [
    'zomato.com',
    '.zomato.com',
    'zoma.to',
    '.zoma.to',
    'zomato.onelink.me',
    'link.zomato.com',
    'b.zmtcdn.com',
  ],
  swiggy: [
    'swiggy.com',
    '.swiggy.com',
    'swiggy.onelink.me',
    'swig.gy',
    '.swig.gy',
  ],
  toing: [
    'toingit.com',
    '.toingit.com',
    'toing.in',
    '.toing.in',
    'toing.com',
    '.toing.com',
    'play.google.com',
    'apps.apple.com',
  ],
};

/**
 * Domains known to perform HTTP 301/302 short link redirects.
 */
export const SHORT_REDIRECT_DOMAINS = [
  'zomato.onelink.me',
  'zoma.to',
  'link.zomato.com',
  'swiggy.onelink.me',
  'swig.gy',
];

/**
 * Extracts a clean URL from a string that might contain mobile share text,
 * leading/trailing whitespace, or trailing punctuation.
 */
export function extractCleanUrl(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';
  const trimmed = rawInput.trim();

  // 1. If it parses directly as a URL
  try {
    const direct = new URL(trimmed);
    if (direct.protocol === 'http:' || direct.protocol === 'https:') {
      return direct.href;
    }
  } catch {
    // Proceed to regex extraction
  }

  // 2. Search for first http:// or https:// substring
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/i;
  const match = trimmed.match(urlRegex);
  if (match) {
    let candidate = match[1];
    // Strip trailing punctuation often attached from chat or punctuation
    candidate = candidate.replace(/[.,;:!?)+]+$/, '');
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch {
      return candidate;
    }
  }

  return trimmed;
}

/**
 * Checks if a host belongs to the authorized platform domain list.
 */
export function isAllowedHost(host: string, platform: PlatformType): boolean {
  const h = host.toLowerCase().trim();
  const domains = ALLOWED_PLATFORM_DOMAINS[platform] || [];
  return domains.some((d) => (d.startsWith('.') ? h.endsWith(d) : h === d));
}

/**
 * Detects the platform associated with a given URL string.
 */
export function detectPlatformFromUrl(urlStr: string): PlatformType | 'unknown' {
  try {
    const clean = extractCleanUrl(urlStr);
    const parsed = new URL(clean);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'unknown';
    }
    const host = parsed.hostname.toLowerCase();
    if (isAllowedHost(host, 'zomato')) return 'zomato';
    if (isAllowedHost(host, 'swiggy')) return 'swiggy';
    if (isAllowedHost(host, 'toing')) return 'toing';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Validates whether a URL has a valid protocol and belongs to the authorized platform domain.
 */
export function isValidPlatformUrl(urlStr: string, platform: PlatformType): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;

  try {
    const clean = extractCleanUrl(urlStr);
    const parsed = new URL(clean);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    return isAllowedHost(host, platform);
  } catch {
    return false;
  }
}

/**
 * Generates an accurate, targeted Zomato URL.
 * If an exact verified source URL is provided, it is returned with 'exact_dish'.
 * Otherwise, generates a targeted search query combining BOTH dish name and restaurant name.
 */
export function buildZomatoUrl(
  itemName: string,
  restaurantName?: string,
  sourceUrl?: string
): { url: string; linkType: LinkType; label: string } {
  if (sourceUrl && isValidPlatformUrl(sourceUrl, 'zomato')) {
    return {
      url: sourceUrl,
      linkType: 'exact_dish',
      label: 'Exact Dish Link',
    };
  }

  const query = restaurantName ? `${itemName.trim()} ${restaurantName.trim()}` : itemName.trim();
  return {
    url: `https://www.zomato.com/search?q=${encodeURIComponent(query)}`,
    linkType: 'search_fallback',
    label: restaurantName ? 'Targeted Search (Dish + Restaurant)' : 'Search Fallback',
  };
}

/**
 * Generates an accurate, targeted Swiggy URL.
 * If an exact verified source URL is provided, it is returned with 'exact_dish'.
 * Otherwise, generates a targeted search query combining BOTH dish name and restaurant name.
 */
export function buildSwiggyUrl(
  itemName: string,
  restaurantName?: string,
  sourceUrl?: string
): { url: string; linkType: LinkType; label: string } {
  if (sourceUrl && isValidPlatformUrl(sourceUrl, 'swiggy')) {
    return {
      url: sourceUrl,
      linkType: 'exact_dish',
      label: 'Exact Dish Link',
    };
  }

  const query = restaurantName ? `${itemName.trim()} ${restaurantName.trim()}` : itemName.trim();
  return {
    url: `https://www.swiggy.com/search?query=${encodeURIComponent(query)}`,
    linkType: 'search_fallback',
    label: restaurantName ? 'Targeted Search (Dish + Restaurant)' : 'Search Fallback',
  };
}

/**
 * Generates an accurate Toing destination URL.
 * Default is the official destination: https://www.toingit.com/
 */
export function buildToingUrl(sourceUrl?: string): { url: string; linkType: LinkType; label: string } {
  if (sourceUrl && isValidPlatformUrl(sourceUrl, 'toing')) {
    return {
      url: sourceUrl,
      linkType: 'exact_dish',
      label: 'Exact Dish Link',
    };
  }

  return {
    url: 'https://www.toingit.com/',
    linkType: 'restaurant_fallback',
    label: 'Official Website Fallback',
  };
}

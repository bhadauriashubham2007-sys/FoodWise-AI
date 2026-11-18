import { URL } from 'node:url';
import { PlatformType, LinkType } from '../types/index.js';

/**
 * Validates whether a URL has a valid protocol and belongs to the authorized platform domain.
 */
export function isValidPlatformUrl(urlStr: string, platform: PlatformType): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;

  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    switch (platform) {
      case 'zomato':
        return host === 'zomato.com' || host.endsWith('.zomato.com');

      case 'swiggy':
        return host === 'swiggy.com' || host.endsWith('.swiggy.com');

      case 'toing':
        return (
          host === 'toingit.com' ||
          host.endsWith('.toingit.com') ||
          host === 'toing.in' ||
          host.endsWith('.toing.in') ||
          host === 'toing.com' ||
          host.endsWith('.toing.com') ||
          host === 'play.google.com' ||
          host === 'apps.apple.com'
        );

      default:
        return false;
    }
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

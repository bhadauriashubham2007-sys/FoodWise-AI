/**
 * Mobile App Deep Linking & Browser Fallback Utilities
 *
 * Implements verified app-opening mechanisms for Zomato and Swiggy on mobile devices:
 * - Android: Android Intent URIs targeting verified packages com.application.zomato and in.swiggy.android
 *   with safe S.browser_fallback_url fallback.
 * - iOS: Universal Link routing (direct HTTPS navigation without popup tab blocking).
 * - Desktop/Browser: Safe standard new-tab web navigation.
 * - Toing: Direct official website & verified app store links.
 */

export type MobileOS = 'android' | 'ios' | 'other';

/**
 * Verified Android package identifiers for food delivery platforms.
 */
export const VERIFIED_ANDROID_PACKAGES: Record<string, string> = {
  zomato: 'com.application.zomato',
  swiggy: 'in.swiggy.android',
};

/**
 * Detects whether the current device is running Android, iOS, or other (Desktop/Unknown).
 */
export function getMobileOS(): MobileOS {
  if (typeof window === 'undefined' || !navigator) return 'other';
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();

  if (/android/i.test(ua)) {
    return 'android';
  }
  if (/ipad|iphone|ipod/i.test(ua) && !(window as any).MSStream) {
    return 'ios';
  }
  return 'other';
}

/**
 * Returns true if running on a mobile OS (Android or iOS).
 */
export function isMobileDevice(): boolean {
  const os = getMobileOS();
  return os === 'android' || os === 'ios';
}

/**
 * Builds a verified Android Intent URI for Chrome on Android with safe browser fallback.
 * Syntax:
 * intent://<host><path>?<query>#Intent;scheme=https;package=<package>;S.browser_fallback_url=<encoded_url>;end
 */
export function buildAndroidIntentUrl(webUrl: string, platform: string): string {
  const pkg = VERIFIED_ANDROID_PACKAGES[platform.toLowerCase()];
  if (!pkg) return webUrl;

  try {
    const parsed = new URL(webUrl);
    // Remove protocol for intent path
    const pathAndQuery = `${parsed.host}${parsed.pathname}${parsed.search}`;
    const fallbackEncoded = encodeURIComponent(webUrl);
    return `intent://${pathAndQuery}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${fallbackEncoded};end`;
  } catch {
    return webUrl;
  }
}

export interface PlatformLinkInfo {
  webUrl: string;
  appUrl: string;
  canOpenInApp: boolean;
  os: MobileOS;
  platform: string;
}

/**
 * Resolves verified app and browser destinations for a platform quote URL.
 */
export function getPlatformLinkDestinations(webUrl: string, platform: string): PlatformLinkInfo {
  const os = getMobileOS();
  const lowerPlat = platform.toLowerCase();
  const isZomatoOrSwiggy = lowerPlat === 'zomato' || lowerPlat === 'swiggy';

  if (os === 'android' && isZomatoOrSwiggy) {
    return {
      webUrl,
      appUrl: buildAndroidIntentUrl(webUrl, lowerPlat),
      canOpenInApp: true,
      os,
      platform: lowerPlat,
    };
  }

  if (os === 'ios' && isZomatoOrSwiggy) {
    return {
      webUrl,
      appUrl: webUrl,
      canOpenInApp: true,
      os,
      platform: lowerPlat,
    };
  }

  return {
    webUrl,
    appUrl: webUrl,
    canOpenInApp: false,
    os,
    platform: lowerPlat,
  };
}

/**
 * Opens a platform link according to user preference ('app' vs 'browser').
 * On Android, 'app' routes to native intent with auto-fallback to browser if app not installed.
 * On iOS, 'app' navigates in-frame to trigger Universal Links.
 * 'browser' opens standard web destination in a new tab.
 */
export function handleOpenPlatformLink(
  webUrl: string,
  platform: string,
  preference: 'app' | 'browser' = 'app',
  onBeforeRedirect?: () => void
): void {
  if (onBeforeRedirect) {
    try {
      onBeforeRedirect();
    } catch (err) {
      console.warn('[handleOpenPlatformLink] telemetry error:', err);
    }
  }

  const { appUrl, canOpenInApp, os } = getPlatformLinkDestinations(webUrl, platform);

  if (preference === 'app' && canOpenInApp) {
    if (os === 'android') {
      // In Android Chrome, setting window.location.href to an intent:// URI fires the native Intent
      // If the app is not installed, Chrome falls back to S.browser_fallback_url
      window.location.href = appUrl;
      return;
    }

    if (os === 'ios') {
      // On iOS, direct navigation without window.open allows Universal Link entitlement matching
      window.location.href = webUrl;
      return;
    }
  }

  // Default web / browser action
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

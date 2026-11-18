export interface ClickTelemetry {
  dishName: string;
  platform: string;
  restaurantId?: string;
  restaurantName?: string;
  itemId?: string;
  destinationUrl: string;
  linkType?: string;
}

/**
 * Client-side debug logging for platform redirects.
 * Logs item identity and link destination without exposing any sensitive or private keys.
 */
export function logPlatformRedirect(data: ClickTelemetry): void {
  console.log('[FoodWise Redirect Debug]', {
    dishName: data.dishName,
    platform: data.platform,
    restaurantId: data.restaurantId || 'N/A',
    restaurantName: data.restaurantName || 'N/A',
    itemId: data.itemId || 'N/A',
    linkType: data.linkType || 'unknown',
    destinationUrl: data.destinationUrl,
    timestamp: new Date().toISOString(),
  });
}

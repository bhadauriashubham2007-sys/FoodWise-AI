import { PlatformType, PlatformPriceQuote, CouponRule, PriceProvenance } from '../types/index.js';

export interface QuoteContext {
  itemName?: string;
  restaurantId?: string;
  restaurantName?: string;
  sourceUrl?: string;
  isSurgeActive?: boolean;
  priceProvenance?: PriceProvenance;
  isUserEnteredPrice?: boolean;
}

/**
 * Calculate the exact discount in integer paise for a given coupon and order total.
 * Strictly respects:
 * - Coupon availability
 * - Minimum order threshold (minOrderPaise)
 * - Maximum discount ceiling (maxDiscountPaise) for percentage discounts
 * - Flat discount value (discountValuePaise)
 * - Discount cannot exceed cart total
 */
export function calculateCouponDiscount(coupon: CouponRule, cartTotalPaise: number): number {
  if (!coupon.isAvailable || cartTotalPaise < coupon.minOrderPaise) {
    return 0;
  }

  let calculatedPaise = 0;
  if (coupon.discountType === 'percentage' && typeof coupon.discountPercentage === 'number') {
    const rawDiscount = Math.round((cartTotalPaise * coupon.discountPercentage) / 100);
    calculatedPaise = coupon.maxDiscountPaise
      ? Math.min(rawDiscount, coupon.maxDiscountPaise)
      : rawDiscount;
  } else if (coupon.discountType === 'flat' && typeof coupon.discountValuePaise === 'number') {
    calculatedPaise = coupon.discountValuePaise;
  }

  return Math.max(0, Math.min(calculatedPaise, cartTotalPaise));
}

export interface FoodDeliveryPlatformAdapter {
  platform: PlatformType;
  displayName: string;
  themeColor: string;
  
  /**
   * Get all eligible/available coupons for this platform
   */
  getAvailableCoupons(): Promise<CouponRule[]>;

  /**
   * Calculate final quote for an item on this platform
   * @param itemId - Item identifier
   * @param basePricePaise - Base price in integer paise
   * @param deliveryDistanceKm - Distance in km
   * @param couponCode - Optional coupon code to apply
   * @param context - Item and restaurant identity context to prevent mismatching
   */
  calculateQuote(
    itemId: string,
    basePricePaise: number,
    deliveryDistanceKm: number,
    couponCode?: string,
    context?: QuoteContext
  ): PlatformPriceQuote;
}

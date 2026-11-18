import { FoodDeliveryPlatformAdapter, QuoteContext, calculateCouponDiscount } from './base.adapter.js';
import { PlatformPriceQuote, CouponRule, PriceProvenance } from '../types/index.js';
import { buildToingUrl } from '../utils/urlValidator.js';

export class ToingAdapter implements FoodDeliveryPlatformAdapter {
  platform: 'toing' = 'toing';
  displayName = 'Toing';
  themeColor = '#00B159';

  private coupons: CouponRule[] = [
    {
      id: 'toing-1',
      code: 'TOINGFIRST',
      description: 'Flat ₹60 OFF for first time ordering directly on Toing',
      discountType: 'flat',
      discountValuePaise: 6000,
      minOrderPaise: 14900,
      terms: ['First direct order', 'Direct restaurant support'],
      isAvailable: true,
    },
    {
      id: 'toing-2',
      code: 'DIRECT50',
      description: '50% OFF up to ₹120 (Zero Platform Commission Promo)',
      discountType: 'percentage',
      discountPercentage: 50,
      maxDiscountPaise: 12000,
      minOrderPaise: 24900,
      terms: ['Supported by restaurant partners'],
      isAvailable: true,
    },
    {
      id: 'toing-3',
      code: 'SAVEBIG',
      description: 'Flat ₹40 OFF on any direct order above ₹199',
      discountType: 'flat',
      discountValuePaise: 4000,
      minOrderPaise: 19900,
      terms: ['Unlimited uses'],
      isAvailable: true,
    }
  ];

  async getAvailableCoupons(): Promise<CouponRule[]> {
    return this.coupons;
  }

  /**
   * Find the coupon that yields the highest valid discount in paise for a given order total.
   * Resolves ties deterministically by selecting the coupon with the lower minimum order threshold.
   */
  public getBestCoupon(cartTotalPaise: number): CouponRule | null {
    const eligible = this.coupons.filter(c => c.isAvailable && cartTotalPaise >= c.minOrderPaise);
    if (!eligible.length) return null;

    let bestCoupon: CouponRule | null = null;
    let maxSavings = 0;

    for (const coupon of eligible) {
      const savings = calculateCouponDiscount(coupon, cartTotalPaise);
      if (savings > maxSavings) {
        maxSavings = savings;
        bestCoupon = coupon;
      } else if (savings === maxSavings && savings > 0 && bestCoupon) {
        // Tie-breaker: prefer coupon with lower minOrder threshold
        if (coupon.minOrderPaise < bestCoupon.minOrderPaise) {
          bestCoupon = coupon;
        }
      }
    }

    return maxSavings > 0 ? bestCoupon : null;
  }

  calculateQuote(
    itemId: string,
    basePricePaise: number,
    deliveryDistanceKm: number,
    couponCode?: string,
    context?: QuoteContext
  ): PlatformPriceQuote {
    // Toing Flat economical delivery: ₹25 base + ₹4/km over 3km
    const baseDeliveryPaise = 2500;
    const distanceSurge = deliveryDistanceKm > 3 ? Math.round((deliveryDistanceKm - 3) * 400) : 0;
    const deliveryFeePaise = baseDeliveryPaise + distanceSurge;

    // Platform fee: Confirmed 0 (Toing zero commission direct ordering policy)
    const platformFeePaise = 0;

    // Packaging fee: Undisclosed before cart on merchant stores for orders < ₹200 (Unknown mandatory fee)
    // For orders >= ₹200, verified standard packaging is ₹15.00 (1500 paise)
    const packagingFeePaise: number | null = basePricePaise < 20000 ? null : 1500;

    // Taxes: 5% GST on food base price
    const taxesPaise = Math.round(basePricePaise * 0.05);

    // Surge fee: Always 0 on Toing (Confirmed zero, no surge policy)
    const surgeFeePaise = 0;

    // Coupon logic: Calculate actual paise discount and pick optimal coupon
    let appliedCoupon: CouponRule | null = null;
    let couponDiscountPaise = 0;

    const matchedCoupon = couponCode
      ? this.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.isAvailable)
      : null;

    if (matchedCoupon && basePricePaise >= matchedCoupon.minOrderPaise) {
      appliedCoupon = matchedCoupon;
      couponDiscountPaise = calculateCouponDiscount(matchedCoupon, basePricePaise);
    } else {
      appliedCoupon = this.getBestCoupon(basePricePaise);
      if (appliedCoupon) {
        couponDiscountPaise = calculateCouponDiscount(appliedCoupon, basePricePaise);
      }
    }

    if (couponDiscountPaise === 0) {
      appliedCoupon = null;
    }

    const unknownFeeLabels: string[] = [];
    if (packagingFeePaise === null) {
      unknownFeeLabels.push('Restaurant Packaging (Calculated at merchant checkout)');
    }

    // Only sum verified known fees. Unknown fees remain null and trigger provisional status.
    const knownFeesTotalPaise = deliveryFeePaise + platformFeePaise + (packagingFeePaise ?? 0) + taxesPaise + surgeFeePaise;
    const finalPricePaise = Math.max(0, basePricePaise + knownFeesTotalPaise - couponDiscountPaise);

    // Exact Item & Restaurant Identity Preservation
    const itemName = context?.itemName || itemId;
    const restaurantName = context?.restaurantName || '';
    const restaurantId =
      context?.restaurantId ||
      ('rest-' + restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    // Toing verified destination
    const { url: directOrderUrl, linkType, label: linkTypeLabel } = buildToingUrl(context?.sourceUrl);

    const isUserEnteredPrice = context?.isUserEnteredPrice === true;
    const priceProvenance: PriceProvenance = isUserEnteredPrice
      ? 'user_entered'
      : (context?.priceProvenance || 'demo_catalogue');
    const priceProvenanceLabel = isUserEnteredPrice
      ? 'User-Entered'
      : priceProvenance === 'rule_estimated'
      ? 'Rule Estimated'
      : priceProvenance === 'live_verified'
      ? 'Live Verified'
      : 'Demo Catalogue';

    const estimatedFeeLabels: string[] = [
      'GST 5% (Statutory Restaurant Tax Estimate)',
      'Delivery Fee (Distance-Tiered Estimate)',
    ];

    return {
      platform: this.platform,
      platformDisplayName: this.displayName,
      platformColor: this.themeColor,
      itemId,
      itemName,
      restaurantId,
      restaurantName,
      linkType,
      linkTypeLabel,
      directOrderUrl,
      sourceUrl: context?.sourceUrl,
      basePricePaise,
      isUserEnteredPrice,
      priceProvenance,
      priceProvenanceLabel,
      packagingFeePaise,
      deliveryFeePaise,
      platformFeePaise,
      taxesPaise,
      surgeFeePaise,
      hasEstimatedFees: true,
      estimatedFeeLabels,
      appliedCoupon,
      couponDiscountPaise,
      knownFeesTotalPaise,
      hasUnknownFees: unknownFeeLabels.length > 0,
      unknownFeeLabels,
      finalPricePaise,
      deliveryTimeMinutes: Math.min(60, 25 + Math.round(deliveryDistanceKm * 3.5)),
      appLinks: {
        web: 'https://www.toingit.com/',
        android: 'https://play.google.com/store/apps/details?id=in.swiggy.android.toing',
        ios: 'https://apps.apple.com/in/app/toing-food-delivery/id6748918399',
      },
      listingUnavailableMessage: 'Toing listing link unavailable. Open Toing and search for this dish manually.',
      isAvailable: true,
    };
  }
}

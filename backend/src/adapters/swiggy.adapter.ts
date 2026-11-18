import { FoodDeliveryPlatformAdapter, QuoteContext, calculateCouponDiscount } from './base.adapter.js';
import { PlatformPriceQuote, CouponRule, PriceProvenance } from '../types/index.js';
import { buildSwiggyUrl } from '../utils/urlValidator.js';

export class SwiggyAdapter implements FoodDeliveryPlatformAdapter {
  platform: 'swiggy' = 'swiggy';
  displayName = 'Swiggy';
  themeColor = '#FC8019';

  private coupons: CouponRule[] = [
    {
      id: 'swig-1',
      code: 'SWIGGYIT',
      description: '40% OFF up to ₹80 on orders above ₹149',
      discountType: 'percentage',
      discountPercentage: 40,
      maxDiscountPaise: 8000, // ₹80
      minOrderPaise: 14900, // ₹149
      terms: ['Valid on selected partner outlets', 'Valid once per customer'],
      isAvailable: true,
    },
    {
      id: 'swig-2',
      code: 'FEAST100',
      description: 'Flat ₹100 OFF on party orders above ₹499',
      discountType: 'flat',
      discountValuePaise: 10000,
      minOrderPaise: 49900,
      terms: ['Valid on orders >= ₹499'],
      isAvailable: true,
    },
    {
      id: 'swig-3',
      code: 'SUPERDEAL',
      description: '20% OFF up to ₹50 on minimum ₹199 order',
      discountType: 'percentage',
      discountPercentage: 20,
      maxDiscountPaise: 5000,
      minOrderPaise: 19900,
      terms: ['Universal coupon'],
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
    // Swiggy base delivery: ₹40 base + ₹6/km over 2.5km
    const baseDeliveryPaise = 4000;
    const distanceSurge = deliveryDistanceKm > 2.5 ? Math.round((deliveryDistanceKm - 2.5) * 600) : 0;
    const deliveryFeePaise = baseDeliveryPaise + distanceSurge;

    // Platform fee: ₹7.00 (700 paise) - confirmed mandatory platform fee
    const platformFeePaise = 700;

    // Packaging fee: ₹25.00 (2500 paise) - confirmed standard packaging fee
    const packagingFeePaise = 2500;

    // GST Taxes: 5% on food base price
    const taxesPaise = Math.round(basePricePaise * 0.05);

    // Weather/Surge fee: Standard delivery conditions = confirmed 0.
    // If surge is explicitly active in context, it is unknown/null unless peak quote is provided.
    const isSurgeActive = context?.isSurgeActive === true;
    const surgeFeePaise: number | null = isSurgeActive ? null : 0;

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
    if (surgeFeePaise === null) {
      unknownFeeLabels.push('Peak Hours / Distance Surge (Requires live address checkout)');
    }

    const knownFeesTotalPaise = deliveryFeePaise + platformFeePaise + packagingFeePaise + taxesPaise + (surgeFeePaise ?? 0);
    const finalPricePaise = Math.max(0, basePricePaise + knownFeesTotalPaise - couponDiscountPaise);

    // Exact Item & Restaurant Identity Preservation
    const itemName = context?.itemName || itemId;
    const restaurantName = context?.restaurantName || '';
    const restaurantId =
      context?.restaurantId ||
      ('rest-' + restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    // Targeted URL Generation & Link Classification
    const { url: directOrderUrl, linkType, label: linkTypeLabel } = buildSwiggyUrl(
      itemName,
      restaurantName,
      context?.sourceUrl
    );

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
      deliveryTimeMinutes: Math.min(55, 20 + Math.round(deliveryDistanceKm * 3)),
      isAvailable: true,
    };
  }
}

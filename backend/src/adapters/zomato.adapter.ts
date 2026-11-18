import { FoodDeliveryPlatformAdapter, QuoteContext, calculateCouponDiscount } from './base.adapter.js';
import { PlatformPriceQuote, CouponRule, PriceProvenance } from '../types/index.js';
import { buildZomatoUrl } from '../utils/urlValidator.js';

export class ZomatoAdapter implements FoodDeliveryPlatformAdapter {
  platform: 'zomato' = 'zomato';
  displayName = 'Zomato';
  themeColor = '#E23744';

  private coupons: CouponRule[] = [
    {
      id: 'zom-1',
      code: 'ZOMATO50',
      description: '50% OFF up to ₹100 on orders above ₹199',
      discountType: 'percentage',
      discountPercentage: 50,
      maxDiscountPaise: 10000, // ₹100 in paise
      minOrderPaise: 19900, // ₹199 in paise
      terms: ['Applicable on selected restaurants', 'Once per day'],
      isAvailable: true,
    },
    {
      id: 'zom-2',
      code: 'GOLDDEL',
      description: 'Free delivery on orders above ₹199 with Gold',
      discountType: 'flat',
      discountValuePaise: 3500, // ₹35 delivery waiver
      minOrderPaise: 19900,
      terms: ['For Zomato Gold members', 'Within 7km radius'],
      isAvailable: true,
    },
    {
      id: 'zom-3',
      code: 'TASTY30',
      description: '30% OFF up to ₹75 on orders above ₹249',
      discountType: 'percentage',
      discountPercentage: 30,
      maxDiscountPaise: 7500,
      minOrderPaise: 24900,
      terms: ['All users eligible'],
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
        // Tie-breaker: prefer coupon with lower minOrder threshold (easier to satisfy)
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
    // Delivery fee: ₹35 base + ₹5/km over 3km
    const baseDeliveryPaise = 3500;
    const distanceSurge = deliveryDistanceKm > 3 ? Math.round((deliveryDistanceKm - 3) * 500) : 0;
    const deliveryFeePaise = baseDeliveryPaise + distanceSurge;
    
    // Platform fee: ₹6.00 (600 paise) - confirmed mandatory platform fee
    const platformFeePaise = 600;
    
    // Packaging fee: ₹20.00 (2000 paise) - confirmed standard packaging fee
    const packagingFeePaise = 2000;
    
    // GST Taxes: 5% on food base price
    const taxesPaise = Math.round(basePricePaise * 0.05);

    // Weather/Surge fee: Standard delivery conditions = confirmed 0.
    // If surge is explicitly marked active in context, it is unknown/null unless peak quote is provided.
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
      unknownFeeLabels.push('Rain / High Demand Surge (Requires live address checkout)');
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
    const { url: directOrderUrl, linkType, label: linkTypeLabel } = buildZomatoUrl(
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
      deliveryTimeMinutes: Math.min(60, 25 + Math.round(deliveryDistanceKm * 3)),
      isAvailable: true,
    };
  }
}

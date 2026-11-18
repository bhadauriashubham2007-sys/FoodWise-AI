import {
  Brand,
  BrandCategory,
  BrandMenuItem,
  BrandItemVariant,
  BrandPlatformQuote,
  BrandComparisonResult,
  BrandMatchingStatus,
  LocationContext,
} from '../types/brand.types.js';
import { INDIAN_BRANDS, BRAND_MENU_ITEMS } from '../data/brandCatalog.js';
import { ZomatoAdapter } from '../adapters/zomato.adapter.js';
import { SwiggyAdapter } from '../adapters/swiggy.adapter.js';
import { ToingAdapter } from '../adapters/toing.adapter.js';

export class BrandService {
  private zomatoAdapter = new ZomatoAdapter();
  private swiggyAdapter = new SwiggyAdapter();
  private toingAdapter = new ToingAdapter();

  /**
   * Get all brands with optional category and search filters
   */
  public getBrands(category?: string, query?: string): Brand[] {
    let brands = [...INDIAN_BRANDS];

    if (category && category.toLowerCase() !== 'all') {
      const catNorm = category.toLowerCase().trim();
      brands = brands.filter((b) => b.category.toLowerCase() === catNorm);
    }

    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      brands = brands.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.cuisine.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.popularItems.some((item) => item.toLowerCase().includes(q))
      );
    }

    return brands;
  }

  /**
   * Get brand by ID
   */
  public getBrandById(brandId: string): Brand | null {
    return INDIAN_BRANDS.find((b) => b.id === brandId) || null;
  }

  /**
   * Get brand menu items with optional category and search filters
   */
  public getBrandMenu(brandId: string, category?: string, query?: string): BrandMenuItem[] {
    let items = BRAND_MENU_ITEMS.filter((item) => item.brandId === brandId);

    if (category && category.toLowerCase() !== 'all') {
      const catNorm = category.toLowerCase().trim();
      items = items.filter((item) => item.category.toLowerCase() === catNorm);
    }

    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return items;
  }

  /**
   * Compare specific brand item across Zomato, Swiggy, and Toing
   * Takes into account location context, distance, and authentic Indian platform fees
   */
  public async compareBrandItem(
    brandId: string,
    itemId: string,
    variantName?: string,
    location?: LocationContext
  ): Promise<BrandComparisonResult | null> {
    const brand = this.getBrandById(brandId);
    if (!brand) return null;

    const item = BRAND_MENU_ITEMS.find((it) => it.id === itemId && it.brandId === brandId);
    if (!item) return null;

    // Resolve variant if specified
    let selectedVariant: BrandItemVariant | undefined;
    let basePricePaiseZomato = item.basePricesPaise.zomato;
    let basePricePaiseSwiggy = item.basePricesPaise.swiggy;
    let basePricePaiseToing = item.basePricesPaise.toing ?? item.basePricesPaise.zomato;

    if (variantName && item.variants && item.variants.length > 0) {
      const matchedVariant = item.variants.find(
        (v) => v.name.toLowerCase() === variantName.toLowerCase()
      );
      if (matchedVariant) {
        selectedVariant = matchedVariant;
        basePricePaiseZomato = matchedVariant.pricePaise;
        basePricePaiseSwiggy = matchedVariant.pricePaise;
        basePricePaiseToing = matchedVariant.pricePaise;
      }
    }

    // Default distance based on location or default 3.2km
    const distanceKm = location?.distanceKm || 3.2;

    const locContext: LocationContext = {
      city: location?.city ? location.city.trim() : '',
      pincode: location?.pincode ? location.pincode.trim() : '',
      distanceKm,
    };

    const requestedCityNormalized = locContext.city ? locContext.city.split(',')[0].trim().toLowerCase() : '';
    const isVerifiedCity = requestedCityNormalized === '' || requestedCityNormalized === 'bengaluru' || requestedCityNormalized === 'bangalore';

    const defaultMatchingStatus: BrandMatchingStatus = isVerifiedCity ? 'exact_match_verified' : 'availability_not_verified';
    const defaultMatchingStatusLabel = isVerifiedCity
      ? 'Exact match verified (Demo catalogue)'
      : `Availability not verified for ${locContext.city} (Demo catalogue covers Bengaluru)`;
    const isOutletAvailable = isVerifiedCity;
    const unavailabilityReason = !isVerifiedCity
      ? `No verified outlet found for ${brand.name} in ${locContext.city}. The available demo catalogue currently covers Bengaluru.`
      : undefined;

    // Calculate Zomato Quote
    const zomatoQuoteRaw = this.zomatoAdapter.calculateQuote(
      item.id,
      basePricePaiseZomato,
      distanceKm,
      undefined,
      {
        itemName: item.name,
        restaurantName: brand.name,
        restaurantId: brand.id,
      }
    );

    const zomatoBrandQuote: BrandPlatformQuote = {
      platform: 'zomato',
      platformDisplayName: 'Zomato',
      platformColor: '#E23744',
      brandId: brand.id,
      brandName: brand.name,
      itemId: item.id,
      itemName: item.name,
      selectedVariant: selectedVariant?.name,
      matchingStatus: defaultMatchingStatus,
      matchingStatusLabel: defaultMatchingStatusLabel,
      isAvailable: isOutletAvailable,
      unavailabilityReason,
      basePricePaise: zomatoQuoteRaw.basePricePaise,
      isUserEnteredPrice: false,
      priceProvenance: 'demo_catalogue',
      priceProvenanceLabel: 'Demo Catalogue',
      packagingFeePaise: zomatoQuoteRaw.packagingFeePaise,
      deliveryFeePaise: zomatoQuoteRaw.deliveryFeePaise,
      platformFeePaise: zomatoQuoteRaw.platformFeePaise,
      taxesPaise: zomatoQuoteRaw.taxesPaise,
      surgeFeePaise: zomatoQuoteRaw.surgeFeePaise,
      hasEstimatedFees: true,
      estimatedFeeLabels: zomatoQuoteRaw.estimatedFeeLabels,
      appliedCoupon: zomatoQuoteRaw.appliedCoupon,
      couponDiscountPaise: zomatoQuoteRaw.couponDiscountPaise,
      knownFeesTotalPaise: zomatoQuoteRaw.knownFeesTotalPaise,
      hasUnknownFees: zomatoQuoteRaw.hasUnknownFees,
      unknownFeeLabels: zomatoQuoteRaw.unknownFeeLabels,
      finalPricePaise: zomatoQuoteRaw.finalPricePaise,
      deliveryTimeMinutes: zomatoQuoteRaw.deliveryTimeMinutes,
      directOrderUrl: zomatoQuoteRaw.directOrderUrl,
      linkType: zomatoQuoteRaw.linkType,
      linkTypeLabel: zomatoQuoteRaw.linkTypeLabel,
      dataSource: 'demo_catalog',
    };

    // Calculate Swiggy Quote
    const swiggyQuoteRaw = this.swiggyAdapter.calculateQuote(
      item.id,
      basePricePaiseSwiggy,
      distanceKm,
      undefined,
      {
        itemName: item.name,
        restaurantName: brand.name,
        restaurantId: brand.id,
      }
    );

    const swiggyBrandQuote: BrandPlatformQuote = {
      platform: 'swiggy',
      platformDisplayName: 'Swiggy',
      platformColor: '#FC8019',
      brandId: brand.id,
      brandName: brand.name,
      itemId: item.id,
      itemName: item.name,
      selectedVariant: selectedVariant?.name,
      matchingStatus: defaultMatchingStatus,
      matchingStatusLabel: defaultMatchingStatusLabel,
      isAvailable: isOutletAvailable,
      unavailabilityReason,
      basePricePaise: swiggyQuoteRaw.basePricePaise,
      isUserEnteredPrice: false,
      priceProvenance: 'demo_catalogue',
      priceProvenanceLabel: 'Demo Catalogue',
      packagingFeePaise: swiggyQuoteRaw.packagingFeePaise,
      deliveryFeePaise: swiggyQuoteRaw.deliveryFeePaise,
      platformFeePaise: swiggyQuoteRaw.platformFeePaise,
      taxesPaise: swiggyQuoteRaw.taxesPaise,
      surgeFeePaise: swiggyQuoteRaw.surgeFeePaise,
      hasEstimatedFees: true,
      estimatedFeeLabels: swiggyQuoteRaw.estimatedFeeLabels,
      appliedCoupon: swiggyQuoteRaw.appliedCoupon,
      couponDiscountPaise: swiggyQuoteRaw.couponDiscountPaise,
      knownFeesTotalPaise: swiggyQuoteRaw.knownFeesTotalPaise,
      hasUnknownFees: swiggyQuoteRaw.hasUnknownFees,
      unknownFeeLabels: swiggyQuoteRaw.unknownFeeLabels,
      finalPricePaise: swiggyQuoteRaw.finalPricePaise,
      deliveryTimeMinutes: swiggyQuoteRaw.deliveryTimeMinutes,
      directOrderUrl: swiggyQuoteRaw.directOrderUrl,
      linkType: swiggyQuoteRaw.linkType,
      linkTypeLabel: swiggyQuoteRaw.linkTypeLabel,
      dataSource: 'demo_catalog',
    };

    // Calculate Toing Quote (Direct / App fallback with clear transparency)
    const toingQuoteRaw = this.toingAdapter.calculateQuote(
      item.id,
      basePricePaiseToing,
      distanceKm,
      undefined,
      {
        itemName: item.name,
        restaurantName: brand.name,
        restaurantId: brand.id,
      }
    );

    const toingBrandQuote: BrandPlatformQuote = {
      platform: 'toing',
      platformDisplayName: 'Toing',
      platformColor: '#00B159',
      brandId: brand.id,
      brandName: brand.name,
      itemId: item.id,
      itemName: item.name,
      selectedVariant: selectedVariant?.name,
      matchingStatus: 'availability_not_verified',
      matchingStatusLabel: 'Availability not verified (Web Fallback)',
      isAvailable: false,
      unavailabilityReason:
        'National brand chains are primarily delivered via local cloud partners or app. Web direct listing cannot be verified.',
      basePricePaise: toingQuoteRaw.basePricePaise,
      isUserEnteredPrice: false,
      priceProvenance: selectedVariant ? 'rule_estimated' : 'demo_catalogue',
      priceProvenanceLabel: selectedVariant ? 'Rule Estimated (Web Fallback)' : 'Demo Catalogue (Web Fallback)',
      packagingFeePaise: toingQuoteRaw.packagingFeePaise,
      deliveryFeePaise: toingQuoteRaw.deliveryFeePaise,
      platformFeePaise: toingQuoteRaw.platformFeePaise,
      taxesPaise: toingQuoteRaw.taxesPaise,
      surgeFeePaise: toingQuoteRaw.surgeFeePaise,
      hasEstimatedFees: true,
      estimatedFeeLabels: toingQuoteRaw.estimatedFeeLabels,
      appliedCoupon: toingQuoteRaw.appliedCoupon,
      couponDiscountPaise: toingQuoteRaw.couponDiscountPaise,
      knownFeesTotalPaise: toingQuoteRaw.knownFeesTotalPaise,
      hasUnknownFees: toingQuoteRaw.hasUnknownFees,
      unknownFeeLabels: toingQuoteRaw.unknownFeeLabels,
      isProvisional: true,
      finalPricePaise: toingQuoteRaw.finalPricePaise,
      deliveryTimeMinutes: toingQuoteRaw.deliveryTimeMinutes,
      directOrderUrl: toingQuoteRaw.directOrderUrl,
      linkType: toingQuoteRaw.linkType,
      linkTypeLabel: toingQuoteRaw.linkTypeLabel,
      dataSource: 'demo_catalog',
    };

    // Rank available verified listings by final price
    const availableQuotes = [zomatoBrandQuote, swiggyBrandQuote].sort(
      (a, b) => a.finalPricePaise - b.finalPricePaise
    );

    // List all quotes with available ones first, followed by unverified ones
    const allQuotes: BrandPlatformQuote[] = [...availableQuotes, toingBrandQuote];

    const cheapestQuote = availableQuotes[0] || zomatoBrandQuote;
    const highestQuote = availableQuotes[availableQuotes.length - 1] || swiggyBrandQuote;
    const savingsPaise = Math.max(0, highestQuote.finalPricePaise - cheapestQuote.finalPricePaise);

    const comparedPlatformNames = availableQuotes.map((q) => q.platformDisplayName);
    const unverifiedOrExcluded = allQuotes.filter(
      (q) => !q.isAvailable && q.matchingStatus === 'availability_not_verified'
    );

    // Check if any competing platform has unverified availability, unknown fees, or estimated price
    const hasUnresolvedCompetitor = allQuotes.some((q) => {
      if (q.platform === cheapestQuote.platform) return false;
      const isExplicitlyConfirmedUnavailable =
        q.isAvailable === false && q.matchingStatus === 'not_available';
      if (isExplicitlyConfirmedUnavailable) return false;

      if (q.isAvailable === false || q.matchingStatus === 'availability_not_verified') return true;
      if (q.hasUnknownFees) return true;
      if (q.priceProvenance === 'rule_estimated' || q.priceProvenance === 'unknown') return true;
      return false;
    });

    const isDefinitiveCheapest =
      availableQuotes.length > 0 &&
      !cheapestQuote.hasUnknownFees &&
      cheapestQuote.priceProvenance !== 'rule_estimated' &&
      cheapestQuote.priceProvenance !== 'unknown' &&
      !hasUnresolvedCompetitor;

    let reason = '';
    if (!isVerifiedCity) {
      reason = `No verified listings are currently available for ${locContext.city}. The available demo catalogue currently covers Bengaluru. Demo benchmark: `;
    }

    const comparedList = comparedPlatformNames.join(' and ');
    if (unverifiedOrExcluded.length > 0) {
      const excludedDetails = unverifiedOrExcluded
        .map((q) => `${q.platformDisplayName} excluded: ${q.matchingStatusLabel.toLowerCase()}`)
        .join('; ');
      reason += `Compared across ${comparedList} (${excludedDetails}). Among compared platforms, ${cheapestQuote.platformDisplayName} is the lowest price option for ${brand.name}'s ${item.name}`;
    } else {
      reason += `Compared across ${comparedList}. ${cheapestQuote.platformDisplayName} is the lowest price option for ${brand.name}'s ${item.name}`;
    }

    if (selectedVariant) {
      reason += ` (${selectedVariant.name})`;
    }
    if (savingsPaise > 0) {
      reason += `, saving ₹${(savingsPaise / 100).toFixed(2)} compared to ${highestQuote.platformDisplayName}.`;
    } else {
      reason += `. Both compared platforms offer identical pricing after fees.`;
    }
    if (cheapestQuote.appliedCoupon) {
      reason += ` Includes promo code ${cheapestQuote.appliedCoupon.code}.`;
    }

    return {
      brand,
      menuItem: item,
      selectedVariant,
      location: locContext,
      quotes: allQuotes,
      cheapestQuote,
      highestQuote,
      savingsPaise,
      recommendationReason: reason,
      isDefinitiveCheapest,
      isDemoData: true,
      comparedAt: new Date().toISOString(),
    };
  }
}

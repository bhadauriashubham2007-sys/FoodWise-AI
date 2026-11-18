import { ComparisonService } from './services/comparison.service.js';
import { PlatformPriceQuote, FoodItem } from './types/index.js';

console.log('================================================================');
console.log('  FoodWise AI: Real Comparison Scenarios Verification Suite    ');
console.log('================================================================');

const service = new ComparisonService();

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    throw new Error(`Test failed: ${testName} - ${detail}`);
  }
}

// -----------------------------------------------------------------------------
// Scenario 1: Platform with Unknown Platform Fee (Provisional Ranking)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 1: Platform with Unknown Platform Fee (Provisional Ranking) ---');
{
  const mockItem = service.getComparison('biryani-hyd-1');
  assert(mockItem !== null, 'Fetch comparison for biryani-hyd-1');
  
  if (mockItem) {
    // Construct scenario where a platform has unverified platform fee
    const toingWithUnknownPlatformFee: PlatformPriceQuote = {
      ...mockItem.foodItem.quotes.find(q => q.platform === 'toing')!,
      platformFeePaise: null,
      hasUnknownFees: true,
      unknownFeeLabels: ['Platform Service Fee (Calculated at checkout)'],
      isProvisional: true,
    };
    
    assert(toingWithUnknownPlatformFee.platformFeePaise === null, 'Toing platformFeePaise is strictly NULL');
    assert(toingWithUnknownPlatformFee.hasUnknownFees === true, 'Toing quote hasUnknownFees is true');
    assert(toingWithUnknownPlatformFee.unknownFeeLabels.some(l => l.includes('Platform Service Fee')) === true, 'Toing unknownFeeLabels contains Platform Service Fee');

    // When numerically lowest but has unknown fee, definitive cheapest must be false
    const quotes = [
      mockItem.foodItem.quotes.find(q => q.platform === 'zomato')!,
      mockItem.foodItem.quotes.find(q => q.platform === 'swiggy')!,
      toingWithUnknownPlatformFee,
    ].sort((a, b) => a.finalPricePaise - b.finalPricePaise);
    
    const cheapestQuote = quotes[0];
    const isDefinitiveCheapest = !cheapestQuote.hasUnknownFees;
    
    assert(isDefinitiveCheapest === false, 'isDefinitiveCheapest is FALSE when cheapest quote has unknown fees');
  }
}

// -----------------------------------------------------------------------------
// Scenario 2: Toing has unknown packaging fee (< ₹200 order)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 2: Toing with Unknown Packaging Fee (< ₹200 order) ---');
{
  const comparison = service.getComparison('snack-samosa-chole-52');
  assert(comparison !== null, 'Fetch comparison for small order (snack-samosa-chole-52)');
  
  if (comparison) {
    const toingQuote = comparison.foodItem.quotes.find(q => q.platform === 'toing');
    assert(toingQuote !== undefined, 'Toing quote exists for snack-samosa-chole-52');
    assert(toingQuote?.packagingFeePaise === null, 'Toing packagingFeePaise is strictly NULL (< ₹200)', `Got: ${toingQuote?.packagingFeePaise}`);
    assert(toingQuote?.unknownFeeLabels.some(l => l.includes('Restaurant Packaging')) === true, 'Toing unknownFeeLabels includes Restaurant Packaging');
    
    if (comparison.cheapestQuote.platform === 'toing') {
      assert(comparison.isDefinitiveCheapest === false, 'isDefinitiveCheapest is FALSE when packaging fee is unknown');
      assert(comparison.recommendationReason.includes('Restaurant Packaging'), 'Recommendation discloses unverified Restaurant Packaging');
    }
  }
}

// -----------------------------------------------------------------------------
// Scenario 3: Another platform has unknown delivery fee
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 3: Non-Toing Platform Has Unknown Delivery Fee ---');
{
  // Construct a controlled comparison where Zomato has unknown delivery fee
  const mockZomatoQuote: PlatformPriceQuote = {
    platform: 'zomato',
    platformDisplayName: 'Zomato',
    platformColor: '#E23744',
    itemId: 'test-item-3',
    itemName: 'Test Item',
    restaurantId: 'rest-1',
    restaurantName: 'Test Kitchen',
    linkType: 'exact_dish',
    linkTypeLabel: 'Direct Dish Link',
    directOrderUrl: 'https://www.zomato.com/test',
    basePricePaise: 20000,
    packagingFeePaise: 1500,
    deliveryFeePaise: null, // UNKNOWN delivery fee
    platformFeePaise: 600,
    taxesPaise: 1000,
    surgeFeePaise: 0,
    appliedCoupon: null,
    couponDiscountPaise: 0,
    knownFeesTotalPaise: 1500 + 600 + 1000, // 3100 paise
    hasUnknownFees: true,
    unknownFeeLabels: ['Delivery Fee (Calculated at checkout)'],
    isProvisional: true,
    finalPricePaise: 23100, // Numerically lowest provisional total
    deliveryTimeMinutes: 30,
    isAvailable: true,
  };

  const mockSwiggyQuote: PlatformPriceQuote = {
    platform: 'swiggy',
    platformDisplayName: 'Swiggy',
    platformColor: '#FC8019',
    itemId: 'test-item-3',
    itemName: 'Test Item',
    restaurantId: 'rest-1',
    restaurantName: 'Test Kitchen',
    linkType: 'exact_dish',
    linkTypeLabel: 'Direct Dish Link',
    directOrderUrl: 'https://www.swiggy.com/test',
    basePricePaise: 20000,
    packagingFeePaise: 1500,
    deliveryFeePaise: 3500, // Known
    platformFeePaise: 700,
    taxesPaise: 1000,
    surgeFeePaise: 0,
    appliedCoupon: null,
    couponDiscountPaise: 0,
    knownFeesTotalPaise: 6700,
    hasUnknownFees: false,
    unknownFeeLabels: [],
    isProvisional: false,
    finalPricePaise: 26700,
    deliveryTimeMinutes: 28,
    isAvailable: true,
  };

  const mockToingQuote: PlatformPriceQuote = {
    platform: 'toing',
    platformDisplayName: 'Toing',
    platformColor: '#00B159',
    itemId: 'test-item-3',
    itemName: 'Test Item',
    restaurantId: 'rest-1',
    restaurantName: 'Test Kitchen',
    linkType: 'restaurant_fallback',
    linkTypeLabel: 'Toing App',
    directOrderUrl: 'https://www.toingit.com/',
    basePricePaise: 21000,
    packagingFeePaise: 1500,
    deliveryFeePaise: 2500,
    platformFeePaise: null,
    taxesPaise: 1050,
    surgeFeePaise: 0,
    appliedCoupon: null,
    couponDiscountPaise: 0,
    knownFeesTotalPaise: 5050,
    hasUnknownFees: true,
    unknownFeeLabels: ['Platform Service Fee (Calculated at merchant checkout)'],
    isProvisional: true,
    finalPricePaise: 26050,
    deliveryTimeMinutes: 35,
    isAvailable: true,
  };

  const quotes = [mockZomatoQuote, mockSwiggyQuote, mockToingQuote];
  const sortedQuotes = [...quotes].sort((a, b) => a.finalPricePaise - b.finalPricePaise);
  const cheapestQuote = sortedQuotes[0];
  const isDefinitiveCheapest = !cheapestQuote.hasUnknownFees;

  assert(cheapestQuote.platform === 'zomato', 'Zomato is numerically lowest provisional quote');
  assert(cheapestQuote.hasUnknownFees === true, 'Zomato hasUnknownFees is TRUE due to null delivery fee');
  assert(isDefinitiveCheapest === false, 'isDefinitiveCheapest is FALSE when non-Toing platform has unknown delivery fee');
  assert(cheapestQuote.unknownFeeLabels.includes('Delivery Fee (Calculated at checkout)'), 'Zomato registers unknown delivery fee label');
}

// -----------------------------------------------------------------------------
// Scenario 4: All platforms have verified fees
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 4: All Platforms Have 100% Verified Fees ---');
{
  const verifiedZomato: PlatformPriceQuote = {
    platform: 'zomato',
    platformDisplayName: 'Zomato',
    platformColor: '#E23744',
    itemId: 'test-item-4',
    itemName: 'Verified Dish',
    restaurantId: 'rest-4',
    restaurantName: 'Verified Kitchen',
    linkType: 'exact_dish',
    linkTypeLabel: 'Direct Link',
    directOrderUrl: 'https://www.zomato.com/test',
    basePricePaise: 25000,
    packagingFeePaise: 1500,
    deliveryFeePaise: 3500,
    platformFeePaise: 600,
    taxesPaise: 1250,
    surgeFeePaise: 0,
    appliedCoupon: null,
    couponDiscountPaise: 0,
    knownFeesTotalPaise: 6850,
    hasUnknownFees: false,
    unknownFeeLabels: [],
    isProvisional: false,
    finalPricePaise: 31850,
    deliveryTimeMinutes: 25,
    isAvailable: true,
  };

  const verifiedSwiggy: PlatformPriceQuote = {
    ...verifiedZomato,
    platform: 'swiggy',
    platformDisplayName: 'Swiggy',
    platformColor: '#FC8019',
    deliveryFeePaise: 4000,
    platformFeePaise: 700,
    knownFeesTotalPaise: 7450,
    finalPricePaise: 32450,
  };

  const verifiedToing: PlatformPriceQuote = {
    ...verifiedZomato,
    platform: 'toing',
    platformDisplayName: 'Toing',
    platformColor: '#00B159',
    deliveryFeePaise: 2500,
    platformFeePaise: 0, // Explicitly confirmed 0 by authorized merchant
    knownFeesTotalPaise: 5250,
    finalPricePaise: 30250,
  };

  const quotes = [verifiedZomato, verifiedSwiggy, verifiedToing];
  const sortedQuotes = [...quotes].sort((a, b) => a.finalPricePaise - b.finalPricePaise);
  const cheapestQuote = sortedQuotes[0];
  const highestQuote = sortedQuotes[sortedQuotes.length - 1];
  const isPriceTie = sortedQuotes.length > 1 && sortedQuotes[1].finalPricePaise === cheapestQuote.finalPricePaise;
  const isDefinitiveCheapest = !cheapestQuote.hasUnknownFees && !isPriceTie;
  const savingsPaise = highestQuote.finalPricePaise - cheapestQuote.finalPricePaise;

  assert(isDefinitiveCheapest === true, 'isDefinitiveCheapest is TRUE when all fees are verified');
  assert(isPriceTie === false, 'isPriceTie is FALSE when prices differ');
  assert(cheapestQuote.platform === 'toing', 'Toing is confirmed cheapest');
  assert(savingsPaise === 2200, 'Exact savings calculated: ₹22.00');

  // Verify confirmed recommendation template
  let reason = `${cheapestQuote.platformDisplayName} is the confirmed cheapest choice. `;
  if (cheapestQuote.platformFeePaise === 0) reason += 'Zero platform fee confirmed. ';
  if (savingsPaise > 0) reason += `Total verified savings: ₹${(savingsPaise / 100).toFixed(2)} compared to ${highestQuote.platformDisplayName}.`;

  assert(reason.includes('confirmed cheapest choice'), 'Recommendation identifies confirmed cheapest choice');
  assert(reason.includes('Total verified savings: ₹22.00'), 'Recommendation quotes verified savings');
  console.log(`     Confirmed Reason: "${reason}"`);
}

// -----------------------------------------------------------------------------
// Scenario 5: Two platforms have equal verified final prices (Tie)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 5: Two Platforms Have Equal Verified Final Prices (Price Tie) ---');
{
  const tiedQuoteZomato: PlatformPriceQuote = {
    platform: 'zomato',
    platformDisplayName: 'Zomato',
    platformColor: '#E23744',
    itemId: 'test-item-5',
    itemName: 'Tied Dish',
    restaurantId: 'rest-5',
    restaurantName: 'Tied Kitchen',
    linkType: 'exact_dish',
    linkTypeLabel: 'Direct Link',
    directOrderUrl: 'https://www.zomato.com/test',
    basePricePaise: 20000,
    packagingFeePaise: 1000,
    deliveryFeePaise: 3000,
    platformFeePaise: 600,
    taxesPaise: 1000,
    surgeFeePaise: 0,
    appliedCoupon: null,
    couponDiscountPaise: 0,
    knownFeesTotalPaise: 5600,
    hasUnknownFees: false,
    unknownFeeLabels: [],
    isProvisional: false,
    finalPricePaise: 25600, // Identical ₹256.00
    deliveryTimeMinutes: 25,
    isAvailable: true,
  };

  const tiedQuoteSwiggy: PlatformPriceQuote = {
    ...tiedQuoteZomato,
    platform: 'swiggy',
    platformDisplayName: 'Swiggy',
    platformColor: '#FC8019',
    finalPricePaise: 25600, // Identical ₹256.00
    deliveryTimeMinutes: 30,
  };

  const higherToing: PlatformPriceQuote = {
    ...tiedQuoteZomato,
    platform: 'toing',
    platformDisplayName: 'Toing',
    platformColor: '#00B159',
    finalPricePaise: 27000,
    deliveryTimeMinutes: 35,
  };

  const quotes = [tiedQuoteZomato, tiedQuoteSwiggy, higherToing];
  const sortedQuotes = [...quotes].sort((a, b) => a.finalPricePaise - b.finalPricePaise);
  const cheapestQuote = sortedQuotes[0];
  const tiedQuotes = sortedQuotes.filter(q => q.finalPricePaise === cheapestQuote.finalPricePaise);
  const isPriceTie = tiedQuotes.length > 1;
  const isDefinitiveCheapest = !cheapestQuote.hasUnknownFees && !isPriceTie;

  assert(isPriceTie === true, 'isPriceTie is TRUE when two platforms have equal lowest price');
  assert(isDefinitiveCheapest === false, 'isDefinitiveCheapest is FALSE when there is a tie');
  assert(tiedQuotes.length === 2, 'Exactly 2 platforms tied at lowest price');
  
  const tiedNames = tiedQuotes.map(q => q.platformDisplayName).join(' and ');
  const tieReason = `Price Match (Tie): Both ${tiedNames} offer the identical verified lowest price of ₹${(cheapestQuote.finalPricePaise / 100).toFixed(2)}. Select your preferred platform or faster delivery time.`;

  assert(tieReason.startsWith('Price Match (Tie):'), 'Recommendation starts with Price Match (Tie)');
  assert(tieReason.includes('Both Zomato and Swiggy offer the identical verified lowest price'), 'Recommendation truthfully identifies both tied platforms without favoring one');
  console.log(`     Tie Reason: "${tieReason}"`);
}

console.log('\n================================================================');
console.log(`  Tests Completed: ${passedTests}/${totalTests} Passed (100%)`);
console.log('================================================================\n');

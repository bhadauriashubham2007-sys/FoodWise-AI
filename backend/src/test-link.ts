import { ComparisonService } from './services/comparison.service.js';
import { LinkParserService } from './services/linkParser.service.js';

async function runLinkTests() {
  console.log('====================================================');
  console.log('🧪 TESTING "COMPARE BY LINK" FEATURE ENGINE');
  console.log('====================================================\n');

  const comparisonService = new ComparisonService();
  const linkService = new LinkParserService(comparisonService);

  // Test 1: Valid Zomato link with dish parameter
  console.log('1. Testing Valid Zomato Biryani Link:');
  const res1 = await linkService.parseAndCompareLink(
    'https://www.zomato.com/bangalore/paradise-biryani-palace?dish=hyderabadi-chicken-dum-biryani'
  );
  console.log(`   Source Platform: ${res1.extraction.sourcePlatform}`);
  console.log(`   Extracted Food: ${res1.extraction.foodName}`);
  console.log(`   Matched Item: ${res1.matchedFoodItem?.name}`);
  console.log(`   Cheapest Platform: ${res1.cheapestQuote?.platformDisplayName} (₹${(res1.cheapestQuote?.finalPricePaise || 0) / 100})`);
  console.log(`   Savings vs Highest: ₹${(res1.savingsPaise || 0) / 100}`);
  if (!res1.success || !res1.matchedFoodItem) throw new Error('Test 1 Failed');
  console.log('   ✅ PASS\n');

  // Test 2: Valid Swiggy link with slug
  console.log('2. Testing Valid Swiggy Pizza Link:');
  const res2 = await linkService.parseAndCompareLink(
    'https://www.swiggy.com/restaurants/la-pinoz-pizza-central/spicy-paneer-tikka-makhani-pizza-123456'
  );
  console.log(`   Source Platform: ${res2.extraction.sourcePlatform}`);
  console.log(`   Extracted Food: ${res2.extraction.foodName}`);
  console.log(`   Matched Item: ${res2.matchedFoodItem?.name}`);
  console.log(`   Cheapest Platform: ${res2.cheapestQuote?.platformDisplayName}`);
  if (!res2.success || !res2.matchedFoodItem) throw new Error('Test 2 Failed');
  console.log('   ✅ PASS\n');

  // Test 3: Invalid domain link
  console.log('3. Testing Invalid Domain Link:');
  const res3 = await linkService.parseAndCompareLink('https://www.randomsite.com/food/pizza');
  console.log(`   Valid Domain: ${res3.extraction.isValidDomain}`);
  console.log(`   Message: ${res3.message}`);
  if (res3.extraction.isValidDomain !== false) throw new Error('Test 3 Failed - Should reject invalid domain');
  console.log('   ✅ PASS (Properly rejected)\n');

  // Test 4: Generic Zomato link needing manual input fallback
  console.log('4. Testing Generic Link (Fallback Trigger):');
  const res4 = await linkService.parseAndCompareLink('https://www.zomato.com/india');
  console.log(`   Needs Manual Input: ${res4.needsManualInput}`);
  console.log(`   Extraction Notes: ${res4.extraction.extractionNotes}`);
  if (!res4.needsManualInput) throw new Error('Test 4 Failed - Should request manual input');
  console.log('   ✅ PASS (Fallback correctly requested)\n');

  // Test 5: Manual input fallback provided
  console.log('5. Testing Manual Fallback Input:');
  const res5 = await linkService.parseAndCompareLink('https://www.zomato.com/india', 'Steamed Veg Momos', 130);
  console.log(`   Data Source: ${res5.extraction.dataSource}`);
  console.log(`   Matched Item: ${res5.matchedFoodItem?.name}`);
  console.log(`   Cheapest Platform: ${res5.cheapestQuote?.platformDisplayName}`);
  if (!res5.success || res5.extraction.dataSource !== 'manual_fallback') throw new Error('Test 5 Failed');
  console.log('   ✅ PASS\n');

  console.log('🎉 ALL 5 COMPARE BY LINK TESTS PASSED CLEANLY!');
}

runLinkTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

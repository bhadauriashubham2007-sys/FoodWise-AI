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

  // Test 6: Mobile Zomato short URL (zoma.to)
  console.log('6. Testing Mobile Zomato Short URL (zoma.to):');
  const res6 = await linkService.parseAndCompareLink('https://zoma.to/r/12345');
  console.log(`   Source Platform: ${res6.extraction.sourcePlatform}`);
  console.log(`   Is Valid Domain: ${res6.extraction.isValidDomain}`);
  console.log(`   Needs Manual Input: ${res6.needsManualInput}`);
  if (res6.extraction.sourcePlatform !== 'zomato' || !res6.extraction.isValidDomain) {
    throw new Error('Test 6 Failed - zoma.to must be recognized as valid Zomato domain');
  }
  console.log('   ✅ PASS (zoma.to recognized as Zomato)\n');

  // Test 7: Mobile Share Text with surrounding text and punctuation
  console.log('7. Testing Mobile Share Text with Surrounding Text:');
  const shareText = 'Check out this dish on Zomato: https://www.zomato.com/bangalore/paradise-biryani?dish=hyderabadi-chicken-dum-biryani!';
  const res7 = await linkService.parseAndCompareLink(shareText);
  console.log(`   Extracted Food: ${res7.extraction.foodName}`);
  console.log(`   Matched Item: ${res7.matchedFoodItem?.name}`);
  if (!res7.success || !res7.matchedFoodItem) {
    throw new Error('Test 7 Failed - Mobile share text should be sanitized and parsed');
  }
  console.log('   ✅ PASS (Share text extracted and matched)\n');

  // Test 8: Swiggy mobile share URL (swiggy.onelink.me)
  console.log('8. Testing Swiggy Mobile Share URL (swiggy.onelink.me):');
  const res8 = await linkService.parseAndCompareLink('https://swiggy.onelink.me/1234/dish?item=spicy-paneer-tikka-makhani-pizza');
  console.log(`   Source Platform: ${res8.extraction.sourcePlatform}`);
  console.log(`   Matched Item: ${res8.matchedFoodItem?.name}`);
  if (res8.extraction.sourcePlatform !== 'swiggy' || !res8.matchedFoodItem) {
    throw new Error('Test 8 Failed - swiggy.onelink.me must be recognized as valid Swiggy domain');
  }
  console.log('   ✅ PASS (swiggy.onelink.me recognized and matched)\n');

  // Test 9: SSRF & Localhost Injection Protection
  console.log('9. Testing SSRF & Localhost Protection:');
  const res9 = await linkService.parseAndCompareLink('http://127.0.0.1:5000/api/foods');
  console.log(`   Valid Domain: ${res9.extraction.isValidDomain}`);
  console.log(`   Message: ${res9.message}`);
  if (res9.extraction.isValidDomain !== false) {
    throw new Error('Test 9 Failed - Localhost/IP must be rejected');
  }
  console.log('   ✅ PASS (Localhost correctly blocked)\n');

  // Test 10: Exact User Zomato Onelink URL (https://zomato.onelink.me/xqzv/38letfej)
  console.log('10. Testing Exact User Zomato Onelink URL (https://zomato.onelink.me/xqzv/38letfej):');
  const userExactUrl = 'https://zomato.onelink.me/xqzv/38letfej';
  const res10 = await linkService.parseAndCompareLink(userExactUrl);
  console.log(`    Source Platform: ${res10.extraction.sourcePlatform}`);
  console.log(`    Is Valid Domain: ${res10.extraction.isValidDomain}`);
  console.log(`    Needs Manual Input: ${res10.needsManualInput}`);
  console.log(`    Message: ${res10.message}`);

  if (res10.extraction.sourcePlatform !== 'zomato') {
    throw new Error(`Test 10 Failed - Expected sourcePlatform 'zomato', got '${res10.extraction.sourcePlatform}'`);
  }
  if (!res10.extraction.isValidDomain) {
    throw new Error('Test 10 Failed - zomato.onelink.me must be identified as valid platform domain');
  }
  if (res10.message?.toLowerCase().includes('not supported') || res10.message?.toLowerCase().includes('unsupported')) {
    throw new Error(`Test 10 Failed - Returned unsupported platform error: ${res10.message}`);
  }
  if (!res10.needsManualInput) {
    throw new Error('Test 10 Failed - Short onelink has no dish in slug, must trigger needsManualInput');
  }
  if (res10.matchedFoodItem !== undefined) {
    throw new Error('Test 10 Failed - Must not invent a food item when no dish is in the link');
  }
  console.log('    ✅ PASS (Identified as Zomato, offered manual input fallback, did not invent dish)\n');

  // Test 11: User Exact URL with Manual Food Name Fallback
  console.log('11. Testing Exact User Zomato URL with Manual Dish Name Fallback:');
  const res11 = await linkService.parseAndCompareLink(userExactUrl, 'Classic Italian Margherita Single Pizza');
  console.log(`    Source Platform: ${res11.extraction.sourcePlatform}`);
  console.log(`    Data Source: ${res11.extraction.dataSource}`);
  console.log(`    Matched Dish: ${res11.matchedFoodItem?.name}`);
  console.log(`    Cheapest Platform: ${res11.cheapestQuote?.platformDisplayName}`);
  if (!res11.success || !res11.matchedFoodItem || res11.extraction.sourcePlatform !== 'zomato') {
    throw new Error('Test 11 Failed - Exact user URL with manual fallback must match and compare');
  }
  console.log('    ✅ PASS (User URL successfully compared with manual fallback)\n');

  console.log('🎉 ALL 11 COMPARE BY LINK TESTS PASSED CLEANLY!');
}

runLinkTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

import { ComparisonService } from './services/comparison.service.js';
import { LinkParserService } from './services/linkParser.service.js';
import { isValidPlatformUrl } from './utils/urlValidator.js';
import { DEMO_FOOD_ITEMS } from './data/demoData.js';

console.log('================================================================');
console.log('  FoodWise AI: Platform URL & Item Identity Verification Suite  ');
console.log('================================================================\n');

const comparisonService = new ComparisonService();
const linkParserService = new LinkParserService(comparisonService);

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: 5+ Dishes Across Zomato, Swiggy, and Toing
// -------------------------------------------------------------
console.log('--- TEST SUITE 1: Testing 5+ Distinct Dishes Across Platforms ---');

const sampleDishIds = [
  'biryani-hyd-1',             // Biryani & Rice (Hyderabadi Chicken Dum Biryani / Paradise Biryani Palace)
  'pizza-margherita-9',        // Pizza (Classic Margherita Basil Pizza / Domino's Pizza Gourmet)
  'burger-chicken-whopper-16', // Burger (Flame Grilled Chicken Whopper / Burger King Kitchen)
  'momo-chicken-steam-20',     // Momos (Darjeeling Steamed Chicken Momos / Wow! Momo)
  'south-mysore-masala-32',    // South Indian (Crispy Mysore Masala Dosa / Sagar Ratna Pure Veg)
  'pizza-paneer-7',            // Pizza (Spicy Paneer Tikka Makhani Pizza / La Pino'z Pizza)
];

for (const dishId of sampleDishIds) {
  const comparison = comparisonService.getComparison(dishId);
  assert(comparison !== null, `Fetch comparison for dish: ${dishId}`);
  if (!comparison) continue;

  const { foodItem } = comparison;
  console.log(`\nTesting Dish: "${foodItem.name}" at "${foodItem.restaurantName}" (ID: ${foodItem.id}, RestaurantID: ${foodItem.restaurantId})`);

  // Verify exact identity preserved on FoodItem
  assert(
    Boolean(foodItem.restaurantId && foodItem.restaurantId.startsWith('rest-')),
    `FoodItem has permanent restaurantId: "${foodItem.restaurantId}"`
  );
  assert(
    foodItem.quotes.length === 3,
    `FoodItem has quotes for all 3 platforms (Found: ${foodItem.quotes.length})`
  );

  // 1. Zomato Quote Check
  const zomatoQuote = foodItem.quotes.find((q) => q.platform === 'zomato');
  assert(Boolean(zomatoQuote), `Zomato quote present for ${foodItem.name}`);
  if (zomatoQuote) {
    assert(
      isValidPlatformUrl(zomatoQuote.directOrderUrl, 'zomato'),
      `Zomato URL domain is valid (${zomatoQuote.directOrderUrl})`
    );
    assert(
      zomatoQuote.restaurantId === foodItem.restaurantId,
      `Zomato quote retains correct restaurantId: ${zomatoQuote.restaurantId}`
    );
    assert(
      zomatoQuote.restaurantName === foodItem.restaurantName,
      `Zomato quote retains correct restaurantName: ${zomatoQuote.restaurantName}`
    );
    assert(
      zomatoQuote.itemName === foodItem.name,
      `Zomato quote retains exact itemName: ${zomatoQuote.itemName}`
    );

    // If search fallback, check that query contains both dish and restaurant
    if (zomatoQuote.linkType === 'search_fallback') {
      const decoded = decodeURIComponent(zomatoQuote.directOrderUrl);
      assert(
        decoded.includes(foodItem.name) && decoded.includes(foodItem.restaurantName),
        `Zomato search fallback binds dish & restaurant in query: "${decoded}"`
      );
    } else {
      assert(
        zomatoQuote.linkType === 'exact_dish',
        `Zomato verified link has exact_dish classification`
      );
    }
  }

  // 2. Swiggy Quote Check
  const swiggyQuote = foodItem.quotes.find((q) => q.platform === 'swiggy');
  assert(Boolean(swiggyQuote), `Swiggy quote present for ${foodItem.name}`);
  if (swiggyQuote) {
    assert(
      isValidPlatformUrl(swiggyQuote.directOrderUrl, 'swiggy'),
      `Swiggy URL domain is valid (${swiggyQuote.directOrderUrl})`
    );
    assert(
      swiggyQuote.restaurantId === foodItem.restaurantId,
      `Swiggy quote retains correct restaurantId: ${swiggyQuote.restaurantId}`
    );
    assert(
      swiggyQuote.restaurantName === foodItem.restaurantName,
      `Swiggy quote retains correct restaurantName: ${swiggyQuote.restaurantName}`
    );
    assert(
      swiggyQuote.itemName === foodItem.name,
      `Swiggy quote retains exact itemName: ${swiggyQuote.itemName}`
    );

    if (swiggyQuote.linkType === 'search_fallback') {
      const decoded = decodeURIComponent(swiggyQuote.directOrderUrl);
      assert(
        decoded.includes(foodItem.name) && decoded.includes(foodItem.restaurantName),
        `Swiggy search fallback binds dish & restaurant in query: "${decoded}"`
      );
    } else {
      assert(
        swiggyQuote.linkType === 'exact_dish',
        `Swiggy verified link has exact_dish classification`
      );
    }
  }

  // 3. Toing Quote Check
  const toingQuote = foodItem.quotes.find((q) => q.platform === 'toing');
  assert(Boolean(toingQuote), `Toing quote present for ${foodItem.name}`);
  if (toingQuote) {
    assert(
      isValidPlatformUrl(toingQuote.directOrderUrl, 'toing'),
      `Toing URL domain is valid (${toingQuote.directOrderUrl})`
    );
    assert(
      toingQuote.directOrderUrl === 'https://www.toingit.com/',
      `Toing URL points to verified official destination`
    );
    assert(
      toingQuote.linkType === 'restaurant_fallback',
      `Toing link correctly classified as restaurant_fallback`
    );
    assert(
      toingQuote.appLinks?.android === 'https://play.google.com/store/apps/details?id=in.swiggy.android.toing',
      `Toing Android app destination link verified`
    );
    assert(
      toingQuote.appLinks?.ios === 'https://apps.apple.com/in/app/toing-food-delivery/id6748918399',
      `Toing iOS app destination link verified`
    );
  }
}

// -------------------------------------------------------------
// TEST SUITE 2: Cross-Platform Matching & Dietary Guardrails
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 2: Cross-Platform Matching Guardrails ---');

async function testMatching() {
  // Test 1: Non-veg Biryani Link Matching
  const zomatoBiryaniUrl = 'https://www.zomato.com/bangalore/paradise-biryani?dish=hyderabadi-chicken-dum-biryani';
  const biryaniRes = await linkParserService.parseAndCompareLink(zomatoBiryaniUrl);
  assert(biryaniRes.success, 'Parse Zomato Biryani URL successfully');
  assert(
    biryaniRes.matchedFoodItem?.dietary === 'non-veg',
    `Matched food item has correct non-veg dietary: ${biryaniRes.matchedFoodItem?.dietary}`
  );
  assert(
    biryaniRes.equivalentItems.every((item) => item.dietary === 'non-veg'),
    'Equivalent suggestions are strictly non-veg biryanis (no veg confusion)'
  );
  assert(
    biryaniRes.equivalentItems.every((item) => item.id !== biryaniRes.matchedFoodItem?.id),
    'Equivalent suggestions exclude the primary matched item'
  );

  // Test 2: Dietary Guardrail - Prevent veg/non-veg mismatch
  const vegPizzaUrl = 'https://www.swiggy.com/restaurants/la-pinoz-pizza/spicy-paneer-tikka-makhani-pizza';
  const pizzaRes = await linkParserService.parseAndCompareLink(vegPizzaUrl);
  assert(pizzaRes.success, 'Parse Swiggy Paneer Pizza URL successfully');
  assert(
    pizzaRes.matchedFoodItem?.dietary === 'veg',
    `Matched pizza is strictly veg: ${pizzaRes.matchedFoodItem?.dietary}`
  );
  assert(
    pizzaRes.equivalentItems.every((item) => item.dietary === 'veg'),
    'Equivalent suggestions for veg pizza are all strictly veg pizzas'
  );

  // Test 3: Unrelated dishes should not be matched
  const manualMismatch = await linkParserService.parseAndCompareLink(
    'https://www.zomato.com/order',
    'Avocado Sushi Roll'
  );
  assert(
    manualMismatch.matchedFoodItem === undefined,
    'Unrelated dish (Avocado Sushi Roll) is not falsely matched to random catalogue dish'
  );

  // -------------------------------------------------------------
  // TEST SUITE 3: Domain Security & Protocol Validation
  // -------------------------------------------------------------
  console.log('\n--- TEST SUITE 3: Domain Security & Protocol Validation ---');

  assert(isValidPlatformUrl('https://www.zomato.com/order', 'zomato'), 'Valid https zomato.com accepted');
  assert(isValidPlatformUrl('https://zomato.onelink.me/xqzv/38letfej', 'zomato'), 'Valid https zomato.onelink.me mobile share URL accepted');
  assert(isValidPlatformUrl('https://zoma.to/r/12345', 'zomato'), 'Valid https zoma.to mobile short URL accepted');
  assert(isValidPlatformUrl('https://link.zomato.com/share', 'zomato'), 'Valid https link.zomato.com accepted');
  assert(isValidPlatformUrl('https://swiggy.com/restaurants', 'swiggy'), 'Valid https swiggy.com accepted');
  assert(isValidPlatformUrl('https://swiggy.onelink.me/dish', 'swiggy'), 'Valid https swiggy.onelink.me mobile share URL accepted');
  assert(isValidPlatformUrl('https://swig.gy/r/123', 'swiggy'), 'Valid https swig.gy accepted');
  assert(isValidPlatformUrl('https://www.toingit.com/', 'toing'), 'Valid https toingit.com accepted');
  assert(!isValidPlatformUrl('https://evil-zomato.com/phish', 'zomato'), 'Malicious evil-zomato.com rejected');
  assert(!isValidPlatformUrl('https://evil-zoma.to.attacker.com', 'zomato'), 'Malicious sub-host evil-zoma.to.attacker.com rejected');
  assert(!isValidPlatformUrl('javascript:alert(1)', 'swiggy'), 'javascript: URI protocol rejected');
  assert(!isValidPlatformUrl('file:///etc/passwd', 'toing'), 'file: protocol rejected');
  assert(!isValidPlatformUrl('http://192.168.1.1/admin', 'zomato'), 'Internal private IP rejected');

  console.log('\n================================================================');
  console.log(`  Tests Completed: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

testMatching().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

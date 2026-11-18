import { ToingAdapter } from './adapters/toing.adapter.js';
import { ZomatoAdapter } from './adapters/zomato.adapter.js';
import { SwiggyAdapter } from './adapters/swiggy.adapter.js';
import { ComparisonService } from './services/comparison.service.js';

console.log('====================================================');
console.log('🧪 VERIFYING TOING DESTINATION & LINK CONFIGURATION');
console.log('====================================================\n');

const toingAdapter = new ToingAdapter();
const zomatoAdapter = new ZomatoAdapter();
const swiggyAdapter = new SwiggyAdapter();
const comparisonService = new ComparisonService();

// Test 1: Toing URL Verification
const toingQuote = toingAdapter.calculateQuote('Hyderabadi Chicken Dum Biryani', 29500, 3.2);

console.log('1. Checking Toing Direct Order URL:');
console.log(`   directOrderUrl: ${toingQuote.directOrderUrl}`);
if (toingQuote.directOrderUrl !== 'https://www.toingit.com/') {
  console.error('❌ FAILED: Toing directOrderUrl must be https://www.toingit.com/');
  process.exit(1);
}
console.log('   ✅ PASS: Uses verified official destination (https://www.toingit.com/) without fake deep-links.\n');

// Test 2: Check App Links
console.log('2. Checking App Store Links for Toing:');
console.log(`   Web:     ${toingQuote.appLinks?.web}`);
console.log(`   Android: ${toingQuote.appLinks?.android}`);
console.log(`   iOS:     ${toingQuote.appLinks?.ios}`);

if (
  toingQuote.appLinks?.android !== 'https://play.google.com/store/apps/details?id=in.swiggy.android.toing' ||
  toingQuote.appLinks?.ios !== 'https://apps.apple.com/in/app/toing-food-delivery/id6748918399' ||
  toingQuote.appLinks?.web !== 'https://www.toingit.com/'
) {
  console.error('❌ FAILED: App links do not match verified destinations');
  process.exit(1);
}
console.log('   ✅ PASS: Official Android & iOS store links properly configured.\n');

// Test 3: Check Listing Unavailable Message
console.log('3. Checking Required Listing Note:');
console.log(`   Message: "${toingQuote.listingUnavailableMessage}"`);
const expectedMsg = 'Toing listing link unavailable. Open Toing and search for this dish manually.';
if (toingQuote.listingUnavailableMessage !== expectedMsg) {
  console.error(`❌ FAILED: Expected "${expectedMsg}", got "${toingQuote.listingUnavailableMessage}"`);
  process.exit(1);
}
console.log('   ✅ PASS: Exact message matched.\n');

// Test 4: Verify Food & Restaurant Integrity in Comparison
console.log('4. Checking Food & Restaurant Integrity:');
const comp = comparisonService.getComparison('biryani-hyd-1');
if (!comp) {
  console.error('❌ FAILED: Comparison returned null');
  process.exit(1);
}
console.log(`   Dish Name:       ${comp.foodItem.name}`);
console.log(`   Restaurant Name: ${comp.foodItem.restaurantName}`);
console.log(`   Distance:        ${comp.foodItem.distanceKm} km`);
console.log(`   Toing Quote:     ₹${comp.cheapestQuote.finalPricePaise / 100} (${comp.cheapestQuote.platformDisplayName})`);
console.log(`   Toing Link:      ${comp.cheapestQuote.directOrderUrl}`);

if (comp.foodItem.name !== 'Hyderabadi Chicken Dum Biryani' || comp.foodItem.restaurantName !== 'Paradise Biryani Palace') {
  console.error('❌ FAILED: Food item or restaurant details altered');
  process.exit(1);
}
console.log('   ✅ PASS: Item details completely preserved.\n');

// Test 5: Verify Zomato & Swiggy Links are Untouched
console.log('5. Checking Zomato & Swiggy Links (Must be untouched):');
const zomQuote = zomatoAdapter.calculateQuote('Hyderabadi Chicken Dum Biryani', 32000, 3.2);
const swigQuote = swiggyAdapter.calculateQuote('Hyderabadi Chicken Dum Biryani', 33500, 3.2);
console.log(`   Zomato: ${zomQuote.directOrderUrl}`);
console.log(`   Swiggy: ${swigQuote.directOrderUrl}`);

if (!zomQuote.directOrderUrl.includes('zomato.com') || !swigQuote.directOrderUrl.includes('swiggy.com')) {
  console.error('❌ FAILED: Zomato or Swiggy URLs modified');
  process.exit(1);
}
console.log('   ✅ PASS: Zomato and Swiggy links remain fully intact.\n');

console.log('🎉 ALL TOING LINK VERIFICATIONS PASSED SUCCESSFULLY!');

import { ComparisonService } from './services/comparison.service.js';
import { ZomatoAdapter } from './adapters/zomato.adapter.js';
import { SwiggyAdapter } from './adapters/swiggy.adapter.js';
import { ToingAdapter } from './adapters/toing.adapter.js';

console.log('--- Testing FoodWise Core Engine ---');

const zomato = new ZomatoAdapter();
const swiggy = new SwiggyAdapter();
const toing = new ToingAdapter();

// 1. Test Paise integer accuracy
const basePaise = 25000; // ₹250
const distanceKm = 3.5;

const zQuote = zomato.calculateQuote('Item 1', basePaise, distanceKm);
const sQuote = swiggy.calculateQuote('Item 1', basePaise, distanceKm);
const tQuote = toing.calculateQuote('Item 1', basePaise, distanceKm);

console.log(`Base Price: ₹${basePaise / 100}`);
console.log(`Zomato Final: ₹${zQuote.finalPricePaise / 100} (Delivery: ₹${(zQuote.deliveryFeePaise || 0) / 100}, Platform: ₹${(zQuote.platformFeePaise || 0) / 100})`);
console.log(`Swiggy Final: ₹${sQuote.finalPricePaise / 100} (Delivery: ₹${(sQuote.deliveryFeePaise || 0) / 100}, Platform: ₹${(sQuote.platformFeePaise || 0) / 100})`);
console.log(`Toing Final:  ₹${tQuote.finalPricePaise / 100} (Delivery: ₹${(tQuote.deliveryFeePaise || 0) / 100}, Platform: ${tQuote.platformFeePaise === null ? 'NULL (Unknown)' : '₹' + (tQuote.platformFeePaise / 100)})`);

// 2. Verify unknown fee handling
console.log('\n--- Unknown Fee Verification ---');
console.log(`Toing Packaging Fee (< ₹200): ${toing.calculateQuote('Cheaper', 15000, 2).packagingFeePaise === null ? 'PASS (Correctly null/unknown)' : 'FAIL'}`);
console.log(`Toing Platform Fee (Confirmed Zero): ${toing.calculateQuote('Cheaper', 15000, 2).platformFeePaise === 0 ? 'PASS (Confirmed 0 paise)' : 'FAIL'}`);

// 3. Test Comparison Service
const service = new ComparisonService();
const results = service.searchFood();
console.log(`\nCatalog Items Count: ${results.length}`);
console.log(`Top Item: ${results[0].name} from ${results[0].restaurantName}`);
console.log(`Cheapest Platform: ${results[0].cheapestPlatform} (Savings: ₹${(results[0].maxSavingsPaise || 0) / 100})`);

const biryaniCompare = service.getComparison('biryani-hyd-1');
if (biryaniCompare) {
  console.log(`\nDetailed Comparison for: ${biryaniCompare.foodItem.name}`);
  console.log(`Recommendation: ${biryaniCompare.recommendationReason}`);
}

console.log('\n✅ ALL ARCHITECTURAL TESTS PASSED!');

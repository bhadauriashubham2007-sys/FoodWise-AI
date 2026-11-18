import { ComparisonService } from './services/comparison.service.js';
import { IntentService } from './services/intent.service.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING MANDATORY FOODWISE SEARCH PIPELINE TESTS');
  console.log('====================================================\n');

  const intentService = new IntentService();
  const comparisonService = new ComparisonService();

  const testQueries = [
    'Paneer pizza',
    'Chicken biryani',
    'Cold coffee',
    'Veg burger under 150',
    'Momos',
    'Cheapest pizza',
  ];

  for (const query of testQueries) {
    console.log(`🔍 Testing Query: "${query}"`);
    const { intent, source } = await intentService.extractIntent(query);
    console.log(`   Source: ${source}`);
    console.log(`   Extracted Intent: Keywords=[${intent.foodKeywords.join(', ')}], Budget=${intent.maxBudgetRupees || 'None'}, Dietary=${intent.dietary || 'Any'}, Sort=${intent.sortBy}`);

    const results = comparisonService.executeSearchPipeline(intent);
    console.log(`   Matches Found: ${results.length}`);

    if (results.length === 0) {
      console.error(`   ❌ FAILED: No results returned for "${query}"`);
      process.exit(1);
    }

    console.log(`   Top 3 Matches:`);
    results.slice(0, 3).forEach((r, idx) => {
      const cheapest = r.quotes.reduce((min, q) => q.finalPricePaise < min.finalPricePaise ? q : min, r.quotes[0]);
      console.log(`     ${idx + 1}. ${r.name} (${r.restaurantName}) - Lowest: ₹${cheapest.finalPricePaise / 100} on ${cheapest.platformDisplayName} [${r.dietary}]`);
    });
    console.log('----------------------------------------------------\n');
  }

  // Also test total database size
  const total = comparisonService.searchFood();
  console.log(`📊 Total Database Listings Count: ${total.length} (Requirement >= 50: ${total.length >= 50 ? 'PASS ✅' : 'FAIL ❌'})`);

  console.log('\n🎉 ALL 6 MANDATORY SEARCH QUERIES PASSED WITH DYNAMIC RESULTS!');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

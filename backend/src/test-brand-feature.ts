import { BrandService } from './services/brand.service.js';
import { INDIAN_BRANDS, BRAND_MENU_ITEMS } from './data/brandCatalog.js';

console.log('================================================================');
console.log('  FoodWise AI: "Explore by Brand" Engine & Comparison Tests    ');
console.log('================================================================\n');

const brandService = new BrandService();
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

async function runBrandTests() {
  // -------------------------------------------------------------
  // TEST SUITE 1: Brand Catalogue Coverage (Indian Market Chains)
  // -------------------------------------------------------------
  console.log('--- TEST SUITE 1: Brand Catalogue Coverage ---');

  const allBrands = brandService.getBrands();
  assert(allBrands.length >= 10, `Loaded ${allBrands.length} brands (Expected >= 10)`);

  const categories = ['Pizza', 'Burgers', 'Chicken', 'Sandwiches', 'Coffee & Beverages', 'Indian Food Chains'];
  for (const cat of categories) {
    const catBrands = brandService.getBrands(cat);
    assert(catBrands.length >= 1, `Category "${cat}" has brands (${catBrands.map((b) => b.name).join(', ')})`);
  }

  // Verify Required Brands Exist
  const requiredBrandIds = [
    'brand-dominos',
    'brand-pizzahut',
    'brand-burgerking',
    'brand-mcdonalds',
    'brand-wendys',
    'brand-kfc',
    'brand-subway',
    'brand-starbucks',
    'brand-ccd',
    'brand-haldirams',
    'brand-bikanervala',
  ];

  for (const id of requiredBrandIds) {
    const brand = brandService.getBrandById(id);
    assert(brand !== null, `Required brand "${id}" exists: ${brand?.name}`);
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: Mandatory Test Cases (Domino's, BK, McDonald's, KFC)
  // -------------------------------------------------------------
  console.log('\n--- TEST SUITE 2: Mandatory Brand Item Comparisons ---');

  // Test Case 1: Domino's -> Margherita Pizza
  console.log('\nTesting 1: Domino\'s Pizza -> Classic Margherita Pizza');
  const dominosComp = await brandService.compareBrandItem(
    'brand-dominos',
    'brand-dominos-margherita',
    'Regular (7-inch)',
    { city: 'Bengaluru', pincode: '560001', distanceKm: 2.8 }
  );

  assert(dominosComp !== null, 'Domino\'s Margherita comparison generated successfully');
  if (dominosComp) {
    assert(dominosComp.brand.name === "Domino's Pizza", 'Brand identity matches Domino\'s Pizza');
    assert(dominosComp.menuItem.name === 'Classic Margherita Pizza', 'Item matches Classic Margherita Pizza');
    assert(dominosComp.quotes.length === 3, 'Includes quotes for Zomato, Swiggy, and Toing');

    const zomato = dominosComp.quotes.find((q) => q.platform === 'zomato');
    const swiggy = dominosComp.quotes.find((q) => q.platform === 'swiggy');
    const toing = dominosComp.quotes.find((q) => q.platform === 'toing');

    assert(Boolean(zomato && zomato.isAvailable), 'Zomato quote available and calculated');
    assert(Boolean(swiggy && swiggy.isAvailable), 'Swiggy quote available and calculated');
    assert(zomato?.matchingStatus === 'exact_match_verified', 'Zomato classified as exact_match_verified');
    assert(toing?.matchingStatus === 'availability_not_verified', 'Toing correctly tagged as availability_not_verified');
    assert(Boolean(zomato?.directOrderUrl && zomato.directOrderUrl.includes('zomato.com')), 'Zomato URL targets zomato.com');
    assert(Boolean(swiggy?.directOrderUrl && swiggy.directOrderUrl.includes('swiggy.com')), 'Swiggy URL targets swiggy.com');
    assert(toing?.directOrderUrl === 'https://www.toingit.com/', 'Toing points to official web destination');
  }

  // Test Case 2: Burger King -> Whopper
  console.log('\nTesting 2: Burger King -> Ultimate Flame-Grilled Chicken Whopper');
  const bkComp = await brandService.compareBrandItem(
    'brand-burgerking',
    'brand-burgerking-whopper-chicken',
    'Single Burger',
    { city: 'Delhi NCR', pincode: '110001', distanceKm: 3.5 }
  );

  assert(bkComp !== null, 'Burger King Whopper comparison generated successfully');
  if (bkComp) {
    assert(bkComp.brand.name === 'Burger King', 'Brand identity matches Burger King');
    assert(bkComp.menuItem.name === 'Ultimate Flame-Grilled Chicken Whopper', 'Item matches Chicken Whopper');
    assert(bkComp.cheapestQuote.finalPricePaise > 0, `Cheapest price is integer paise: ₹${bkComp.cheapestQuote.finalPricePaise / 100}`);
    assert(bkComp.location.city === 'Delhi NCR', 'Location context preserved in comparison: Delhi NCR');
  }

  // Test Case 3: McDonald's -> McAloo Tikki Burger
  console.log('\nTesting 3: McDonald\'s -> McAloo Tikki Burger');
  const mcdComp = await brandService.compareBrandItem(
    'brand-mcdonalds',
    'brand-mcdonalds-mcaloo-tikki',
    'Single Burger',
    { city: 'Mumbai', pincode: '400001', distanceKm: 2.1 }
  );

  assert(mcdComp !== null, 'McDonald\'s McAloo Tikki comparison generated successfully');
  if (mcdComp) {
    assert(mcdComp.brand.name === "McDonald's", 'Brand identity matches McDonald\'s');
    assert(mcdComp.menuItem.name === 'McAloo Tikki Burger', 'Item matches McAloo Tikki Burger');
    assert(mcdComp.menuItem.dietary === 'veg', 'Dietary preference is verified veg');
  }

  // Test Case 4: KFC -> Hot & Crispy Chicken
  console.log('\nTesting 4: KFC -> Hot & Crispy Chicken');
  const kfcComp = await brandService.compareBrandItem(
    'brand-kfc',
    'brand-kfc-hot-crispy',
    '4 Pieces',
    { city: 'Bengaluru', pincode: '560038', distanceKm: 3.0 }
  );

  assert(kfcComp !== null, 'KFC Hot & Crispy comparison generated successfully');
  if (kfcComp) {
    assert(kfcComp.brand.name === 'KFC', 'Brand identity matches KFC');
    assert(kfcComp.menuItem.name === 'Hot & Crispy Chicken (4 Pcs)', 'Item matches Hot & Crispy Chicken');
    assert(kfcComp.menuItem.dietary === 'non-veg', 'Dietary preference is verified non-veg');
    assert(kfcComp.quotes.every((q) => q.dataSource === 'demo_catalog'), 'All quotes explicitly tagged as demo_catalog');
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: Brand Search & Category Filtering
  // -------------------------------------------------------------
  console.log('\n--- TEST SUITE 3: Brand & Menu Search Filters ---');

  const pizzaSearch = brandService.getBrands('Pizza');
  assert(pizzaSearch.length === 2, `Category "Pizza" returns 2 brands (Domino's & Pizza Hut)`);

  const burgerSearch = brandService.getBrands('Burgers');
  assert(burgerSearch.length === 3, `Category "Burgers" returns 3 brands (Burger King, McDonald's, Wendy's)`);

  const querySearch = brandService.getBrands(undefined, 'whopper');
  assert(querySearch.some((b) => b.id === 'brand-burgerking'), 'Search for "whopper" returns Burger King');

  const dominosMenuSearch = brandService.getBrandMenu('brand-dominos', undefined, 'garlic');
  assert(dominosMenuSearch.length >= 1, `Domino's menu search for "garlic" found Garlic Breadsticks`);

  console.log('\n================================================================');
  console.log(`  Tests Completed: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runBrandTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

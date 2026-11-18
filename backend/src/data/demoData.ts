export interface LiveVerificationProof {
  isVerifiedLiveSource?: boolean;
  provider: string;
  verifiedAt: string;
  nonce?: string;
  signature?: string;
}

export interface RawFoodTemplate {
  id: string;
  name: string;
  category: string;
  cuisine: string;
  dietary: 'veg' | 'non-veg' | 'egg' | 'vegan';
  description: string;
  imageUrl: string;
  restaurantId?: string;
  restaurantName: string;
  restaurantRating: number;
  ratingCount: number;
  distanceKm: number;
  city?: string;
  isDemoData?: boolean;
  dataProvenance?: 'demo_catalogue' | 'live_verified' | 'unknown';
  liveVerificationProof?: LiveVerificationProof;
  tags: string[];
  basePricesPaise: {
    zomato: number;
    swiggy: number;
    toing: number;
  };
  sourceUrls?: {
    zomato?: string;
    swiggy?: string;
    toing?: string;
  };
}

export const DEMO_FOOD_ITEMS: RawFoodTemplate[] = [
  // ==========================================
  // 1. BIRYANI & RICE
  // ==========================================
  {
    id: 'biryani-hyd-1',
    name: 'Hyderabadi Chicken Dum Biryani',
    category: 'Biryani & Rice',
    cuisine: 'Mughlai / Hyderabadi',
    dietary: 'non-veg',
    description: 'Slow-cooked fragrant basmati rice with tender marinated chicken pieces, infused with saffron and secret spices. Served with Mirchi ka Salan and Raita.',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=60',
    restaurantId: 'rest-paradise-biryani',
    restaurantName: 'Paradise Biryani Palace',
    restaurantRating: 4.4,
    ratingCount: 3200,
    distanceKm: 3.2,
    tags: ['biryani', 'chicken biryani', 'dum biryani', 'hyderabadi', 'rice', 'non veg'],
    basePricesPaise: { zomato: 32000, swiggy: 33500, toing: 29500 },
    sourceUrls: {
      zomato: 'https://www.zomato.com/bangalore/paradise-biryani?dish=hyderabadi-chicken-dum-biryani',
      swiggy: 'https://www.swiggy.com/restaurants/paradise-biryani/hyderabadi-chicken-dum-biryani',
    }
  },
  {
    id: 'biryani-luck-2',
    name: 'Lucknowi Murgh Awadhi Biryani',
    category: 'Biryani & Rice',
    cuisine: 'Awadhi / Lucknowi',
    dietary: 'non-veg',
    description: 'Delicately spiced aromatic Awadhi chicken biryani cooked on slow dum with kewra water, rose essence, and saffron-glazed basmati grains.',
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Behrouz Royal Biryani',
    restaurantRating: 4.5,
    ratingCount: 2100,
    distanceKm: 4.1,
    tags: ['biryani', 'chicken biryani', 'lucknowi', 'awadhi', 'rice', 'non veg'],
    basePricesPaise: { zomato: 38000, swiggy: 39900, toing: 35000 }
  },
  {
    id: 'biryani-kolk-3',
    name: 'Kolkata Chicken Biryani with Aloo & Egg',
    category: 'Biryani & Rice',
    cuisine: 'Bengali / Mughlai',
    dietary: 'non-veg',
    description: 'Iconic Kolkata-style biryani featuring slow-cooked soft potato, boiled egg, and juicy chicken piece with subtle meetha ittar aroma.',
    imageUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Arsalan Restaurant',
    restaurantRating: 4.6,
    ratingCount: 4100,
    distanceKm: 2.7,
    tags: ['biryani', 'chicken biryani', 'kolkata biryani', 'aloo', 'rice', 'non veg'],
    basePricesPaise: { zomato: 31000, swiggy: 32500, toing: 28500 }
  },
  {
    id: 'biryani-veg-4',
    name: 'Royal Subz Paneer Dum Biryani',
    category: 'Biryani & Rice',
    cuisine: 'North Indian',
    dietary: 'veg',
    description: 'Layers of premium basmati rice, charred cottage cheese cubes, cauliflower florets, and French beans in royal shahi spices. Served with boondi raita.',
    imageUrl: 'https://images.unsplash.com/photo-1642821373181-696a54913e9a?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Bikkgane Biryani House',
    restaurantRating: 4.3,
    ratingCount: 1680,
    distanceKm: 3.0,
    tags: ['biryani', 'veg biryani', 'paneer biryani', 'pulao', 'rice', 'vegetarian'],
    basePricesPaise: { zomato: 26000, swiggy: 27000, toing: 24000 }
  },
  {
    id: 'rice-jeera-dal-5',
    name: 'Dal Tadka with Steamed Jeera Basmati Rice',
    category: 'Biryani & Rice',
    cuisine: 'North Indian',
    dietary: 'veg',
    description: 'Yellow arhar lentils tempered with cumin, garlic, and dried red chilies, paired with hot ghee-glazed jeera rice.',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Dhabawala Comfort Bowls',
    restaurantRating: 4.4,
    ratingCount: 950,
    distanceKm: 1.9,
    tags: ['dal rice', 'jeera rice', 'dal tadka', 'chawal', 'rice', 'veg comfort food'],
    basePricesPaise: { zomato: 17000, swiggy: 18000, toing: 15500 }
  },
  {
    id: 'biryani-egg-6',
    name: 'Hyderabadi Spiced Double Egg Biryani',
    category: 'Biryani & Rice',
    cuisine: 'Hyderabadi',
    dietary: 'egg',
    description: 'Two golden pan-fried boiled eggs nestled in fragrant saffron-infused dum basmati rice with spicy salan gravy.',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Bawarchi Biryani Central',
    restaurantRating: 4.2,
    ratingCount: 1420,
    distanceKm: 2.5,
    tags: ['biryani', 'egg biryani', 'anda biryani', 'rice', 'egg'],
    basePricesPaise: { zomato: 21000, swiggy: 22000, toing: 19000 }
  },

  // ==========================================
  // 2. PIZZA & ITALIAN
  // ==========================================
  {
    id: 'pizza-paneer-7',
    name: 'Spicy Paneer Tikka Makhani Pizza',
    category: 'Pizza & Italian',
    cuisine: 'Italian / Fusion',
    dietary: 'veg',
    description: 'Hand-stretched crust topped with rich makhani sauce, diced paneer tikka, crisp capsicum, red onions, and 100% mozzarella cheese.',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60',
    restaurantName: "La Pino'z Pizza Central",
    restaurantRating: 4.3,
    ratingCount: 2800,
    distanceKm: 3.1,
    tags: ['pizza', 'paneer pizza', 'paneer tikka pizza', 'cheese pizza', 'veg pizza', 'italian'],
    basePricesPaise: { zomato: 24900, swiggy: 25900, toing: 22900 }
  },
  {
    id: 'pizza-cheese-farm-8',
    name: 'Farmhouse Special Cheese Burst Pizza',
    category: 'Pizza & Italian',
    cuisine: 'Italian',
    dietary: 'veg',
    description: 'Crisp crust filled with liquid cheese, loaded with fresh tomatoes, crunchy bell peppers, sweet corn kernels, and black olives.',
    imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Ovenstory Gourmet Pizza',
    restaurantRating: 4.4,
    ratingCount: 2450,
    distanceKm: 3.8,
    tags: ['pizza', 'farmhouse pizza', 'cheese burst', 'veg pizza', 'italian'],
    basePricesPaise: { zomato: 39900, swiggy: 38900, toing: 36000 }
  },
  {
    id: 'pizza-margherita-9',
    name: 'Classic Italian Margherita Single Pizza',
    category: 'Pizza & Italian',
    cuisine: 'Italian',
    dietary: 'veg',
    description: 'Traditional thin Italian crust layered with San Marzano herb tomato sauce, fresh basil leaves, and bubbling mozzarella.',
    imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Pizza Hut Express',
    restaurantRating: 4.1,
    ratingCount: 3900,
    distanceKm: 2.2,
    tags: ['pizza', 'margherita', 'cheese pizza', 'cheapest pizza', 'budget pizza', 'veg'],
    basePricesPaise: { zomato: 14900, swiggy: 15900, toing: 13900 }
  },
  {
    id: 'pizza-chicken-bbq-10',
    name: 'Smoky BBQ Chicken Feast Pizza',
    category: 'Pizza & Italian',
    cuisine: 'American / Italian',
    dietary: 'non-veg',
    description: 'Smoky barbecue chicken chunks, caramelized onions, jalapeños, and melted cheddar and mozzarella blend on golden hand-tossed dough.',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=60',
    restaurantName: "Domino's Gourmet Bistro",
    restaurantRating: 4.5,
    ratingCount: 5100,
    distanceKm: 2.9,
    tags: ['pizza', 'chicken pizza', 'bbq chicken', 'non veg pizza', 'italian'],
    basePricesPaise: { zomato: 37900, swiggy: 38900, toing: 34900 }
  },
  {
    id: 'pizza-paneer-makhani-11',
    name: 'Paneer Makhani & Capsicum Thin Crust Pizza',
    category: 'Pizza & Italian',
    cuisine: 'Italian / Fusion',
    dietary: 'veg',
    description: 'Ultra-thin crust smothered in butter gravy with spiced cottage cheese cubes, green bell peppers, and oregano flakes.',
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Mojo Pizza Crust Hub',
    restaurantRating: 4.3,
    ratingCount: 1820,
    distanceKm: 3.5,
    tags: ['pizza', 'paneer pizza', 'thin crust', 'veg pizza', 'paneer'],
    basePricesPaise: { zomato: 29900, swiggy: 31000, toing: 27900 }
  },
  {
    id: 'pizza-corn-cheese-12',
    name: 'Golden Sweet Corn & Double Cheese Pizza',
    category: 'Pizza & Italian',
    cuisine: 'Italian',
    dietary: 'veg',
    description: 'Sweet American corn tossed with garlic butter and blanketed under a thick layer of melted gouda and mozzarella.',
    imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Tossin Woodfired Pizza',
    restaurantRating: 4.2,
    ratingCount: 1450,
    distanceKm: 2.4,
    tags: ['pizza', 'corn pizza', 'cheese pizza', 'cheap pizza', 'cheapest pizza', 'veg'],
    basePricesPaise: { zomato: 16900, swiggy: 17900, toing: 14900 }
  },

  // ==========================================
  // 3. BURGERS & FAST FOOD
  // ==========================================
  {
    id: 'burger-veg-aloo-13',
    name: 'Crispy Veg Aloo Tikki Burger',
    category: 'Burgers & Fast Food',
    cuisine: 'American / Street',
    dietary: 'veg',
    description: 'Spiced potato and peas patty fried to golden crispness, topped with onion rings, tomato slice, and creamy eggless mayonnaise in a sesame seed bun.',
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Burger King Express',
    restaurantRating: 4.2,
    ratingCount: 3900,
    distanceKm: 1.5,
    tags: ['burger', 'veg burger', 'aloo tikki', 'cheap burger', 'budget burger', 'fast food'],
    basePricesPaise: { zomato: 8900, swiggy: 9500, toing: 7900 }
  },
  {
    id: 'burger-paneer-melt-14',
    name: 'Crunchy Paneer Melt Burger with Peri Peri Fries',
    category: 'Burgers & Fast Food',
    cuisine: 'American',
    dietary: 'veg',
    description: 'Golden crumb-fried spicy paneer patty with molten cheese sauce, crisp iceberg lettuce, and peri peri seasoned crinkle fries.',
    imageUrl: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=800&auto=format&fit=crop&q=60',
    restaurantName: "Wendy's Burgers",
    restaurantRating: 4.4,
    ratingCount: 2200,
    distanceKm: 2.1,
    tags: ['burger', 'veg burger', 'paneer burger', 'fries', 'fast food', 'veg'],
    basePricesPaise: { zomato: 13900, swiggy: 14500, toing: 12500 }
  },
  {
    id: 'burger-chicken-smash-15',
    name: 'Crispy Gourmet Chicken Smash Burger',
    category: 'Burgers & Fast Food',
    cuisine: 'American',
    dietary: 'non-veg',
    description: 'Crispy fried chicken breast fillet glazed with spicy peri-peri mayo, melted cheddar, lettuce, and pickled gherkins on toasted brioche.',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'The Burger Club',
    restaurantRating: 4.6,
    ratingCount: 1530,
    distanceKm: 1.8,
    tags: ['burger', 'chicken burger', 'crispy chicken', 'smash burger', 'non veg'],
    basePricesPaise: { zomato: 24900, swiggy: 25900, toing: 22900 }
  },
  {
    id: 'burger-chicken-whopper-16',
    name: 'Ultimate Flame-Grilled Chicken Whopper',
    category: 'Burgers & Fast Food',
    cuisine: 'American',
    dietary: 'non-veg',
    description: 'Flame-grilled tender chicken patty with freshly sliced tomatoes, crunchy lettuce, creamy mayo, and pickles on a toasted 5-inch bun.',
    imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Burger King Flagship',
    restaurantRating: 4.5,
    ratingCount: 4600,
    distanceKm: 2.6,
    tags: ['burger', 'chicken burger', 'whopper', 'fast food', 'non veg'],
    basePricesPaise: { zomato: 21900, swiggy: 22900, toing: 19900 }
  },
  {
    id: 'burger-veg-cheesy-17',
    name: 'Double Decker Cheesy Veggie Tower Burger',
    category: 'Burgers & Fast Food',
    cuisine: 'Continental',
    dietary: 'veg',
    description: 'Two crispy vegetable patties loaded with double English cheddar cheese slice, caramelized onions, and house special thousand island dressing.',
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Truffles Cafe & Burgers',
    restaurantRating: 4.7,
    ratingCount: 6800,
    distanceKm: 3.4,
    tags: ['burger', 'veg burger', 'cheese burger', 'tower burger', 'truffles', 'veg'],
    basePricesPaise: { zomato: 18900, swiggy: 19900, toing: 17500 }
  },
  {
    id: 'burger-chicken-peri-18',
    name: 'Peri-Peri Crispy Chicken Burger',
    category: 'Burgers & Fast Food',
    cuisine: 'American',
    dietary: 'non-veg',
    description: 'Deep-fried chicken fillet sprinkled with African bird eye peri-peri spice dust, topped with iceberg lettuce and chipotle sauce.',
    imageUrl: 'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?w=800&auto=format&fit=crop&q=60',
    restaurantName: "McDonald's Gourmet",
    restaurantRating: 4.3,
    ratingCount: 5200,
    distanceKm: 2.0,
    tags: ['burger', 'chicken burger', 'peri peri chicken', 'spicy burger', 'non veg'],
    basePricesPaise: { zomato: 19900, swiggy: 20900, toing: 18500 }
  },

  // ==========================================
  // 4. MOMOS & DUMPLINGS
  // ==========================================
  {
    id: 'momo-veg-steam-19',
    name: 'Steamed Veg Darjeeling Momos (8 Pcs)',
    category: 'Momos & Dumplings',
    cuisine: 'Tibetan / Asian',
    dietary: 'veg',
    description: 'Authentic Darjeeling-style thin-wrapper momos stuffed with finely minced cabbage, carrots, spring onion, and ginger. Served with fiery red chili chutney.',
    imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Prasuma Momos & More',
    restaurantRating: 4.4,
    ratingCount: 1900,
    distanceKm: 1.7,
    tags: ['momo', 'momos', 'steamed momos', 'veg momos', 'dimsum', 'dumplings', 'darjeeling'],
    basePricesPaise: { zomato: 12900, swiggy: 13900, toing: 11500 }
  },
  {
    id: 'momo-chicken-steam-20',
    name: 'Authentic Steamed Chicken Dimsums (8 Pcs)',
    category: 'Momos & Dumplings',
    cuisine: 'Tibetan / Asian',
    dietary: 'non-veg',
    description: 'Juicy minced chicken and scallion filling wrapped in translucent delicate dumpling dough, steamed fresh and paired with hot garlic sauce.',
    imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Momo I Am Himalayan Diner',
    restaurantRating: 4.6,
    ratingCount: 2300,
    distanceKm: 2.3,
    tags: ['momo', 'momos', 'chicken momos', 'steamed momos', 'dimsum', 'non veg'],
    basePricesPaise: { zomato: 16900, swiggy: 17900, toing: 14900 }
  },
  {
    id: 'momo-paneer-fried-21',
    name: 'Crispy Fried Paneer Momos with Schezwan Dip (6 Pcs)',
    category: 'Momos & Dumplings',
    cuisine: 'Tibetan / Indo-Chinese',
    dietary: 'veg',
    description: 'Golden fried crispy dumplings packed with spiced crumbled paneer and herbs, served with fiery Schezwan chili garlic sauce.',
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Wow! Momo Express',
    restaurantRating: 4.2,
    ratingCount: 3100,
    distanceKm: 2.8,
    tags: ['momo', 'momos', 'fried momos', 'paneer momos', 'crispy momos', 'veg'],
    basePricesPaise: { zomato: 15900, swiggy: 16900, toing: 13900 }
  },
  {
    id: 'momo-chicken-kurkure-22',
    name: 'Kurkure Crunchy Fried Chicken Momos (6 Pcs)',
    category: 'Momos & Dumplings',
    cuisine: 'Street Fusion',
    dietary: 'non-veg',
    description: 'Dumplings battered with crispy crunchy flakes, deep fried until extra crunchy outside while juicy chicken remains tender inside.',
    imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Momo Zone Corner',
    restaurantRating: 4.5,
    ratingCount: 1640,
    distanceKm: 2.0,
    tags: ['momo', 'momos', 'kurkure momos', 'fried momos', 'chicken momos', 'non veg'],
    basePricesPaise: { zomato: 18900, swiggy: 19900, toing: 16900 }
  },
  {
    id: 'momo-tandoori-chick-23',
    name: 'Smoky Tandoori Chicken Momos with Mint Chutney',
    category: 'Momos & Dumplings',
    cuisine: 'Tandoori Fusion',
    dietary: 'non-veg',
    description: 'Chicken momos marinated in spiced tandoori curd masala, charred over live charcoal, tossed with chaat masala and butter.',
    imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Kingdom of Momos',
    restaurantRating: 4.4,
    ratingCount: 1850,
    distanceKm: 3.3,
    tags: ['momo', 'momos', 'tandoori momos', 'chicken momos', 'non veg'],
    basePricesPaise: { zomato: 19900, swiggy: 20900, toing: 17900 }
  },
  {
    id: 'momo-gravy-paneer-24',
    name: 'Afghani Creamy Malai Paneer Momos (6 Pcs)',
    category: 'Momos & Dumplings',
    cuisine: 'Mughlai Fusion',
    dietary: 'veg',
    description: 'Steamed paneer momos drenched in a rich cashew-cream and cheese gravy with crushed black peppercorns and coriander.',
    imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'The Momo Hut',
    restaurantRating: 4.3,
    ratingCount: 1120,
    distanceKm: 2.4,
    tags: ['momo', 'momos', 'gravy momos', 'afghani momos', 'paneer momos', 'veg'],
    basePricesPaise: { zomato: 17900, swiggy: 18900, toing: 15900 }
  },

  // ==========================================
  // 5. CHINESE FOOD
  // ==========================================
  {
    id: 'chinese-noodles-veg-25',
    name: 'Veg Hakka Noodles with Chili Paneer Combo',
    category: 'Chinese food',
    cuisine: 'Indo-Chinese',
    dietary: 'veg',
    description: 'Wok-tossed noodles with shredded cabbage, bell peppers, and scallions, served with saucy dry chili paneer cubes.',
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Mainland China Express',
    restaurantRating: 4.4,
    ratingCount: 2900,
    distanceKm: 3.6,
    tags: ['chinese', 'noodles', 'hakka noodles', 'chili paneer', 'chowmein', 'veg chinese'],
    basePricesPaise: { zomato: 23000, swiggy: 24000, toing: 21000 }
  },
  {
    id: 'chinese-chicken-manch-26',
    name: 'Chicken Manchurian with Egg Fried Rice Bowl',
    category: 'Chinese food',
    cuisine: 'Indo-Chinese',
    dietary: 'non-veg',
    description: 'Golden chicken meatballs simmered in ginger, garlic, soy, and coriander gravy, served over hot egg fried rice.',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Wok Express Bowls',
    restaurantRating: 4.5,
    ratingCount: 1950,
    distanceKm: 2.2,
    tags: ['chinese', 'chicken manchurian', 'fried rice', 'egg fried rice', 'chinese bowl', 'non veg'],
    basePricesPaise: { zomato: 26900, swiggy: 27900, toing: 24900 }
  },
  {
    id: 'chinese-chili-paneer-27',
    name: 'Dry Chili Paneer with Bell Peppers & Spring Onions',
    category: 'Chinese food',
    cuisine: 'Indo-Chinese',
    dietary: 'veg',
    description: 'Batter-coated cottage cheese wok-fried with garlic, green chilies, dark soy sauce, and spring onion greens.',
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=60',
    restaurantName: "Berco's Chinese & Thai",
    restaurantRating: 4.4,
    ratingCount: 3100,
    distanceKm: 2.7,
    tags: ['chinese', 'chili paneer', 'paneer dry', 'starter', 'veg chinese'],
    basePricesPaise: { zomato: 21900, swiggy: 22900, toing: 19900 }
  },
  {
    id: 'chinese-chicken-noodles-28',
    name: 'Schezwan Chicken Chili Garlic Noodles',
    category: 'Chinese food',
    cuisine: 'Indo-Chinese',
    dietary: 'non-veg',
    description: 'Spicy noodles tossed with shredded chicken, pungent Schezwan peppercorn paste, crushed garlic, and bok choy.',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Chowman Chinese Wok',
    restaurantRating: 4.5,
    ratingCount: 1780,
    distanceKm: 3.0,
    tags: ['chinese', 'chicken noodles', 'schezwan noodles', 'chowmein', 'spicy chinese', 'non veg'],
    basePricesPaise: { zomato: 24900, swiggy: 25900, toing: 22900 }
  },
  {
    id: 'chinese-spring-rolls-29',
    name: 'Crispy Golden Vegetable Spring Rolls (4 Pcs)',
    category: 'Chinese food',
    cuisine: 'Asian / Chinese',
    dietary: 'veg',
    description: 'Crispy filo pastry rolls stuffed with julienned veggies and glass noodles, served with sweet chili dip.',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Asia Seven Bites',
    restaurantRating: 4.2,
    ratingCount: 1350,
    distanceKm: 1.6,
    tags: ['chinese', 'spring rolls', 'veg spring rolls', 'starter', 'snack', 'veg'],
    basePricesPaise: { zomato: 14900, swiggy: 15900, toing: 13500 }
  },

  // ==========================================
  // 6. SOUTH INDIAN FOOD
  // ==========================================
  {
    id: 'south-ghee-dosa-30',
    name: 'Classic Ghee Roast Masala Dosa',
    category: 'South Indian food',
    cuisine: 'South Indian',
    dietary: 'veg',
    description: 'Golden crispy fermented crepe roasted with pure desi ghee, filled with spiced potato onion mash, served with trio chutneys and drumstick sambar.',
    imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Vidyarthi Bhavan Tiffins',
    restaurantRating: 4.7,
    ratingCount: 5200,
    distanceKm: 2.8,
    tags: ['dosa', 'south indian', 'masala dosa', 'ghee dosa', 'breakfast', 'veg'],
    basePricesPaise: { zomato: 14000, swiggy: 13500, toing: 12000 }
  },
  {
    id: 'south-idli-vada-31',
    name: 'Steamed Button Idli & Crispy Medu Vada Combo',
    category: 'South Indian food',
    cuisine: 'South Indian',
    dietary: 'veg',
    description: 'Two fluffy steamed rice cakes and one crunchy lentil doughnut, dunked in piping hot vegetable sambar with fresh coconut chutney.',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'A2B - Adyar Ananda Bhavan',
    restaurantRating: 4.5,
    ratingCount: 4200,
    distanceKm: 1.9,
    tags: ['idli', 'vada', 'south indian', 'breakfast', 'sambar', 'healthy', 'veg'],
    basePricesPaise: { zomato: 11000, swiggy: 11500, toing: 9900 }
  },
  {
    id: 'south-mysore-masala-32',
    name: 'Crispy Mysore Masala Dosa with Red Garlic Chutney',
    category: 'South Indian food',
    cuisine: 'South Indian',
    dietary: 'veg',
    description: 'Crisp crepe lined with spicy red chili garlic spread, stuffed with potato masala, and cooked with dollops of white butter.',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'MTR 1924 Heritage Tiffins',
    restaurantRating: 4.6,
    ratingCount: 3800,
    distanceKm: 3.2,
    tags: ['dosa', 'mysore masala dosa', 'south indian', 'spicy dosa', 'veg'],
    basePricesPaise: { zomato: 16000, swiggy: 16500, toing: 14500 }
  },
  {
    id: 'south-rava-onion-33',
    name: 'Onion Rava Masala Dosa with Sambar',
    category: 'South Indian food',
    cuisine: 'South Indian',
    dietary: 'veg',
    description: 'Lacy semolina crepe studded with chopped green chilies, ginger, and caramelized onions, filled with mashed potatoes.',
    imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Saravana Bhavan Tiffins',
    restaurantRating: 4.4,
    ratingCount: 2900,
    distanceKm: 2.5,
    tags: ['dosa', 'rava dosa', 'south indian', 'onion dosa', 'crispy dosa', 'veg'],
    basePricesPaise: { zomato: 15000, swiggy: 15500, toing: 13500 }
  },
  {
    id: 'south-uttapam-onion-34',
    name: 'Tomato Onion Uttapam with Trio Chutneys',
    category: 'South Indian food',
    cuisine: 'South Indian',
    dietary: 'veg',
    description: 'Thick savory pancake topped with juicy diced tomatoes, red onions, fresh coriander, and roasted cumin seeds.',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Sagar Ratna Sweets & Meals',
    restaurantRating: 4.3,
    ratingCount: 2100,
    distanceKm: 2.0,
    tags: ['uttapam', 'south indian', 'breakfast', 'pancake', 'veg'],
    basePricesPaise: { zomato: 13000, swiggy: 13500, toing: 11500 }
  },

  // ==========================================
  // 7. NORTH INDIAN FOOD
  // ==========================================
  {
    id: 'north-paneer-butter-35',
    name: 'Paneer Butter Masala Combo with 2 Butter Naan',
    category: 'North Indian food',
    cuisine: 'North Indian',
    dietary: 'veg',
    description: 'Cottage cheese cubes in rich, creamy tomato and butter gravy, accompanied by 2 freshly baked butter garlic naans.',
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Punjab Grill Express',
    restaurantRating: 4.5,
    ratingCount: 1840,
    distanceKm: 2.1,
    tags: ['paneer', 'paneer butter masala', 'north indian', 'curry', 'naan', 'veg'],
    basePricesPaise: { zomato: 26000, swiggy: 25000, toing: 23000 }
  },
  {
    id: 'north-dal-makhani-36',
    name: 'Slow-Cooked Dal Makhani with Garlic Naan',
    category: 'North Indian food',
    cuisine: 'North Indian / Punjabi',
    dietary: 'veg',
    description: 'Black lentils slow cooked overnight on charcoal embers with churned butter and cream, served with crisp garlic naan.',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Dhaba By Claridges',
    restaurantRating: 4.6,
    ratingCount: 2300,
    distanceKm: 3.5,
    tags: ['dal makhani', 'dal', 'north indian', 'punjabi', 'naan', 'veg'],
    basePricesPaise: { zomato: 24000, swiggy: 25000, toing: 22000 }
  },
  {
    id: 'north-butter-chicken-37',
    name: 'Old Delhi Style Murgh Butter Chicken',
    category: 'North Indian food',
    cuisine: 'North Indian / Mughlai',
    dietary: 'non-veg',
    description: 'Tandoor-roasted chicken pieces cooked in a silky, velvety tomato gravy laced with butter, fenugreek, and cream.',
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Moti Mahal Delux Heritage',
    restaurantRating: 4.6,
    ratingCount: 4500,
    distanceKm: 2.8,
    tags: ['butter chicken', 'chicken curry', 'north indian', 'mughlai', 'non veg'],
    basePricesPaise: { zomato: 34000, swiggy: 35500, toing: 31000 }
  },
  {
    id: 'north-shahi-paneer-38',
    name: 'Shahi Paneer with Desi Ghee Phulkas (3 Pcs)',
    category: 'North Indian food',
    cuisine: 'North Indian / Mughlai',
    dietary: 'veg',
    description: 'Soft cottage cheese simmered in aromatic cashew, cardamom, and saffron gravy, served with piping hot wheat rotis.',
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=60',
    restaurantName: "Haldiram's Restaurant",
    restaurantRating: 4.4,
    ratingCount: 3100,
    distanceKm: 1.8,
    tags: ['shahi paneer', 'paneer', 'roti', 'north indian', 'veg thali', 'veg'],
    basePricesPaise: { zomato: 22000, swiggy: 23000, toing: 19900 }
  },
  {
    id: 'north-thali-veg-deluxe-39',
    name: 'Executive North Indian Veg Thali',
    category: 'North Indian food',
    cuisine: 'North Indian',
    dietary: 'veg',
    description: 'Complete meal box: Paneer dish, Dal Makhani, seasonal dry vegetable, Jeera Rice, 2 Butter Naan, Gulab Jamun, and salad.',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Bikanervala Thali Express',
    restaurantRating: 4.5,
    ratingCount: 2800,
    distanceKm: 2.3,
    tags: ['thali', 'veg thali', 'north indian', 'meal combo', 'lunch box', 'veg'],
    basePricesPaise: { zomato: 27900, swiggy: 28900, toing: 25500 }
  },
  {
    id: 'north-chole-bhature-40',
    name: 'Amritsari Pindi Chole Bhature (2 Pcs)',
    category: 'North Indian food',
    cuisine: 'Punjabi',
    dietary: 'veg',
    description: 'Dark spicy chickpea curry cooked with pomegranate seeds and dry spices, served with fluffy hot bhature, pickled carrots, and onions.',
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Sita Ram Diwan Chand',
    restaurantRating: 4.6,
    ratingCount: 3900,
    distanceKm: 3.1,
    tags: ['chole bhature', 'punjabi', 'breakfast', 'chana', 'bhature', 'veg'],
    basePricesPaise: { zomato: 14900, swiggy: 15900, toing: 13500 }
  },

  // ==========================================
  // 8. BEVERAGES & CAFE
  // ==========================================
  {
    id: 'bev-cold-coffee-thirdwave-41',
    name: 'Signature Cold Coffee & Fudgy Brownie',
    category: 'Beverages',
    cuisine: 'Cafe',
    dietary: 'veg',
    description: 'Double shot slow-brewed espresso blended with chilled whole milk, paired with a warm Belgian dark chocolate walnut brownie.',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Third Wave Roastworks',
    restaurantRating: 4.6,
    ratingCount: 2900,
    distanceKm: 1.5,
    tags: ['cold coffee', 'coffee', 'iced coffee', 'brownie', 'beverage', 'cafe', 'shake'],
    basePricesPaise: { zomato: 27900, swiggy: 28900, toing: 26000 }
  },
  {
    id: 'bev-classic-cold-coffee-42',
    name: 'Classic Creamy Chilled Cold Coffee (300ml)',
    category: 'Beverages',
    cuisine: 'Cafe',
    dietary: 'veg',
    description: 'Classic creamy iced coffee churned with ice cream, cocoa dust, and rich milk. Sweet, refreshing, and budget friendly.',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Cafe Coffee Day Bites',
    restaurantRating: 4.2,
    ratingCount: 3400,
    distanceKm: 1.8,
    tags: ['cold coffee', 'coffee', 'iced coffee', 'cheap coffee', 'beverage', 'cold drink', 'frappe'],
    basePricesPaise: { zomato: 9900, swiggy: 11000, toing: 8900 }
  },
  {
    id: 'bev-iced-caramel-latte-43',
    name: 'Iced Caramel Macchiato Latte',
    category: 'Beverages',
    cuisine: 'Cafe',
    dietary: 'veg',
    description: 'Freshly steamed milk with vanilla-flavored syrup, marked with espresso and topped with a caramel drizzle over ice.',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Starbucks Gourmet Coffee',
    restaurantRating: 4.5,
    ratingCount: 4100,
    distanceKm: 2.4,
    tags: ['coffee', 'latte', 'cold coffee', 'caramel latte', 'starbucks', 'beverage'],
    basePricesPaise: { zomato: 26500, swiggy: 27500, toing: 24500 }
  },
  {
    id: 'bev-mango-lassi-44',
    name: 'Malai Kesar Mango Lassi (400ml)',
    category: 'Beverages',
    cuisine: 'North Indian',
    dietary: 'veg',
    description: 'Thick churned sweet yogurt blended with Alphonso mango pulp and saffron strands, crowned with malai and pistachio slivers.',
    imageUrl: 'https://images.unsplash.com/photo-1571006687082-8c105e46bfb0?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Amritsari Lassi Corner',
    restaurantRating: 4.5,
    ratingCount: 1800,
    distanceKm: 1.2,
    tags: ['lassi', 'mango lassi', 'beverage', 'shake', 'sweet drink', 'veg'],
    basePricesPaise: { zomato: 8900, swiggy: 9500, toing: 7900 }
  },
  {
    id: 'bev-chocolate-thickshake-45',
    name: 'Belgian Dark Chocolate Thickshake',
    category: 'Beverages',
    cuisine: 'Dessert Drinks',
    dietary: 'veg',
    description: 'Decadent dark chocolate gelato blended thick with milk and chocolate shavings. Thick enough to eat with a spoon.',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'The ThickShake Factory',
    restaurantRating: 4.3,
    ratingCount: 2200,
    distanceKm: 2.1,
    tags: ['shake', 'thickshake', 'chocolate shake', 'beverage', 'drink', 'sweet'],
    basePricesPaise: { zomato: 16900, swiggy: 17900, toing: 14900 }
  },
  {
    id: 'bev-masala-chai-flask-46',
    name: 'Desi Kulhad Ginger Masala Chai (500ml Flask)',
    category: 'Beverages',
    cuisine: 'Indian Hot Drinks',
    dietary: 'veg',
    description: 'Hot brewed tea leaves with fresh crushed ginger, green cardamom, cloves, and whole milk, packed in an insulated heat-retaining flask.',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Chaayos Desi Chai Hub',
    restaurantRating: 4.4,
    ratingCount: 3500,
    distanceKm: 1.7,
    tags: ['chai', 'tea', 'masala chai', 'ginger chai', 'hot beverage', 'beverage'],
    basePricesPaise: { zomato: 13900, swiggy: 14900, toing: 12500 }
  },

  // ==========================================
  // 9. DESSERTS & SWEETS
  // ==========================================
  {
    id: 'dessert-gulab-jamun-47',
    name: 'Hot Desi Ghee Gulab Jamun (4 Pcs)',
    category: 'Desserts',
    cuisine: 'Indian Sweets',
    dietary: 'veg',
    description: 'Soft melt-in-mouth cottage cheese and mawa dumplings fried in pure desi ghee, soaked in warm rose and cardamom sugar syrup.',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60',
    restaurantName: "Haldiram's Sweets",
    restaurantRating: 4.6,
    ratingCount: 4100,
    distanceKm: 1.5,
    tags: ['dessert', 'gulab jamun', 'mithai', 'sweets', 'indian sweets', 'veg'],
    basePricesPaise: { zomato: 12000, swiggy: 12500, toing: 10500 }
  },
  {
    id: 'dessert-brownie-fudge-48',
    name: 'Warm Belgian Chocolate Walnut Brownie',
    category: 'Desserts',
    cuisine: 'Bakery / Desserts',
    dietary: 'veg',
    description: 'Dense, gooey Belgian chocolate fudge brownie loaded with roasted California walnuts and molten dark chocolate chunks.',
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Theobroma Patisserie',
    restaurantRating: 4.7,
    ratingCount: 5400,
    distanceKm: 2.0,
    tags: ['dessert', 'brownie', 'chocolate brownie', 'cake', 'bakery', 'sweet'],
    basePricesPaise: { zomato: 13000, swiggy: 14000, toing: 11900 }
  },
  {
    id: 'dessert-rasmalai-49',
    name: 'Kesar Pista Chilled Rasmalai (2 Pcs)',
    category: 'Desserts',
    cuisine: 'Bengali Sweets',
    dietary: 'veg',
    description: 'Spongy chenna patties flattened and steeped in reduced saffron milk garnished with crushed pistachios and almonds.',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Kanti Sweets & Mithai',
    restaurantRating: 4.5,
    ratingCount: 2600,
    distanceKm: 2.2,
    tags: ['dessert', 'rasmalai', 'mithai', 'sweets', 'bengali sweets', 'veg'],
    basePricesPaise: { zomato: 11000, swiggy: 11500, toing: 9500 }
  },
  {
    id: 'dessert-icecream-sundae-50',
    name: 'Death By Chocolate Supreme Ice Cream Sundae',
    category: 'Desserts',
    cuisine: 'Desserts / Ice Cream',
    dietary: 'veg',
    description: 'Layers of chocolate sponge cake, two scoops of vanilla and chocolate gelato, roasted nuts, honey and warm fudge topping.',
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Corner House Ice Cream',
    restaurantRating: 4.8,
    ratingCount: 7200,
    distanceKm: 3.0,
    tags: ['dessert', 'ice cream', 'sundae', 'dbc', 'chocolate', 'sweet'],
    basePricesPaise: { zomato: 19900, swiggy: 21000, toing: 18500 }
  },
  {
    id: 'dessert-churros-nutella-51',
    name: 'Crispy Cinnamon Sugar Churros with Nutella Dip',
    category: 'Desserts',
    cuisine: 'Spanish / Desserts',
    dietary: 'veg',
    description: 'Spanish fried dough pastries piped with fluted edges, dusted with cinnamon sugar, served with a pot of warm hazelnut Nutella.',
    imageUrl: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'San Churro Chocolateria',
    restaurantRating: 4.4,
    ratingCount: 1500,
    distanceKm: 3.4,
    tags: ['dessert', 'churros', 'nutella', 'sweet', 'pastry'],
    basePricesPaise: { zomato: 17900, swiggy: 18900, toing: 15900 }
  },

  // ==========================================
  // 10. SNACKS & CHAAT
  // ==========================================
  {
    id: 'snack-samosa-chole-52',
    name: 'Crispy Punjabi Aloo Samosa with Chole Chaat (2 Pcs)',
    category: 'Snacks',
    cuisine: 'North Indian Street Food',
    dietary: 'veg',
    description: 'Two golden fried triangle samosas crushed and smothered with spicy pindi chole, sweetened curd, tamarind chutney, and sev.',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Bikanervala Chaat Bazaar',
    restaurantRating: 4.5,
    ratingCount: 3800,
    distanceKm: 1.4,
    tags: ['samosa', 'snack', 'chaat', 'street food', 'chole samosa', 'cheap snack', 'veg'],
    basePricesPaise: { zomato: 9900, swiggy: 10500, toing: 8500 }
  },
  {
    id: 'snack-pani-puri-53',
    name: 'Delhi Style Suji Golgappe / Pani Puri (8 Pcs)',
    category: 'Snacks',
    cuisine: 'Indian Street Food',
    dietary: 'veg',
    description: 'Crisp semolina hollow puris filled with spiced boiled potato-chickpea mash, dunked in tangy mint-coriander and sweet saunth water.',
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Chaat Chowk Express',
    restaurantRating: 4.3,
    ratingCount: 2900,
    distanceKm: 1.1,
    tags: ['pani puri', 'golgappe', 'puchka', 'chaat', 'street food', 'snack', 'veg'],
    basePricesPaise: { zomato: 7900, swiggy: 8500, toing: 6900 }
  },
  {
    id: 'snack-chicken-roll-54',
    name: 'Kolkata Crispy Chicken Kathi Roll',
    category: 'Snacks',
    cuisine: 'Kolkata Street Food',
    dietary: 'non-veg',
    description: 'Paratha layered with pan-fried egg, wrapped around juicy spiced chicken tikka strips, sliced onions, green chilies, and lemon juice.',
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Kusum Rolls Kolkata',
    restaurantRating: 4.6,
    ratingCount: 4200,
    distanceKm: 2.1,
    tags: ['roll', 'kathi roll', 'chicken roll', 'street food', 'snack', 'wrap', 'non veg'],
    basePricesPaise: { zomato: 14900, swiggy: 15900, toing: 13500 }
  },
  {
    id: 'snack-paneer-tikka-55',
    name: 'Tandoori Char-Grilled Paneer Tikka (6 Pcs)',
    category: 'Snacks',
    cuisine: 'Tandoori / North Indian',
    dietary: 'veg',
    description: 'Cubes of fresh paneer marinated in spiced yogurt with bell peppers and onions, roasted on skewers in a clay tandoor.',
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Pind Balluchi Tandoor',
    restaurantRating: 4.4,
    ratingCount: 1980,
    distanceKm: 2.9,
    tags: ['paneer', 'paneer tikka', 'tandoori', 'starter', 'snack', 'veg'],
    basePricesPaise: { zomato: 22900, swiggy: 23900, toing: 20500 }
  },
  {
    id: 'snack-french-fries-56',
    name: 'Peri Peri Seasoned Crinkle Cut Fries',
    category: 'Snacks',
    cuisine: 'American Fast Food',
    dietary: 'veg',
    description: 'Golden crinkle-cut potato fries tossed in tangy and spicy African peri peri seasoning mix. Served with garlic dip.',
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&auto=format&fit=crop&q=60',
    restaurantName: 'Burger King Snacks',
    restaurantRating: 4.3,
    ratingCount: 3200,
    distanceKm: 1.5,
    tags: ['fries', 'french fries', 'peri peri fries', 'snack', 'fast food', 'veg'],
    basePricesPaise: { zomato: 9900, swiggy: 10900, toing: 8900 }
  }
];

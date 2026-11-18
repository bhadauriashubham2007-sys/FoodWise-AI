import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  MapPin,
  ChevronRight,
  ArrowLeft,
  Zap,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Info,
  CheckCircle2,
  X,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import {
  Brand,
  BrandCategory,
  BrandMenuItem,
  BrandComparisonResult,
  LocationContext,
  BrandPlatformQuote,
} from '../types';
import { fetchBrands, fetchBrandMenu, fetchBrandItemComparison } from '../services/api';
import { formatPaise, formatFeeDisplay } from '../utils/currency';
import { logPlatformRedirect } from '../utils/telemetry';
import { PlatformOrderButton } from './PlatformOrderButton';
import { useUserLocation } from '../context/LocationContext';

export const ExploreByBrand: React.FC = () => {
  // Brand selection state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Active brand and menu state
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [menuItems, setMenuItems] = useState<BrandMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string>('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  // Selected item & comparison state
  const [selectedItem, setSelectedItem] = useState<BrandMenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  const [comparison, setComparison] = useState<BrandComparisonResult | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const { activeCity } = useUserLocation();

  // Delivery Location Context
  const [location, setLocation] = useState<LocationContext>(() => ({
    city: activeCity ? activeCity.split(',')[0].trim() : 'Bengaluru',
    pincode: '560001',
    distanceKm: 3.2,
  }));
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customPincode, setCustomPincode] = useState('');

  // Sync brand location when global activeCity changes
  useEffect(() => {
    if (activeCity) {
      setLocation((prev) => ({
        ...prev,
        city: activeCity.split(',')[0].trim(),
      }));
    }
  }, [activeCity]);

  const brandCategories = [
    'All',
    'Pizza',
    'Burgers',
    'Chicken',
    'Sandwiches',
    'Coffee & Beverages',
    'Indian Food Chains',
  ];

  const cityPresets: LocationContext[] = [
    { city: 'Bengaluru', pincode: '560001', distanceKm: 2.8 },
    { city: 'Delhi NCR', pincode: '110001', distanceKm: 3.5 },
    { city: 'Mumbai', pincode: '400001', distanceKm: 2.5 },
    { city: 'Hyderabad', pincode: '500001', distanceKm: 3.0 },
    { city: 'Kolkata', pincode: '700001', distanceKm: 2.7 },
  ];

  // Load brands on mount or filter change
  const loadBrands = useCallback(async (cat = selectedCategory, q = brandSearchQuery) => {
    try {
      setBrandsLoading(true);
      const data = await fetchBrands(cat, q);
      setBrands(data);
    } catch (err) {
      console.error('Failed to load brands', err);
    } finally {
      setBrandsLoading(false);
    }
  }, [selectedCategory, brandSearchQuery]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // Load brand menu when brand is selected
  const handleSelectBrand = async (brand: Brand) => {
    setActiveBrand(brand);
    setActiveMenuCategory('All');
    setMenuSearchQuery('');
    setSelectedItem(null);
    setComparison(null);

    try {
      setMenuLoading(true);
      const res = await fetchBrandMenu(brand.id, 'All', '');
      setMenuItems(res.items);
    } catch (err) {
      console.error('Failed to load brand menu', err);
    } finally {
      setMenuLoading(false);
    }
  };

  // Filter brand menu items
  const handleFilterMenu = async (cat: string, q: string) => {
    if (!activeBrand) return;
    setActiveMenuCategory(cat);
    try {
      setMenuLoading(true);
      const res = await fetchBrandMenu(activeBrand.id, cat, q);
      setMenuItems(res.items);
    } catch (err) {
      console.error('Failed to filter menu', err);
    } finally {
      setMenuLoading(false);
    }
  };

  // Select item to compare across Zomato, Swiggy, Toing
  const handleSelectItemToCompare = async (
    item: BrandMenuItem,
    variant?: string,
    locContext = location
  ) => {
    setSelectedItem(item);
    setSelectedVariant(variant || item.variants?.[0]?.name);

    if (!activeBrand) return;

    try {
      setComparisonLoading(true);
      const comp = await fetchBrandItemComparison(
        activeBrand.id,
        item.id,
        variant || item.variants?.[0]?.name,
        locContext
      );
      setComparison(comp);
    } catch (err) {
      console.error('Failed to compare brand item', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Handle Location Change
  const handleSetLocation = (preset: LocationContext) => {
    setLocation(preset);
    setLocationPickerOpen(false);
    if (activeBrand && selectedItem) {
      handleSelectItemToCompare(selectedItem, selectedVariant, preset);
    }
  };

  const handleCustomLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customCity.trim()) {
      const newLoc: LocationContext = {
        city: customCity.trim(),
        pincode: customPincode.trim() || '560001',
        distanceKm: 3.2,
      };
      setLocation(newLoc);
      setLocationPickerOpen(false);
      setCustomCity('');
      setCustomPincode('');
      if (activeBrand && selectedItem) {
        handleSelectItemToCompare(selectedItem, selectedVariant, newLoc);
      }
    }
  };

  // Return to Brand List
  const handleBackToBrands = () => {
    setActiveBrand(null);
    setMenuItems([]);
    setSelectedItem(null);
    setComparison(null);
  };

  // Return to Menu List
  const handleBackToMenu = () => {
    setSelectedItem(null);
    setComparison(null);
  };

  // Unique menu categories for active brand
  const activeBrandCategories = [
    'All',
    ...Array.from(new Set(menuItems.map((m) => m.category))),
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ========================================================================= */}
      {/* 1. Header & Location Bar                                                  */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-white via-white to-orange-50/40 rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-[#FF5E1E] text-xs font-bold mb-2">
              <Store className="w-3.5 h-3.5" />
              <span>National Chain Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
              <span>Explore by Brand</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold border border-stone-200">
                Indian Chains
              </span>
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm mt-1">
              Select an iconic food chain, browse official menu items, and find the lowest price across Zomato, Swiggy, and Toing.
            </p>
          </div>

          {/* Interactive Delivery Location Selector */}
          <div className="relative">
            <button
              onClick={() => setLocationPickerOpen(!locationPickerOpen)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-stone-800 text-xs font-semibold transition-all shadow-sm group"
            >
              <MapPin className="w-4 h-4 text-[#FF5E1E] flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider leading-none">
                  Delivery Zone
                </span>
                <span className="font-extrabold text-stone-900 text-xs">
                  {location.city} ({location.pincode})
                </span>
              </div>
            </button>

            {/* Location Selector Dropdown Modal */}
            {locationPickerOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-stone-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
                  <span className="text-xs font-extrabold text-stone-900">Choose Delivery Hub</span>
                  <button
                    onClick={() => setLocationPickerOpen(false)}
                    className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] text-stone-500 mb-2">Popular Metros:</div>
                <div className="space-y-1.5 mb-4">
                  {cityPresets.map((preset) => (
                    <button
                      key={preset.city}
                      onClick={() => handleSetLocation(preset)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        location.city === preset.city
                          ? 'bg-orange-50 text-[#FF5E1E] font-bold border border-[#FF5E1E]/30'
                          : 'hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <span>{preset.city}</span>
                      <span className="text-[10px] text-stone-400">{preset.pincode}</span>
                    </button>
                  ))}
                </div>

                {/* Custom City & Pincode Input */}
                <form onSubmit={handleCustomLocationSubmit} className="pt-3 border-t border-stone-100 space-y-2">
                  <div className="text-[11px] font-bold text-stone-700">Custom City or Pincode:</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="City Name"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={customPincode}
                      onChange={(e) => setCustomPincode(e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-stone-900 hover:bg-[#FF5E1E] text-white text-xs font-bold transition-colors"
                  >
                    Apply Zone
                  </button>
                </form>

                <p className="text-[10px] text-stone-400 mt-2 text-center leading-snug">
                  Availability and delivery charges adjust for your neighborhood outlet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. VIEW 1: BRAND SELECTOR                                                 */}
        {/* ========================================================================= */}
        {!activeBrand && (
          <div className="pt-6 space-y-6">
            {/* Search & Category Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search brands (Domino's, Burger King, KFC, Starbucks, Haldiram's...)"
                  value={brandSearchQuery}
                  onChange={(e) => {
                    setBrandSearchQuery(e.target.value);
                    loadBrands(selectedCategory, e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/40"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {brandCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      loadBrands(cat, brandSearchQuery);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Brands Grid */}
            {brandsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-44 bg-stone-100 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : brands.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-200/80 p-6 space-y-3">
                <Store className="w-8 h-8 text-stone-400 mx-auto" />
                <h4 className="font-bold text-stone-800 text-sm">No food brands found</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Try searching for another brand or resetting your category filter to &quot;All&quot;.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setBrandSearchQuery('');
                    loadBrands('All', '');
                  }}
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl"
                >
                  View All Brands
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="bg-white rounded-3xl p-5 border border-stone-200/80 hover:border-[#FF5E1E]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Logo & Category */}
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shadow-sm group-hover:scale-105 transition-transform"
                          />
                          <div>
                            <h3 className="font-extrabold text-base text-stone-900 group-hover:text-[#FF5E1E] transition-colors">
                              {brand.name}
                            </h3>
                            <span className="text-[11px] font-semibold text-stone-500">
                              {brand.cuisine}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FF5E1E] border border-orange-200">
                          {brand.category}
                        </span>
                      </div>

                      {/* Tagline & Outlets */}
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
                        {brand.tagline}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-stone-500 mb-3">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{brand.outletCountIndia}</span>
                      </div>

                      {/* Popular Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {brand.popularItems.slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 truncate max-w-[150px]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 mt-4 border-t border-stone-100">
                      <button
                        onClick={() => handleSelectBrand(brand)}
                        className="w-full py-2.5 px-4 rounded-xl bg-stone-900 group-hover:bg-[#FF5E1E] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span>Browse {brand.name} Menu</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. VIEW 2: BRAND MENU BROWSING                                            */}
        {/* ========================================================================= */}
        {activeBrand && !selectedItem && (
          <div className="pt-6 space-y-6">
            {/* Top Navigation & Brand Banner */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleBackToBrands}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to All Brands</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-stone-500">
                  Comparing prices for:
                </span>
                <span className="font-extrabold text-stone-900 text-xs bg-stone-100 px-2.5 py-1 rounded-lg">
                  {location.city}
                </span>
              </div>
            </div>

            {/* Active Brand Card Banner */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={activeBrand.logoUrl}
                  alt={activeBrand.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-stone-900">{activeBrand.name}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5E1E]">
                      {activeBrand.category}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">{activeBrand.tagline}</p>
                  <span className="text-[11px] text-stone-400 mt-1 block">
                    📍 {activeBrand.outletCountIndia} • {menuItems.length} Signature Items
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <span className="text-[11px] px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Brand Chain</span>
                </span>
              </div>
            </div>

            {/* Menu Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${activeBrand.name} menu...`}
                  value={menuSearchQuery}
                  onChange={(e) => {
                    setMenuSearchQuery(e.target.value);
                    handleFilterMenu(activeMenuCategory, e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
                />
              </div>

              {/* Menu Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {activeBrandCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleFilterMenu(cat, menuSearchQuery)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeMenuCategory === cat
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            {menuLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-64 bg-stone-100 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
                <Search className="w-8 h-8 text-stone-400 mx-auto" />
                <h4 className="font-bold text-stone-800 text-sm">No dishes found</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Try searching for another dish on {activeBrand.name}&apos;s menu.
                </p>
                <button
                  onClick={() => handleFilterMenu('All', '')}
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl"
                >
                  View Full {activeBrand.name} Menu
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image & Badges */}
                      <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          {/* Dietary Dot */}
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center bg-white shadow-sm ${
                              item.dietary === 'veg' ? 'border-emerald-600' : 'border-red-600'
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                item.dietary === 'veg' ? 'bg-emerald-600' : 'bg-red-600'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-900/80 text-white backdrop-blur-sm">
                            {item.category}
                          </span>
                        </div>

                        {item.servingSize && (
                          <span className="absolute bottom-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-900/80 text-white backdrop-blur-sm">
                            {item.servingSize}
                          </span>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-4">
                        <h4 className="font-bold text-sm text-stone-900 group-hover:text-[#FF5E1E] transition-colors line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Variants Preview */}
                        {item.variants && item.variants.length > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-stone-400">Sizes:</span>
                            {item.variants.map((v) => (
                              <span
                                key={v.name}
                                className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium"
                              >
                                {v.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing & Compare Action */}
                    <div className="p-4 pt-0">
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Starts from</span>
                          <span className="font-extrabold text-stone-900 text-sm">
                            {formatPaise(item.basePricesPaise.zomato)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleSelectItemToCompare(item)}
                          className="px-3.5 py-2 rounded-xl bg-stone-900 group-hover:bg-[#FF5E1E] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                        >
                          <span>Compare Prices</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. VIEW 3: CROSS-PLATFORM PRICE COMPARISON                                */}
        {/* ========================================================================= */}
        {activeBrand && selectedItem && (
          <div className="pt-6 space-y-6">
            {/* Top Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleBackToMenu}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to {activeBrand.name} Menu</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-semibold">Hub:</span>
                <span className="text-xs font-extrabold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg">
                  📍 {location.city} ({location.pincode})
                </span>
              </div>
            </div>

            {/* Selected Dish Card Banner with Variant Picker */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start md:items-center gap-4">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-stone-200 shadow-sm flex-shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#FF5E1E] uppercase tracking-wider">
                      {activeBrand.name}
                    </span>
                    <span className="text-xs text-stone-400">•</span>
                    <span className="text-xs font-semibold text-stone-500">
                      {selectedItem.category}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-0.5">
                    {selectedItem.name}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 max-w-xl line-clamp-2">
                    {selectedItem.description}
                  </p>
                </div>
              </div>

              {/* Variant Selector Dropdown if available */}
              {selectedItem.variants && selectedItem.variants.length > 0 && (
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                  <label className="text-xs font-bold text-stone-700 whitespace-nowrap">
                    Choose Portion:
                  </label>
                  <select
                    value={selectedVariant || ''}
                    onChange={(e) => {
                      setSelectedVariant(e.target.value);
                      handleSelectItemToCompare(selectedItem, e.target.value);
                    }}
                    className="w-full sm:w-auto bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
                  >
                    {selectedItem.variants.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} — {formatPaise(v.pricePaise)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Recommendation Banner */}
            {comparison && (
              <div
                className={`rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
                  comparison.isDefinitiveCheapest === false
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm ${
                      comparison.isDefinitiveCheapest === false ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                  >
                    {comparison.isDefinitiveCheapest === false ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Zap className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                        comparison.isDefinitiveCheapest === false ? 'text-amber-800' : 'text-emerald-800'
                      }`}
                    >
                      {comparison.isDefinitiveCheapest === false
                        ? 'Provisional Brand Comparison (Unverified Platform Data)'
                        : 'Best Value Brand Recommendation'}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-stone-900 mt-0.5">
                      {comparison.recommendationReason}
                    </p>
                  </div>
                </div>

                {comparison.savingsPaise > 0 && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap ${
                      comparison.isDefinitiveCheapest === false
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {comparison.isDefinitiveCheapest === false ? 'Provisional Savings: ' : 'Saves '}
                    {formatPaise(comparison.savingsPaise)}
                  </span>
                )}
              </div>
            )}

            {/* Side-by-Side Platform Quotes Comparison Grid */}
            {comparisonLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-96 bg-white rounded-3xl border border-stone-200 animate-pulse" />
                ))}
              </div>
            ) : comparison ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {comparison.quotes.map((quote: BrandPlatformQuote) => {
                  const isCheapest = quote.platform === comparison.cheapestQuote.platform && quote.isAvailable;
                  return (
                    <div
                      key={quote.platform}
                      className={`bg-white rounded-3xl overflow-hidden border transition-all flex flex-col justify-between shadow-card ${
                        isCheapest
                          ? 'border-[#FF5E1E] ring-2 ring-[#FF5E1E]/20 shadow-lg'
                          : 'border-stone-200'
                      }`}
                    >
                      {/* Platform Header */}
                      <div
                        className="p-5 border-b border-stone-100 flex items-center justify-between"
                        style={{ backgroundColor: isCheapest ? '#FFF7F2' : '#FFFFFF' }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm"
                            style={{ backgroundColor: quote.platformColor }}
                          >
                            {quote.platformDisplayName[0]}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-base text-stone-900">
                              {quote.platformDisplayName}
                            </h4>
                            <span className="text-[11px] text-stone-500 font-medium">
                              {quote.deliveryTimeMinutes && quote.deliveryTimeMinutes > 0
                                ? `⏱️ ~${quote.deliveryTimeMinutes} mins`
                                : '⏱️ Est. time unknown'}
                            </span>
                          </div>
                        </div>

                        {/* Availability / Matching Status Badge */}
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              quote.matchingStatus === 'exact_match_verified'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : quote.matchingStatus === 'availability_not_verified'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}
                          >
                            {quote.matchingStatus === 'exact_match_verified'
                              ? 'Demo Match Verified'
                              : quote.matchingStatus === 'availability_not_verified'
                              ? 'Availability Unverified'
                              : 'Similar Item'}
                          </span>
                        </div>
                      </div>

                      {/* Fee Breakdown Rows */}
                      <div className="p-5 space-y-2.5 text-xs">
                        <div className="flex justify-between items-center text-stone-600 pb-2 border-b border-stone-100">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">Item Base Price</span>
                            {quote.priceProvenance === 'rule_estimated' ? (
                              <span className="text-[10px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                                Estimated
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-500 font-semibold bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded">
                                Demo Catalogue
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-stone-900 text-sm">
                            {formatPaise(quote.basePricePaise)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-stone-600">
                          <span>Packaging Fee</span>
                          {renderFeePill(quote.packagingFeePaise)}
                        </div>

                        <div className="flex justify-between items-center text-stone-600">
                          <span>Delivery Fee ({location.city})</span>
                          {renderFeePill(quote.deliveryFeePaise)}
                        </div>

                        <div className="flex justify-between items-center text-stone-600">
                          <div className="flex items-center gap-1">
                            <span>Platform Fee</span>
                            {quote.platformFeePaise === 0 && (
                              <span className="text-[10px] text-emerald-600 font-bold">(0% Fee)</span>
                            )}
                          </div>
                          {renderFeePill(quote.platformFeePaise)}
                        </div>

                        <div className="flex justify-between items-center text-stone-600">
                          <span>GST Taxes (5%)</span>
                          {renderFeePill(quote.taxesPaise)}
                        </div>

                        {quote.couponDiscountPaise > 0 && (
                          <div className="mt-1 p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-emerald-800 text-[11px] font-bold">
                            <span>Promo ({quote.appliedCoupon?.code})</span>
                            <span>-{formatPaise(quote.couponDiscountPaise)}</span>
                          </div>
                        )}

                        {/* Unavailability notice for Toing or unlisted platforms */}
                        {quote.unavailabilityReason && (
                          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                            <div className="flex items-start gap-1 font-bold">
                              <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span>Platform Listing Note:</span>
                            </div>
                            <p className="text-[10px] text-amber-800 leading-snug">
                              {quote.unavailabilityReason}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Final Price & Direct Order Action */}
                      <div className="p-5 bg-stone-50 border-t border-stone-100">
                        <div className="flex justify-between items-baseline mb-3">
                          <div>
                            <span className="text-xs font-semibold text-stone-500">
                              {quote.hasUnknownFees ? 'Provisional Subtotal' : 'Total Payable'}
                            </span>
                            <span className="block text-[10px] text-stone-400">
                              {quote.hasUnknownFees ? 'Excludes unverified fees' : 'Exact integer paise'}
                            </span>
                          </div>
                          <span className="text-2xl font-extrabold text-stone-900">
                            {formatPaise(quote.finalPricePaise)}
                          </span>
                        </div>

                        <PlatformOrderButton
                          platform={quote.platform}
                          platformDisplayName={quote.platformDisplayName}
                          directOrderUrl={quote.directOrderUrl}
                          isCheapest={isCheapest}
                          onRedirect={() =>
                            logPlatformRedirect({
                              dishName: `${activeBrand.name} - ${selectedItem.name}`,
                              platform: quote.platform,
                              restaurantId: quote.brandId,
                              restaurantName: quote.brandName,
                              itemId: quote.itemId,
                              destinationUrl: quote.directOrderUrl,
                              linkType: quote.linkType,
                            })
                          }
                        />

                        {/* Link Designation Badge */}
                        <div className="mt-2 text-center">
                          <span className="inline-block text-[9px] px-2.5 py-0.5 rounded-full bg-stone-200/70 text-stone-700 font-semibold">
                            🔗 {quote.linkTypeLabel || 'Targeted Link'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};

function renderFeePill(feePaise: number | null) {
  const display = formatFeeDisplay(feePaise);
  if (display.isUnknown) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
        Unknown (Checkout)
      </span>
    );
  }
  if (display.isFree) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-200">
        FREE
      </span>
    );
  }
  return <span className="font-bold text-stone-900">{display.text}</span>;
}

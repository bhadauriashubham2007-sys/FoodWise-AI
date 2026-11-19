import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sparkles, TrendingDown, ShieldCheck, Zap, ChevronRight, Layers, X, RefreshCw, MapPin } from 'lucide-react';
import { FoodItem } from '../types';
import { fetchFoods } from '../services/api';
import { useUserLocation } from '../context/LocationContext';
import { FoodCard } from '../components/FoodCard';
import { PriceBreakdownModal } from '../components/PriceBreakdownModal';
import { CompareByLink } from '../components/CompareByLink';
import { ExploreByBrand } from '../components/ExploreByBrand';
import { useSound } from '../context/SoundContext';

interface HomeProps {
  savedItems: FoodItem[];
  onToggleSave: (item: FoodItem) => void;
}

export const Home: React.FC<HomeProps> = ({ savedItems, onToggleSave }) => {
  const { play } = useSound();
  const navigate = useNavigate();
  const { activeCity, setActiveCity } = useUserLocation();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [modalItem, setModalItem] = useState<FoodItem | null>(null);
  const [searchedTerm, setSearchedTerm] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const categories = [
    'All',
    'Biryani & Rice',
    'Pizza & Italian',
    'Burgers & Fast Food',
    'Momos & Dumplings',
    'Chinese food',
    'South Indian food',
    'North Indian food',
    'Beverages',
    'Desserts',
    'Snacks'
  ];

  const loadFoods = useCallback(async (queryText?: string, cat = activeCategory, city = activeCity) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const data = await fetchFoods({
        query: queryText !== undefined ? queryText : searchQuery,
        category: cat !== 'All' ? cat : undefined,
        city,
      }, controller.signal);
      setFoods(data);
      setSearchedTerm(queryText !== undefined ? queryText : searchQuery);
    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.error('Failed to load foods:', error);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [searchQuery, activeCategory, activeCity]);

  useEffect(() => {
    loadFoods('', 'All', activeCity);
  }, [activeCity]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    play('search_initiate');
    loadFoods(searchQuery, activeCategory);
  };

  const handleCategoryClick = (cat: string) => {
    play('click');
    setActiveCategory(cat);
    // Clear incompatible search text when user browses a new category
    setSearchQuery('');
    setSearchedTerm('');
    loadFoods('', cat);
  };

  const handleClearSearch = () => {
    play('click');
    setSearchQuery('');
    setSearchedTerm('');
    loadFoods('', activeCategory);
  };

  const handleResetAll = () => {
    setSearchQuery('');
    setSearchedTerm('');
    setActiveCategory('All');
    loadFoods('', 'All');
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative pt-10 pb-16 lg:pt-16 lg:pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Announcement */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-950 text-xs font-bold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-[#FF5E1E]" />
              <span>Multi-Platform Intelligence for Zomato, Swiggy &amp; Toing</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 tracking-tight leading-[1.15]">
              Your Food. Your Choice.{' '}
              <span className="text-[#FF5E1E] underline decoration-[#FF5E1E]/30 decoration-wavy">
                Always the Best Deal.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed font-normal">
              Compare menu prices, delivery charges, packaging fees, and active coupons across India&apos;s top delivery platforms in one click.
            </p>

            {/* Dynamic Search Bar */}
            <div className="mt-10 max-w-2xl mx-auto">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center bg-white p-2 rounded-2xl shadow-elevated border border-stone-200"
              >
                <Search className="w-5 h-5 text-stone-400 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search biryani, pizza, cold coffee, momos, burger, pasta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none bg-transparent"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1.5 mr-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold shadow-sm transition-all mr-1.5"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/ai-search?q=${encodeURIComponent(searchQuery || 'Popular food deals')}`)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-[#FF5E1E] hover:bg-[#E54E12] text-white text-sm font-bold shadow-md transition-all"
                  title="Ask Gemini AI for deals"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Find</span>
                </button>
              </form>

              {/* Category Pills */}
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      activeCategory === cat
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-stone-200/70 text-stone-700 hover:bg-stone-300/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compare by Link Section */}
      <CompareByLink
        onOpenQuickModal={(it) => {
          play('modal_open');
          setModalItem(it);
        }}
      />

      {/* Explore by Brand Section */}
      <ExploreByBrand />

      {/* Live Value Proposition Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-card hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-red-100/70 text-[#E23744] flex items-center justify-center mb-4">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1">True Final Price Comparison</h3>
            <p className="text-stone-600 text-xs leading-relaxed">
              We add delivery fees, packaging fees, and taxes to reveal the actual amount deducted from your wallet.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-card hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-orange-100/70 text-[#FF5E1E] flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1">Automated Coupon Discovery</h3>
            <p className="text-stone-600 text-xs leading-relaxed">
              Discover eligible promo codes like ZOMATO50, SWIGGYIT, and direct restaurant discounts instantly.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-card hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1">No Surprises Guarantee</h3>
            <p className="text-stone-600 text-xs leading-relaxed">
              Zero guessing. Missing fees remain explicitly tagged as &quot;Unknown&quot; rather than mislead you with ₹0.
            </p>
          </div>
        </div>
      </section>

      {/* Dynamic Food Comparison Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#FF5E1E] uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Multi-Platform Price Quotes</span>
              <span className="text-stone-300">•</span>
              <span className="inline-flex items-center gap-1 text-stone-600 font-semibold normal-case">
                <MapPin className="w-3.5 h-3.5 text-[#FF5E1E]" />
                <span>{activeCity.split(',')[0]}</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              {searchedTerm ? `Search Results for "${searchedTerm}"` : activeCategory !== 'All' ? `${activeCategory} Dishes` : 'Popular Dishes Live Comparison'}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {loading ? 'Searching full 50+ catalogue...' : `Showing ${foods.length} verified dishes with live Zomato, Swiggy & Toing quotes`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {(searchedTerm || activeCategory !== 'All') && (
              <button
                onClick={handleResetAll}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 underline"
              >
                Clear Filters
              </button>
            )}
            <Link
              to="/compare"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 hover:text-[#FF5E1E] transition-colors"
            >
              <span>View Full Comparison Grid</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-96 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : foods.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-sm max-w-2xl mx-auto p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF5E1E] flex items-center justify-center mx-auto">
              {activeCity.toLowerCase().includes('bengaluru') || activeCity.toLowerCase().includes('bangalore') ? (
                <Search className="w-8 h-8" />
              ) : (
                <MapPin className="w-8 h-8" />
              )}
            </div>
            {activeCity.toLowerCase().includes('bengaluru') || activeCity.toLowerCase().includes('bangalore') ? (
              <>
                <h3 className="text-lg font-bold text-stone-900">No dishes matched your search</h3>
                <p className="text-stone-600 text-sm max-w-md mx-auto">
                  We couldn&apos;t find any items matching &quot;{searchedTerm || activeCategory}&quot;. Try searching for <strong>biryani</strong>, <strong>pizza</strong>, <strong>burgers</strong>, <strong>momos</strong>, or <strong>cold coffee</strong>.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={handleResetAll}
                    className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors"
                  >
                    Reset Search
                  </button>
                  <button
                    onClick={() => navigate(`/ai-search?q=${encodeURIComponent(searchQuery)}`)}
                    className="px-5 py-2.5 rounded-xl bg-[#FF5E1E] text-white text-xs font-bold hover:bg-[#E54E12] transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Search with Gemini AI</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-stone-900">
                  No verified listings are currently available for {activeCity}.
                </h3>
                <p className="text-stone-600 text-sm max-w-md mx-auto">
                  The available demo catalogue currently covers Bengaluru. We do not invent unverified restaurants, prices, or delivery fees for {activeCity.split(',')[0]}.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setActiveCity('Bengaluru, Karnataka')}
                    className="px-5 py-2.5 rounded-xl bg-[#FF5E1E] text-white text-xs font-bold hover:bg-[#E54E12] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Switch to Bengaluru (Explore Demo)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {foods.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                isSaved={savedItems.some((s) => s.id === item.id)}
                onToggleSave={onToggleSave}
                onOpenQuickModal={(it) => setModalItem(it)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Platform Transparency Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#FF5E1E]">
              Next-Gen Delivery Transparency
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-white">
              Why do food prices differ across platforms?
            </h2>
            <p className="text-stone-400 text-sm sm:text-base mt-4 leading-relaxed">
              Each delivery app charges different merchant commissions, platform charges, distance-based delivery rates, and rain/demand surcharges. FoodWise AI monitors these variable fees in real-time to save you up to 35% on every meal.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/ai-search"
                className="px-6 py-3.5 rounded-xl bg-[#FF5E1E] hover:bg-[#E54E12] text-white font-bold text-sm shadow-md transition-colors inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Try AI Deal Finder</span>
              </Link>
              <Link
                to="/coupons"
                className="px-6 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm transition-colors inline-flex items-center gap-2"
              >
                <span>Browse All Coupons</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Modal */}
      <PriceBreakdownModal
        item={modalItem}
        onClose={() => {
          play('modal_close');
          setModalItem(null);
        }}
      />
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Bot,
  RefreshCw,
  Search as SearchIcon,
  Filter,
  X,
  Target,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { FoodItem, SearchIntent, PlatformType, DietaryType } from '../types';
import { queryAI } from '../services/api';
import { useUserLocation } from '../context/LocationContext';
import { FoodCard } from '../components/FoodCard';
import { PriceBreakdownModal } from '../components/PriceBreakdownModal';
import { useSound } from '../context/SoundContext';

interface SearchProps {
  savedItems: FoodItem[];
  onToggleSave: (item: FoodItem) => void;
}

interface FilterOverrides {
  prompt?: string;
  dietary?: DietaryType | 'all';
  budgetRupees?: number;
  clearBudget?: boolean;
  selectedCategory?: string;
  selectedPlatform?: PlatformType | 'all';
  selectedSort?: 'relevance' | 'cheapest' | 'rating' | 'fastest';
  city?: string;
}

export const Search: React.FC<SearchProps> = ({ savedItems, onToggleSave }) => {
  const { play } = useSound();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { activeCity, setActiveCity } = useUserLocation();

  const [prompt, setPrompt] = useState(initialQuery);
  const [dietary, setDietary] = useState<DietaryType | 'all'>('all');
  const [budgetRupees, setBudgetRupees] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');
  const [selectedSort, setSelectedSort] = useState<'relevance' | 'cheapest' | 'rating' | 'fastest'>('relevance');
  const [minRating, setMinRating] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [extractedIntent, setExtractedIntent] = useState<SearchIntent | null>(null);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [modalItem, setModalItem] = useState<FoodItem | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef<boolean>(false);

  const presetQueries = [
    'Find paneer pizza under ₹250',
    'Cheapest chicken biryani',
    'Cold coffee under ₹100',
    'Veg burger under 150',
    'Find momos near my location',
    'Cheapest pizza',
  ];

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

  const executeSearch = useCallback(async (overrides?: FilterOverrides) => {
    // 1. Cancel previous pending in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Track request sequence ID to prevent race conditions
    const currentRequestId = ++requestIdRef.current;

    const queryText = (overrides?.prompt !== undefined ? overrides.prompt : prompt).trim();
    const effectiveCategory = overrides?.selectedCategory !== undefined ? overrides.selectedCategory : selectedCategory;
    const effectiveDietary = overrides?.dietary !== undefined ? overrides.dietary : dietary;
    const effectiveBudget = overrides?.clearBudget
      ? undefined
      : overrides?.budgetRupees !== undefined
      ? overrides.budgetRupees
      : budgetRupees;
    const effectivePlatform = overrides?.selectedPlatform !== undefined ? overrides.selectedPlatform : selectedPlatform;
    const effectiveSort = overrides?.selectedSort !== undefined ? overrides.selectedSort : selectedSort;
    const effectiveCity = overrides?.city !== undefined ? overrides.city : activeCity;

    try {
      setLoading(true);
      setError(null);

      // Keep URL sync non-intrusive and avoid mount reload loops
      if (queryText) {
        setSearchParams({ q: queryText }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }

      // Execute AI intent query (empty query is supported for category browsing)
      const res = await queryAI(
        queryText,
        {
          dietary: effectiveDietary !== 'all' ? effectiveDietary : undefined,
          budgetRupees: effectiveBudget,
          category: effectiveCategory !== 'All' ? effectiveCategory : undefined,
          platform: effectivePlatform !== 'all' ? effectivePlatform : undefined,
          sortBy: effectiveSort,
          city: effectiveCity,
        },
        controller.signal
      );

      // Discard stale out-of-order response if a newer request was dispatched
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setAiAnswer(res.answer);
      setAiProvider(res.aiProvider || null);
      setExtractedIntent(res.intent || null);
      setResults(res.suggestedItems || []);

      if (res.intent?.maxBudgetRupees && !effectiveBudget) {
        setBudgetRupees(res.intent.maxBudgetRupees);
      }
      if (res.intent?.dietary && effectiveDietary === 'all' && res.intent.dietary !== 'all') {
        setDietary(res.intent.dietary);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      if (currentRequestId === requestIdRef.current) {
        console.error('AI Search Error:', err);
        setError('Unable to complete search. Please check your connection and try again.');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [prompt, dietary, budgetRupees, selectedCategory, selectedPlatform, selectedSort, activeCity, setSearchParams]);

  const debouncedSearch = useCallback((overrides?: FilterOverrides, delayMs = 150) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(overrides);
    }, delayMs);
  }, [executeSearch]);

  // Initial load and city change handler (fires exactly once on mount)
  useEffect(() => {
    const isFirstMount = !hasMountedRef.current;
    hasMountedRef.current = true;

    if (isFirstMount) {
      executeSearch({ prompt: initialQuery });
    } else {
      executeSearch({ city: activeCity });
    }
  }, [activeCity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleClearFilters = () => {
    setDietary('all');
    setBudgetRupees(undefined);
    setSelectedCategory('All');
    setSelectedPlatform('all');
    setSelectedSort('relevance');
    setMinRating(0);
    executeSearch({
      dietary: 'all',
      clearBudget: true,
      selectedCategory: 'All',
      selectedPlatform: 'all',
      selectedSort: 'relevance'
    });
  };

  const handleClearAll = () => {
    play('click');
    setPrompt('');
    setDietary('all');
    setBudgetRupees(undefined);
    setSelectedCategory('All');
    setSelectedPlatform('all');
    setSelectedSort('relevance');
    setMinRating(0);
    setAiAnswer(null);
    setExtractedIntent(null);
    executeSearch({
      prompt: '',
      dietary: 'all',
      clearBudget: true,
      selectedCategory: 'All',
      selectedPlatform: 'all',
      selectedSort: 'relevance'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-100 text-[#FF5E1E] text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini AI Intent Engine &amp; Multi-Platform Comparator</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          AI Food Search &amp; Deal Finder
        </h1>
        <p className="mt-2 text-stone-600 text-sm">
          Ask in plain English or use precision filters. Gemini extracts your budget, cuisine, and dietary intent to calculate real final prices across Zomato, Swiggy, and Toing.
        </p>
      </div>

      {/* Main AI Input Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-card max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#FF5E1E]" />
              <span>What would you like to order today?</span>
            </label>
            {prompt && (
              <button
                onClick={handleClearAll}
                className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            )}
          </div>

          <div className="relative flex items-center bg-stone-50 rounded-2xl border border-stone-300 p-2 focus-within:ring-2 focus-within:ring-[#FF5E1E]/20 focus-within:border-[#FF5E1E] transition-all">
            <textarea
              rows={2}
              placeholder="e.g. Find paneer pizza under ₹250, or cheapest chicken biryani with quick delivery..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  play('search_initiate');
                  executeSearch();
                }
              }}
              className="w-full bg-transparent p-2 text-stone-900 placeholder-stone-400 text-sm focus:outline-none resize-none font-medium"
            />
            <button
              onClick={() => {
                play('search_initiate');
                executeSearch();
              }}
              disabled={loading}
              className="self-end px-5 py-3 rounded-xl bg-[#FF5E1E] hover:bg-[#E54E12] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 flex-shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{loading ? 'Analyzing...' : 'Find Deals'}</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-4 border-t border-stone-100 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-600 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>Search Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1.5">Food Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategory(val);
                  debouncedSearch({ selectedCategory: val });
                }}
                className="w-full bg-stone-50 border border-stone-300 text-stone-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Dietary Filter */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1.5">Dietary Preference</label>
              <div className="flex items-center gap-1">
                {(['all', 'veg', 'non-veg', 'egg', 'vegan'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDietary(d);
                      debouncedSearch({ dietary: d });
                    }}
                    className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all text-center ${
                      dietary === d
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {d === 'all' ? 'All' : d === 'veg' ? 'Veg' : d === 'non-veg' ? 'Non-Veg' : d === 'egg' ? 'Egg' : 'Vegan'}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1.5">Platform Priority</label>
              <select
                value={selectedPlatform}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSelectedPlatform(val);
                  debouncedSearch({ selectedPlatform: val });
                }}
                className="w-full bg-stone-50 border border-stone-300 text-stone-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
              >
                <option value="all">All Platforms (Compare All)</option>
                <option value="zomato">Zomato</option>
                <option value="swiggy">Swiggy</option>
                <option value="toing">Toing (Direct Order)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1.5">Sort Results By</label>
              <select
                value={selectedSort}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSelectedSort(val);
                  debouncedSearch({ selectedSort: val });
                }}
                className="w-full bg-stone-50 border border-stone-300 text-stone-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
              >
                <option value="relevance">Best AI Relevance</option>
                <option value="cheapest">Lowest Final Price</option>
                <option value="rating">Highest Restaurant Rating</option>
                <option value="fastest">Fastest Delivery Time</option>
              </select>
            </div>
          </div>

          {/* Quick Budget Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-[11px] font-bold text-stone-500">Max Budget:</span>
            {[100, 150, 250, 350, 500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  const nextBudget = budgetRupees === amt ? undefined : amt;
                  setBudgetRupees(nextBudget);
                  debouncedSearch({ budgetRupees: nextBudget, clearBudget: nextBudget === undefined });
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  budgetRupees === amt
                    ? 'bg-[#FF5E1E] text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Under ₹{amt}
              </button>
            ))}
            {budgetRupees && (
              <button
                type="button"
                onClick={() => {
                  setBudgetRupees(undefined);
                  debouncedSearch({ clearBudget: true });
                }}
                className="text-[11px] text-stone-400 hover:text-stone-700 underline"
              >
                Clear Budget
              </button>
            )}
          </div>
        </div>

        {/* Popular Presets */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
            Try Example Prompts
          </span>
          <div className="flex flex-wrap gap-2">
            {presetQueries.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  play('search_initiate');
                  setPrompt(q);
                  executeSearch({ prompt: q });
                }}
                className="text-xs bg-stone-100 hover:bg-orange-50 hover:text-[#FF5E1E] hover:border-orange-200 border border-transparent text-stone-700 px-3 py-1.5 rounded-xl transition-all text-left font-medium"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Extracted Intent Strip (Visible demonstration of AI intent parsing) */}
      {extractedIntent && (
        <div className="max-w-4xl mx-auto bg-stone-900 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#FF5E1E]" />
            <span className="font-bold text-stone-300">Understood Intent:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {extractedIntent.foodKeywords.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-orange-300 font-mono">
                🍜 Food: {extractedIntent.foodKeywords.join(' ')}
              </span>
            )}
            {extractedIntent.maxBudgetRupees && (
              <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-emerald-400 font-mono">
                💰 Budget: ≤ ₹{extractedIntent.maxBudgetRupees}
              </span>
            )}
            {extractedIntent.dietary && extractedIntent.dietary !== 'all' && (
              <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-blue-300 font-mono">
                🥗 Diet: {extractedIntent.dietary}
              </span>
            )}
            {extractedIntent.sortBy && (
              <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-amber-300 font-mono">
                ⚡ Sort: {extractedIntent.sortBy}
              </span>
            )}
            {extractedIntent.preferredPlatform && extractedIntent.preferredPlatform !== 'all' && (
              <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-purple-300 font-mono">
                📱 Platform: {extractedIntent.preferredPlatform}
              </span>
            )}
          </div>
          <span className="text-[10px] text-stone-400 font-mono">
            via {aiProvider || 'NLP Pipeline'}
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
          <RefreshCw className="w-8 h-8 text-[#FF5E1E] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-stone-700">
            Scanning 50+ dishes across Zomato, Swiggy &amp; Toing...
          </p>
          <p className="text-xs text-stone-400">
            Extracting intent, calculating integer paise delivery fees &amp; verifying promo coupons.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => executeSearch()}
            className="text-xs font-bold underline text-red-700 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* AI Recommendation Message */}
      {aiAnswer && !loading && (
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-white to-orange-50/40 rounded-3xl p-6 sm:p-8 border border-orange-200 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-orange-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FF5E1E] text-white flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-stone-900 text-base">FoodWise Deal Recommendation</span>
            </div>
            {aiProvider && (
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-medium border border-stone-200">
                {aiProvider}
              </span>
            )}
          </div>
          <div className="text-stone-800 text-sm leading-relaxed whitespace-pre-line font-normal">
            {aiAnswer}
          </div>
        </div>
      )}

      {/* Results Section */}
      {!loading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900">
                Matching Dishes &amp; Multi-Platform Quotes
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Found {results.length} verified listings from full catalogue
              </p>
            </div>

            {results.length > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-sm max-w-xl mx-auto p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF5E1E] flex items-center justify-center mx-auto">
                {activeCity.toLowerCase().includes('bengaluru') || activeCity.toLowerCase().includes('bangalore') ? (
                  <SearchIcon className="w-8 h-8" />
                ) : (
                  <MapPin className="w-8 h-8" />
                )}
              </div>
              {activeCity.toLowerCase().includes('bengaluru') || activeCity.toLowerCase().includes('bangalore') ? (
                <>
                  <h3 className="text-lg font-bold text-stone-900">No matching dishes found</h3>
                  <p className="text-stone-600 text-xs max-w-sm mx-auto leading-relaxed">
                    We couldn&apos;t find any items matching your criteria. Try relaxing your budget filter or searching for popular dishes like <strong>biryani</strong>, <strong>pizza</strong>, <strong>burgers</strong>, <strong>momos</strong>, or <strong>cold coffee</strong>.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={handleClearAll}
                      className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors"
                    >
                      View All Available Dishes
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-stone-900">
                    No verified listings are currently available for {activeCity}.
                  </h3>
                  <p className="text-stone-600 text-xs max-w-sm mx-auto leading-relaxed">
                    The available demo catalogue currently covers Bengaluru. We do not invent unverified restaurants, prices, coupons, or delivery fees for {activeCity.split(',')[0]}.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveCity('Bengaluru, Karnataka')}
                      className="px-5 py-2.5 rounded-xl bg-[#FF5E1E] text-white text-xs font-bold hover:bg-[#E54E12] transition-colors flex items-center gap-1.5 mx-auto shadow-sm"
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
              {results.map((item) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  isSaved={savedItems.some((s) => s.id === item.id)}
                  onToggleSave={onToggleSave}
                  onOpenQuickModal={(it) => {
                    play('modal_open');
                    setModalItem(it);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

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

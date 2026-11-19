import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Scale, ExternalLink, Bookmark, AlertCircle, Info, Zap, MapPin, Sparkles } from 'lucide-react';
import { FoodItem, ComparisonResult, PlatformType } from '../types';
import { fetchFoods, fetchComparison } from '../services/api';
import { formatPaise, formatFeeDisplay } from '../utils/currency';
import { logPlatformRedirect } from '../utils/telemetry';
import { useUserLocation } from '../context/LocationContext';
import { PlatformOrderButton } from '../components/PlatformOrderButton';
import { useSound } from '../context/SoundContext';

interface ComparisonProps {
  savedItems: FoodItem[];
  onToggleSave: (item: FoodItem) => void;
}

export const Comparison: React.FC<ComparisonProps> = ({ savedItems, onToggleSave }) => {
  const { play } = useSound();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedItemId = searchParams.get('item');

  const { activeCity, setActiveCity } = useUserLocation();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Platform coupon inputs
  const [coupons, setCoupons] = useState<Record<PlatformType, string>>({
    zomato: '',
    swiggy: '',
    toing: '',
  });

  const lastLoadedItemRef = useRef<string | null>(null);
  const compAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadInitial();
  }, [activeCity]);

  // Synchronize item selection without duplicate fetch on initial mount
  useEffect(() => {
    if (selectedItemId && foods.length > 0) {
      const match = foods.find((f) => f.id === selectedItemId);
      if (match && lastLoadedItemRef.current !== match.id) {
        setSelectedItem(match);
        loadComparison(match.id);
      }
    }
  }, [selectedItemId, foods]);

  // Clean up in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (compAbortRef.current) {
        compAbortRef.current.abort();
      }
    };
  }, []);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const items = await fetchFoods({ city: activeCity });
      setFoods(items);
      const initial = selectedItemId
        ? items.find((f) => f.id === selectedItemId) || items[0]
        : items[0];
      setSelectedItem(initial || null);
      if (initial) {
        await loadComparison(initial.id);
      } else {
        setComparison(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async (itemId: string, updatedCoupons = coupons) => {
    lastLoadedItemRef.current = itemId;
    if (compAbortRef.current) {
      compAbortRef.current.abort();
    }
    const controller = new AbortController();
    compAbortRef.current = controller;

    try {
      const comp = await fetchComparison(itemId, updatedCoupons, activeCity, controller.signal);
      setComparison(comp);
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.error('Failed to load comparison', err);
    }
  };

  const handleSelectItem = (item: FoodItem) => {
    play('click');
    setSelectedItem(item);
    setSearchParams({ item: item.id });
    loadComparison(item.id, coupons);
  };

  const handleApplyCoupon = (platform: PlatformType, code: string) => {
    play('action_success');
    const updated = { ...coupons, [platform]: code };
    setCoupons(updated);
    if (selectedItem) {
      loadComparison(selectedItem.id, updated);
    }
  };

  const isSaved = selectedItem ? savedItems.some((s) => s.id === selectedItem.id) : false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-[#FF5E1E] text-xs font-bold mb-2">
            <Scale className="w-3.5 h-3.5" />
            <span>Side-by-Side Fee Audit</span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Multi-Platform Price Comparison
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Compare Zomato, Swiggy, and Toing side-by-side with genuine integer paise precision.
          </p>
        </div>

        {/* Dish Selector Dropdown */}
        {foods.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-stone-700 whitespace-nowrap">Choose Dish:</label>
            <select
              value={selectedItem?.id || ''}
              onChange={(e) => {
                const found = foods.find((f) => f.id === e.target.value);
                if (found) handleSelectItem(found);
              }}
              className="bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
            >
              {foods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.name} — {food.restaurantName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Empty State for Location */}
      {!loading && foods.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-sm max-w-xl mx-auto p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF5E1E] flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8" />
          </div>
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
        </div>
      )}

      {/* Selected Dish Overview Card */}
      {selectedItem && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-card flex flex-col md:flex-row items-center gap-6">
          <img
            src={selectedItem.imageUrl}
            alt={selectedItem.name}
            className="w-full md:w-48 h-36 rounded-2xl object-cover shadow-sm"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {selectedItem.category}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-900 text-white">
                {selectedItem.dataProvenance === 'live_verified'
                  ? 'Live Verified'
                  : selectedItem.dataProvenance === 'unknown' || selectedItem.isDemoData === false
                  ? 'Unverified Source'
                  : 'Demo Catalogue'}
              </span>
              <span className="text-xs text-stone-500">• {selectedItem.cuisine}</span>
              <span className="text-xs text-stone-500">• {selectedItem.distanceKm} km away</span>
            </div>
            <h2 className="text-2xl font-bold text-stone-900">{selectedItem.name}</h2>
            <p className="text-xs text-stone-600 line-clamp-2">{selectedItem.description}</p>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button
              onClick={() => onToggleSave(selectedItem)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                isSaved
                  ? 'bg-orange-50 border-[#FF5E1E] text-[#FF5E1E]'
                  : 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Deal Saved' : 'Save Deal'}</span>
            </button>
            <Link
              to="/coupons"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-center bg-stone-900 hover:bg-stone-800 text-white transition-colors"
            >
              Browse Coupons
            </Link>
          </div>
        </div>
      )}

      {/* Recommendation Banner */}
      {comparison && (
        <div
          className={`rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
            comparison.isPriceTie
              ? 'bg-blue-50 border-blue-200'
              : !comparison.isDefinitiveCheapest
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 shadow-md ${
                comparison.isPriceTie
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : !comparison.isDefinitiveCheapest
                  ? 'bg-amber-600 text-white shadow-amber-500/20'
                  : 'bg-emerald-600 text-white shadow-emerald-500/20'
              }`}
            >
              {!comparison.isDefinitiveCheapest ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <Zap className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-extrabold uppercase tracking-wider ${
                    comparison.isCityMismatch
                      ? 'text-amber-900'
                      : comparison.isPriceTie
                      ? 'text-blue-900'
                      : !comparison.isDefinitiveCheapest
                      ? 'text-amber-900'
                      : 'text-emerald-800'
                  }`}
                >
                  {comparison.isCityMismatch
                    ? 'Location Mismatch — Unverified Area'
                    : comparison.isPriceTie
                    ? 'Equal Price Match (Tie)'
                    : !comparison.isDefinitiveCheapest
                    ? 'Provisional Lowest Price (Unverified Fees)'
                    : 'Best Value Recommendation'}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    comparison.isCityMismatch
                      ? 'bg-amber-200 text-amber-900'
                      : comparison.isPriceTie
                      ? 'bg-blue-200 text-blue-900'
                      : !comparison.isDefinitiveCheapest
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {comparison.isCityMismatch
                    ? 'Delivery Unavailable'
                    : comparison.isPriceTie
                    ? 'Identical Price'
                    : !comparison.isDefinitiveCheapest
                    ? `Provisional Savings: up to ${formatPaise(comparison.savingsPaise)}`
                    : `Saves ${formatPaise(comparison.savingsPaise)}`}
                </span>
              </div>
              <p className="text-sm font-bold text-stone-900 mt-0.5">
                {comparison.recommendationReason}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 min-w-[200px]">
            {comparison.cheapestQuote.isAvailable ? (
              <PlatformOrderButton
                platform={comparison.cheapestQuote.platform}
                platformDisplayName={comparison.cheapestQuote.platformDisplayName}
                directOrderUrl={comparison.cheapestQuote.directOrderUrl}
                isCheapest={true}
                size="lg"
                onRedirect={() =>
                  logPlatformRedirect({
                    dishName: selectedItem?.name || comparison.foodItem.name,
                    platform: comparison.cheapestQuote.platform,
                    restaurantId: selectedItem?.restaurantId || comparison.foodItem.restaurantId,
                    restaurantName: selectedItem?.restaurantName || comparison.foodItem.restaurantName,
                    itemId: selectedItem?.id || comparison.foodItem.id,
                    destinationUrl: comparison.cheapestQuote.directOrderUrl,
                    linkType: comparison.cheapestQuote.linkType,
                  })
                }
              />
            ) : (
              <div className="px-5 py-3 rounded-xl bg-stone-200 text-stone-600 text-xs font-bold flex items-center gap-2 cursor-not-allowed whitespace-nowrap">
                <span>Unavailable in {activeCity}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
              <span
                className={`font-semibold ${
                  comparison.isPriceTie
                    ? 'text-blue-800'
                    : !comparison.isDefinitiveCheapest
                    ? 'text-amber-800'
                    : 'text-emerald-800'
                }`}
              >
                {comparison.cheapestQuote.linkTypeLabel || 'Targeted Link'}
              </span>
            </div>
            {comparison.cheapestQuote.platform === 'toing' && (
              <span
                className={`text-[11px] font-medium text-right ${
                  !comparison.isDefinitiveCheapest ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                Toing listing link unavailable. Open Toing and search for this dish manually.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Side by Side Comparison Grid */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {comparison.foodItem.quotes.map((quote) => {
            const isCheapest = quote.platform === comparison.cheapestQuote.platform;
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
                  className="p-6 border-b border-stone-100 flex items-center justify-between"
                  style={{
                    backgroundColor: isCheapest ? '#FFF7F2' : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm"
                      style={{ backgroundColor: quote.platformColor }}
                    >
                      {quote.platformDisplayName[0]}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-stone-900">
                        {quote.platformDisplayName}
                      </h3>
                      <span className="text-xs text-stone-500 font-medium">
                        {quote.deliveryTimeMinutes && quote.deliveryTimeMinutes > 0
                          ? `⏱️ ~${quote.deliveryTimeMinutes} mins delivery`
                          : '⏱️ Est. delivery time unknown'}
                      </span>
                    </div>
                  </div>

                  {isCheapest && (
                    <span
                      className={`px-3 py-1 rounded-full text-white text-[11px] font-extrabold uppercase tracking-wide ${
                        comparison.isPriceTie
                          ? 'bg-blue-600'
                          : quote.hasUnknownFees
                          ? 'bg-amber-600'
                          : 'bg-[#FF5E1E]'
                      }`}
                    >
                      {comparison.isPriceTie
                        ? 'Tied Lowest'
                        : quote.hasUnknownFees
                        ? 'Provisional Leader*'
                        : 'Cheapest'}
                    </span>
                  )}
                </div>

                {/* Pricing Breakdown Rows */}
                <div className="p-6 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center text-stone-600 pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">Item Base Price</span>
                      {quote.isUserEnteredPrice ? (
                        <span className="text-[10px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                          User-Entered
                        </span>
                      ) : quote.priceProvenance === 'rule_estimated' ? (
                        <span className="text-[10px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                          Estimated
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-500 font-semibold bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded">
                          Catalogue
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-stone-900 text-sm">
                      {formatPaise(quote.basePricePaise)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-stone-600">
                    <div className="flex items-center gap-1">
                      <span>Restaurant Packaging</span>
                      {quote.packagingFeePaise === null && (
                        <span title="Fee not disclosed until checkout">
                          <Info className="w-3 h-3 text-amber-500" />
                        </span>
                      )}
                    </div>
                    {renderFeePill(quote.packagingFeePaise)}
                  </div>

                  <div className="flex justify-between items-center text-stone-600">
                    <div className="flex items-center gap-1">
                      <span>Delivery Fee</span>
                      <span className="text-[10px] text-stone-400 font-medium">(Distance-Tiered)</span>
                    </div>
                    {renderFeePill(quote.deliveryFeePaise)}
                  </div>

                  <div className="flex justify-between items-center text-stone-600">
                    <div className="flex items-center gap-1">
                      <span>Platform Service Fee</span>
                      {quote.platformFeePaise === 0 && (
                        <span className="text-[10px] text-emerald-600 font-bold">(0% Commission)</span>
                      )}
                    </div>
                    {renderFeePill(quote.platformFeePaise)}
                  </div>

                  <div className="flex justify-between items-center text-stone-600">
                    <div className="flex items-center gap-1">
                      <span>GST & Govt Taxes (5%)</span>
                      <span className="text-[10px] text-stone-400 font-medium">(Statutory Est.)</span>
                    </div>
                    {renderFeePill(quote.taxesPaise)}
                  </div>

                  {/* Coupon Application Row */}
                  <div className="pt-2 border-t border-stone-100">
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      Platform Coupon
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder={quote.appliedCoupon?.code || 'Enter promo code...'}
                        value={coupons[quote.platform]}
                        onChange={(e) =>
                          setCoupons({ ...coupons, [quote.platform]: e.target.value })
                        }
                        className="w-full uppercase text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
                      />
                      <button
                        onClick={() => handleApplyCoupon(quote.platform, coupons[quote.platform])}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-[#FF5E1E] text-white text-[11px] font-bold transition-colors"
                      >
                        Apply
                      </button>
                    </div>

                    {quote.couponDiscountPaise > 0 && (
                      <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-emerald-800 text-[11px] font-bold">
                        <span>Coupon ({quote.appliedCoupon?.code})</span>
                        <span>-{formatPaise(quote.couponDiscountPaise)}</span>
                      </div>
                    )}
                  </div>

                  {/* Missing/Unknown fee notice */}
                  {quote.hasUnknownFees && (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>Undisclosed Fees Alert:</span>
                      </div>
                      {quote.unknownFeeLabels.map((lbl, idx) => (
                        <p key={idx} className="text-[10px] pl-4 text-amber-800">
                          • {lbl}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Final Price & Manual Redirect */}
                <div className="p-6 bg-stone-50 border-t border-stone-100">
                  <div className="flex justify-between items-baseline mb-4">
                    <div>
                      <span className="text-xs font-semibold text-stone-500">
                        {quote.hasUnknownFees
                          ? 'Provisional Subtotal'
                          : quote.priceProvenance === 'rule_estimated'
                          ? 'Estimated Subtotal'
                          : 'Confirmed Total'}
                      </span>
                      <span className="block text-[10px] text-stone-400">
                        {quote.hasUnknownFees
                          ? 'Excludes unverified checkout fees'
                          : quote.priceProvenance === 'rule_estimated'
                          ? 'Includes estimated prices'
                          : 'Strict integer paise math'}
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
                    size="lg"
                    onRedirect={() =>
                      logPlatformRedirect({
                        dishName: selectedItem?.name || quote.itemName,
                        platform: quote.platform,
                        restaurantId: selectedItem?.restaurantId || quote.restaurantId,
                        restaurantName: selectedItem?.restaurantName || quote.restaurantName,
                        itemId: selectedItem?.id || quote.itemId,
                        destinationUrl: quote.directOrderUrl,
                        linkType: quote.linkType,
                      })
                    }
                  />

                  {/* Destination Link Classification Badge */}
                  <div className="mt-2 text-center">
                    <span className="inline-block text-[10px] px-2.5 py-0.5 rounded-full bg-stone-200/70 text-stone-700 font-semibold">
                      🔗 {quote.linkTypeLabel || 'Targeted Link'}
                    </span>
                  </div>

                  {quote.platform === 'toing' && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-snug space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>Toing listing link unavailable. Open Toing and search for this dish manually.</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-1 border-t border-amber-200/60 text-[10px] text-stone-600">
                        <a
                          href="https://play.google.com/store/apps/details?id=in.swiggy.android.toing"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-700 hover:text-[#00B159] hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>Android App</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <span>•</span>
                        <a
                          href="https://apps.apple.com/in/app/toing-food-delivery/id6748918399"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-700 hover:text-[#00B159] hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>iOS App</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-center text-stone-400 mt-2">
                    Checkout & payment completed manually by you
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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

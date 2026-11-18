import React, { useState } from 'react';
import {
  Link2,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  Zap,
  TrendingDown,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { CompareByLinkResponse, FoodItem } from '../types';
import { compareByLink } from '../services/api';
import { useUserLocation } from '../context/LocationContext';
import { formatPaise, formatFeeDisplay } from '../utils/currency';
import { logPlatformRedirect } from '../utils/telemetry';

interface CompareByLinkProps {
  onOpenQuickModal?: (item: FoodItem) => void;
  onSaveDeal?: (item: FoodItem) => void;
  isSaved?: (item: FoodItem) => boolean;
}

export const CompareByLink: React.FC<CompareByLinkProps> = ({
  onOpenQuickModal,
  onSaveDeal,
  isSaved,
}) => {
  const { activeCity } = useUserLocation();
  const [url, setUrl] = useState('');
  const [manualFoodName, setManualFoodName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareByLinkResponse | null>(null);

  const sampleLinks = [
    {
      label: 'Zomato Biryani',
      url: 'https://www.zomato.com/bangalore/paradise-biryani?dish=hyderabadi-chicken-dum-biryani',
    },
    {
      label: 'Swiggy Paneer Pizza',
      url: 'https://www.swiggy.com/restaurants/la-pinoz-pizza/spicy-paneer-tikka-makhani-pizza',
    },
    {
      label: 'Toing Cold Coffee',
      url: 'https://www.toingit.com/?dish=cold-coffee',
    },
  ];

  const handleCompare = async (targetUrl?: string, nameFallback?: string, priceFallback?: string) => {
    const inputUrl = (targetUrl !== undefined ? targetUrl : url).trim();
    if (!inputUrl) {
      setError('Please paste a food link from Zomato, Swiggy, or Toing.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await compareByLink(
        inputUrl,
        nameFallback !== undefined ? nameFallback : manualFoodName,
        priceFallback ? parseFloat(priceFallback) : manualPrice ? parseFloat(manualPrice) : undefined,
        activeCity
      );

      setResult(res);

      if (!res.success && res.message) {
        setError(res.message);
      }
    } catch (err: any) {
      console.error('Compare by link error:', err);
      setError(err?.message || 'Unable to analyze link. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setManualFoodName('');
    setManualPrice('');
    setResult(null);
    setError(null);
  };

  const getPlatformMeta = (platform: string) => {
    switch (platform) {
      case 'zomato':
        return { name: 'Zomato', color: '#E23744', bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'swiggy':
        return { name: 'Swiggy', color: '#FC8019', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'toing':
        return { name: 'Toing', color: '#00B159', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      default:
        return { name: 'Other', color: '#78716C', bg: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-gradient-to-br from-white via-white to-orange-50/30 rounded-3xl p-6 sm:p-10 border border-stone-200/90 shadow-card relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-[#FF5E1E] text-xs font-bold mb-3">
            <Link2 className="w-3.5 h-3.5" />
            <span>Direct Food URL Comparison</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
            <span>Compare by Link</span>
          </h2>

          <p className="mt-2 text-stone-600 text-sm sm:text-base leading-relaxed">
            Found a dish on Zomato, Swiggy or Toing? Paste its link and find the same food at a better price.
          </p>

          {/* Supported Platforms Indicators */}
          <div className="flex items-center gap-3 mt-4 pt-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Supported Platforms:
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#E23744]" />
                Zomato
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#FC8019]" />
                Swiggy
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#00B159]" />
                Toing
              </span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCompare();
          }}
          className="mt-6 max-w-3xl"
        >
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-stone-50 rounded-2xl border border-stone-300 p-2 focus-within:ring-2 focus-within:ring-[#FF5E1E]/20 focus-within:border-[#FF5E1E] transition-all gap-2">
            <div className="flex items-center flex-1 pl-2">
              <Link2 className="w-5 h-5 text-stone-400 mr-2 flex-shrink-0" />
              <input
                type="url"
                placeholder="Paste a Zomato, Swiggy or Toing food link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-none font-medium py-1.5"
              />
              {url && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-stone-400 hover:text-stone-700 mr-1"
                  title="Clear link"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-3 rounded-xl bg-[#FF5E1E] hover:bg-[#E54E12] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{loading ? 'Analyzing Link...' : 'Compare Prices'}</span>
            </button>
          </div>

          {/* Quick Presets for User Testing */}
          <div className="flex items-center gap-2 mt-3 flex-wrap text-xs">
            <span className="text-stone-400 font-semibold">Try sample links:</span>
            {sampleLinks.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setUrl(sample.url);
                  handleCompare(sample.url);
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-orange-50 hover:text-[#FF5E1E] border border-stone-200 text-stone-700 font-medium transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="mt-6 max-w-3xl p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Link Comparison Notice</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Fallback Form: Triggered when URL is valid but dish name cannot be auto-extracted */}
        {result?.needsManualInput && (
          <div className="mt-6 max-w-3xl bg-amber-50/80 rounded-2xl p-5 border border-amber-200 text-amber-950 space-y-4">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-900">
                  Manual Details Fallback
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  We confirmed your {result.extraction.sourcePlatform.toUpperCase()} link! To ensure 100% price accuracy, please type the food name below:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold uppercase text-amber-800 block mb-1">
                  Food Dish Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabadi Biryani, Margherita Pizza, Momos..."
                  value={manualFoodName}
                  onChange={(e) => setManualFoodName(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-amber-800 block mb-1">
                  Listed Price (₹ Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCompare(url, manualFoodName, manualPrice)}
              disabled={loading || !manualFoodName.trim()}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-[#FF5E1E] disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Search Across All Platforms</span>
            </button>
          </div>
        )}

        {/* Results Section */}
        {result?.matchedFoodItem && (
          <div className="mt-8 pt-8 border-t border-stone-200 max-w-4xl space-y-6">
            {/* Detection Summary Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-100/70 p-4 rounded-2xl border border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5E1E] text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-stone-900">
                      Detected: {result.extraction.foodName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        getPlatformMeta(result.extraction.sourcePlatform).bg
                      }`}
                    >
                      Source: {getPlatformMeta(result.extraction.sourcePlatform).name}
                    </span>
                    {activeCity && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                        📍 {activeCity}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {result.extraction.originalPriceRupees ? (
                      <>
                        User-entered price: <strong className="text-stone-800">₹{result.extraction.originalPriceRupees}</strong> ({getPlatformMeta(result.extraction.sourcePlatform).name}) •{' '}
                      </>
                    ) : null}
                    Data Source: <strong className="text-stone-700 capitalize">{result.extraction.dataSource.replace('_', ' ')}</strong> (Verified against 50+ DEMO catalogue)
                  </p>
                </div>
              </div>

              {result.savingsPaise && result.savingsPaise > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">
                    Potential Savings
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                    Save {formatPaise(result.savingsPaise)}
                  </span>
                </div>
              )}
            </div>

            {/* Matched Dish Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.matchedFoodItem.quotes.map((quote) => {
                const isCheapest = quote.platform === result.cheapestQuote?.platform;
                const isSource = quote.platform === result.extraction.sourcePlatform;

                return (
                  <div
                    key={quote.platform}
                    className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                      isCheapest
                        ? 'bg-white border-[#FF5E1E] ring-2 ring-[#FF5E1E]/20 shadow-md'
                        : 'bg-white/80 border-stone-200'
                    }`}
                  >
                    <div>
                      {/* Platform header */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: quote.platformColor }}
                          />
                          <span className="font-bold text-stone-900">
                            {quote.platformDisplayName}
                          </span>
                        </div>
                        {isCheapest && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white uppercase tracking-wider ${
                              quote.hasUnknownFees ? 'bg-amber-600' : 'bg-[#FF5E1E]'
                            }`}
                          >
                            {quote.hasUnknownFees ? 'Provisional Lowest*' : 'Lowest Price'}
                          </span>
                        )}
                        {isSource && !isCheapest && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                            Your Link
                          </span>
                        )}
                      </div>

                      {/* Fee Breakdown */}
                      <div className="py-3 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-stone-600">
                          <span>Base Item Price</span>
                          <span className="font-semibold text-stone-900 flex items-center gap-1">
                            {formatPaise(quote.basePricePaise)}
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
                                Demo Catalogue
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-stone-600">
                          <div className="flex items-center gap-1">
                            <span>Delivery Fee</span>
                            <span className="text-[10px] text-stone-400 font-medium">(Distance-Tiered)</span>
                          </div>
                          {renderFeePill(quote.deliveryFeePaise)}
                        </div>

                        <div className="flex justify-between items-center text-stone-600">
                          <span>Platform Fee</span>
                          {renderFeePill(quote.platformFeePaise)}
                        </div>

                        <div className="flex justify-between items-center text-stone-600">
                          <span>Packaging Fee</span>
                          {renderFeePill(quote.packagingFeePaise)}
                        </div>

                        <div className="flex justify-between items-center text-stone-600">
                          <div className="flex items-center gap-1">
                            <span>Taxes (GST 5%)</span>
                            <span className="text-[10px] text-stone-400 font-medium">(Statutory Est.)</span>
                          </div>
                          {renderFeePill(quote.taxesPaise)}
                        </div>

                        {quote.couponDiscountPaise > 0 && (
                          <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                            <span>Coupon ({quote.appliedCoupon?.code})</span>
                            <span className="font-bold">
                              -{formatPaise(quote.couponDiscountPaise)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Final Price & Direct Order Action */}
                    <div className="pt-3 border-t border-stone-100 mt-2">
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <span className="text-xs font-semibold text-stone-500">
                            {quote.hasUnknownFees ? 'Provisional Subtotal' : 'Final Estimated Price'}
                          </span>
                          <span className="block text-[10px] text-stone-400">
                            {quote.hasUnknownFees ? 'Excludes unverified checkout fees' : 'Strict integer paise math'}
                          </span>
                        </div>
                        <span className="text-xl font-extrabold text-stone-900">
                          {formatPaise(quote.finalPricePaise)}
                        </span>
                      </div>

                      <a
                        href={quote.directOrderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          logPlatformRedirect({
                            dishName:
                              result?.matchedFoodItem?.name ||
                              quote.itemName ||
                              result?.extraction.foodName ||
                              'Dish',
                            platform: quote.platform,
                            restaurantId:
                              result?.matchedFoodItem?.restaurantId || quote.restaurantId,
                            restaurantName:
                              result?.matchedFoodItem?.restaurantName || quote.restaurantName,
                            itemId: result?.matchedFoodItem?.id || quote.itemId,
                            destinationUrl: quote.directOrderUrl,
                            linkType: quote.linkType,
                          })
                        }
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                          isCheapest
                            ? 'bg-[#FF5E1E] hover:bg-[#E54E12] text-white shadow-sm'
                            : 'bg-stone-900 hover:bg-stone-800 text-white'
                        }`}
                      >
                        <span>{quote.platform === 'toing' ? 'Open Toing (Official Site)' : `Order on ${quote.platformDisplayName}`}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <div className="mt-1.5 text-center">
                        <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-700 font-semibold">
                          🔗 {quote.linkTypeLabel || 'Targeted Link'}
                        </span>
                      </div>

                      {quote.platform === 'toing' && (
                        <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[10px] text-amber-900 leading-snug space-y-1">
                          <div className="flex items-start gap-1">
                            <Info className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span>Toing listing link unavailable. Open Toing and search for this dish manually.</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-1 border-t border-amber-200/50 text-[9px] text-stone-600">
                            <a
                              href="https://play.google.com/store/apps/details?id=in.swiggy.android.toing"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-[#00B159] hover:underline font-semibold flex items-center gap-0.5"
                            >
                              <span>Android</span>
                              <ExternalLink className="w-2 h-2" />
                            </a>
                            <span>•</span>
                            <a
                              href="https://apps.apple.com/in/app/toing-food-delivery/id6748918399"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-[#00B159] hover:underline font-semibold flex items-center gap-0.5"
                            >
                              <span>iOS</span>
                              <ExternalLink className="w-2 h-2" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Info className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  All orders are verified and completed manually by you on the merchant platform.
                </span>
              </div>

              {onOpenQuickModal && (
                <button
                  type="button"
                  onClick={() => onOpenQuickModal(result.matchedFoodItem!)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors"
                >
                  Full Fee Audit Matrix
                </button>
              )}
            </div>
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
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
        Unknown
      </span>
    );
  }
  if (display.isFree) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
        FREE
      </span>
    );
  }
  return <span className="font-semibold text-stone-900">{display.text}</span>;
}

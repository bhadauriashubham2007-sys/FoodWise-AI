import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Bookmark, ArrowRight, Zap } from 'lucide-react';
import { FoodItem } from '../types';
import { formatPaise } from '../utils/currency';

interface FoodCardProps {
  item: FoodItem;
  isSaved?: boolean;
  onToggleSave?: (item: FoodItem) => void;
  onOpenQuickModal?: (item: FoodItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  item,
  isSaved = false,
  onToggleSave,
  onOpenQuickModal,
}) => {
  // Sort quotes to find cheapest
  const quotes = [...item.quotes].sort((a, b) => a.finalPricePaise - b.finalPricePaise);
  const cheapest = quotes[0];
  const mostExpensive = quotes[quotes.length - 1];
  const savingsPaise = Math.max(0, mostExpensive.finalPricePaise - cheapest.finalPricePaise);
  const isPriceTie = quotes.length > 1 && quotes[1].finalPricePaise === cheapest.finalPricePaise;

  const platformBadgeColors: Record<string, string> = {
    zomato: 'bg-red-50 text-red-700 border-red-200',
    swiggy: 'bg-orange-50 text-orange-700 border-orange-200',
    toing: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-card hover:shadow-xl transition-all duration-300 flex flex-col group">
      {/* Image & Quick Badges */}
      <div className="relative h-48 w-full overflow-hidden bg-stone-100">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Dietary, Category and Provenance Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center bg-white shadow-sm ${
              item.dietary === 'veg' ? 'border-emerald-600' : 'border-red-600'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                item.dietary === 'veg' ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-900/80 text-white backdrop-blur-sm">
            {item.category}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-900/80 text-stone-200 border border-stone-600 backdrop-blur-sm">
            {item.dataProvenance === 'live_verified'
              ? 'Live Verified'
              : item.dataProvenance === 'unknown' || item.isDemoData === false
              ? 'Unverified Source'
              : 'Demo Catalogue'}
          </span>
        </div>

        {/* Save Bookmark button */}
        {onToggleSave && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleSave(item);
            }}
            aria-label={isSaved ? 'Remove from saved' : 'Save deal'}
            className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all ${
              isSaved
                ? 'bg-[#FF5E1E] text-white shadow-md'
                : 'bg-white/80 text-stone-700 hover:bg-white hover:text-[#FF5E1E]'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Restaurant Name & Rating Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <span className="font-semibold text-sm drop-shadow-md truncate">{item.restaurantName}</span>
          <div className="flex items-center gap-1 bg-stone-900/80 px-2 py-0.5 rounded-lg text-xs font-bold backdrop-blur-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{item.restaurantRating}</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-stone-600 mb-1.5">
            <span>{item.cuisine}</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              <span>{item.distanceKm} km away</span>
            </div>
          </div>

          <h3 className="font-bold text-lg text-stone-900 group-hover:text-[#FF5E1E] transition-colors line-clamp-1">
            {item.name}
          </h3>

          <p className="text-stone-600 text-xs mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Multi-Platform Price Grid */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Platform Price Comparison</span>
            {savingsPaise > 0 && (
              <span
                className={`font-bold px-2 py-0.5 rounded-full border text-[10px] ${
                  cheapest.hasUnknownFees
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}
              >
                {cheapest.hasUnknownFees ? 'Provisional ' : ''}Save up to {formatPaise(savingsPaise)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {quotes.map((q) => {
              const isBest = q.platform === cheapest.platform;
              return (
                <div
                  key={q.platform}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    isBest
                      ? isPriceTie
                        ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/30'
                        : q.hasUnknownFees
                        ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-400/30'
                        : 'bg-orange-50/80 border-[#FF5E1E] ring-1 ring-[#FF5E1E]/30'
                      : platformBadgeColors[q.platform] || 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                    <span>{q.platformDisplayName}</span>
                    {isBest && !q.hasUnknownFees && !isPriceTie && (
                      <Zap className="w-3 h-3 text-[#FF5E1E] fill-[#FF5E1E]" />
                    )}
                  </div>
                  <div className="font-extrabold text-stone-900 text-sm mt-0.5">
                    {formatPaise(q.finalPricePaise)}
                  </div>
                  {q.isUserEnteredPrice ? (
                    <div className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded mt-0.5 inline-block">
                      User Price
                    </div>
                  ) : q.priceProvenance === 'rule_estimated' ? (
                    <div className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded mt-0.5 inline-block">
                      Estimated
                    </div>
                  ) : isBest ? (
                    <div
                      className={`text-[9px] font-extrabold uppercase tracking-wider ${
                        isPriceTie
                          ? 'text-blue-700'
                          : q.hasUnknownFees
                          ? 'text-amber-700'
                          : 'text-[#FF5E1E]'
                      }`}
                    >
                      {isPriceTie
                        ? 'Tied Lowest'
                        : q.hasUnknownFees
                        ? 'Provisional*'
                        : 'Lowest'}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-3 flex items-center gap-2">
            <Link
              to={`/compare?item=${item.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-[#FF5E1E] text-white text-xs font-bold transition-all duration-200 group/btn"
            >
              <span>Compare Breakdown</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>

            {onOpenQuickModal && (
              <button
                onClick={() => onOpenQuickModal(item)}
                className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors"
                title="Quick Fee Inspector"
              >
                Inspect Fees
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

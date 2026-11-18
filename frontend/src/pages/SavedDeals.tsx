import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Trash2,
  ArrowRight,
  TrendingDown,
  ExternalLink,
  Cloud,
  LogIn,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { FoodItem } from '../types';
import { formatPaise } from '../utils/currency';
import { logPlatformRedirect } from '../utils/telemetry';
import { useAuth } from '../context/AuthContext';
import { handleOpenPlatformLink } from '../utils/deepLink';

interface SavedDealsProps {
  savedItems: FoodItem[];
  onRemoveSave: (item: FoodItem) => void;
  onClearAll: () => void;
  isLoading?: boolean;
  migrationWarning?: string | null;
  onRetryMigration?: () => void;
  isRetryingMigration?: boolean;
}

export const SavedDeals: React.FC<SavedDealsProps> = ({
  savedItems,
  onRemoveSave,
  onClearAll,
  isLoading = false,
  migrationWarning,
  onRetryMigration,
  isRetryingMigration = false,
}) => {
  const { user, openAuthModal } = useAuth();

  const totalSavingsPaise = savedItems.reduce(
    (sum, item) => sum + (item.maxSavingsPaise || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-100 text-[#FF5E1E] text-xs font-bold mb-2">
            <Bookmark className="w-3.5 h-3.5 fill-[#FF5E1E]" />
            <span>Personal Bookmarks</span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Saved Food Deals
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Keep track of favorite dishes and check for price drops before ordering.
          </p>
        </div>

        {savedItems.length > 0 && (
          <button
            onClick={onClearAll}
            className="self-start sm:self-auto text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-xl transition-colors"
          >
            Clear All Saved
          </button>
        )}
      </div>

      {/* Sync Status Banner */}
      {user ? (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">
              Cloud Bookmarks: Synced with your account ({user.email})
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Supabase Protected
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong className="font-bold">Guest Mode:</strong> Deals saved only in this browser session. Sign in to sync across devices.
            </span>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('signin')}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-[#FF5E1E] text-white text-[11px] font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In to Sync</span>
          </button>
        </div>
      )}

      {/* Migration Warning Banner */}
      {migrationWarning && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-extrabold text-amber-900">Partial Cloud Bookmark Migration</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">{migrationWarning}</p>
            </div>
          </div>
          {onRetryMigration && (
            <button
              type="button"
              onClick={onRetryMigration}
              disabled={isRetryingMigration}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-stone-900 hover:bg-[#FF5E1E] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetryingMigration ? 'animate-spin' : ''}`} />
              <span>{isRetryingMigration ? 'Retrying Sync...' : 'Retry Cloud Sync'}</span>
            </button>
          )}
        </div>
      )}

      {/* Savings Summary Banner */}
      {savedItems.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-[#FF5E1E] text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-orange-100 tracking-wider">
                Potential Combined Savings
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold">
                {formatPaise(totalSavingsPaise)}
              </div>
            </div>
          </div>
          <p className="text-xs text-orange-100 max-w-xs text-center sm:text-right">
            By choosing the cheapest platform for each saved item rather than the highest.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 text-sm font-semibold text-stone-500 animate-pulse">
          Loading saved deals from cloud...
        </div>
      )}

      {/* Deals List */}
      {!isLoading && savedItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">No Saved Deals Yet</h3>
          <p className="text-stone-500 text-xs max-w-sm mx-auto">
            Browse our multi-platform catalog and click the bookmark icon on any dish to save it here for fast comparisons.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-[#FF5E1E] text-white text-xs font-bold transition-colors"
            >
              <span>Explore Popular Dishes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedItems.map((item) => {
            const sortedQuotes = [...item.quotes].sort(
              (a, b) => a.finalPricePaise - b.finalPricePaise
            );
            const cheapest = sortedQuotes[0] || {
              platformDisplayName: 'Best Price',
              finalPricePaise: item.cheapestPricePaise || 0,
              directOrderUrl: '#',
              platform: 'zomato',
              linkType: 'exact_dish',
              linkTypeLabel: 'Direct Link',
            };

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-stone-100">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => onRemoveSave(item)}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-white/80 hover:bg-white text-stone-700 hover:text-red-600 transition-colors shadow-sm"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-3 left-3 bg-stone-900/80 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-lg backdrop-blur-sm">
                      {item.restaurantName}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-base text-stone-900 line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {item.cuisine} • {item.distanceKm} km
                    </p>

                    <div className="mt-4 p-3 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#FF5E1E] block">
                          Lowest on {cheapest.platformDisplayName}
                        </span>
                        <span className="text-lg font-extrabold text-stone-900">
                          {formatPaise(cheapest.finalPricePaise)}
                        </span>
                      </div>
                      {item.maxSavingsPaise !== undefined && item.maxSavingsPaise > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-stone-500 block">Saves</span>
                          <span className="text-xs font-bold text-emerald-700">
                            +{formatPaise(item.maxSavingsPaise)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center gap-2">
                  <Link
                    to={`/compare?item=${item.id}`}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-[#FF5E1E] text-white text-xs font-bold text-center transition-colors"
                  >
                    View Comparison
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenPlatformLink(
                        cheapest.directOrderUrl,
                        cheapest.platform,
                        'app',
                        () =>
                          logPlatformRedirect({
                            dishName: item.name,
                            platform: cheapest.platform,
                            restaurantId: item.restaurantId,
                            restaurantName: item.restaurantName,
                            itemId: item.id,
                            destinationUrl: cheapest.directOrderUrl,
                            linkType: cheapest.linkType,
                          })
                      )
                    }
                    className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors"
                    title={`Open ${cheapest.platformDisplayName} (${cheapest.linkTypeLabel || 'Direct Link'})`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

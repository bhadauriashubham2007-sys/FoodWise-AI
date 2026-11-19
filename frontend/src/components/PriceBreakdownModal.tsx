import React from 'react';
import { X, ExternalLink, AlertCircle, Info } from 'lucide-react';
import { FoodItem, PlatformPriceQuote } from '../types';
import { formatPaise, formatFeeDisplay } from '../utils/currency';
import { logPlatformRedirect } from '../utils/telemetry';
import { PlatformOrderButton } from './PlatformOrderButton';
import { useSound } from '../context/SoundContext';

interface PriceBreakdownModalProps {
  item: FoodItem | null;
  onClose: () => void;
}

export const PriceBreakdownModal: React.FC<PriceBreakdownModalProps> = ({ item, onClose }) => {
  const { play } = useSound();
  if (!item) return null;

  const handleClose = () => {
    play('modal_close');
    onClose();
  };

  const sortedQuotes = [...item.quotes].sort((a, b) => a.finalPricePaise - b.finalPricePaise);
  const cheapestPlatform = sortedQuotes[0]?.platform;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-stone-300 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 flex items-start justify-between bg-white rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
              <span>{item.restaurantName}</span>
              <span>•</span>
              <span>{item.cuisine}</span>
            </div>
            <h2 className="text-xl font-extrabold text-stone-900">{item.name}</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {item.dataProvenance === 'live_verified'
                ? 'Live Platform Fee Audit'
                : item.dataProvenance === 'unknown' || item.isDemoData === false
                ? 'Unverified Source Fee Audit'
                : 'Demo Catalogue Fee Audit'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200/50 flex items-center gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Accuracy Note:</strong> Missing fees are marked as &quot;Unknown&quot; (calculated at platform checkout), never assumed as ₹0.
          </span>
        </div>

        {/* Fee Matrix */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {item.quotes.map((quote: PlatformPriceQuote) => {
              const isCheapest = quote.platform === cheapestPlatform;
              return (
                <div
                  key={quote.platform}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    isCheapest
                      ? 'bg-white border-[#FF5E1E] shadow-md ring-2 ring-[#FF5E1E]/20'
                      : 'bg-white/80 border-stone-200'
                  }`}
                >
                  <div>
                    {/* Platform Title */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: quote.platformColor }}
                        />
                        <span className="font-bold text-stone-900">{quote.platformDisplayName}</span>
                      </div>
                      {isCheapest && (
                        <span
                          className={`text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full uppercase ${
                            item.isPriceTie
                              ? 'bg-blue-600'
                              : quote.hasUnknownFees
                              ? 'bg-amber-600'
                              : 'bg-[#FF5E1E]'
                          }`}
                        >
                          {item.isPriceTie
                            ? 'Tied Lowest'
                            : quote.hasUnknownFees
                            ? 'Provisional Leader*'
                            : 'Best Value'}
                        </span>
                      )}
                    </div>

                    {/* Breakdown Rows */}
                    <div className="py-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-stone-600">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>Base Item Price</span>
                          {quote.isUserEnteredPrice ? (
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                              User-Entered
                            </span>
                          ) : quote.priceProvenance === 'rule_estimated' ? (
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                              Estimated
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-500 font-semibold bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded">
                              Catalogue
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-stone-900">
                          {formatPaise(quote.basePricePaise)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-stone-600">
                        <span>Packaging Fee</span>
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
                        <span>Platform Fee</span>
                        {renderFeePill(quote.platformFeePaise)}
                      </div>

                      <div className="flex justify-between items-center text-stone-600">
                        <div className="flex items-center gap-1">
                          <span>GST Taxes (5%)</span>
                          <span className="text-[10px] text-stone-400 font-medium">(Statutory Est.)</span>
                        </div>
                        {renderFeePill(quote.taxesPaise)}
                      </div>

                      {quote.couponDiscountPaise > 0 && (
                        <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                          <span>Coupon ({quote.appliedCoupon?.code})</span>
                          <span className="font-bold">-{formatPaise(quote.couponDiscountPaise)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total & Link */}
                  <div className="pt-3 border-t border-stone-100 mt-2">
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <span className="text-xs font-semibold text-stone-500">
                          {quote.hasUnknownFees ? 'Provisional Subtotal' : 'Estimated Total'}
                        </span>
                        {quote.hasUnknownFees && (
                          <span className="block text-[10px] text-amber-700 italic">
                            + unknown fees may apply
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-extrabold text-stone-900">
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
                          dishName: item.name,
                          platform: quote.platform,
                          restaurantId: item.restaurantId,
                          restaurantName: item.restaurantName,
                          itemId: item.id,
                          destinationUrl: quote.directOrderUrl,
                          linkType: quote.linkType,
                        })
                      }
                    />

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
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-stone-100/70 border-t border-stone-200 text-center text-xs text-stone-500 rounded-b-3xl">
          FoodWise AI does not process payments. Orders and coupon redemptions are confirmed on each platform.
        </div>
      </div>
    </div>
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

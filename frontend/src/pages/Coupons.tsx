import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Copy, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { CouponGroup, PlatformType } from '../types';
import { fetchCoupons } from '../services/api';
import { formatPaise } from '../utils/currency';

export const Coupons: React.FC = () => {
  const [couponGroups, setCouponGroups] = useState<CouponGroup[]>([]);
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons()
      .then((data) => setCouponGroups(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const allCoupons = couponGroups.flatMap((group) =>
    group.coupons.map((c) => ({ ...c, platform: group.platform }))
  );

  const filteredCoupons =
    activePlatform === 'all'
      ? allCoupons
      : allCoupons.filter((c) => c.platform === activePlatform);

  const platformMeta: Record<
    PlatformType,
    { name: string; color: string; badgeClass: string }
  > = {
    zomato: {
      name: 'Zomato',
      color: '#E23744',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
    },
    swiggy: {
      name: 'Swiggy',
      color: '#FC8019',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    toing: {
      name: 'Toing',
      color: '#00B159',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-100 text-[#FF5E1E] text-xs font-bold mb-3">
          <Ticket className="w-3.5 h-3.5" />
          <span>Verified Platform Promotions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          Coupons &amp; Exclusive Deals
        </h1>
        <p className="mt-2 text-stone-600 text-sm">
          Discover working promo codes for Zomato, Swiggy, and Toing. Copy any code with one click and test live discounts in our comparison engine.
        </p>
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setActivePlatform('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePlatform === 'all'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
          }`}
        >
          All Platforms ({allCoupons.length})
        </button>
        {(['zomato', 'swiggy', 'toing'] as PlatformType[]).map((p) => {
          const meta = platformMeta[p];
          const count = allCoupons.filter((c) => c.platform === p).length;
          return (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activePlatform === p
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
              <span>{meta.name}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Coupons List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-3xl h-60 animate-pulse border border-stone-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoupons.map((coupon) => {
            const meta = platformMeta[coupon.platform as PlatformType];
            const isCopied = copiedCode === coupon.code;
            return (
              <div
                key={coupon.id}
                className="bg-white rounded-3xl border border-stone-200 shadow-card hover:shadow-lg transition-all p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Platform & Discount Type Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}
                    >
                      {meta.name}
                    </span>
                    <span className="text-[11px] font-bold text-stone-500">
                      Min Order {formatPaise(coupon.minOrderPaise)}
                    </span>
                  </div>

                  {/* Coupon Code Pill */}
                  <div className="bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl p-3 flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                        Promo Code
                      </span>
                      <span className="text-base font-extrabold text-stone-900 tracking-wider">
                        {coupon.code}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(coupon.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-900 hover:bg-[#FF5E1E] text-white shadow-sm'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm mb-1">{coupon.description}</h3>

                  <ul className="space-y-1 text-xs text-stone-500 mt-2">
                    {coupon.terms.map((t, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-stone-400">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-stone-100 mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Promo
                  </span>
                  <Link
                    to="/compare"
                    className="text-xs font-bold text-[#FF5E1E] hover:underline flex items-center gap-1"
                  >
                    <span>Test Deal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

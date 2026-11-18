import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, ShieldCheck, Heart, Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 mt-20 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF5E1E] flex items-center justify-center text-white font-bold">
                <Utensils className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-2xl text-white tracking-tight">
                Food<span className="text-[#FF5E1E]">Wise</span> AI
              </span>
            </div>
            <p className="text-stone-400 text-sm leading-relaxed">
              Your Food. Your Choice. Always the Best Deal.
              Empowering consumers to make transparent, smart food delivery choices across Zomato, Swiggy, and Toing.
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Never scrapes private endpoints. Transparent open rates.</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-4">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="text-stone-400 hover:text-white transition-colors">
                  Home & Popular Dishes
                </Link>
              </li>
              <li>
                <Link to="/ai-search" className="text-stone-400 hover:text-white transition-colors">
                  AI Food Search Assistant
                </Link>
              </li>
              <li>
                <Link to="/compare" className="text-stone-400 hover:text-white transition-colors">
                  Live Price Comparison
                </Link>
              </li>
              <li>
                <Link to="/coupons" className="text-stone-400 hover:text-white transition-colors">
                  Coupons & Deal Discoveries
                </Link>
              </li>
              <li>
                <Link to="/saved" className="text-stone-400 hover:text-white transition-colors">
                  My Saved Deals
                </Link>
              </li>
            </ul>
          </div>

          {/* Platforms Supported */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-4">Compared Platforms</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between py-1 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E23744]"></span>
                  <span className="text-stone-200">Zomato</span>
                </div>
                <span className="text-xs text-stone-400">Gold Coupons & Distance Surge</span>
              </li>
              <li className="flex items-center justify-between py-1 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FC8019]"></span>
                  <span className="text-stone-200">Swiggy</span>
                </div>
                <span className="text-xs text-stone-400">One Perks & Flat Party Deals</span>
              </li>
              <li className="flex items-center justify-between py-1 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00B159]"></span>
                  <span className="text-stone-200">Toing</span>
                </div>
                <span className="text-xs text-emerald-400">Zero Platform Fee Ordering</span>
              </li>
            </ul>
          </div>

          {/* Architectural Principles */}
          <div className="space-y-3 text-xs text-stone-400 bg-stone-800/40 p-4 rounded-2xl border border-stone-800">
            <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Architectural Principles</span>
            </div>
            <p>
              • <strong>Paise Precision:</strong> All calculations strictly use integer paise (no JavaScript floating point errors).
            </p>
            <p>
              • <strong>Transparent Fees:</strong> Undisclosed fees remain explicitly marked as &quot;Unknown&quot; rather than &quot;₹0&quot;.
            </p>
            <p>
              • <strong>Manual Checkout:</strong> FoodWise does not automate payments or checkout. You confirm and pay securely on the merchant&apos;s site.
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} FoodWise AI. Built with React, Vite, TypeScript, Express & Gemini API.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              Crafted with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for food lovers
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

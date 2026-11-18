import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-50/80 border-b border-amber-200/60 px-4 py-2.5 text-xs text-amber-900">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Demo Architecture Mode:</strong> Data is simulated across Zomato, Swiggy, & Toing. All fees calculated in integer paise.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-amber-800">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Missing platform fees marked as &quot;Unknown&quot; (never 0)
          </span>
          <span className="hidden sm:inline">•</span>
          <span>Manual checkout redirection only</span>
        </div>
      </div>
    </div>
  );
};

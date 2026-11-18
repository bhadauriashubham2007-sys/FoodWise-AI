/**
 * Currency & Fee Utilities for FoodWise AI
 * Strictly handles integer paise and distinct representation of null (unknown) vs 0 (free).
 */

export function formatPaise(paise: number, includeDecimals = false): string {
  if (isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  if (includeDecimals || rupees % 1 !== 0) {
    return `₹${rupees.toFixed(2)}`;
  }
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export interface FeeDisplay {
  text: string;
  isUnknown: boolean;
  isFree: boolean;
  badgeClass: string;
}

export function formatFeeDisplay(feePaise: number | null): FeeDisplay {
  if (feePaise === null || feePaise === undefined) {
    return {
      text: 'Unknown (At checkout)',
      isUnknown: true,
      isFree: false,
      badgeClass: 'text-amber-800 bg-amber-100/80 border border-amber-300 font-medium',
    };
  }

  if (feePaise === 0) {
    return {
      text: 'FREE',
      isUnknown: false,
      isFree: true,
      badgeClass: 'text-emerald-700 bg-emerald-100 border border-emerald-300 font-semibold',
    };
  }

  return {
    text: formatPaise(feePaise),
    isUnknown: false,
    isFree: false,
    badgeClass: 'text-stone-800 font-medium',
  };
}

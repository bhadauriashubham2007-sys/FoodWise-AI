import React from 'react';
import { ExternalLink, Smartphone, Globe } from 'lucide-react';
import { getPlatformLinkDestinations, handleOpenPlatformLink } from '../utils/deepLink';

interface PlatformOrderButtonProps {
  platform: string;
  platformDisplayName: string;
  directOrderUrl: string;
  isCheapest?: boolean;
  onRedirect?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PlatformOrderButton: React.FC<PlatformOrderButtonProps> = ({
  platform,
  platformDisplayName,
  directOrderUrl,
  isCheapest = false,
  onRedirect,
  className = '',
  size = 'md',
}) => {
  const info = getPlatformLinkDestinations(directOrderUrl, platform);
  const isToing = platform === 'toing';

  // Primary action click
  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleOpenPlatformLink(directOrderUrl, platform, 'app', onRedirect);
  };

  // Secondary browser action click
  const handleBrowserClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleOpenPlatformLink(directOrderUrl, platform, 'browser', onRedirect);
  };

  const primaryBtnClass = isCheapest
    ? 'bg-[#FF5E1E] hover:bg-[#E54E12] text-white shadow-sm'
    : 'bg-stone-900 hover:bg-stone-800 text-white';

  const paddingClass =
    size === 'sm' ? 'py-2 px-3 text-xs' : size === 'lg' ? 'py-3 px-5 text-sm' : 'py-2.5 px-3 text-xs';

  if (isToing) {
    return (
      <div className={`w-full ${className}`}>
        <a
          href={directOrderUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onRedirect}
          className={`w-full rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors ${primaryBtnClass} ${paddingClass}`}
        >
          <span>Open Toing (Official Website)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  // If on mobile and supported (Zomato or Swiggy)
  if (info.canOpenInApp) {
    return (
      <div className={`w-full space-y-1.5 ${className}`}>
        <button
          type="button"
          onClick={handlePrimaryClick}
          className={`w-full rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors ${primaryBtnClass} ${paddingClass}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Open in {platformDisplayName} App</span>
        </button>

        <button
          type="button"
          onClick={handleBrowserClick}
          className="w-full py-1 text-[11px] font-semibold text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1 transition-colors"
        >
          <Globe className="w-3 h-3 text-stone-400" />
          <span>Open in Browser</span>
        </button>
      </div>
    );
  }

  // Desktop or fallback
  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={handleBrowserClick}
        className={`w-full rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors ${primaryBtnClass} ${paddingClass}`}
      >
        <span>Order on {platformDisplayName}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Utensils,
  Sparkles,
  Scale,
  Ticket,
  Bookmark,
  User as UserIcon,
  Menu,
  X,
  LogIn,
  LogOut,
  Cloud,
  MapPin,
  ChevronDown,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserLocation } from '../context/LocationContext';
import { useSound } from '../context/SoundContext';

interface NavbarProps {
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ savedCount }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut, openAuthModal } = useAuth();
  const { activeCity, setActiveCity } = useUserLocation();
  const { soundEnabled, setSoundEnabled, testSound } = useSound();
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const locationMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) {
        setLocationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const popularCities = [
    { label: 'Bengaluru, Karnataka', name: 'Bengaluru, Karnataka', tag: 'Demo Catalogue' },
    { label: 'Jaipur, Rajasthan', name: 'Jaipur, Rajasthan' },
    { label: 'Delhi / NCR', name: 'Delhi NCR' },
    { label: 'Mumbai, Maharashtra', name: 'Mumbai, Maharashtra' },
  ];

  const handleCitySelect = async (cityName: string) => {
    await setActiveCity(cityName);
    setLocationDropdownOpen(false);
  };

  const handleCustomCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customCityInput.trim()) {
      await setActiveCity(customCityInput.trim());
      setCustomCityInput('');
      setLocationDropdownOpen(false);
    }
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: Utensils },
    { to: '/ai-search', label: 'AI Food Search', icon: Sparkles, badge: 'AI' },
    { to: '/compare', label: 'Price Comparison', icon: Scale },
    { to: '/coupons', label: 'Coupons & Deals', icon: Ticket },
    { to: '/saved', label: 'Saved Deals', icon: Bookmark, count: savedCount },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const displayName =
    profile?.fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Guest';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF5E1E] to-[#FFA07A] flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
              <Utensils className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-2xl tracking-tight text-stone-900">
                  Food<span className="text-[#FF5E1E]">Wise</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#FF5E1E]/10 text-[#FF5E1E]">
                  AI
                </span>
              </div>
              <p className="text-[11px] font-medium text-stone-500 leading-none">
                Smart Food Price Comparison
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#FF5E1E]' : 'text-stone-500'}`} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FF5E1E] text-white">
                      {link.badge}
                    </span>
                  )}
                  {link.count !== undefined && link.count > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-[#FF5E1E] text-white' : 'bg-stone-200 text-stone-900'
                      }`}
                    >
                      {link.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action / Auth Controls */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Location Selector */}
            <div className="relative" ref={locationMenuRef}>
              <button
                type="button"
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-stone-300 shadow-sm transition-all text-xs font-bold text-stone-800"
                title={`Active Delivery Location: ${activeCity}`}
                aria-label="Select Delivery Location"
              >
                <MapPin className="w-3.5 h-3.5 text-[#FF5E1E] flex-shrink-0" />
                <span className="max-w-[130px] truncate">{activeCity.split(',')[0]}</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {locationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-50">
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider px-2 py-1">
                    Select Delivery City
                  </div>
                  <div className="mt-1 space-y-1">
                    {popularCities.map((c) => {
                      const isSelected = activeCity.toLowerCase().includes(c.name.split(',')[0].toLowerCase());
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleCitySelect(c.name)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                            isSelected
                              ? 'bg-orange-50 text-[#FF5E1E]'
                              : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FF5E1E]' : 'text-stone-400'}`} />
                            <span>{c.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#FF5E1E]" />}
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={handleCustomCitySubmit} className="mt-3 pt-2.5 border-t border-stone-100">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 px-1">
                      Custom City
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. Pune, Kolkata"
                        value={customCityInput}
                        onChange={(e) => setCustomCityInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF5E1E]"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-[#FF5E1E] transition-colors"
                      >
                        Set
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-stone-300 shadow-sm transition-all text-xs font-bold text-stone-800"
                  title={`Signed in as ${user.email}`}
                >
                  <div className="w-6 h-6 rounded-lg bg-[#FF5E1E] text-white flex items-center justify-center text-xs font-extrabold uppercase">
                    {displayName.charAt(0)}
                  </div>
                  <span className="max-w-[120px] truncate">{displayName}</span>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                </Link>
                <button
                  onClick={() => signOut()}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('signin')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold shadow-sm transition-all duration-200"
              >
                <LogIn className="w-3.5 h-3.5 text-[#FF5E1E]" />
                <span>Sign In</span>
              </button>
            )}

            {/* Quick Audio Feedback Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) testSound('action_success');
              }}
              className={`p-2 rounded-xl border transition-all text-xs font-bold flex items-center justify-center ${
                soundEnabled
                  ? 'bg-orange-50 border-orange-200 text-[#FF5E1E] hover:bg-orange-100 shadow-sm'
                  : 'bg-white border-stone-200 text-stone-500 hover:text-stone-800 hover:border-stone-300 shadow-sm'
              }`}
              title={soundEnabled ? 'UI Sound Effects: Enabled (Click to mute)' : 'UI Sound Effects: Disabled (Click to enable)'}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <Link
              to="/ai-search"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5E1E] hover:bg-[#E54E12] text-white text-sm font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask FoodWise AI</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-stone-100 text-stone-800 hover:bg-stone-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#FAF7F2] px-4 pt-3 pb-6 space-y-3">
          {/* Mobile Location Selector */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF5E1E]" />
                <span>Delivery City</span>
              </span>
              <span className="text-xs font-bold text-[#FF5E1E] truncate max-w-[150px]">
                {activeCity}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {popularCities.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    handleCitySelect(c.name);
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center border transition-all ${
                    activeCity.toLowerCase().includes(c.name.split(',')[0].toLowerCase())
                      ? 'bg-orange-50 border-[#FF5E1E] text-[#FF5E1E]'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  {c.label.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium ${
                  active ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-[#FF5E1E]' : 'text-stone-500'}`} />
                  <span>{link.label}</span>
                </div>
                {link.count !== undefined && link.count > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FF5E1E] text-white">
                    {link.count}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Mobile Sound Settings Toggle */}
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-stone-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF5E1E]">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900">Sound Effects</div>
                <div className="text-[10px] text-stone-500">
                  {soundEnabled ? 'Enabled (Web Audio API)' : 'Muted by default (Opt-in)'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) testSound('action_success');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                soundEnabled
                  ? 'bg-[#FF5E1E] text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {soundEnabled ? 'Mute' : 'Enable'}
            </button>
          </div>

          {/* Mobile Auth Button */}
          <div className="pt-2 border-t border-stone-200">
            {user ? (
              <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FF5E1E] text-white flex items-center justify-center text-sm font-bold uppercase">
                    {displayName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">{displayName}</div>
                    <div className="text-xs text-stone-500 truncate max-w-[180px]">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 text-stone-600 hover:text-stone-900"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('signin');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-900 text-white text-sm font-bold"
              >
                <LogIn className="w-4 h-4 text-[#FF5E1E]" />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

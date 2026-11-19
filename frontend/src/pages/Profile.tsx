import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Settings,
  ShieldCheck,
  Database,
  Save,
  CheckCircle2,
  MapPin,
  Cloud,
  Lock,
  LogIn,
  AlertCircle,
  Volume2,
  VolumeX,
  Volume1,
  Play,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserLocation } from '../context/LocationContext';
import { useSound } from '../context/SoundContext';

const DEFAULT_PREFERENCES = {
  name: 'Foodie Friend',
  dietaryPreference: 'all' as const,
  preferredPlatform: 'all' as const,
  city: 'Bengaluru, Karnataka',
  pincode: '',
};

export const Profile: React.FC = () => {
  const { user, profile, token, openAuthModal, isConfigured, updateProfile, loading } = useAuth();
  const { activeCity, setActiveCity } = useUserLocation();
  const { soundEnabled, setSoundEnabled, volume, setVolume, testSound, play } = useSound();

  const [name, setName] = useState(DEFAULT_PREFERENCES.name);
  const [dietaryPreference, setDietaryPreference] = useState<'all' | 'veg' | 'non-veg' | 'egg' | 'vegan'>(
    DEFAULT_PREFERENCES.dietaryPreference
  );
  const [preferredPlatform, setPreferredPlatform] = useState<'all' | 'zomato' | 'swiggy' | 'toing'>(
    DEFAULT_PREFERENCES.preferredPlatform
  );
  const [city, setCity] = useState(activeCity || DEFAULT_PREFERENCES.city);
  const [pincode, setPincode] = useState(DEFAULT_PREFERENCES.pincode);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize state from authoritative cloud profile, auth user metadata, or active city
  useEffect(() => {
    if (user) {
      const authoritativeName =
        profile?.fullName ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        DEFAULT_PREFERENCES.name;

      const authoritativeCity =
        profile?.defaultCity ||
        activeCity ||
        localStorage.getItem('foodwise_active_city') ||
        DEFAULT_PREFERENCES.city;

      setName(authoritativeName);
      setCity(authoritativeCity);
      setDietaryPreference(profile?.dietaryPreference || DEFAULT_PREFERENCES.dietaryPreference);
      setPreferredPlatform(profile?.preferredPlatform || DEFAULT_PREFERENCES.preferredPlatform);
      setPincode(profile?.defaultPincode || DEFAULT_PREFERENCES.pincode);
    } else {
      // Guest Mode: load from localStorage
      try {
        const stored = localStorage.getItem('foodwise_guest_profile');
        const parsed = stored ? JSON.parse(stored) : null;
        setName(parsed?.name || DEFAULT_PREFERENCES.name);
        setCity(parsed?.city || activeCity || DEFAULT_PREFERENCES.city);
        setDietaryPreference(parsed?.dietaryPreference || DEFAULT_PREFERENCES.dietaryPreference);
        setPreferredPlatform(parsed?.preferredPlatform || DEFAULT_PREFERENCES.preferredPlatform);
        setPincode(parsed?.pincode || DEFAULT_PREFERENCES.pincode);
      } catch {
        setName(DEFAULT_PREFERENCES.name);
        setCity(activeCity || DEFAULT_PREFERENCES.city);
      }
    }
  }, [user?.id, profile, activeCity]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccess(null);
    setIsSaving(true);

    try {
      const trimmedName = name.trim();
      const trimmedCity = city.trim() || activeCity;
      const trimmedPincode = pincode.trim();

      // 1. Immediately update shared location state across all pages
      await setActiveCity(trimmedCity);

      if (user && token) {
        // Authenticated: Persist to backend Supabase database
        const updated = await updateProfile({
          fullName: trimmedName || undefined,
          dietaryPreference,
          preferredPlatform,
          defaultCity: trimmedCity,
          defaultPincode: trimmedPincode || undefined,
        });

        // 2. Verify persisted values returned from database response
        if (updated.fullName) setName(updated.fullName);
        if (updated.defaultCity) setCity(updated.defaultCity);
        if (updated.dietaryPreference) setDietaryPreference(updated.dietaryPreference);
        if (updated.preferredPlatform) setPreferredPlatform(updated.preferredPlatform);

        setSavedSuccess('Preferences successfully synced to your cloud account!');
      } else {
        // Guest: Persist to localStorage only
        localStorage.setItem(
          'foodwise_guest_profile',
          JSON.stringify({
            name: trimmedName || DEFAULT_PREFERENCES.name,
            dietaryPreference,
            preferredPlatform,
            city: trimmedCity,
            pincode: trimmedPincode,
          })
        );
        setSavedSuccess('Preferences saved locally in your browser (Guest Mode).');
      }

      play('action_success');
      setTimeout(() => setSavedSuccess(null), 4000);
    } catch (err: any) {
      console.error('[Profile] Save failed:', err);
      setErrorMessage(err.message || 'Failed to save profile preferences.');
      setSavedSuccess(null);
      play('action_error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-100 text-[#FF5E1E] text-xs font-bold mb-2">
          <UserIcon className="w-3.5 h-3.5" />
          <span>Account Preferences</span>
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
          User Profile &amp; Settings
        </h1>
        <p className="text-stone-600 text-sm mt-1">
          Customize your default comparison preferences, location, and platform priority.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-card text-center">
            <div className="w-20 h-20 rounded-full bg-[#FF5E1E] text-white text-3xl font-extrabold flex items-center justify-center mx-auto shadow-md shadow-orange-500/20 mb-4 uppercase">
              {name ? name.charAt(0) : 'U'}
            </div>
            <h3 className="font-extrabold text-lg text-stone-900">{name}</h3>
            <p className="text-xs text-stone-500 flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{city}</span>
            </p>

            <div className="mt-6 pt-6 border-t border-stone-100 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-stone-600">
                <span>Account Mode</span>
                {user ? (
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200 flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-emerald-600" />
                    <span>Cloud Synced</span>
                  </span>
                ) : (
                  <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] border border-amber-200">
                    Guest / Local
                  </span>
                )}
              </div>
              {user?.email && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>Email</span>
                  <span className="font-medium text-stone-900 truncate max-w-[150px]">{user.email}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Dietary Default</span>
                <span className="font-bold text-stone-900 capitalize">{dietaryPreference}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Favored Platform</span>
                <span className="font-bold text-stone-900 capitalize">{preferredPlatform}</span>
              </div>
            </div>
          </div>

          {/* Cloud Account / Guest Mode Status Card */}
          {user ? (
            <div className="bg-emerald-950 text-white rounded-3xl p-6 border border-emerald-800/60 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Cloud className="w-4 h-4" />
                <span>Cloud Account Active</span>
              </div>
              <h4 className="font-bold text-sm text-white">Supabase Cloud Syncing</h4>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Your profile preferences and deal bookmarks are securely persisted in Supabase and isolated by Postgres Row Level Security (RLS).
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-300">
                <Lock className="w-3.5 h-3.5" />
                <span>Protected by Supabase Auth</span>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900 text-white rounded-3xl p-6 border border-stone-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Database className="w-4 h-4" />
                <span>Guest Mode Active</span>
              </div>
              <h4 className="font-bold text-sm text-white">Local Browser Storage</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Your comparison preferences are stored locally in this browser. Sign in or create an account to access them across all your devices.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#FF5E1E] hover:bg-[#E54E12] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Create Account</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preferences Form & Sound Settings */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#FF5E1E]" />
                <span>Delivery &amp; Comparison Preferences</span>
              </h3>
              {loading && (
                <div className="text-xs text-stone-500 animate-pulse">Loading profile...</div>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                    City &amp; Delivery Zone
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                    Default Pincode (Optional)
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    maxLength={6}
                    placeholder="e.g. 560001"
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                  Dietary Filter Default
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: 'all' as const, label: 'All / Any' },
                    { id: 'veg' as const, label: 'Vegetarian' },
                    { id: 'non-veg' as const, label: 'Non-Veg' },
                    { id: 'egg' as const, label: 'Eggitarian' },
                    { id: 'vegan' as const, label: 'Vegan' },
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setDietaryPreference(option.id)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        dietaryPreference === option.id
                          ? 'bg-stone-900 border-stone-900 text-white shadow-sm'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                  Preferred Platform Priority
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'all' as const, label: 'Compare All (Default)' },
                    { id: 'zomato' as const, label: 'Zomato First' },
                    { id: 'swiggy' as const, label: 'Swiggy First' },
                    { id: 'toing' as const, label: 'Toing First (Direct)' },
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setPreferredPlatform(option.id)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        preferredPlatform === option.id
                          ? 'bg-[#FF5E1E] border-[#FF5E1E] text-white shadow-sm'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <ShieldCheck
                    className={`w-4 h-4 ${user ? 'text-emerald-600' : 'text-stone-400'}`}
                  />
                  <span>
                    {user ? 'Changes sync to cloud account' : 'Preferences saved locally on this browser'}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-[#FF5E1E] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{savedSuccess}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>
          </div>

          {/* Sound & Audio Feedback Settings Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF5E1E] shadow-sm">
                  {soundEnabled ? (
                    volume > 0.5 ? <Volume2 className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-stone-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                    <span>Sound Effects &amp; Audio Feedback</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                      Web Audio API
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Subtle, polished SaaS confirmations for button clicks, saved deals, and comparison completions.
                  </p>
                </div>
              </div>

              {/* Master Sound Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={soundEnabled}
                aria-label="Toggle UI sound effects"
                onClick={() => {
                  const nextState = !soundEnabled;
                  setSoundEnabled(nextState);
                  if (nextState) {
                    testSound('action_success');
                  }
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FF5E1E] focus:ring-offset-2 ${
                  soundEnabled ? 'bg-[#FF5E1E]' : 'bg-stone-300'
                }`}
              >
                <span className="sr-only">Enable sound effects</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100 space-y-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">Audio Status</span>
                <span
                  className={`font-bold px-2.5 py-1 rounded-full text-[11px] ${
                    soundEnabled
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {soundEnabled ? 'Enabled' : 'Muted by Default (Opt-in)'}
                </span>
              </div>

              {/* Volume Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span>Feedback Volume</span>
                    <span className="text-stone-400 font-normal">({Math.round(volume * 100)}%)</span>
                  </span>
                  <span className="text-[11px] text-stone-500 font-normal">
                    {volume === 0 ? 'Muted' : volume < 0.4 ? 'Soft' : volume < 0.8 ? 'Balanced' : 'Full'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX
                    className={`w-4 h-4 ${volume === 0 ? 'text-[#FF5E1E]' : 'text-stone-400'}`}
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    disabled={!soundEnabled}
                    onChange={(e) => {
                      const newVol = parseFloat(e.target.value);
                      setVolume(newVol);
                    }}
                    onMouseUp={() => {
                      if (soundEnabled) testSound('click');
                    }}
                    onTouchEnd={() => {
                      if (soundEnabled) testSound('click');
                    }}
                    className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#FF5E1E] disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Sound effects volume"
                  />
                  <Volume2
                    className={`w-4 h-4 ${volume > 0.6 ? 'text-[#FF5E1E]' : 'text-stone-400'}`}
                  />
                </div>
              </div>

              {/* Sound Test / Preview Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Preview Sound Profiles
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Tactile Click', type: 'click' as const },
                    { label: 'Save Deal', type: 'deal_saved' as const },
                    { label: 'Comparison', type: 'comparison_complete' as const },
                    { label: 'Confirmation', type: 'action_success' as const },
                  ].map((sample) => (
                    <button
                      key={sample.type}
                      type="button"
                      onClick={() => testSound(sample.type)}
                      className="px-3 py-2 rounded-xl bg-stone-50 hover:bg-orange-50 hover:border-orange-200 hover:text-[#FF5E1E] border border-stone-200 text-xs font-semibold text-stone-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <p className="text-[11px] text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                Sounds are synthesized directly in your browser using the standard Web Audio API without downloading audio files or tracking audio activity. In accordance with web standards, audio output is initialized only after your first click.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

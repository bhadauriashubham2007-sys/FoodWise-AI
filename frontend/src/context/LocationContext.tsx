import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile, updateUserProfile } from '../services/api';

export const DEFAULT_CITY = 'Bengaluru, Karnataka';

export interface LocationContextValue {
  activeCity: string;
  setActiveCity: (city: string) => Promise<void>;
  isLoadingLocation: boolean;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

function getInitialCity(): string {
  try {
    const cachedActive = localStorage.getItem('foodwise_active_city');
    if (cachedActive && cachedActive.trim()) {
      return cachedActive.trim();
    }
    const guestStored = localStorage.getItem('foodwise_guest_profile');
    if (guestStored) {
      const parsed = JSON.parse(guestStored);
      if (parsed && typeof parsed.city === 'string' && parsed.city.trim()) {
        return parsed.city.trim();
      }
    }
  } catch (err) {
    console.warn('[LocationContext] Failed reading initial location from storage:', err);
  }
  return DEFAULT_CITY;
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [activeCity, setActiveCityState] = useState<string>(getInitialCity);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  // Timestamp tracking to prevent stale asynchronous profile fetches from overwriting a user-selected city
  const userSelectedAtRef = useRef<number>(0);
  const previousUserIdRef = useRef<string | undefined>(undefined);

  // Handle session transitions & cloud profile loading
  useEffect(() => {
    let active = true;
    const fetchStart = Date.now();

    // If switching between different authenticated accounts, reset user selection timestamp
    if (user?.id !== previousUserIdRef.current) {
      previousUserIdRef.current = user?.id;
      userSelectedAtRef.current = 0;
    }

    async function syncCloudLocation() {
      if (user && token) {
        setIsLoadingLocation(true);
        try {
          const profile = await getUserProfile(user.id, token);
          if (active && profile?.defaultCity && profile.defaultCity.trim()) {
            // Only apply if user did not explicitly pick another city in the interim
            if (userSelectedAtRef.current < fetchStart) {
              setActiveCityState(profile.defaultCity.trim());
              try {
                localStorage.setItem('foodwise_active_city', profile.defaultCity.trim());
              } catch {
                // Ignore storage error
              }
            }
          }
        } catch (err) {
          console.warn('[LocationContext] Could not load cloud profile city:', err);
        } finally {
          if (active) {
            setIsLoadingLocation(false);
          }
        }
      } else {
        // User logged out / Guest mode: restore local guest preference
        try {
          const cachedActive = localStorage.getItem('foodwise_active_city');
          const guestProfile = localStorage.getItem('foodwise_guest_profile');
          let fallback = DEFAULT_CITY;
          if (cachedActive && cachedActive.trim()) {
            fallback = cachedActive.trim();
          } else if (guestProfile) {
            const parsed = JSON.parse(guestProfile);
            if (parsed && typeof parsed.city === 'string' && parsed.city.trim()) {
              fallback = parsed.city.trim();
            }
          }
          if (active && userSelectedAtRef.current === 0) {
            setActiveCityState(fallback);
          }
        } catch {
          // Keep current active city
        }
      }
    }

    syncCloudLocation();

    return () => {
      active = false;
    };
  }, [user?.id, token]);

  const setActiveCity = useCallback(
    async (newCity: string) => {
      const trimmed = newCity.trim();
      if (!trimmed) return;

      // Mark this user selection timestamp to protect against race conditions
      userSelectedAtRef.current = Date.now();
      setActiveCityState(trimmed);

      // 1. Immediately cache in localStorage for instant reload availability
      try {
        localStorage.setItem('foodwise_active_city', trimmed);
      } catch (err) {
        console.warn('[LocationContext] Failed to cache active city:', err);
      }

      // 2. Persist to guest profile in localStorage
      try {
        const stored = localStorage.getItem('foodwise_guest_profile');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.city = trimmed;
        localStorage.setItem('foodwise_guest_profile', JSON.stringify(parsed));
      } catch (err) {
        console.warn('[LocationContext] Failed to update guest profile storage:', err);
      }

      // 3. If authenticated, persist to user's cloud profile
      if (user && token) {
        try {
          await updateUserProfile(user.id, { defaultCity: trimmed }, token);
        } catch (err: any) {
          console.warn('[LocationContext] Failed to update cloud profile default city:', err?.message || err);
        }
      }
    },
    [user?.id, token]
  );

  return (
    <LocationContext.Provider
      value={{
        activeCity,
        setActiveCity,
        isLoadingLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export function useUserLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useUserLocation must be used within a LocationProvider');
  }
  return context;
}

export { useUserLocation as useLocationContext };

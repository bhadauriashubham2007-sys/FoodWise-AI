import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Comparison } from './pages/Comparison';
import { Coupons } from './pages/Coupons';
import { SavedDeals } from './pages/SavedDeals';
import { Profile } from './pages/Profile';
import { FoodItem } from './types';
import {
  getSavedDeals,
  saveDeal,
  deleteSavedDeal,
  backendDealToFoodItem,
} from './services/api';

const AppContent: React.FC = () => {
  const { user, token } = useAuth();
  const [savedItems, setSavedItems] = useState<FoodItem[]>(() => {
    try {
      const stored = localStorage.getItem('foodwise_saved_deals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loadingDeals, setLoadingDeals] = useState<boolean>(false);
  const [migrationWarning, setMigrationWarning] = useState<string | null>(null);
  const [isRetryingMigration, setIsRetryingMigration] = useState<boolean>(false);

  /**
   * Safely migrates local guest bookmarks to the authenticated user's cloud account.
   * Tracks success/failure per item:
   * - Only successfully persisted bookmarks are cleared from localStorage.
   * - Failed bookmarks are strictly retained in localStorage so no data is lost.
   * - Returns the list of items that could not be migrated.
   */
  const migrateGuestBookmarks = useCallback(
    async (
      userId: string,
      authToken: string
    ): Promise<{ failed: FoodItem[]; successCount: number }> => {
      let localGuestDeals: FoodItem[] = [];
      try {
        const raw = localStorage.getItem('foodwise_saved_deals');
        if (raw) localGuestDeals = JSON.parse(raw);
      } catch {
        localGuestDeals = [];
      }

      if (!Array.isArray(localGuestDeals) || localGuestDeals.length === 0) {
        setMigrationWarning(null);
        return { failed: [], successCount: 0 };
      }

      const failed: FoodItem[] = [];
      let successCount = 0;

      for (const item of localGuestDeals) {
        const cheapest = item.cheapestPlatform || item.quotes[0]?.platform || 'zomato';
        const price = item.cheapestPricePaise ?? item.quotes[0]?.finalPricePaise ?? 0;
        const savings = item.maxSavingsPaise || 0;
        const directUrl = item.quotes[0]?.directOrderUrl;

        try {
          await saveDeal(
            userId,
            {
              foodItemId: item.id,
              cheapestPlatformCode: cheapest,
              cheapestPricePaise: price,
              maxSavingsPaise: savings,
              directOrderUrl: directUrl,
            },
            authToken
          );
          successCount++;
        } catch (err: any) {
          console.warn(
            `[App] Guest bookmark migration failed for "${item.name}":`,
            err?.message || err
          );
          failed.push(item);
        }
      }

      if (failed.length === 0) {
        // Complete success: safely clear local storage
        localStorage.removeItem('foodwise_saved_deals');
        setMigrationWarning(null);
      } else {
        // Partial or complete failure: preserve ONLY failed items in localStorage
        try {
          localStorage.setItem('foodwise_saved_deals', JSON.stringify(failed));
        } catch (storageErr) {
          console.error('[App] Failed to write back unmigrated bookmarks to localStorage:', storageErr);
        }

        const msg =
          successCount > 0
            ? `${failed.length} local bookmark(s) could not be synced to the cloud (${failed
                .map((f) => f.name)
                .join(', ')}). They remain safely preserved on this device.`
            : `Unable to sync your local bookmarks to your cloud account. They remain safely preserved in this browser.`;
        setMigrationWarning(msg);
      }

      return { failed, successCount };
    },
    []
  );

  // Sync deals when auth state transitions (Guest <-> Cloud User)
  useEffect(() => {
    let active = true;

    async function syncDeals() {
      if (user && token) {
        setLoadingDeals(true);
        try {
          // 1. Attempt migration of any local guest bookmarks
          const { failed } = await migrateGuestBookmarks(user.id, token);

          // 2. Fetch authenticated cloud deals from backend
          const cloudDeals = await getSavedDeals(user.id, token);
          if (active) {
            const mappedCloudItems = cloudDeals.map(backendDealToFoodItem);

            // Merge cloud deals with any unmigrated local items to avoid UI disappearance
            const combined = [...mappedCloudItems];
            for (const f of failed) {
              if (!combined.some((c) => c.id === f.id)) {
                combined.push(f);
              }
            }
            setSavedItems(combined);
          }
        } catch (err: any) {
          console.warn('[App] Could not complete cloud deals sync:', err?.message || err);
        } finally {
          if (active) setLoadingDeals(false);
        }
      } else {
        // User logged out / Guest mode: clear cloud warning and restore from localStorage
        setMigrationWarning(null);
        try {
          const stored = localStorage.getItem('foodwise_saved_deals');
          if (active) {
            setSavedItems(stored ? JSON.parse(stored) : []);
          }
        } catch {
          if (active) setSavedItems([]);
        }
      }
    }

    syncDeals();

    return () => {
      active = false;
    };
  }, [user, token, migrateGuestBookmarks]);

  // Handle manual retry of unmigrated bookmarks
  const handleRetryMigration = async () => {
    if (!user || !token) return;
    setIsRetryingMigration(true);
    try {
      const { failed } = await migrateGuestBookmarks(user.id, token);
      const cloudDeals = await getSavedDeals(user.id, token);
      const mappedCloudItems = cloudDeals.map(backendDealToFoodItem);

      const combined = [...mappedCloudItems];
      for (const f of failed) {
        if (!combined.some((c) => c.id === f.id)) {
          combined.push(f);
        }
      }
      setSavedItems(combined);
    } catch (err: any) {
      console.error('[App] Retry migration failed:', err?.message || err);
    } finally {
      setIsRetryingMigration(false);
    }
  };

  // Persist to localStorage ONLY when operating in Guest Mode
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('foodwise_saved_deals', JSON.stringify(savedItems));
      } catch (e) {
        console.error('Failed to sync saved deals to localStorage', e);
      }
    }
  }, [savedItems, user]);

  const handleToggleSave = async (item: FoodItem) => {
    const existingIndex = savedItems.findIndex((p) => p.id === item.id);

    if (existingIndex >= 0) {
      // Deal already saved: remove it
      const existingItem = savedItems[existingIndex];
      await handleRemoveSave(existingItem);
    } else {
      // Add deal
      if (user && token) {
        try {
          const cheapest = item.cheapestPlatform || item.quotes[0]?.platform || 'zomato';
          const price = item.cheapestPricePaise ?? item.quotes[0]?.finalPricePaise ?? 0;
          const savings = item.maxSavingsPaise || 0;
          const directUrl = item.quotes[0]?.directOrderUrl;

          const saved = await saveDeal(
            user.id,
            {
              foodItemId: item.id,
              cheapestPlatformCode: cheapest,
              cheapestPricePaise: price,
              maxSavingsPaise: savings,
              directOrderUrl: directUrl,
            },
            token
          );

          const itemWithDealId = { ...item, savedDealId: saved.id };
          setSavedItems((prev) => [...prev, itemWithDealId]);
        } catch (err: any) {
          console.error('[App] Failed to save deal to cloud:', err.message);
          // Fallback to in-memory save so user is not blocked
          setSavedItems((prev) => [...prev, item]);
        }
      } else {
        // Guest Mode: save locally
        setSavedItems((prev) => [...prev, item]);
      }
    }
  };

  const handleRemoveSave = async (item: FoodItem) => {
    if (user && token && item.savedDealId) {
      try {
        await deleteSavedDeal(user.id, item.savedDealId, token);
      } catch (err: any) {
        console.error('[App] Failed to delete saved deal from cloud:', err.message);
      }
    }
    // Also remove from failed guest deals if it was lingering in localStorage
    if (user) {
      try {
        const raw = localStorage.getItem('foodwise_saved_deals');
        if (raw) {
          const list: FoodItem[] = JSON.parse(raw);
          const filtered = list.filter((p) => p.id !== item.id);
          if (filtered.length === 0) {
            localStorage.removeItem('foodwise_saved_deals');
            setMigrationWarning(null);
          } else {
            localStorage.setItem('foodwise_saved_deals', JSON.stringify(filtered));
          }
        }
      } catch {}
    }
    setSavedItems((prev) => prev.filter((p) => p.id !== item.id));
  };

  const handleClearAll = async () => {
    if (user && token) {
      for (const item of savedItems) {
        if (item.savedDealId) {
          try {
            await deleteSavedDeal(user.id, item.savedDealId, token);
          } catch {
            // continue
          }
        }
      }
      localStorage.removeItem('foodwise_saved_deals');
      setMigrationWarning(null);
    } else {
      localStorage.removeItem('foodwise_saved_deals');
    }
    setSavedItems([]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] text-stone-900 selection:bg-orange-200 selection:text-orange-950">
      <DisclaimerBanner />
      <Navbar savedCount={savedItems.length} />
      <AuthModal />

      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route
              path="/"
              element={<Home savedItems={savedItems} onToggleSave={handleToggleSave} />}
            />
            <Route
              path="/ai-search"
              element={<Search savedItems={savedItems} onToggleSave={handleToggleSave} />}
            />
            <Route
              path="/compare"
              element={<Comparison savedItems={savedItems} onToggleSave={handleToggleSave} />}
            />
            <Route path="/coupons" element={<Coupons />} />
            <Route
              path="/saved"
              element={
                <SavedDeals
                  savedItems={savedItems}
                  onRemoveSave={handleRemoveSave}
                  onClearAll={handleClearAll}
                  isLoading={loadingDeals}
                  migrationWarning={migrationWarning}
                  onRetryMigration={handleRetryMigration}
                  isRetryingMigration={isRetryingMigration}
                />
              }
            />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <AppContent />
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;

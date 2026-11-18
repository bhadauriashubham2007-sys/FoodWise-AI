import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { UserProfile, ProfileUpdateInput } from '../types';
import { getUserProfile, updateUserProfile } from '../services/api';

export type AuthMode = 'signin' | 'signup';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: AuthError | Error | null; user: User | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  updateProfile: (updates: ProfileUpdateInput) => Promise<UserProfile>;
  authModalOpen: boolean;
  authModalMode: AuthMode;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('signin');

  const fetchProfileForUser = useCallback(
    async (userId: string, accessToken: string): Promise<UserProfile | null> => {
      try {
        const p = await getUserProfile(userId, accessToken);
        if (p) {
          setProfile(p);
          return p;
        }
      } catch (err: any) {
        console.warn('[AuthContext] Failed fetching cloud profile:', err?.message || err);
      }
      return null;
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (mounted) {
          if (!error && data.session) {
            setSession(data.session);
            setUser(data.session.user);
            if (data.session.user && data.session.access_token) {
              await fetchProfileForUser(data.session.user.id, data.session.access_token);
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('[AuthContext] Error checking session:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initSession();

    if (!isSupabaseConfigured) {
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user && currentSession.access_token) {
          await fetchProfileForUser(currentSession.user.id, currentSession.access_token);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!user || !session?.access_token) return null;
    return fetchProfileForUser(user.id, session.access_token);
  };

  const updateProfile = async (updates: ProfileUpdateInput): Promise<UserProfile> => {
    if (!user || !session?.access_token) {
      throw new Error('You must be signed in to update your profile.');
    }

    // 1. Persist to cloud database via API
    const updated = await updateUserProfile(user.id, updates, session.access_token);

    // 2. Synchronize full_name in Supabase auth user_metadata if changed
    if (updates.fullName !== undefined && isSupabaseConfigured) {
      try {
        const { data: authUser, error: authErr } = await supabase.auth.updateUser({
          data: { full_name: updates.fullName },
        });
        if (!authErr && authUser?.user) {
          setUser(authUser.user);
        }
      } catch (err) {
        console.warn('[AuthContext] Auth user metadata sync warning:', err);
      }
    }

    // 3. Immediately set the updated authoritative profile
    setProfile(updated);
    return updated;
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | Error | null }> => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase credentials are not configured in your frontend environment. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to activate cloud accounts, or continue in Guest Mode.'
        ),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user && data.session?.access_token) {
        await fetchProfileForUser(data.user.id, data.session.access_token);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ error: AuthError | Error | null; user: User | null }> => {
    if (!isSupabaseConfigured) {
      return {
        user: null,
        error: new Error(
          'Supabase credentials are not configured in your frontend environment. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to activate cloud accounts, or continue in Guest Mode.'
        ),
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { error, user: null };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        if (data.user && data.session.access_token) {
          await fetchProfileForUser(data.user.id, data.session.access_token);
        }
      }

      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: err, user: null };
    }
  };

  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthContext] Error signing out:', err);
      }
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const openAuthModal = (mode: AuthMode = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const token = session?.access_token || null;

  const value: AuthContextValue = {
    user,
    profile,
    session,
    token,
    loading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

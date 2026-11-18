import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../config/supabase';

export type AuthMode = 'signin' | 'signup';

interface AuthContextValue {
  user: User | null;
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
  authModalOpen: boolean;
  authModalMode: AuthMode;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('signin');

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
      (_event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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
    session,
    token,
    loading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
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

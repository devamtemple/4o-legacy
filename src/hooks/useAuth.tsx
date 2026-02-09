'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser, Session, SupabaseClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function transformUser(supabaseUser: SupabaseUser | null): AuthUser | null {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName: (supabaseUser as unknown as Record<string, Record<string, unknown>>)['user_metadata']?.['display_name'] as string ?? undefined,
  };
}

async function fetchUserWithRole(
  supabase: SupabaseClient,
  session: Session | null,
): Promise<AuthUser | null> {
  const authUser = transformUser(session?.user ?? null);
  if (!authUser) return null;

  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (data?.role) {
      authUser.role = data.role;
    }
  } catch {
    // Profiles query failed — continue without role
  }

  return authUser;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(await fetchUserWithRole(supabase, session));
      } catch {
        // Auth failed — continue as logged out
      } finally {
        setLoading(false);
      }
    })();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      setUser(await fetchUserWithRole(supabase, session));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      try {
        const supabase = createClient();
        if (!supabase) return { error: 'Authentication is not configured' };
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Map Supabase errors to user-friendly messages
          if (
            error.message.includes('Invalid login credentials') ||
            error.message.includes('Invalid email or password')
          ) {
            return { error: 'Invalid email or password' };
          }
          return { error: error.message };
        }

        return { error: null };
      } catch {
        return { error: 'Connection failed, please try again' };
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      try {
        const supabase = createClient();
        if (!supabase) return { error: 'Authentication is not configured' };
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          return { error: error.message };
        }

        return { error: null };
      } catch {
        return { error: 'Connection failed, please try again' };
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      const supabase = createClient();
      if (!supabase) return { error: 'Authentication is not configured' };
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch {
      return { error: 'Connection failed, please try again' };
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

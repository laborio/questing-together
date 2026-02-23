import { useEffect, useState } from 'react';

import { User } from '@supabase/supabase-js';

import { supabase } from '@/src/online/supabase-client';

type UseAnonymousAuthResult = {
  isAuthReady: boolean;
  user: User | null;
  authError: string | null;
};

export function useAnonymousAuth(): UseAnonymousAuthResult {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        setAuthError(error.message);
      }

      if (data.session?.user) {
        setUser(data.session.user);
        setIsAuthReady(true);
        return;
      }

      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (!isMounted) return;

      if (anonError) {
        setAuthError(anonError.message);
        setIsAuthReady(true);
        return;
      }

      setUser(anonData.user ?? null);
      setIsAuthReady(true);
    };

    void hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    isAuthReady,
    user,
    authError,
  };
}

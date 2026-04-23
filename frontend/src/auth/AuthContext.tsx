// src/auth/AuthContext.tsx
import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect } from "react";
import { db_client } from "./client"; // your Supabase client

// Define the shape of our user in context
type AuthUser = {
  email: string;
  userId: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load session on mount
    async function loadSession() {
      try {
        const { data: sessionData, error } = await db_client.auth.getSession();
        if (error) {
          console.error("Failed to get session:", error.message);
          return;
        }

        const supaUser = sessionData?.session?.user;
        if (supaUser?.email && supaUser?.id) {
          setUser({ email: supaUser.email, userId: supaUser.id });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Unexpected error loading session:", err);
      } finally {
        setLoading(false) // finish loading
      }
    }

    loadSession();

    // Listen for auth state changes
    const { data: listener } = db_client.auth.onAuthStateChange((_event, session) => {
      const supaUser = session?.user;
      if (supaUser?.email && supaUser?.id) {
        setUser({ email: supaUser.email, userId: supaUser.id });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  function signOut() {
    db_client.auth.signOut();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

// Custom hook for consuming the auth context
export function useAuth() {
  return useContext(AuthContext);
}
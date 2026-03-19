"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type PerfilUsuario = {
  nome: string;
  email: string;
  perfil: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: PerfilUsuario | null;
  status: AuthStatus;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PerfilUsuario | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setStatus(currentSession ? "authenticated" : "unauthenticated");

    if (currentSession?.user?.id) {
      const { data: perfil } = await supabase
        .from("dim_perfis")
        .select("nome, email, perfil")
        .eq("id", currentSession.user.id)
        .single();
      setProfile(perfil ? { nome: perfil.nome, email: perfil.email, perfil: perfil.perfil } : null);
    } else {
      setProfile(null);
    }
  }, [supabase]);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setStatus(session ? "authenticated" : "unauthenticated");
      if (!session?.user?.id) {
        setProfile(null);
        return;
      }
      supabase
        .from("dim_perfis")
        .select("nome, email, perfil")
        .eq("id", session.user.id)
        .single()
        .then(({ data: perfil }) => {
          setProfile(perfil ? { nome: perfil.nome, email: perfil.email, perfil: perfil.perfil } : null);
        });
    });

    return () => subscription.unsubscribe();
  }, [refresh, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setStatus("unauthenticated");
  }, [supabase.auth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        status,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

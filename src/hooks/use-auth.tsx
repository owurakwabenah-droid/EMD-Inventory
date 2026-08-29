import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type Profile } from "@/lib/supabase";

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: string | null;
  isAdmin: boolean;
  isFinance: boolean;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

function normalizeRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() ?? "";
}

const AuthContext = createContext<AuthValue | null>(null);

async function resolveEmail(identifier: string): Promise<string> {
  const value = identifier.trim();
  if (value.includes("@")) return value;
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .ilike("username", value)
    .maybeSingle();
  if (error || !data?.email) {
    throw new Error("We couldn't find that username. Try your email address instead.");
  }
  return data.email as string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile((data as Profile) ?? null);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const signIn = async (identifier: string, password: string) => {
    const email = await resolveEmail(identifier);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      void supabase.from("login_events").insert({
        user_id: data.user.id,
        identifier,
        login_method: identifier.includes("@") ? "email" : "username",
        user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
      });
      void supabase.from("activity_logs").insert({
        user_id: data.user.id,
        action: "login",
        details: { via: identifier.includes("@") ? "email" : "username" },
      });
    }
  };

  const signOut = async () => {
    const uid = session?.user?.id;
    if (uid) {
      await supabase.from("activity_logs").insert({ user_id: uid, action: "logout", details: {} });
    }
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (!session?.user) return;
    const idleMs = 15 * 60 * 1000;
    let timer: number | undefined;
    const reset = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void signOut();
      }, idleMs);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, reset, { passive: true }));
    reset();
    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, reset));
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthValue>(() => {
    const role = (profile?.role ?? null) as string | null;
    const normalizedRole = normalizeRole(role);
    const isAdmin = ["admin", "main admin", "boison"].includes(normalizedRole);
    const isFinance = ["finance", "financier", "finance manager", "financial"].includes(normalizedRole);

    return {
      session,
      user: session?.user ?? null,
      profile,
      role,
      isAdmin,
      isFinance,
      loading,
      signIn,
      signOut,
    };
  }, [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

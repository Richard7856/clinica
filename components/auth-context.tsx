"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { staffRepo } from "@/lib/repositories";
import type { Staff, StaffRole } from "@/lib/schemas/staff";

// Contexto global de autenticación. Expone:
//   - `user`: Firebase User (o null)
//   - `staff`: doc del staff asociado (trae rol, nombre, etc.)
//   - `role`: shortcut al rol con fallback a custom claim
//   - `signIn` / `signOut`
//
// El rol se lee primero del token (custom claim) y en segunda instancia del
// doc /staff/{uid}. Esto permite que un admin "promueva" a alguien sin
// re-loguear mediante custom claims, y mantiene coherencia con reglas.

type AuthState = {
  user: User | null;
  staff: Staff | null;
  role: StaffRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setStaff(null);
        setRole(null);
        setLoading(false);
        return;
      }
      try {
        const token = await u.getIdTokenResult();
        const claimRole = (token.claims.role as StaffRole | undefined) ?? null;
        const doc = await staffRepo.getById(u.uid);
        setStaff(doc);
        setRole(claimRole ?? doc?.role ?? null);
      } catch (err) {
        console.error("No se pudo leer staff doc", err);
        setStaff(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      staff,
      role,
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      },
      signOut: async () => {
        await fbSignOut(getFirebaseAuth());
      },
    }),
    [user, staff, role, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

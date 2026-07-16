import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Patient } from "./types";

// Contexto de autenticación del CLIENTE.
//
// El reto (huevo-y-gallina de negocio): los pacientes existen en la clínica
// pero nunca han tenido login. Estrategia de ligado:
//   1. El cliente se registra/entra con su email en Firebase Auth.
//   2. Buscamos en `patients` un doc cuyo email coincida → esa es su ficha.
//   3. Si existe, mostramos sus Cisnes reales. Si no, queda como cuenta sin
//      ficha ligada (la clínica puede vincularla luego, o se crea ficha).
//
// Así el cliente que la clínica ya registró (con su email) ve su historial
// al primer login, sin pasos manuales.

interface AuthState {
  user: User | null;
  patient: Patient | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPatient: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

async function findPatientByEmail(email: string): Promise<Patient | null> {
  const snap = await getDocs(
    query(
      collection(db, "patients"),
      where("email", "==", email.toLowerCase().trim()),
      limit(1),
    ),
  );
  const first = snap.docs[0];
  if (!first) return null;
  const d = first.data();
  return {
    id: first.id,
    fullName: (d.fullName as string) ?? "",
    email: (d.email as string) ?? "",
    phone: d.phone as string | undefined,
    qrSlug: (d.qrSlug as string) ?? "",
    points: typeof d.points === "number" ? d.points : 0,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPatient = useCallback(async (u: User | null) => {
    if (!u?.email) {
      setPatient(null);
      return;
    }
    try {
      setPatient(await findPatientByEmail(u.email));
    } catch {
      setPatient(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      await loadPatient(u);
      setLoading(false);
    });
    return unsub;
  }, [loadPatient]);

  const value: AuthState = {
    user,
    patient,
    loading,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    signUp: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    },
    signOut: async () => {
      await fbSignOut(auth);
    },
    refreshPatient: async () => {
      await loadPatient(auth.currentUser);
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

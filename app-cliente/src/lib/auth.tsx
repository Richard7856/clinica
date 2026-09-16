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
  sendPasswordResetEmail,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Patient } from "./types";

export type Role = "admin" | "collaborator" | "client";

export interface StaffInfo {
  uid: string;
  fullName: string;
  role: string; // admin / reception / therapist
}

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
  role: Role; // "admin" si el usuario es staff de la clínica, si no "client"
  staff: StaffInfo | null;
  patient: Patient | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
    banned: Boolean(d.banned),
    storeEnabled: Boolean(d.storeEnabled),
  };
}

// Determina si el usuario es staff de la clínica leyendo /staff/{uid}.
async function findStaff(u: User): Promise<StaffInfo | null> {
  try {
    const snap = await getDoc(doc(db, "staff", u.uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    if (d.active === false) return null;
    return {
      uid: u.uid,
      fullName: (d.fullName as string) ?? "",
      role: (d.role as string) ?? "reception",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPatient = useCallback(async (u: User | null) => {
    if (!u?.email) {
      setPatient(null);
      return;
    }
    try {
      const p = await findPatientByEmail(u.email);
      // Usuario restringido por el admin: se le niega el acceso.
      if (p?.banned) {
        // Sin diálogo: en web no se ve. El cierre de sesión es la señal, y
        // LoginScreen no puede mostrar un toast desde aquí (aún no está montado).
        await fbSignOut(auth);
        setPatient(null);
        return;
      }
      setPatient(p);
    } catch {
      setPatient(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Primero: ¿es staff? Si sí, es admin. Si no, cargamos su ficha.
        const s = await findStaff(u);
        setStaff(s);
        if (s) setPatient(null);
        else await loadPatient(u);
      } else {
        setStaff(null);
        setPatient(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [loadPatient]);

  // Rol: staff con role "admin" → panel admin; cualquier otro staff
  // (collaborator/reception/therapist) → panel colaborador; si no, cliente.
  const role: Role = staff
    ? staff.role === "admin"
      ? "admin"
      : "collaborator"
    : "client";

  const value: AuthState = {
    user,
    role,
    staff,
    patient,
    loading,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    // Registrarse creaba la cuenta pero no la ficha, así que la clienta nueva
    // entraba a un "aún no encontramos tu ficha" y no podía agendar hasta que
    // alguien la diera de alta a mano. Ahora la ficha nace con ella.
    signUp: async (email, password, fullName) => {
      const correo = email.toLowerCase().trim();
      await createUserWithEmailAndPassword(auth, correo, password);

      // Si la clínica ya la tenía registrada con ese correo, se reusa esa
      // ficha (con sus Cisnes) en vez de crear una duplicada.
      const existente = await findPatientByEmail(correo);
      if (existente) return;

      await addDoc(collection(db, "patients"), {
        fullName: fullName.trim(),
        email: correo,
        phone: "",
        points: 0,
        banned: false,
        storeEnabled: false,
        qrSlug: correo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    // Recuperar contraseña: Firebase manda el correo con la liga de cambio.
    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
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

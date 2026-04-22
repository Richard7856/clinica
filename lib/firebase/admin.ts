import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";

// Firebase Admin SDK. Se usa desde server actions y route handlers para:
// - verificar ID tokens de la sesión
// - setear custom claims (rol) al crear staff
// - lecturas privilegiadas en reportes si hiciera falta
//
// Requiere variables FIREBASE_ADMIN_* en env (no NEXT_PUBLIC_). Ver .env.example.

let cachedApp: App | null = null;

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApp();
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK no configurado. Faltan FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY."
    );
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cachedApp;
}

export function getAdminAuth(): AdminAuth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): AdminFirestore {
  return getFirestore(getAdminApp());
}

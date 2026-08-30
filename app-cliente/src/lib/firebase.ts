import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase para la app cliente. Apunta al MISMO proyecto que la clínica web,
// así los Cisnes/recompensas/pacientes son los mismos datos.
//
// Las credenciales NEXT_PUBLIC_FIREBASE_* de la web son públicas (client SDK);
// aquí van vía variables de entorno de Expo (EXPO_PUBLIC_*), que se inyectan
// en build. Se configuran en app-cliente/.env (ver .env.example).

// Respaldo del proyecto de demo (clin-bd81e). La config del CLIENTE de Firebase
// no es secreta: identifica al proyecto y ya viaja dentro del APK y del bundle
// web. La seguridad real vive en firestore.rules y en Auth, no en ocultarla.
// Sirve para que un build sin .env (ej. Vercel) siga funcionando; las variables
// de entorno tienen prioridad si existen.
const FALLBACK = {
  apiKey: "AIzaSyC0f4R3HcNcJaqxchp2rdvt0NfuNfY91no",
  authDomain: "clin-bd81e.firebaseapp.com",
  projectId: "clin-bd81e",
  storageBucket: "clin-bd81e.firebasestorage.app",
  messagingSenderId: "425848684961",
  appId: "1:425848684961:web:53125c46dbab102aeb4be0",
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? FALLBACK.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? FALLBACK.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? FALLBACK.projectId,
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? FALLBACK.storageBucket,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? FALLBACK.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? FALLBACK.appId,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

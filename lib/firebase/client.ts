import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";

// Firebase client SDK singleton. El connect*Emulator se activa solo si
// NEXT_PUBLIC_USE_EMULATORS=1 en dev para no pegarle al proyecto de prod.

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;
let emulatorsBound = false;

const shouldUseEmulators = () =>
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_EMULATORS === "1";

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length ? getApp() : initializeApp(config);
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = getAuth(getFirebaseApp());
  if (shouldUseEmulators() && !emulatorsBound) {
    bindEmulators(cachedAuth);
  }
  return cachedAuth;
}

export function getDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getFirebaseApp());
  if (shouldUseEmulators() && !emulatorsBound) {
    bindEmulators(getFirebaseAuth());
  }
  return cachedDb;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (cachedStorage) return cachedStorage;
  cachedStorage = getStorage(getFirebaseApp());
  if (shouldUseEmulators() && !emulatorsBound) {
    bindEmulators(getFirebaseAuth());
  }
  return cachedStorage;
}

function bindEmulators(auth: Auth) {
  if (emulatorsBound) return;
  const db = getFirestore(getFirebaseApp());
  const storage = getStorage(getFirebaseApp());
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  emulatorsBound = true;
}

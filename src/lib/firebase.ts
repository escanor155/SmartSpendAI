
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const criticalEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
};

let app: FirebaseApp;
let db: Firestore;

const missingVars: string[] = Object.entries(criticalEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn(
    "***********************************************************************************\n" +
    `IMPORTANT: One or more critical Firebase environment variables are missing: ${missingVars.join(', ')}.\n` +
    "Firebase will likely fail to initialize or function correctly.\n" +
    "Please ensure these are correctly set in your .env file (e.g., .env or .env.local), prefixed with NEXT_PUBLIC_, " +
    "and that you have RESTARTED your development server after any changes to the .env file.\n" +
    "For 'auth/configuration-not-found' errors, also ensure that the Email/Password sign-in provider (and any other providers you use) is ENABLED in your Firebase project's Authentication settings (Sign-in method tab).\n" +
    "***********************************************************************************"
  );
  // Assign a non-functional placeholder to satisfy TypeScript and prevent immediate crashes if possible.
  app = { name: "[CONFIG_MISSING_CRITICAL]", options: {}, automaticDataCollectionEnabled: false } as unknown as FirebaseApp;
} else if (!getApps().length) {
  try {
    app = initializeApp({
      apiKey: apiKey,
      authDomain: authDomain,
      projectId: projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  } catch (e) {
    console.error("Firebase initialization failed with explicit error:", e);
    app = { name: "[INITIALIZATION_FAILED]", options: {}, automaticDataCollectionEnabled: false } as unknown as FirebaseApp;
  }
} else {
  app = getApp();
}

let authInstance: Auth;
try {
  if (app && app.name && !app.name.startsWith("[CONFIG_MISSING") && !app.name.startsWith("[INITIALIZATION_FAILED]")) {
    authInstance = getAuth(app);
    db = getFirestore(app); // Initialize Firestore here
  } else {
    console.warn("Firebase app object is not valid (due to missing config or init failure); Auth and Firestore services cannot be initialized. Features requiring Firebase WILL FAIL.");
    authInstance = { currentUser: null, onAuthStateChanged: () => (() => {}) } as unknown as Auth;
    // @ts-ignore - Assigning a placeholder for db to satisfy TypeScript if init fails
    db = { type: '[FIRESTORE_INIT_FAILED]' } as unknown as Firestore;
  }
} catch(e) {
  console.error("Failed to get Firebase Auth or Firestore instance with explicit error:", e);
  authInstance = { currentUser: null, onAuthStateChanged: () => (() => {}) } as unknown as Auth;
  // @ts-ignore
  db = { type: '[FIRESTORE_INIT_FAILED]' } as unknown as Firestore;
}

export { app, authInstance as auth, db };

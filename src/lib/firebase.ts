
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
// import { getFirestore, type Firestore } from "firebase/firestore"; // Will be used later

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey || !authDomain || !projectId) {
  const missingVars: string[] = [];
  if (!apiKey) missingVars.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!authDomain) missingVars.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!projectId) missingVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

  console.warn(
    "***********************************************************************************\n" +
    `IMPORTANT: One or more critical Firebase environment variables are missing: ${missingVars.join(', ')}.\n` +
    "Firebase will likely fail to initialize or function correctly, especially authentication.\n" +
    "Please ensure these are correctly set in your .env file (e.g., .env or .env.local), prefixed with NEXT_PUBLIC_, " +
    "and that you have RESTARTED your development server after any changes to the .env file.\n" +
    "For 'auth/configuration-not-found' errors, also ensure that the Email/Password sign-in provider (and any other providers you use) is ENABLED in your Firebase project's Authentication settings (Sign-in method tab).\n" +
    "***********************************************************************************"
  );
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;

// Check if critical config is present before attempting to initialize.
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  // This console.error will primarily be visible on the server side during build or initial load.
  console.error(
    "CRITICAL ERROR: Firebase configuration (API Key, Auth Domain, or Project ID) is missing from environment variables. " +
    "Firebase initialization cannot proceed reliably. App features requiring Firebase, especially authentication, WILL FAIL. " +
    "Check your .env file and ensure the server was restarted after any changes. Also verify that the .env file is in the project root."
  );
  // Assign a non-functional placeholder to satisfy TypeScript and prevent immediate crashes if possible.
  app = { name: "[CONFIG_MISSING_CRITICAL]", options: {}, automaticDataCollectionEnabled: false } as unknown as FirebaseApp;
} else if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Firebase initialization failed with explicit error:", e);
    // More specific error from initializeApp if it occurs
    app = { name: "[INITIALIZATION_FAILED]", options: {}, automaticDataCollectionEnabled: false } as unknown as FirebaseApp;
  }
} else {
  app = getApp();
}

let authInstance: Auth; // Renamed to avoid conflict with 'auth' import from firebase/auth
try {
  // Attempt to get auth only if app seems to be a valid FirebaseApp (basic check for name)
  // and not one of our placeholders.
  if (app && app.name && !app.name.startsWith("[CONFIG_MISSING") && !app.name.startsWith("[INITIALIZATION_FAILED]")) {
    authInstance = getAuth(app);
  } else {
    console.warn("Firebase app object is not valid (due to missing config or init failure); Auth service cannot be initialized. Authentication will not work.");
    // Provide a minimally functional placeholder to avoid more crashes, though auth will not work.
    // Ensure any methods called on 'auth' elsewhere are robust enough to handle this placeholder.
    authInstance = {
        currentUser: null,
        onAuthStateChanged: () => (() => {}), // no-op unsubscribe
        // Add other methods as no-ops if they are directly called and cause errors, e.g.:
        // signInWithEmailAndPassword: () => Promise.reject(new Error("Auth not initialized")),
        // createUserWithEmailAndPassword: () => Promise.reject(new Error("Auth not initialized")),
        // signOut: () => Promise.reject(new Error("Auth not initialized")),
    } as unknown as Auth;
  }
} catch(e) {
  console.error("Failed to get Firebase Auth instance with explicit error:", e);
  authInstance = { // Provide placeholder
      currentUser: null,
      onAuthStateChanged: () => (() => {}),
  } as unknown as Auth;
}

// const db: Firestore = getFirestore(app); // Will be used later

export { app, authInstance as auth /*, db */ }; // Export renamed authInstance as auth

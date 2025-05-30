
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
// import { getFirestore, type Firestore } from "firebase/firestore"; // Will be used later

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey || !projectId) {
  // This warning will appear in the server console during build/startup,
  // and potentially in the browser console if the file is bundled for the client.
  console.warn(
    "***********************************************************************************\n" +
    "IMPORTANT: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) or Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) " +
    "was not found in environment variables.\n" +
    "Firebase will likely fail to initialize correctly.\n" +
    "Please ensure these are correctly set in your .env file, prefixed with NEXT_PUBLIC_, " +
    "and that you have RESTARTED your development server after any changes to the .env file.\n" +
    "***********************************************************************************"
  );
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
// Attempt to initialize only if critical config seems present.
// The SDK will still throw its own more specific error if keys are present but invalid.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Critical Firebase configuration (API Key or Project ID) is missing. Firebase initialization aborted. App features requiring Firebase will fail.");
  // Assign a non-functional placeholder to satisfy TypeScript and prevent immediate crashes on `getAuth` if possible,
  // though downstream Firebase operations will fail.
  app = { name: "[CONFIG_MISSING]", options: {}, automaticDataCollectionEnabled: false } as unknown as FirebaseApp;
} else if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    app = { name: "[INITIALIZATION_FAILED]", options: {}, automaticDataCollectionEnabled: false } as unknown as FirebaseApp;
  }
} else {
  app = getApp();
}

let auth: Auth;
try {
  // Attempt to get auth only if app seems to be a valid FirebaseApp (basic check for name)
  // and not one of our placeholders.
  if (app && app.name && !app.name.startsWith("[CONFIG_MISSING]") && !app.name.startsWith("[INITIALIZATION_FAILED]")) {
    auth = getAuth(app);
  } else {
    console.warn("Firebase app object is not valid; Auth service cannot be initialized.");
    auth = {} as Auth; // Non-functional placeholder
  }
} catch(e) {
  console.error("Failed to get Firebase Auth instance:", e);
  auth = {} as Auth; // Non-functional placeholder
}

// const db: Firestore = getFirestore(app); // Will be used later

export { app, auth /*, db */ };

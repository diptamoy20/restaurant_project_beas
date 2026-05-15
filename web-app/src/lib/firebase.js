import { initializeApp, getApps } from 'firebase/app';
import {
  FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured =
  Object.values(firebaseConfig).every(Boolean);

let firebaseApp = null;
let firebaseAuth = null;

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');
facebookProvider.setCustomParameters({
  display: 'popup',
});

export function getFirebaseAuth() {
  if (!isFirebaseConfigured) {
    throw new Error('firebase-not-configured');
  }

  firebaseApp = firebaseApp ?? getApps()[0] ?? initializeApp(firebaseConfig);
  firebaseAuth = firebaseAuth ?? getAuth(firebaseApp);

  return firebaseAuth;
}

export async function signOutFromFirebase() {
  if (!isFirebaseConfigured) {
    return;
  }

  await signOut(getFirebaseAuth()).catch(() => {});
}

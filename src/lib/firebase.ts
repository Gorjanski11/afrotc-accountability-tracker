import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// Same Firebase project/database as the TO's site (afrotc-training-tracker) -- this site reads
// the shared `cadets` roster and `pmtEvents` calendar, and owns its own attendance/extraEvents/
// extraEventAttendance collections. One database, not a separate one, so the roster and PMT
// calendar can never drift between sites. Firebase web config is not a secret -- Firebase's
// security model relies on Firestore Security Rules (see firestore.rules), not on hiding this
// object.
const firebaseConfig = {
  apiKey: "AIzaSyB7nortxOkZX0wzLfWZJ4kQh5uePGQRK2k",
  authDomain: "afrotc-traning-tracker.firebaseapp.com",
  projectId: "afrotc-traning-tracker",
  storageBucket: "afrotc-traning-tracker.firebasestorage.app",
  messagingSenderId: "339778762887",
  appId: "1:339778762887:web:5e630efd6004ae6e602022",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// In local dev, talk to the Firebase Local Emulator Suite instead of production so testing never
// touches real cadet data. Start it with `firebase emulators:start` before `npm run dev`.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

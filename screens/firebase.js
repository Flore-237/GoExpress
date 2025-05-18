import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAcoaYf0LIbbQjM0mPo8v0SsFHpPxUAi4w",
  authDomain: "goexpress-18bb5.firebaseapp.com",
  projectId: "goexpress-18bb5",
  storageBucket: "goexpress-18bb5.appspot.com",
  messagingSenderId: "805063861437",
  appId: "1:805063861437:android:da9f68a8a689fe8f4103d4"
};

// Initialise Firebase
const app = initializeApp(firebaseConfig);

// Initialise Firestore et Auth
const db = getFirestore(app);
const auth = getAuth(app);

// Exporte les instances
export { app, db, auth };

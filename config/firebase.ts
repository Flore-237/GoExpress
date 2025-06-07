import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAcoaYf0LIbbQjM0mPo8v0SsFHpPxUAi4w",
  authDomain: "goexpress-18bb5.firebaseapp.com",
  projectId: "goexpress-18bb5",
  storageBucket: "goexpress-18bb5.appspot.com",
  messagingSenderId: "805063861437",
  appId: "1:805063861437:android:7a21a846b7f3768b4103d4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager()
  })
});

const auth = getAuth(app);

export { db, auth };

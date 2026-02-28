import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: 'AIzaSyBY_-r6dEwEASW4G9AKQkfvJCZukUC8dz8',
	authDomain: 'sarisarify-8b925.firebaseapp.com',
	projectId: 'sarisarify-8b925',
	storageBucket: 'sarisarify-8b925.firebasestorage.app',
	messagingSenderId: '264633423483',
	appId: '1:264633423483:web:6a96d050ffa1d8a64c74de'
};

const app = initializeApp(firebaseConfig);

// Firestore with persistent local cache — offline-first, no deprecated enableIndexedDbPersistence()
export const db = initializeFirestore(app, {
	localCache: persistentLocalCache()
});

// Auth with local persistence — user stays signed in across app restarts
export const auth = getAuth(app);
// await setPersistence(auth, browserLocalPersistence);
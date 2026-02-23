import firebase from '@react-native-firebase/app';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import appCheck from '@react-native-firebase/app-check';
import { Platform } from 'react-native';

let initialized = false;

export async function initializeFirebase(): Promise<void> {
  if (initialized) return;

  // App Check: Play Integrity on Android (DeviceCheck on iOS if ever needed).
  // This restricts Firestore access to verified builds of this app only.
  // Users do not interact with this — it is fully transparent.
  const provider =
    Platform.OS === 'android'
      ? appCheck().newReactNativeFirebaseAppCheckProvider()
      : appCheck().newReactNativeFirebaseAppCheckProvider();

  provider.configure({ android: { provider: 'playIntegrity' } });

  await appCheck().initializeAppCheck({
    provider,
    isTokenAutoRefreshEnabled: true,
  });

  // Enable Firestore offline persistence.
  // Firestore will cache all data locally and sync when connectivity returns.
  firestore().settings({ persistence: true });

  initialized = true;
}

export function getFirestore(): FirebaseFirestoreTypes.Module {
  return firestore();
}

// Convenience: typed collection references
export const Collections = {
  products: () => firestore().collection('products'),
  sales: () => firestore().collection('sales'),
  saleItems: () => firestore().collection('saleItems'),
  borrowers: () => firestore().collection('borrowers'),
  borrows: () => firestore().collection('borrows'),
  borrowPayments: () => firestore().collection('borrowPayments'),
} as const;

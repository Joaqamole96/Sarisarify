import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getDatabase } from '@/infrastructure/database';
import { initializeFirebase } from '@/infrastructure/firestore';
import { syncOnBackground, syncOnForeground } from '@/services/syncService';
import RootNavigation from '@/navigation';

export default function App() {
  useEffect(() => {
    // Initialize database and Firebase on first launch
    async function bootstrap() {
      // Runs migrations if needed
      await getDatabase();
      // Sets up App Check + Firestore offline persistence
      await initializeFirebase();
      // Pull any remote changes from other devices
      await syncOnForeground();
    }
    bootstrap();
  }, []);

  useEffect(() => {
    // Sync on app state changes
    let previousState: AppStateStatus = AppState.currentState;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        (previousState === 'active') &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        // App going to background: push local changes to Firestore
        syncOnBackground();
      }

      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextState === 'active'
      ) {
        // App coming to foreground: pull remote changes
        syncOnForeground();
      }

      previousState = nextState;
    });

    return () => subscription.remove();
  }, []);

  return <RootNavigation />;
}

# Sarisarify

Family sari-sari store management app built with Expo (React Native) + TypeScript.

## Setup

### Prerequisites
- Node.js 20+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Android device or emulator

### 1. Install dependencies
```bash
npm install
```

### 2. Firebase setup
1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with package name `com.family.sarisarify`
3. Download `google-services.json` and place it in the project root
4. Enable **Firestore** in the Firebase console
5. Enable **App Check** → Play Integrity for the Android app
6. Deploy Firestore security rules from `firestore.rules`

### 3. Firestore security rules
Deploy the rules in `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```

### 4. Run on Android
```bash
npm run android
```

### 5. Build APK for family distribution
```bash
npm run build:android
```
This uses EAS Build (free tier). The output APK can be installed directly on any Android phone.

## Project Structure

```
src/
  types/          Shared TypeScript interfaces
  infrastructure/ SQLite setup + Firebase client
  repositories/   All database queries (one file per entity group)
  stores/         Zustand state stores
  services/       SyncService (background Firebase sync)
  ml/             Assistant module (Phase 1 rules + Phase 2 LSTM)
  constants/      Icon registry
  navigation/     React Navigation setup
  screens/        UI screens (one folder per tab)
  components/     Shared UI components
```

## Development Order (recommended)
1. `infrastructure/database.ts` — already done, runs migrations
2. `repositories/` — already done, all queries implemented
3. `stores/` — already done, Zustand stores wired up
4. `screens/Sale/` — highest priority, most-used screen
5. `screens/Products/`
6. `screens/Borrows/`
7. `screens/Statistics/`
8. `screens/Assistant/`
9. `ml/phase2/` — after 500 sales of real data

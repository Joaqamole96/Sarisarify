# Sarisarify — Project Documentation

## Overview
A React Native (Expo) mobile app for managing a small family sari-sari store.

**Users:** Owner (self), mother, sister
**Platform:** Android

---

## Features (Specification v1)

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Sales** | Session-based sales with product catalog, quick-add, sum display, cash/borrow confirmation |
| 2 | **Products** | Catalog with add/edit (name, price, frequency)/remove |
| 3 | **Borrows** | Track utang — add (borrower, product, amount), resolve (date paid) |
| 4 | **Statistics** | Daily/weekly/monthly/annual sales stats + sales log |
| 5 | **Assistant** | ML module (Phase 2 — deferred until 500+ sales exist) |

---

## Architecture

### Tech Stack
- React Native 0.76.0 + Expo SDK 52
- TypeScript
- React Navigation (Stack + Bottom Tabs)
- Firebase (Firestore + App Check) via `@react-native-firebase` v20
- SQLite (`expo-sqlite` v14) — local cache/offline
- Zustand — state management
- Phase 2: TensorFlow.js (deferred — removed from dependencies until needed)

### Project Structure
```
Sarisarify/
├── App.tsx                  # Root component
├── index.js                 # Entry point (registerRootComponent)
├── app.json                 # Expo config
├── eas.json                 # EAS Build config
├── android/                 # Generated native Android project (via prebuild)
├── assets/                  # App icons and splash screen
├── src/
│   ├── navigation/          # React Navigation setup
│   ├── screens/             # SaleScreen, ProductsScreen, BorrowsScreen, StatsScreen
│   ├── components/          # Shared UI components
│   ├── stores/              # Zustand stores
│   ├── repositories/        # Data access layer (Firestore + SQLite)
│   ├── services/            # Business logic
│   └── ml/                  # Phase 2 ML stubs (phaseController, phase1/, phase2/)
└── google-services.json     # Firebase Android config (not in source control)
```

### ML Phase System
- **Phase 1 (<500 sales):** Rule-based suggestions (frequency sorting, time-of-day patterns)
- **Phase 2 (≥500 sales):** LSTM model via TensorFlow.js
- `phaseController.ts` gates which phase runs — stubs are wired, TF deps deferred

---

## app.json
```json
{
  "expo": {
    "name": "Sarisarify",
    "slug": "sarisarify",
    "version": "1.0.0",
    "orientation": "portrait",
    "android": {
      "package": "com.family.sarisarify",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": ["@react-native-firebase/app"],
    "newArchEnabled": true
  }
}
```

---

## Key package.json Dependencies

```json
{
  "expo": "~52.0.0",
  "react": "18.3.1",
  "react-native": "0.76.0",
  "@react-native-firebase/app": "^20.5.0",
  "@react-native-firebase/firestore": "^20.5.0",
  "@react-native-firebase/app-check": "^20.5.0",
  "@react-native-async-storage/async-storage": "^2.1.0",
  "expo-sqlite": "~14.0.0",
  "expo-dev-client": "~4.0.17",
  "react-navigation/native": "...",
  "zustand": "..."
}
```

**Removed (incompatible):**
- `@tensorflow/tfjs` + `@tensorflow/tfjs-react-native` — requires async-storage v1, conflicts with v2. Re-add when Phase 2 is ready.
- `react-native-print` — pulled in react-native-windows as peer dep, requires React 19.

---

## android/gradle.properties (key entries)
```
android.suppressKotlinVersionCompatibilityCheck=1.9.24
kotlin.suppressKotlinVersionCompatibilityCheck=1.9.24
```

---

## eas.json
```json
{
  "build": {
    "development": {
      "android": {
        "buildType": "apk",
        "image": "latest",
        "gradleCommand": ":app:assembleDebug -Pandroid.kotlinVersion=1.9.25"
      }
    }
  }
}
```

---

## Session 1 — Scaffold (2026-02-23)

### What was built
Full project scaffold generated including all screens, navigation, stores, repositories, services, and ML stubs.

### Setup problems encountered and resolved

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| `npm install` ERESOLVE: `react@undefined` | Corrupted node_modules from previous install | Delete node_modules + package-lock, reinstall |
| `@tensorflow/tfjs-react-native` peer conflict | Requires async-storage v1, project has v2 | Removed TF packages (deferred to Phase 2) |
| `react-native-print` peer conflict | Pulls react-native-windows requiring React 19 | Removed react-native-print |
| `npx expo install` ESM crash on Firebase | `@react-native-firebase` v20 dir imports incompatible with Node's ESM resolver | Set `NODE_OPTIONS=--no-experimental-require-module` |
| `expo prebuild` PluginError on firebase/sqlite | Wrong packages listed as config plugins | Removed firestore + app-check + sqlite from plugins array; only `@react-native-firebase/app` is valid |
| `expo prebuild` missing asset files | assets/ folder empty | Created placeholder PNGs in assets/ |
| Local `expo run:android` Kotlin 1.9.24 mismatch | System Kotlin != required 1.9.25 | Switched to EAS cloud build |
| Local Gradle cache corruption | `invalid stored block lengths` on .bin files | Switched to EAS cloud build |
| EAS build: wrong expo-dev-client version | EAS resolved v6 (newer SDK), project needs v4 | Pinned `expo-dev-client@~4.0.17` |
| EAS build: Kotlin 1.9.24 on build server | EAS server image has 1.9.24, Compose needs 1.9.25 | **UNRESOLVED — next session** |

### Current status
**BLOCKED** on EAS build server Kotlin version mismatch.

`expo-modules-core:compileDebugKotlin` fails with:
```
This version (1.5.15) of the Compose Compiler requires Kotlin 1.9.25
but you appear to be using Kotlin 1.9.24
```

### Next session — first thing to try
Pin a newer EAS build image in `eas.json`:
```json
"image": "latest"
```
This should give a build server with Kotlin 1.9.25. If `latest` doesn't work, check available images with `eas build:inspect` and pin a specific newer one.

If EAS image doesn't resolve it, alternative: downgrade `expo-modules-core` to a version that uses Compose Compiler 1.5.14 (compatible with Kotlin 1.9.24).

---

## Development Notes

### Install command
Always use `--legacy-peer-deps` for npm installs in this project:
```bash
npm install <package> --legacy-peer-deps
```
Plain `npm install` will fail due to Firebase async-storage optional peer conflict (harmless but breaks resolver).

### Starting the dev server (after APK is installed)
```bash
$env:NODE_OPTIONS="--no-experimental-require-module"
npx expo start --android
```
The NODE_OPTIONS flag is required every terminal session due to Node 20 + Firebase ESM issue.

### Rebuilding native
```bash
npx expo prebuild --platform android --clean
eas build --platform android --profile development
```

### Firebase setup reminder
`google-services.json` must be in project root before prebuild/build. Get it from:
Firebase Console → Project Settings → Your apps → Android → Download config file.

---

## What's NOT yet started
- UI implementation (all screens are stubs)
- Firebase Firestore data model implementation
- SQLite schema and sync logic
- Any actual business logic

The scaffold, navigation structure, and store/repository interfaces exist but contain no real logic yet. **Next milestone after build succeeds: implement SaleScreen.**
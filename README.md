# Sarisarify — Sprint 0 Setup

## Prerequisites
- Node 18+
- Firebase CLI: `npm install -g firebase-tools`

## 5. Test offline (prod build only)

```bash
npm run build
npm run preview
```
Open in Chrome → DevTools → Network → Offline → reload. App must load.

## 6. Deploy

```bash
firebase login
firebase deploy --only hosting,firestore:rules
```

Share the hosting URL with all 3 family members. Open in Chrome → "Add to Home Screen".

## Sprint 0 acceptance criteria checklist

- [X] `npm run dev` runs with no errors
- [X] Tailwind styles apply (green nav visible)
- [X] Sign-in screen appears on first load
- [X] After sign-in, bottom nav with 5 tabs is visible
- [X] App installs to Android home screen from Chrome
- [ ] App loads with network disabled (prod build)
- [ ] Firestore write succeeds online; queues offline and syncs on reconnect
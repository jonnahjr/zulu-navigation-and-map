# Zulu Navigation

A modern React Native (Expo) app for real-time navigation, directions, and location search using free APIs (OpenStreetMap Nominatim for places, Mapbox for directions), with offline support.

## Features
- Interactive map with current location
- Search with autocomplete
- Step-by-step directions (walking, driving, transit)
- Voice guidance
- Bottom tab navigation
- Save favorite places/routes
- Offline storage
- Clean, minimal UI (glassmorphism, dark mode)

## Tech Stack
- React Native + Expo + TypeScript
- Zustand (state), NativeWind (styling), Reanimated (animations)
- OpenStreetMap Nominatim (places), Mapbox Directions API (free tier)
- AsyncStorage

## Setup
1. Install dependencies: `npm install`
2. Obtain a free Mapbox access token (sign up at mapbox.com for free tier).
3. Copy `.env.example` to `.env` and set `MAPBOX_ACCESS_TOKEN=your_token`.
4. Run the app: `npx expo start` (for mobile) or `npm run start:dev` (for web with proxy).

### Web build note
If you run the app on web you may encounter an unresolved internal React Native import for `../Utilities/Platform`. A local shim and webpack alias have been added to work around this for development builds:

- Shim: `src/shims/Platform.web.ts` re-exports Platform from `react-native-web`.
- Webpack alias: `webpack.config.js` maps React Native internal Platform imports to the shim for web.

To run the web build:

```powershell
npx expo start --web
```

If the web build still fails, a fallback is to create a temporary shim at `node_modules/react-native/Libraries/Utilities/Platform.js` that re-exports `react-native-web`'s Platform for the duration of development.

## Folder Structure
- `src/components` — UI components
- `src/screens` — App screens
- `src/navigation` — Navigation setup
- `src/hooks` — Custom hooks
- `src/utils` — Helpers (API, voice, etc.)
- `src/store` — State management
- `src/types` — TypeScript types

---
Replace API keys and adjust features as needed for production.

## Zulu Navigation — Professional Overview

This repository (Zulu Navigation) is a Next-Gen Navigation & Guide scaffold built with Expo + React Native + TypeScript. It focuses on a premium dark UI (glassmorphism + neon accents), high-clarity maps, voice-guidance, offline caching, and an extendable architecture for advanced routing features.

Key design & architecture notes
- Dark-first UI: central `src/components/design/theme.ts` provides color tokens. Use `NeonCard`, `NeonButton`, and `GlowingPin` for consistent glass + neon visuals.
- Platform-aware map: `src/components/MapView.tsx` provides a native map on iOS/Android and a lightweight placeholder on web. Replace the web placeholder with your web mapping provider (Mapbox GL JS or Google Maps JS) for full functionality.
- State & persistence: `src/store/appStore.ts` uses Zustand with AsyncStorage persistence for favorites and saved routes. `src/utils/offlineStorage.ts` provides helpers for export/import.
- Animations: Reanimated (and optional Framer Motion on web) are intended for smooth transitions and animated guidance.

Running (development)
1. Install dependencies:

```powershell
npm install
```

2. Start Expo (choose platform):

```powershell
npx expo start       # dev server + Expo Go
npx expo start --web # web build (development)
```

Notes & caveats
- Web: Some React Native internals require shims when bundling for web. The project includes temporary development shims and a webpack alias (`webpack.config.js`) that map a few internal RN modules to `react-native-web` or local no-op shims. These are intended for development only; remove them when you upgrade to compatible package versions.
- Android 14: A known native permission change (`DETECT_SCREEN_CAPTURE`) in recent Android versions can cause errors during unimodule initialization. We delay some unimodule initialization in `App.tsx` to mitigate this for development. For production/native builds, upgrade Expo SDK / unimodules or patch native modules.
- Native modules: features like `react-native-maps`, `react-native-reanimated`, and `expo-location` may require rebuilding dev clients or EAS builds for full native behavior.

Roadmap / next steps
- Replace web placeholder with Mapbox GL JS (fast, modern web maps) or Google Maps JS.
- Implement offline tile downloads and SQLite routing cache for offline navigation.
- Add AI-powered suggestions server integration for personalized POI scoring.
- Add end-to-end tests and CI configuration.

Contact & contribution
If you're using this scaffold as a starting point, open issues for missing features or PRs for improvements. Keep an eye on the `src/shims/*` files; they are dev fallbacks and should be removed once your dependency tree is aligned with the target SDK.

## Testing web mapping and search (env vars)

To fully test web mapping and directions you should provide a Mapbox access token. You can set it in PowerShell before starting Expo web like this:

```powershell
$env:MAPBOX_ACCESS_TOKEN = 'pk.<your_mapbox_token_here>'
npm run start:dev
```

Notes:
- `MAPBOX_ACCESS_TOKEN`: used by the server proxy for directions and by `MapView.web.tsx` for map display.
- Places search uses free OpenStreetMap Nominatim API with no keys required.

For production, set the token in `.env` file.

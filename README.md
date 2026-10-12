# Delivery App — Admin Dashboard

## Setup

```bash
cp .env.example .env   # then fill in the values below
pnpm install
pnpm dev               # http://localhost:5173/admin/
```

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | NestJS backend origin, e.g. `http://localhost:3000`. All API calls (including place search) go here. |
| `VITE_GOOGLE_MAPS_API_KEY` | Browser key for the Maps JavaScript API. Optional: without it, maps show "Google Maps key not configured". |
| `VITE_GOOGLE_MAPS_MAP_ID` | Optional Map ID for Advanced Markers. Falls back to Google's `DEMO_MAP_ID`. |

`.env` is gitignored. Never commit a real key.

## Google Maps

Maps follow the same split as the customer app:

- **Map display** (warehouse pin picker, delivery-zone editor, zones overview, order address preview) uses the **Maps JavaScript API** in the browser via `@vis.gl/react-google-maps`. The script is loaded once by `MapsProvider` (`src/lib/googleMaps.tsx`).
- **Place search** never calls Google from the browser. It goes through the backend's `GET /api/v1/places/autocomplete` and `/places/details`. The backend chooses the provider (`PLACES_PROVIDER` = PHOTON | OLA | GOOGLE) and holds its own `GOOGLE_PLACES_API_KEY`.

### Getting a Maps JavaScript API key

This is a **separate key** from the backend's server-side Places key and from the Android-restricted app key. Each key gets its own restriction type, so don't reuse them.

1. In [Google Cloud Console](https://console.cloud.google.com/), select the project that has billing enabled.
2. **APIs & Services → Library**: enable **Maps JavaScript API** and **Geocoding API**. Geocoding is used to show a readable address under the warehouse pin. If it's off, the dashboard falls back to raw lat/lng.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Edit the key:
   - **Application restrictions → Websites (HTTP referrers)**. Add every origin the dashboard is served from, for example:
     - `http://localhost:5173/*` (local dev)
     - `http://127.0.0.1:5173/*`
     - `https://<your-dashboard-domain>/*`, and the bare-IP origin if you serve from one (e.g. `https://144.24.146.130/*`)
   - **API restrictions → Restrict key**. Select only *Maps JavaScript API* and *Geocoding API*.
5. Put it in `.env` as `VITE_GOOGLE_MAPS_API_KEY=...` and restart `pnpm dev`. Vite only reads env at startup and inlines it at build time, so rebuild for production too.
6. (Production) **Google Maps Platform → Map management → Create Map ID** (JavaScript, Vector). Set it as `VITE_GOOGLE_MAPS_MAP_ID`.

A browser key is always visible to anyone who opens the dashboard. The referrer and API restrictions are what keep it safe, so don't skip them.

If the map shows *"Google Maps rejected the API key"*, the referrer list doesn't match the URL in the address bar, or one of the APIs above isn't enabled.

---

## Template notes (Vite)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# Admin Dashboard

Admin web app for the delivery platform. Vite + React 19 + TypeScript, antd 5, TanStack React Query 5, react-router 7, dayjs, recharts, Google Maps (`@vis.gl/react-google-maps`).

## Layout
- `src/types/` — domain types and pure formatters, one file per entity.
- `src/services/` — one class service per entity, exported as a singleton. Requests go through `fetchWithAuth` (`src/services/auth.ts`) against `VITE_API_BASE_URL` (default `http://localhost:3000`), paths under `/api/v1/...`. Responses are `{ data, message, errors }`; unwrap `data` and throw `message` on failure.
- `src/pages/` — one page per route, lazy-loaded in `src/App.tsx`.
- `src/components/` — shared UI (`DrawerForm`, `TableSkeleton`, `StatusBadge`, `CopyableId`, uploads, `maps/`).
- `src/layouts/AdminLayout.tsx` — sidebar nav; `superAdminOnly` items pair with `RoleProtectedRoute` in `App.tsx`.
- `src/contexts/AuthContext.tsx` — current user and roles.

## Related repos
- Backend (NestJS): `C:\Users\Sahal\Delivery_App\nestjs-backend` — check controllers/DTOs for the API contract.
- Rider app (Flutter): `C:\Users\Sahal\Delivery_App\rider_app`.

## Commands
- `pnpm dev` — dev server
- `pnpm exec tsc -b` — type-check
- `pnpm lint` — ESLint
- `pnpm build` — type-check + production build

## Conventions
- Commits: `feat(<scope>): ...`, `fix: ...`.
- New features: use the `/feature` skill.

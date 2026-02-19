# Frontend Fix Checklist (Applied)

## Applied in this audited bundle
- [x] **Removed hardcoded API URL**: uses `VITE_API_BASE_URL` (falls back to relative `/api`).
- [x] **Protected routing**: everything except `/login` requires `accessToken`.
- [x] **Auto-logout on 401**: clears token when API returns unauthorized.
- [x] **Header hygiene**: avoids sending `undefined` headers.

## Still recommended (next)
- [ ] Centralize auth state in a context/store (instead of direct `localStorage` checks).
- [ ] Add refresh-token flow or shorter-lived JWT with rotation.
- [ ] Add role-aware UI gating (admin vs restricted).

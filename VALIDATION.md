# Validation results

- Python 3.12.14: backend tests and deployment regression tests passed (9 tests).
- Node 24.19.0: npm ci and production TypeScript/Vite build passed.
- Fresh-database initialization created three synthetic hospitals.
- Restart preserved an edited hospital record.
- Startup with demo seeding disabled left the database empty.
- Frontend entry point, nested SPA paths and JS assets served successfully.
- Unknown API paths and attempted path traversal returned 404.
- Docker build and hosted deployment were not executed; Docker was unavailable.
- No public hosting URL has been created.

This validates demo deployment behavior, not clinical suitability, authentication,
concurrent multi-instance safety, or all interactive browser workflows.

Live Uvicorn HTTP smoke checks passed for /, health, hospitals, overview,
resources, requests, forecasts, routes and scenarios. Dependency compatibility
check passed. Frontend lint completed with existing warnings (unused imports
and React effect state updates); these did not block the build. Backend tests
reported datetime and TestClient deprecation warnings.

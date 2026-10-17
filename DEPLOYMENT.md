# Deploy CRISISCARE AI

This package runs the React frontend and FastAPI API together at one URL.
It is a synthetic healthcare coordination demo. Endpoints, including reset and
approval, are public and unauthenticated. Anyone with the link can change the
shared demo state. Do not enter real patient data. Operational deployment needs
authentication, server-enforced roles, and a separate security review.

## Option 1: Render public demo

1. Extract this ZIP. Upload the contents of `To_Share` into your GitHub repository.
   `Dockerfile`, `render.yaml`, `requirements.txt`, `backend`, and `frontend` must
   appear at the repository root. Do not upload the outer ZIP or node_modules.
2. Sign in at https://dashboard.render.com and create a **Blueprint**.
3. Connect that repository. Render reads `render.yaml`; review and create the
   `crisiscare-demo` service. It builds the frontend and installs backend dependencies.
4. Wait for the build and health check to pass, then open the service's assigned
   HTTPS URL. That URL is the shareable link. No existing URL in the original
   README is required.
5. Visit `/api/health` on that URL; expect `status: healthy`. The dashboard should
   show three seeded hospitals. Test Requests and Emergency Mode before sharing.

The free service uses temporary storage. Database changes are lost on restart,
redeploy, or idle spin-down, and the next launch restores the demo baseline.
Free services also sleep after inactivity, so the first visit can take longer.
For persistent data, choose a service supporting persistent disks, mount a disk
at `/data`, and change DATA_DIR to `/data`. Back up the SQLite database using the
SQLite backup API or while the application is stopped; include WAL state when
copying a live database. Use one service instance and one Uvicorn worker.

Official references:
- https://render.com/docs/blueprint-spec
- https://render.com/docs/free
- https://render.com/docs/health-checks

## Option 2: Docker locally or on a Docker-capable host

From the extracted project root:

```bash
docker compose up --build -d
```

Open http://localhost:8000. The named volume preserves demo changes across
container recreation. `docker compose down` preserves it; adding `-v` deletes it.
For an internet-facing Docker host, configure HTTPS with your hosting provider
or a reverse proxy and route to port 8000.

The Docker image uses Node 24 to compile the frontend and Python 3.12 to run
FastAPI as an unprivileged user. It honors the host-provided PORT variable,
listens on 0.0.0.0, and defaults to port 8000. Docker itself was unavailable in
the preparation environment, so the image was not built here; the equivalent
Node build and Python application were tested directly.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| PORT | 8000 in Docker | Listening port; passed to Uvicorn by Docker command |
| DATA_DIR | backend folder outside Docker | Writable SQLite location; Docker defaults to /data |
| SEED_DEMO_DATA | true | Seed only an empty database; false leaves it empty |
| CORS_ORIGINS | empty | Exact origins separated by commas, only for separate frontend hosting |
| VITE_API_BASE_URL | /api | Optional build-time frontend API URL, including /api |

Environment files are examples only: the application does not automatically load
`.env`. Set variables in your hosting dashboard or shell. In normal single-server
hosting, leave CORS_ORIGINS empty and VITE_API_BASE_URL unset. No external AI API
key is required. Map tiles require access to OpenStreetMap's external tile service.

## Troubleshooting

- **ModuleNotFoundError: backend**: start Uvicorn from the root containing backend,
  using `backend.main:app`, rather than from inside backend.
- **Blank page or assets missing**: run `npm ci` then `npm run build` inside frontend.
  The Docker build does this automatically. Do not use Vite's development server
  as the production server.
- **Failed API requests**: serve the frontend and backend at the same URL. Hosting
  only `frontend/dist` does not deploy the backend. For a separate frontend,
  rebuild with VITE_API_BASE_URL and configure the backend's CORS_ORIGINS.
- **Read-only database**: point DATA_DIR at a writable directory. Persist that
  entire directory if changes need to survive restarts.
- **No hospitals**: confirm SEED_DEMO_DATA=true; seeding only happens if no hospital
  exists. Reset Demo deliberately deletes changes and restores the baseline.

## Changes made

Added dependency pins, a multi-stage Dockerfile, Render Blueprint, Docker Compose,
environment examples and ignore files. Moved schema creation into startup, seeded
empty databases, allowed a configurable writable data directory, restricted CORS,
checked database connectivity in health checks, and prevented SPA file traversal.
Added a build-time API base override. Removed bundled runtime databases and caches
from the deliverable. Rebuilt the frontend and removed the obsolete tunnel URL.

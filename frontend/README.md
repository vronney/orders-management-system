# Orders Management System — Frontend

This is the React + TypeScript + Vite frontend for the Orders Management System. It communicates with the FastAPI backend and is production-served by nginx inside Docker.

## Quick Start (Docker)

1) Build and start all services

```powershell
docker compose build
docker compose up -d
```

2) Open the app

- Frontend: http://localhost:3000
- API: http://localhost:8000 (docs at /docs)

3) Login

- Admin: admin / admin123 (can upload)
- Viewer: viewer / viewer123 (read-only)

## Environment: Frontend → Backend URL

The frontend reads the backend base URL from `VITE_API_BASE` at build time. In Docker Compose we pass:

```yaml
args:
  VITE_API_BASE: http://localhost:8000
```

If you change the backend port/host, rebuild the frontend image with the new value.

## Development Mode (no Docker)

Run the frontend dev server with hot reload:

```powershell
cd frontend
npm install
npm run dev
```

Set the backend URL on the fly by creating `.env` in `frontend/`:

```
VITE_API_BASE=http://localhost:8000
```

Then open the dev server URL printed by Vite (e.g., http://localhost:5173).

## CSV Upload Behavior (Duplicates)

- Orders are unique by `order_id`.
- If you upload rows with an existing `order_id`, the backend updates that order instead of failing (PostgreSQL upsert).
- The upload runs in batches and deduplicates within each batch (last occurrence wins).

## Favicon and Static Assets

- The production nginx image serves the built assets from `/usr/share/nginx/html`.
- A minimal placeholder `favicon.ico` is generated during the image build to avoid 404s; replace it by adding a real `favicon.ico` to `frontend/public/` and copying it in the Dockerfile if desired.

## Troubleshooting

- Blank screen at http://localhost:3000:
  - Ensure the frontend was built and running via Docker (`docker compose up -d frontend`).
  - Verify `VITE_API_BASE` points to a reachable backend and the backend is running (`http://localhost:8000/health`).
- API errors (401/403): you may be logged out—log in again as admin.

## Notes

- Any change to `VITE_API_BASE` requires rebuilding the frontend image.
- In production, serve the Vite build (`dist/`) behind nginx (already configured in the provided Dockerfile).

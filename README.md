# Smart Parking & EV Web Stack

This repository includes a React + Vite + TypeScript frontend and an Express + TypeScript backend with shared types. The backend uses in-memory data for quick demos (no payments implemented).

## Prerequisites
- Node.js 18+
- npm

## Setup
1) Install dependencies
- Frontend: `cd frontend && npm install`
- Backend: `cd backend && npm install`

2) Environment variables
- Copy `frontend/.env.example` to `frontend/.env` and adjust `VITE_API_BASE_URL` if needed.
- Copy `backend/.env.example` to `backend/.env` and adjust `PORT`/`CORS_ORIGIN`. `DATABASE_URL` defaults to SQLite (`file:./dev.db`). To use Postgres, set `DATABASE_URL` to your Postgres connection string.

3) Initialize the database (from `backend`)
- `npm run prisma:generate`
- `npm run db:push`
- `npm run db:seed`

## Run
- Backend (API on http://localhost:4000):
  - `cd backend && npm run dev`
- Frontend (Vite dev server on http://localhost:5173):
  - Open a new terminal: `cd frontend && npm run dev`

## Build
- Backend: `cd backend && npm run build`
- Frontend: `cd frontend && npm run build`

## Notes
- Shared domain types live in `shared/types.ts` and are imported by both apps.
- API endpoints available:
  - `GET /api/health`
  - `GET /api/lots`
  - `GET /api/lots/:id/spots`
  - `POST /api/reservations` with `{ lotId, spotId, vehiclePlate, userId? }`
  - `GET /api/reservations/:id`
  - `GET /api/charging-stations`
  - `POST /api/charging-sessions` with `{ stationId, reservationId?, userId? }`
- Frontend pages: Home, Availability (live data), Reservation (mock submit), Charging (roadmap), Admin (placeholder), Support, 404.

## Next steps
- Wire Reservation page to `POST /api/reservations` and show confirmation.
- Add real persistence (DB) and auth before production use.
- Expand tests and linting as the codebase grows.

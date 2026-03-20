# SPAREV - Smart Parking & EV Charging Platform

SPAREV is a full-stack academic project built for DBMS coursework. It combines parking reservation and EV charging workflows into a single web platform with a modern frontend, typed backend APIs, and shared domain models.

## Project Highlights
- Real-time parking lot and spot visibility.
- Reservation and charging session APIs.
- Shared TypeScript types across frontend and backend.
- Prisma-powered data layer with SQLite by default.
- One-command local development workflow.

## Tech Stack
- Frontend: React, Vite, TypeScript
- Backend: Node.js, Express, TypeScript
- Database: Prisma ORM with SQLite (default)
- Tooling: ESLint, tsx, npm scripts

## Prerequisites
- Node.js 18 or newer
- npm

## Quick Start
1. Install dependencies in all modules:

```bash
cd backend && npm install
cd ../frontend && npm install
cd .. && npm install
```

2. Configure environment files:
- Copy `backend/.env.example` to `backend/.env`.
- Copy `frontend/.env.example` to `frontend/.env`.

3. Initialize the database (from `backend`):

```bash
cd backend
npm run prisma:generate
npm run db:push
npm run db:seed
cd ..
```

4. Run everything with one command (from project root):

```bash
npm run dev
```

This starts:
- Backend API: http://localhost:4000
- Frontend App: http://localhost:5173

## Available Scripts

### Root
- `npm run dev` - Runs backend and frontend together.
- `npm run dev:backend` - Runs backend only.
- `npm run dev:frontend` - Runs frontend only.

### Backend (`backend/`)
- `npm run dev` - Start backend in development mode.
- `npm run build` - Build backend TypeScript.
- `npm run start` - Start compiled backend.
- `npm run db:push` - Apply Prisma schema to DB.
- `npm run db:seed` - Seed database with sample data.
- `npm run prisma:generate` - Generate Prisma client.

### Frontend (`frontend/`)
- `npm run dev` - Start Vite development server.
- `npm run build` - Build production frontend bundle.
- `npm run preview` - Preview production build.

## Core API Endpoints
- `GET /api/health`
- `GET /api/lots`
- `GET /api/lots/:id/spots`
- `POST /api/reservations`
- `GET /api/reservations/:id`
- `GET /api/charging-stations`
- `POST /api/charging-sessions`
- `GET /api/lots/:id/history`
- `GET /api/analytics/daily?days=7`

## Current Frontend Pages
- Home
- Availability
- Reservation
- Charging
- Analytics
- Admin
- Support
- Not Found (404)

## Academic Scope
This project demonstrates:
- Relational modeling and schema design for parking and charging domains.
- API design with typed contracts and modular services.
- Frontend-backend integration for real-world DBMS workflows.

## Next Improvements
- Add authentication and role-based access control.
- Complete reservation submission and confirmation UX.
- Integrate payment workflow for charging sessions.
- Expand automated tests for API and UI flows.

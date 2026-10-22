# University Portfolio

This repository is split into two applications:

- `frontend/` contains the standalone React + Vite frontend.
- `backend/` contains the Laravel API and session-backed workflow logic.
- `legacy/` keeps the original PHP application for reference during migration.

## Run Locally

Frontend:

```bash
cd frontend
npm install
npm run dev
```

`npm run dev` first tries the Apache/XAMPP backend at `http://localhost/university-portfolio/backend/public`.
If that URL is unavailable, it automatically starts `php artisan serve --host=127.0.0.1 --port=8000`
from `backend/` and points Vite at `http://127.0.0.1:8000` for the current dev session.

Backend:

```bash
cd backend
composer install
php artisan config:clear
php artisan route:list
```

The React frontend runs on `http://localhost:5173` by default. Its Vite proxy forwards `/api` and `/uploads` requests to the Laravel backend at `http://localhost/university-portfolio/backend/public`.

## Environment

Backend environment values live in `backend/.env`.

Important values:

- `APP_URL=http://localhost/university-portfolio/backend/public`
- `FRONTEND_URL=http://localhost:5173`

Frontend examples live in `frontend/.env.example`.

Optional frontend dev fallback:

- `VITE_BACKEND_FALLBACK_URL=http://127.0.0.1:8000`

## Verification

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
php artisan test
```

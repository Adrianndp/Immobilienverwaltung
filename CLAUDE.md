# Immobilienverwaltung

Django + DRF backend (`backend/`), React + Vite + TypeScript frontend (`frontend/`), Postgres. All run via `docker compose up`. UI text is German.

## Running
- Source folders are bind-mounted, so code changes reload live.
- Postgres is exposed on host port **5433**. Inside Docker the backend uses `db:5432`.
- Config comes from `.env` at the repo root (`.env.example` is the template).

## Rules
- **Dependencies are pinned exactly.**
  - npm: `save-exact` is set in `.npmrc`.
  - Python: after `pip install`, run `.venv/bin/pip freeze > requirements.txt`.
  - Docker images use exact version tags.
- After changing frontend deps: `docker compose up -d --build -V frontend` (`-V` refreshes the container's `node_modules`).
- Run Django commands that create files (`startapp`, `makemigrations`) locally with `backend/.venv/bin/python manage.py ...`, not in the container, which runs as root.
- **Frontend:** MUI only, no custom CSS files. Pages go in `src/pages/`, reusable parts in `src/components/`.

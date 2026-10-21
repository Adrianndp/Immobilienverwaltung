Immobilienverwaltung für private Vermieter

## Deployment

1. Copy `.env.example` to `.env` and set for production:
   - `DJANGO_SECRET_KEY`: a new random value, e.g. `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
   - `DJANGO_DEBUG=False`
   - `DJANGO_ALLOWED_HOSTS=example.com`
   - `DJANGO_CSRF_TRUSTED_ORIGINS=https://example.com`
   - a strong `POSTGRES_PASSWORD`
2. `docker compose -f docker-compose.prod.yml up -d --build`
3. Create a user: `docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser`

nginx serves the app on `NGINX_PORT` (default 80) and proxies `/api` and `/admin` to gunicorn. Migrations and `collectstatic` run on every backend start. For HTTPS, put a TLS proxy (e.g. certbot on the host's nginx) in front.

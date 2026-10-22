Immobilienverwaltung für private Vermieter

## Deployment

1. Copy `.env.example` to `.env` and set for production:
   - `DJANGO_SECRET_KEY`: a new random value, e.g. `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
   - `DJANGO_DEBUG=False`
   - `DOMAIN=immo.example.com`
   - `DJANGO_ALLOWED_HOSTS` to the domain, e.g. `immo.example.com`
   - `DJANGO_CSRF_TRUSTED_ORIGINS=https://<domain>`, e.g. `https://immo.example.com`
   - a strong `POSTGRES_PASSWORD`
2. `docker compose -f docker-compose.prod.yml up -d --build`
3. Create a user: `docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser`

Caddy listens on ports 80/443 and forwards to nginx, which serves the app and proxies `/api` and `/admin` to gunicorn. Migrations and `collectstatic` run on every backend start.

Caddy obtains the Let's Encrypt certificate automatically. Before the first start, the DNS A record for `DOMAIN` must point to the server and ports 80/443 must be open.

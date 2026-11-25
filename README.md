## Immobilienverwaltung für private Vermieter

<img width="3681" height="1972" alt="Screenshot From 2026-11-25 21-31-48" src="https://github.com/user-attachments/assets/a341d27b-957d-4b12-bdb9-113e84fed135" />

## Kubernetes (minikube)

Manifests are in `k8s/` (kustomize), namespace `immobilienverwaltung`. The setup matches `docker-compose.prod.yml` without Caddy: Postgres StatefulSet, backend (gunicorn, with an init container that runs migrations and `collectstatic`), and nginx (`frontend`).

1. Create the namespace and the secret once:
   ```sh
   kubectl create namespace immobilienverwaltung
   kubectl -n immobilienverwaltung create secret generic immobilienverwaltung-secrets \
     --from-literal=POSTGRES_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')" \
     --from-literal=DJANGO_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')"
   ```
2. Build the images into minikube and deploy:
   ```sh
   minikube image build -t immobilienverwaltung-backend:local ./backend
   minikube image build -t immobilienverwaltung-frontend:local -f Dockerfile.prod ./frontend
   kubectl apply -k k8s
   ```
3. Create a user: `kubectl -n immobilienverwaltung exec -it deploy/backend -- python manage.py createsuperuser`
4. Open the app: `kubectl -n immobilienverwaltung port-forward svc/frontend 8080:80`, then go to http://localhost:8080

After code changes: rebuild the images (step 2), then `kubectl -n immobilienverwaltung rollout restart deploy/backend deploy/frontend`.

With `DJANGO_DEBUG=False`, cookies are `Secure`. Browsers accept them over plain HTTP only on `localhost`, so use the port-forward and not the minikube node IP. To use another URL, change `DJANGO_CSRF_TRUSTED_ORIGINS` in `k8s/config.yaml`.

## Deployment (Docker Compose)

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

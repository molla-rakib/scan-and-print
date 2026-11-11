# Production: mudron.org on the VPS

One Ubuntu VPS (161.97.151.186, Docker) hosts mudron.org and eshopbd.site. They share one MongoDB and
one Caddy; each app runs in its own compose project.

```
/var/www/infra          shared: Caddy (80/443, HTTPS for every domain) + MongoDB 8 (auth, 1 GB cache)
  docker-compose.yml    = deploy/infra/docker-compose.yml
  Caddyfile             = deploy/infra/Caddyfile
  eshopbd.override.yml  = deploy/eshopbd.override.yml
  .env                  MONGO_ROOT_PASSWORD, ESHOPBD_DB_PASSWORD, MUDRON_DB_PASSWORD
/var/www/mudron         this repo; docker-compose.prod.yml (repo root) runs the app as `mudron` on the infra network
  .env                  production env (APP_URL=https://mudron.org, MONGODB_URI → mongo:27017/mudron)
/var/www/eshopbd-site   eshopbd's own repo (app, Redis, MinIO); its .env sets COMPOSE_FILE so its own
                        mongo/caddy services are off and it joins the infra network
/root/backups           dumps taken during the move (Atlas, eshopbd, the removed agency-os demo)
```

Every container joins the external Docker network `infra`. Caddy reaches the apps by name
(`mudron:3000`, `eshopbd-app:3000`, `eshopbd-minio:9000`); never name a service plain `app` on that
network, or two apps would answer to the same DNS name.

Each app has its own MongoDB user that can only use its own database
(`mongodb://mudron:<pw>@mongo:27017/mudron?authSource=admin`). MongoDB has no published port.

## Deploying an update

```bash
ssh root@161.97.151.186
cd /var/www/mudron && git pull && docker compose -f docker-compose.prod.yml up -d --build \
  && docker image prune -f && docker builder prune -f
```

The build takes about 2 minutes; the old container keeps serving until the new one starts. The two
`prune` commands delete the previous image and leftover build cache, which otherwise grow by about
1 GB per deploy.
For a new agent release, run `agent/release.ps1` locally first and commit `public/downloads`.

## Common tasks

```bash
# Logs
docker logs -f mudron
cd /var/www/infra && docker compose logs -f caddy

# After editing the Caddyfile
cd /var/www/infra && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Mongo shell / backup of the Mudron database
cd /var/www/infra && . ./.env
docker compose exec mongo mongosh -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin
docker compose exec -T mongo mongodump -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --db mudron --archive --gzip > /root/backups/mudron-$(date +%F).archive.gz

# Restore (replaces the collections in the archive)
docker compose exec -T mongo mongorestore -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --archive --gzip --drop < /root/backups/mudron-YYYY-MM-DD.archive.gz
```

## Adding another site

Give it its own compose project on the `infra` network with a unique service name, create a MongoDB
user for its database, add a block to `/var/www/infra/Caddyfile` and reload Caddy.

# Production image for mudron.org (run by docker-compose.prod.yml on the VPS).
# Uses Next's standalone output, so the final image carries only what the server needs.

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Env vars are read when used (lib/env.ts); nothing connects to the database during the build.
# Exception: values used by prerendered pages are baked in now, so they come in as build args.
#   APP_URL: canonical links, sitemap/robots/llms.txt URLs, social previews
#   DEVICE_MONTHLY_FEE, TRIAL_DAYS: prices on the home page and llms.txt
ARG APP_URL GOOGLE_ANALYTICS_ID DEVICE_MONTHLY_FEE TRIAL_DAYS
ENV APP_URL=$APP_URL GOOGLE_ANALYTICS_ID=$GOOGLE_ANALYTICS_ID \
    DEVICE_MONTHLY_FEE=$DEVICE_MONTHLY_FEE TRIAL_DAYS=$TRIAL_DAYS
RUN npm run build

FROM base AS run
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

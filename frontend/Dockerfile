# Image frontend Aperio (static + nginx) — build depuis la RACINE du monorepo :
#   docker build -f frontend/Dockerfile -t aperio-frontend .
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
# --include=dev : devDependencies (vite, tsc) nécessaires au build
RUN npm ci --include=dev
COPY shared ./shared
COPY frontend ./frontend
# Le frontend importe les types partagés : on build shared d'abord.
RUN npm run -w shared build && npm run -w frontend build

# ─── Runtime : nginx ──────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80

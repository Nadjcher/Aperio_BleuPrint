# Image backend Aperio — build depuis la RACINE du monorepo :
#   docker build -f backend/Dockerfile -t aperio-backend .
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
# Manifests d'abord (cache des deps)
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
# --include=dev : devDependencies (tsc, tsx) nécessaires au build
RUN npm ci --include=dev
# Sources + build (shared puis backend)
COPY shared ./shared
COPY backend ./backend
RUN npm run -w shared build && npm run -w backend build

# ─── Runtime ───────────────────────────────────────────────
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Dépendances de production uniquement
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev && npm cache clean --force
# Artefacts compilés
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/backend/dist ./backend/dist
WORKDIR /app/backend
EXPOSE 4000
# Les migrations sont jouées automatiquement au boot (migrationsRun en prod)
CMD ["node", "dist/index.js"]

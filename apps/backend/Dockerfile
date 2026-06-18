# Backend NestJS — build context = raiz do monorepo.
# docker build -f apps/backend/Dockerfile .

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app

# Copia o monorepo (node_modules/dist são ignorados via .dockerignore) e instala
# as dependências — o postinstall compila packages/shared automaticamente.
COPY . .
RUN npm ci

# Compila o backend.
RUN npm run build --workspace backend

# ---- runtime ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# node_modules (com o symlink @conversaja/shared) + artefatos compilados.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3000
CMD ["node", "apps/backend/dist/main.js"]

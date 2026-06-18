# Frontend Angular — build context = raiz do monorepo.
# docker build -f apps/frontend/Dockerfile .

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace frontend

# ---- runtime (nginx) ----
FROM nginx:alpine
# Arquivos estáticos da aplicação Angular.
COPY --from=build /app/apps/frontend/dist/frontend/browser /usr/share/nginx/html
# Configuração com fallback de SPA e proxy do WebSocket para o backend.
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

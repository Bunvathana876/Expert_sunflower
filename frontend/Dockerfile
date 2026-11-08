# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Development target (used by docker-compose.yml with bind-mount & Vite HMR)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5174
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:5174/ || exit 1
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------------------------------------------------------------------------
# Production build stage (TypeScript verification + Vite/PWA static bundle)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ---------------------------------------------------------------------------
# Hardened non-root Nginx reverse-proxy & static SPA server (UID 101, port 8080)
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod

COPY nginx/security-headers.inc /etc/nginx/conf.d/security-headers.inc
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER 101

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health/live || exit 1

CMD ["nginx", "-g", "daemon off;"]

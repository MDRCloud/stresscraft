# ── Build Stage ──
FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Runtime Stage ──
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Clean default assets and copy production React build
RUN rm -rf ./*
COPY --from=build /app/dist ./
COPY docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# syntax=docker/dockerfile:1

# ---- Build stage ---------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .
# Build without baked-in Google settings; they are injected at container start.
ARG VITE_BASE_PATH=/
ARG VITE_ROUTER_MODE=browser
ENV VITE_BASE_PATH=$VITE_BASE_PATH VITE_ROUTER_MODE=$VITE_ROUTER_MODE
RUN npm run build

# ---- Runtime stage -------------------------------------------------------
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-cashrow-config.sh /docker-entrypoint.d/40-cashrow-config.sh
RUN chmod +x /docker-entrypoint.d/40-cashrow-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

# Runtime settings (read by docker/40-cashrow-config.sh on every start).
ENV GOOGLE_CLIENT_ID="" \
    ENABLE_DEMO="true" \
    APP_NAME="Cashrow"

EXPOSE 80

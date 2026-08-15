# React Router v8 requires Node >= 22.22; no Prisma here so alpine is fine.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_ vars are baked at build time. Only PUBLIC Auth0 values are needed —
# the API base stays relative (nginx proxies /api).
ARG VITE_AUTH0_DOMAIN=dev-yg.us.auth0.com
ARG VITE_AUTH0_CLIENT_ID=H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA
ARG VITE_AUTH0_AUDIENCE=https://bbl-candidate-test-api
ARG VITE_API_BASE_URL=""
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN \
    VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID \
    VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE \
    VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

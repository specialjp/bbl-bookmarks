# node:22-slim (Debian): Prisma engines are a known flake source on
# Alpine/musl. Node 22 satisfies the repo-wide >=22.22 floor.
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Full node_modules kept on purpose: the prisma CLI runs `migrate deploy`
# at container start (idempotent). Trading image size for a self-migrating
# demo container — documented in README.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts /app/package*.json ./
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

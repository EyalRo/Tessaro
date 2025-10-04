FROM node:22-alpine AS base
WORKDIR /workspace/services/admin-app/app

FROM base AS deps
COPY services/admin-app/app/package.json ./package.json
COPY services/admin-app/app/package-lock.json ./package-lock.json
RUN npm ci

FROM base AS builder
ARG VITE_USERS_API_URL=/api
ENV VITE_USERS_API_URL=${VITE_USERS_API_URL}
COPY --from=deps /workspace/services/admin-app/app/node_modules ./node_modules
COPY services/admin-app/app/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /workspace/services/admin-app/app
ENV NODE_ENV=production
COPY --from=builder /workspace/services/admin-app/app/package.json ./package.json
COPY --from=builder /workspace/services/admin-app/app/package-lock.json ./package-lock.json
COPY --from=builder /workspace/services/admin-app/app/node_modules ./node_modules
COPY --from=builder /workspace/services/admin-app/app/dist ./dist
COPY --from=builder /workspace/services/admin-app/app/vite.config.ts ./vite.config.ts
COPY --from=builder /workspace/services/admin-app/app/tsconfig.json ./tsconfig.json
COPY --from=builder /workspace/services/admin-app/app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
EXPOSE 4173
ENV PORT=4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]

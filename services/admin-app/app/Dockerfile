FROM node:20-alpine AS base
WORKDIR /workspace

FROM base AS deps
COPY package.json package-lock.json ./
COPY services/admin-app/app/package.json services/admin-app/app/package.json
COPY services/admin-app/app/package-lock.json services/admin-app/app/package-lock.json
RUN npm ci
RUN npm ci --prefix services/admin-app/app

FROM base AS builder
ARG VITE_USERS_API_URL=/api
ENV VITE_USERS_API_URL=${VITE_USERS_API_URL}
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/services/admin-app/app/node_modules ./services/admin-app/app/node_modules
COPY . .
RUN CI=true npm test -- --runInBand
RUN npm run admin:build

FROM node:20-alpine AS runner
WORKDIR /workspace/services/admin-app/app
ENV NODE_ENV=production
COPY --from=builder /workspace/services/admin-app/app/package.json ./package.json
COPY --from=builder /workspace/services/admin-app/app/package-lock.json ./package-lock.json
COPY --from=builder /workspace/services/admin-app/app/node_modules ./node_modules
COPY --from=builder /workspace/services/admin-app/app/dist ./dist
COPY --from=builder /workspace/services/admin-app/app/vite.config.ts ./vite.config.ts
COPY --from=builder /workspace/services/admin-app/app/tsconfig.json ./tsconfig.json
COPY --from=builder /workspace/tsconfig.json /workspace/tsconfig.json
COPY services/admin-app/app/docker-entrypoint.sh ./docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
EXPOSE 4173
ENV PORT=4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]

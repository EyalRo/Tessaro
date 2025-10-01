FROM node:20-alpine AS base
WORKDIR /workspace

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/admin/package-lock.json apps/admin/package-lock.json
RUN npm ci
RUN npm ci --prefix apps/admin

FROM base AS builder
ARG VITE_USERS_API_URL=/api
ENV VITE_USERS_API_URL=${VITE_USERS_API_URL}
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/admin/node_modules ./apps/admin/node_modules
COPY . .
RUN CI=true npm test -- --runInBand
RUN npm run admin:build

FROM node:20-alpine AS runner
WORKDIR /workspace/apps/admin
ENV NODE_ENV=production
COPY --from=builder /workspace/apps/admin/package.json ./package.json
COPY --from=builder /workspace/apps/admin/package-lock.json ./package-lock.json
COPY --from=builder /workspace/apps/admin/node_modules ./node_modules
COPY --from=builder /workspace/apps/admin/dist ./dist
COPY --from=builder /workspace/apps/admin/vite.config.ts ./vite.config.ts
COPY --from=builder /workspace/apps/admin/tsconfig.json ./tsconfig.json
COPY --from=builder /workspace/tsconfig.json /workspace/tsconfig.json
COPY apps/admin/docker-entrypoint.sh ./docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
EXPOSE 4173
ENV PORT=4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]

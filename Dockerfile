# syntax=docker/dockerfile:1.7

FROM oven/bun:1.1.18 AS deps
WORKDIR /app

COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.1.18 AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /root/.bun /root/.bun
COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/server/index.ts"]

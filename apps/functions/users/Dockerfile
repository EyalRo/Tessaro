FROM node:20-alpine AS base
WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci
RUN npm install --no-save ts-node

COPY . .

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "-r", "ts-node/register/transpile-only", "apps/functions/users/src/index.ts"]

FROM node:20-alpine AS base
WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci
RUN npm install --no-save ts-node

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
ENV FUNCTION_ENTRY=services/users-api/functions/src/server.ts
EXPOSE 8080

CMD ["sh", "-c", "node -r ts-node/register/transpile-only -r tsconfig-paths/register ${FUNCTION_ENTRY}"]

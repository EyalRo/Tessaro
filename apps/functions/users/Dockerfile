FROM node:20-alpine AS base
WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci
RUN npm install --no-save ts-node

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
ENV FUNCTION_ENTRY=apps/functions/users/src/knative-get-users.ts

CMD ["sh", "-c", "node -r ts-node/register/transpile-only ${FUNCTION_ENTRY}"]

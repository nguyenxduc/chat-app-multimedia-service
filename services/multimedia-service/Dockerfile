# syntax=docker/dockerfile:1


FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

COPY packages/common/package.json ./packages/common/
COPY services/multimedia-service/package.json ./services/multimedia-service/

RUN pnpm install --frozen-lockfile


FROM deps AS builder

COPY packages/common ./packages/common
COPY services/multimedia-service ./services/multimedia-service

RUN pnpm --filter @chatapp/common build

RUN pnpm --filter @chatapp/multimedia-service build


FROM node:22-alpine AS prodcution

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./

COPY packages/common/package.json ./packages/common/
COPY services/multimedia-service/package.json ./services/multimedia-service/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/services/multimedia-service/dist ./services/multimedia-service/dist

RUN chown -R nodeuser:nodejs /app

USER nodeuser

ENV NODE_ENV=production
ENV MULTIMEDIA_SERVICE_PORT=4004
ENV OTEL_SERVICE_NAME=multimedia-service

EXPOSE 4004
EXPOSE 9464

WORKDIR /app/services/multimedia-service

CMD [ "node", "--import", "./dist/tracing.js", "dist/index.js" ]

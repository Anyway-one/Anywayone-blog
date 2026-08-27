# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS dependencies

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY admin/package.json admin/package.json
COPY web/package.json web/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM dependencies AS builder

ARG VITE_API_BASE_URL=https://api.anywayone.com/api/v1
ARG VITE_WEB_URL=https://www.anywayone.com

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WEB_URL=$VITE_WEB_URL

COPY . .

RUN pnpm --filter @anywayone/admin build

FROM nginx:1.27-alpine AS runner

COPY deploy/admin-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/admin/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --quiet --output-document=/dev/null http://127.0.0.1:8080/healthz || exit 1

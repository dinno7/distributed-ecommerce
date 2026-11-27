FROM node:24-alpine3.24 AS base
WORKDIR /app

FROM base AS docs
RUN apk add --no-cache just mdbook mdbook-mermaid \
    && npm install --global @usebruno/cli@4.4.0

COPY justfile ./
COPY docs/ ./docs/
COPY public/ ./public/
RUN just docsgen \
    && test -s public/docs/index.html \
    && test -s public/apidocs/index.html

FROM base AS runtime
RUN apk add --no-cache ca-certificates openssl
RUN npm install --global pnpm@12.10.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY nest-cli.json tsconfig*.json prisma7.config.ts ./
COPY prisma/ ./prisma/
COPY src/ ./src/
RUN pnpm exec prisma generate --config prisma7.config.ts \
    && pnpm build

COPY --from=docs /app/public ./public/
ENV NODE_ENV=production PORT=7000 PATH="/app/node_modules/.bin:$PATH"
USER node
EXPOSE 7000
CMD ["sh", "-c", "prisma migrate deploy && prisma db seed && exec node dist/main.js"]

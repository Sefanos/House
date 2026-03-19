FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

ARG NEXT_PUBLIC_SPACETIME_URL
ARG NEXT_PUBLIC_SPACETIME_MODULE=houseplan
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG NEXT_PUBLIC_GIPHY_API_KEY

ENV NEXT_PUBLIC_SPACETIME_URL=$NEXT_PUBLIC_SPACETIME_URL
ENV NEXT_PUBLIC_SPACETIME_MODULE=$NEXT_PUBLIC_SPACETIME_MODULE
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_GIPHY_API_KEY=$NEXT_PUBLIC_GIPHY_API_KEY

RUN pnpm --filter @houseplan/web build
RUN mkdir -p /tmp/web-public && if [ -d /app/apps/web/public ]; then cp -R /app/apps/web/public/. /tmp/web-public/; fi

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /tmp/web-public ./apps/web/public

EXPOSE 3001

CMD ["node", "apps/web/server.js"]

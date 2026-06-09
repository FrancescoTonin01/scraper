# ---- Base: Playwright image includes Chromium + system deps ----
FROM mcr.microsoft.com/playwright:v1.60.0-noble AS base

WORKDIR /app

# ---- Install dependencies ----
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

# ---- Copy source code ----
COPY tsconfig.json ./
COPY src ./src/

# ---- Runtime ----
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
EXPOSE 4000

CMD ["npx", "tsx", "src/index.ts"]

# Build from root to access all files
FROM ghcr.io/puppeteer/puppeteer:23.9.0 AS builder

USER root
WORKDIR /app

# Copy all necessary config files from root
COPY tsconfig.base.json tsconfig.json ./
COPY package.json ./

# Copy scraper workspace files
COPY apps/scraper/package.json ./apps/scraper/
COPY apps/scraper/core/package.json ./apps/scraper/core/
COPY apps/scraper/server/package.json ./apps/scraper/server/
COPY apps/scraper/cli/package.json ./apps/scraper/cli/

# Install dependencies in the scraper workspace
WORKDIR /app/apps/scraper
RUN npm install --workspaces --include-workspace-root --legacy-peer-deps

# Copy all source code
WORKDIR /app
COPY apps/scraper/ ./apps/scraper/

# Build core and server
WORKDIR /app/apps/scraper/core
RUN npm run build

WORKDIR /app/apps/scraper/server
RUN npm run build

# Production stage - simpler approach: copy everything from builder
FROM ghcr.io/puppeteer/puppeteer:23.9.0

USER root
WORKDIR /app

# Copy everything from builder (includes node_modules and built files)
COPY --from=builder /app /app

# Create app user and set permissions
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

# Environment variables
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

EXPOSE 8080

# Start the server
WORKDIR /app/apps/scraper/server
CMD ["node", "dist/index.js"]
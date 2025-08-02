# Use the official Puppeteer image which has Chrome pre-installed
FROM ghcr.io/puppeteer/puppeteer:23.9.0 AS builder

USER root
WORKDIR /app

# Copy package files
COPY package.json ./
COPY core/package.json ./core/
COPY server/package.json ./server/
COPY cli/package.json ./cli/

# Install dependencies
RUN npm install --workspaces --include-workspace-root --legacy-peer-deps

# Copy source code
COPY . .

# Build core and server
WORKDIR /app/core
RUN npm run build

WORKDIR /app/server  
RUN npm run build

# Production stage - use same base for consistency
FROM ghcr.io/puppeteer/puppeteer:23.9.0

USER root
WORKDIR /app

# Copy package files
COPY package.json ./
COPY core/package.json ./core/
COPY server/package.json ./server/

# Install production dependencies only
RUN npm install --workspaces --include-workspace-root --omit=dev --legacy-peer-deps

# Copy built files from builder
COPY --from=builder /app/core/dist ./core/dist
COPY --from=builder /app/server/dist ./server/dist

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
WORKDIR /app/server
CMD ["node", "dist/index.js"]
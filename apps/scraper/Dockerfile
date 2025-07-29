# Use Crawlee's Playwright image with Node.js 20 as base
FROM apify/actor-node-playwright-chrome:20 AS builder

# Set working directory
WORKDIR /home/myuser

# Switch to root temporarily to set up directories
USER root
RUN mkdir -p /home/myuser/app && chown -R myuser:myuser /home/myuser/app
USER myuser

# Set working directory to the app folder
WORKDIR /home/myuser/app

# Copy package.json files for all workspaces
COPY --chown=myuser:myuser package.json ./
COPY --chown=myuser:myuser core/package.json ./core/
COPY --chown=myuser:myuser server/package.json ./server/
COPY --chown=myuser:myuser cli/package.json ./cli/

# Install all dependencies with legacy peer deps to resolve conflicts
RUN npm install --include=dev --audit=false --legacy-peer-deps

# Copy source code with proper ownership
COPY --chown=myuser:myuser . ./

# Build the core package first (create dist directory explicitly)
WORKDIR /home/myuser/app/core
RUN mkdir -p dist && npm run build

# Build the server
WORKDIR /home/myuser/app/server
RUN mkdir -p dist && npm run build

# Production stage
FROM apify/actor-node-playwright-chrome:20

# Set working directory
WORKDIR /home/myuser

# Switch to root temporarily to set up directories
USER root
RUN mkdir -p /home/myuser/app && chown -R myuser:myuser /home/myuser/app
USER myuser

# Set working directory to the app folder
WORKDIR /home/myuser/app

# Copy package.json files with correct ownership
COPY --chown=myuser:myuser package.json ./
COPY --chown=myuser:myuser core/package.json ./core/
COPY --chown=myuser:myuser server/package.json ./server/

# Install only production dependencies with legacy peer deps
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional --legacy-peer-deps \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

# Copy built files from builder stage with correct ownership
COPY --from=builder --chown=myuser:myuser /home/myuser/app/core/dist ./core/dist
COPY --from=builder --chown=myuser:myuser /home/myuser/app/server/dist ./server/dist

# Copy package.json files again for runtime dependencies
COPY --from=builder --chown=myuser:myuser /home/myuser/app/core/package.json ./core/
COPY --from=builder --chown=myuser:myuser /home/myuser/app/server/package.json ./server/

# Create storage directory for Crawlee with proper permissions
RUN mkdir -p /home/myuser/app/server/storage && chmod -R 755 /home/myuser/app/server/storage && chown -R myuser:myuser /home/myuser/app/server/storage

# Ensure we run as the correct user
USER myuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the server
WORKDIR /home/myuser/app/server
CMD ["node", "dist/src/index.js"] 
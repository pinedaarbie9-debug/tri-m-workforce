# ============================================================
# Node.js 22 Alpine — Express backend + pre-built React frontend
# ============================================================

FROM node:22-alpine

WORKDIR /app

# ============================================================
# Copy files
# ============================================================
# Copy backend (for npm ci)
COPY backend/package.json backend/package-lock.json* ./backend/

# Install backend dependencies (cached layer)
RUN --mount=type=cache,target=/root/.npm,sharing=locked cd backend && npm ci

# Copy backend source
COPY backend/src ./backend/src
COPY backend/package.json ./backend/package.json

# Copy pre-built frontend
COPY dist ./dist

# ============================================================
# Verify na nandiyan yung files (para makita sa build logs)
# ============================================================
RUN echo "=== /app contents ===" && ls -la /app && \
    echo "=== /app/dist contents ===" && ls -la /app/dist && \
    echo "=== /app/dist/assets contents ===" && ls -la /app/dist/assets && \
    echo "=== /app/backend contents ===" && ls -la /app/backend

# ============================================================
# Environment
# ============================================================
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app

# Start the backend server
CMD ["node", "backend/src/server.js"]
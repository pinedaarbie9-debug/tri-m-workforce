# ============================================================
# Node.js 22 Alpine - Express backend + pre-built React frontend
# ============================================================

FROM node:22-alpine

WORKDIR /app

# ============================================================
# Backend dependencies (cached unless package files change)
# ============================================================
COPY backend/package.json backend/package-lock.json* ./backend/

RUN cd backend && \
    npm ci --omit=dev --no-audit --no-fund --prefer-offline \
      --fetch-retries=5 --fetch-timeout=120000 && \
    npm cache clean --force

# ============================================================
# Backend source code
# ============================================================
COPY backend/src ./backend/src

# ============================================================
# Pre-built frontend (run `npm run build` and commit dist/ first)
# ============================================================
COPY dist ./dist

# ============================================================
# Sanity check (shows in build logs)
# ============================================================
RUN echo "=== /app ===" && ls -la /app && \
    echo "=== dist ===" && ls -la /app/dist && \
    echo "=== express ===" && ls /app/backend/node_modules/express/package.json && \
    echo "=== pg ===" && ls /app/backend/node_modules/pg/package.json

# ============================================================
# Environment
# ============================================================
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "backend/src/server.js"]
# ============================================================
# Node.js 22 Alpine — Express backend + pre-built React frontend
# ============================================================

FROM node:22-alpine

WORKDIR /app

# ============================================================
# Copy backend package files
# ============================================================
COPY backend/package.json backend/package-lock.json* ./backend/

# Install backend dependencies (NO cache mount so node_modules persists in final image)
RUN cd backend && npm ci --omit=dev

# ============================================================
# Copy backend source code
# ============================================================
COPY backend/src ./backend/src

# ============================================================
# Copy pre-built frontend
# ============================================================
COPY dist ./dist

# ============================================================
# Verify na nandiyan yung files (para makita sa build logs)
# ============================================================
RUN echo "=== /app contents ===" && ls -la /app && \
    echo "=== /app/backend contents ===" && ls -la /app/backend && \
    echo "=== Check express ===" && ls -la /app/backend/node_modules/express/package.json && \
    echo "=== Check pg ===" && ls -la /app/backend/node_modules/pg/package.json

# ============================================================
# Environment
# ============================================================
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# ============================================================
# Start the backend server
# ============================================================
CMD ["node", "backend/src/server.js"]
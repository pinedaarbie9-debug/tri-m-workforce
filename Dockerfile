# ============================================================
# Node.js 22 Alpine — lightweight runtime for Express + static frontend
# Frontend (Vite) ay pre-built na, naka-commit sa dist/ folder.
# ============================================================

FROM node:22-alpine

WORKDIR /app

# I-copy muna LAHAT ng files (frontend + backend), para available na
# agad ang buong repo structure kasama ang backend/ folder.
COPY . .

# I-install lang ang backend dependencies.
# Yung dist/ (built frontend) ay naka-commit na sa repo — hindi na kailangan i-build dito.
RUN --mount=type=cache,target=/root/.npm,sharing=locked cd backend && npm ci

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the backend server (which also serves the static frontend)
CMD ["node", "backend/src/server.js"]
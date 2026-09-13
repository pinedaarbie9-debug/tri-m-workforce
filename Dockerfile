FROM node:22-alpine

WORKDIR /app

# I-copy muna LAHAT ng files (frontend + backend) bago mag-install/build,
# para available na agad ang buong repo structure kasama ang backend/ folder.
COPY . .

# HINDI na natin kailangan pang i-build ang frontend dito - naka-commit na
# ang dist/ folder sa repo (pre-built na). Ang kailangan lang i-install ay
# ang backend dependencies.
RUN --mount=type=cache,target=/root/.npm,sharing=locked cd backend && npm ci

EXPOSE 3000

CMD ["node", "backend/src/server.js"]
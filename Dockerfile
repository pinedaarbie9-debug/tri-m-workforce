FROM node:22-alpine

WORKDIR /app

# I-copy muna LAHAT ng files (frontend + backend) bago mag-install/build,
# para available na agad ang buong repo structure kasama ang backend/ folder.
COPY . .

# I-install ang frontend dependencies (may cache mount para mas mabilis
# sa susunod na builds - hindi na kailangan i-download ulit lahat) at i-build
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci
RUN npm run build

# I-install ang backend dependencies (may cache mount din)
RUN --mount=type=cache,target=/root/.npm,sharing=locked cd backend && npm ci

EXPOSE 3000

CMD ["node", "backend/src/server.js"]
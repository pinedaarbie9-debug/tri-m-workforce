FROM node:22-alpine

WORKDIR /app

# I-copy muna LAHAT ng files (frontend + backend) bago mag-install/build,
# para available na agad ang buong repo structure kasama ang backend/ folder.
COPY . .

# I-install ang frontend dependencies at i-build ito (gagawa ng dist/ folder)
RUN npm install
RUN npm run build

# I-install ang backend dependencies
RUN cd backend && npm install

EXPOSE 3000

CMD ["node", "backend/src/server.js"]
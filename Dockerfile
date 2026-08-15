# Stage 1: Build HarnessX core (CLI + library)
FROM node:20-alpine AS builder-core
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Web UI frontend
FROM node:20-alpine AS builder-web
WORKDIR /app
COPY client/package.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /workspace

# Install tsx for running the server (TypeScript source)
RUN npm install -g tsx

# Core library
COPY --from=builder-core /app/dist ./dist
COPY --from=builder-core /app/package.json ./

# Web UI static files
COPY --from=builder-web /app/client/dist ./client/dist

# Server source (imports from ../../src/ which are bundled in dist/)
COPY server/ ./server/
RUN cd server && npm install --production

EXPOSE 3000

# Start the Web UI server (uses tsx for TypeScript execution)
CMD ["npx", "tsx", "server/index.ts"]
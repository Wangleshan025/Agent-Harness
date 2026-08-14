FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /workspace
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN npm install --production
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
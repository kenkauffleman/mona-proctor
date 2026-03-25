FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV PORT=8081

RUN npm run backend:build

CMD ["node", "dist/backend/index.js"]

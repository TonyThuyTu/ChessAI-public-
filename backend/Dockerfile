FROM node:22-alpine

# Dùng corepack thay vì npm install -g pnpm — nhanh hơn, đúng version hơn
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

# Copy package files trước để cache layer deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy source (không copy .env nhờ .dockerignore)
COPY . .

RUN pnpm build

EXPOSE 5000

CMD ["node", "dist/index.js"]
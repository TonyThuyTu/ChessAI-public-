FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Thêm --config.allow-build để bypass lỗi
RUN pnpm install --config.allow-build=@google/genai,esbuild,protobufjs

COPY . .

RUN pnpm run build

CMD ["node", "dist/index.js"]
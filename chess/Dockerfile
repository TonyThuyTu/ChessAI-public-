FROM node:22-alpine

# Cài đặt pnpm
RUN npm install -g pnpm

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file cấu hình package
COPY package.json pnpm-lock.yaml ./

# Cài đặt các dependencies
RUN pnpm install 

# Copy toàn bộ mã nguồn
COPY . .

# Build Next.js
RUN pnpm run build

# Khởi chạy Next.js trong môi trường production
CMD ["pnpm", "start"]

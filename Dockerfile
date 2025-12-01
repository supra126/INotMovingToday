# Build stage
FROM node:24.11.1-slim AS builder

# 更新系統套件以修復已知漏洞
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# 複製 package files
COPY package.json pnpm-lock.yaml ./

# 安裝所有 dependencies (包含 devDependencies 用於 build)
RUN pnpm install --frozen-lockfile

# 複製原始碼
COPY . .

# Build Next.js 專案
RUN pnpm build

# Production stage
FROM node:24.11.1-slim AS production

# 更新系統套件以修復已知漏洞
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# 複製 package files
COPY package.json pnpm-lock.yaml ./

# 只安裝 production dependencies
RUN pnpm install --frozen-lockfile --prod

# 從 builder 複製 build 產物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 暴露埠號
EXPOSE 8080

# 啟動 Next.js server
CMD ["pnpm", "start"]

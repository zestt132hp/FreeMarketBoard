# Этап сборки
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY shared/ ./shared/
COPY vite.config.ts ./
RUN npm install
COPY . .
RUN npm run build

# Финальный образ
FROM node:20-alpine
WORKDIR /app

# Копируем ВСЕ необходимые файлы
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/dist ./dist

EXPOSE 5000
CMD ["npx", "tsx", "server/index.ts"]
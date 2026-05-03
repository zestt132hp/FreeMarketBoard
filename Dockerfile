# Этап сборки сервера
FROM node:20-bullseye AS server-builder

WORKDIR /app
COPY package*.json ./
COPY server/ ./server/
COPY shared/ ./shared/
RUN npm install --no-optional

# Финальный образ для сервера
FROM node:20-bullseye
WORKDIR /app

# Копируем необходимые файлы сервера
COPY --from=server-builder /app/package*.json ./
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/server ./server
COPY --from=server-builder /app/shared ./shared

EXPOSE 5000
CMD ["npx", "tsx", "server/index.ts"]
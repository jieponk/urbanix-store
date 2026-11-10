# Storefront produksi: Next.js. Build dilakukan saat container start (butuh backend hidup
# karena halaman membaca data produk saat build).
FROM node:20-alpine

RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=2048 TZ=Asia/Jakarta
WORKDIR /app

COPY apps/storefront/package.json apps/storefront/package-lock.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY apps/storefront/ ./
EXPOSE 3000
CMD ["sh", "-c", "npm run build && exec npx next start -p 3000 -H 0.0.0.0"]

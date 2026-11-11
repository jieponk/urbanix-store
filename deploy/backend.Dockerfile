# Backend produksi: Django + Gunicorn
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 TZ=Asia/Jakarta
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libpq5 tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY apps/backend/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/backend/ /app/
COPY deploy/backend-start.sh /start.sh
RUN chmod +x /start.sh && rm -f /app/db.sqlite3 /app/.env

EXPOSE 8000
CMD ["/start.sh"]

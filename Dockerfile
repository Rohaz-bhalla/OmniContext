# --- Stage 1: Build the Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/web
COPY apps/web/package.json apps/web/pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install
COPY apps/web ./
# We build as a static export for easier serving
RUN pnpm run build

# --- Stage 2: Prepare the Backend & Final Image ---
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python requirements
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY apps/backend /app/backend

# Copy the built frontend from Stage 1 into a folder the backend can see
COPY --from=frontend-builder /app/web/out /app/backend/static

# Set Hugging Face's required port
ENV PORT=7860
EXPOSE 7860

WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
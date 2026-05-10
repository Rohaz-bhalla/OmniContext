# ==========================================
# STAGE 1: Build the Next.js Frontend
# ==========================================
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Install pnpm to match your turborepo setup
RUN npm install -g pnpm

# Copy the entire monorepo into the container
COPY . .

# Install all workspace dependencies
RUN pnpm install

# Build the Next.js web application
# With output: 'export' in next.config.js, this generates an 'out' folder
WORKDIR /app/apps/web
RUN pnpm run build

# ==========================================
# STAGE 2: Prepare the FastAPI Backend
# ==========================================
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements.txt from the ROOT directory (where it actually lives)
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend source code
COPY apps/backend /app/backend

# Copy the built static HTML/JS from Stage 1 into the backend's static folder
COPY --from=frontend-builder /app/apps/web/out /app/backend/static

# Set Hugging Face's required port environment
WORKDIR /app/backend
ENV PORT=7860
EXPOSE 7860

# Boot up the server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
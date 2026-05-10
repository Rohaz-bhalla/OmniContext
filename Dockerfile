# ... Stage 1: Build the Frontend (Keep as is) ...

# --- Stage 2: Prepare the Backend ---
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Use the full path relative to the REPO ROOT
# This matches your folder structure: apps/backend/requirements.txt
COPY ./apps/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY ./apps/backend /app/backend

# Copy the built frontend from Stage 1
COPY --from=frontend-builder /app/web/out /app/backend/static

# Set environment to run from backend folder
WORKDIR /app/backend
ENV PORT=7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
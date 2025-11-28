# GiveCalc API - Build from project root
# This Dockerfile is used for Google Cloud Run deployment

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install API requirements
COPY api/requirements.txt ./api-requirements.txt
RUN pip install --no-cache-dir -r api-requirements.txt

# Copy the givecalc package and API
COPY givecalc /app/givecalc
COPY config.yaml /app/config.yaml
COPY api /app/api

# Set Python path
ENV PYTHONPATH=/app

# Expose port (Cloud Run uses PORT env var)
ENV PORT=8080
EXPOSE 8080

# Run the FastAPI application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]

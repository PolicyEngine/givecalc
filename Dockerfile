# GiveCalc API - Build from project root
# This Dockerfile is used for Google Cloud Run deployment

FROM python:3.13-slim

WORKDIR /app

# Install system dependencies and uv
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies using uv
RUN uv pip install --system -e . --no-cache

# Copy the givecalc package and API
COPY givecalc /app/givecalc
COPY config.yaml /app/config.yaml
COPY api /app/api

# Set Python path
ENV PYTHONPATH=/app

# Use Modal for PolicyEngine calculations (set to "false" for local dev)
ENV USE_MODAL=true

# Expose port (Cloud Run uses PORT env var)
ENV PORT=8080
EXPOSE 8080

# Run the FastAPI application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]

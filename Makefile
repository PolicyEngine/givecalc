.PHONY: test run format install clean api frontend deploy

# ============= Testing =============

# Run tests
test:
	uv run pytest tests/ -v

# Run tests with coverage
test-cov:
	uv run pytest tests/ -v --cov=givecalc --cov-report=term-missing

# Run specific test
test-one:
	uv run pytest $(TEST) -v -s

# Run performance test
perf:
	uv run pytest tests/test_performance.py -v -s

# ============= Development =============

# Run the Streamlit app (legacy)
run-streamlit:
	streamlit run app.py

# Run the FastAPI backend
api:
	PYTHONPATH=. uvicorn api.main:app --reload --port 8000

# Run the React frontend
frontend:
	cd frontend && npm run dev

# Run both backend and frontend (separate terminals recommended)
dev:
	@echo "Start API in one terminal: make api"
	@echo "Start frontend in another: make frontend"

# Format code
format:
	black givecalc/ tests/ ui/ api/ --line-length 79
	isort givecalc/ tests/ ui/ api/
	cd frontend && npm run lint -- --fix 2>/dev/null || true

# ============= Installation =============

# Install Python package in editable mode
install:
	uv pip install --system -e .

# Install with dev dependencies
install-dev:
	uv pip install --system -e ".[dev]"
	pip install -r api/requirements.txt

# Install frontend dependencies
install-frontend:
	cd frontend && npm install

# Install everything
install-all: install-dev install-frontend

# ============= Docker & Deployment =============

# Build Docker images locally
docker-build:
	docker build -t givecalc-api -f Dockerfile .
	docker build -t givecalc-frontend -f frontend/Dockerfile frontend/

# Run API locally in Docker
docker-api:
	docker run -p 8000:8080 givecalc-api

# Run frontend locally in Docker
docker-frontend:
	docker run -p 3000:8080 -e VITE_API_URL=http://localhost:8000 givecalc-frontend

# Deploy to Google Cloud Run
deploy-api:
	gcloud run deploy givecalc-api \
		--source . \
		--region us-central1 \
		--memory 4Gi \
		--cpu 2 \
		--timeout 300 \
		--max-instances 10 \
		--min-instances 1 \
		--allow-unauthenticated

deploy-frontend:
	@echo "Getting API URL..."
	$(eval API_URL := $(shell gcloud run services describe givecalc-api --region us-central1 --format='value(status.url)'))
	gcloud run deploy givecalc-frontend \
		--source ./frontend \
		--region us-central1 \
		--memory 512Mi \
		--cpu 1 \
		--max-instances 10 \
		--min-instances 0 \
		--allow-unauthenticated \
		--set-build-env-vars VITE_API_URL=$(API_URL)

deploy: deploy-api deploy-frontend
	@echo "Deployment complete!"
	@echo "API: $$(gcloud run services describe givecalc-api --region us-central1 --format='value(status.url)')"
	@echo "Frontend: $$(gcloud run services describe givecalc-frontend --region us-central1 --format='value(status.url)')"

# ============= Cleanup =============

# Clean build artifacts
clean:
	rm -rf build/ dist/ *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf frontend/dist frontend/node_modules

# Update dependencies
update:
	pip install --upgrade policyengine-us policyengine-core
	cd frontend && npm update

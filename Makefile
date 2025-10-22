.PHONY: test run format install clean

# Run tests
test:
	uv run pytest tests/ -v

# Run tests with coverage
test-cov:
	uv run pytest tests/ -v --cov=givecalc --cov-report=term-missing

# Run specific test
test-one:
	uv run pytest $(TEST) -v -s

# Run the Streamlit app
run:
	streamlit run app.py

# Format code
format:
	black givecalc/ tests/ ui/ --line-length 79
	isort givecalc/ tests/ ui/

# Install package in editable mode
install:
	uv pip install --system -e .

# Install with dev dependencies
install-dev:
	uv pip install --system -e ".[dev]"

# Clean build artifacts
clean:
	rm -rf build/ dist/ *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache

# Run performance test
perf:
	uv run pytest tests/test_performance.py -v -s

# Update dependencies
update:
	pip install --upgrade policyengine-us policyengine-core

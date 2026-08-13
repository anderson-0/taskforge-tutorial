.PHONY: install dev env setup seed test test-cov lint typecheck audit verify run migrate reset-db clean

install:
	pip install -r requirements.txt
	pip install --no-build-isolation --no-deps -e .

dev: install

env:
	@test -f .env || cp .env.example .env

setup: dev env migrate seed

seed:
	python -m app.seed

test:
	pytest -v

test-cov:
	pytest --strict-config --cov=app --cov-branch --cov-report=html --cov-report=term-missing

lint:
	ruff check .

typecheck:
	mypy app

audit:
	python -m pip_audit --skip-editable

verify: lint typecheck test-cov audit

run:
	uvicorn app.main:app --reload

migrate:
	alembic upgrade head

reset-db:
	rm -f taskforge.db
	alembic upgrade head
	python -m app.seed

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf .ruff_cache
	rm -rf .mypy_cache
	rm -rf htmlcov
	rm -f .coverage coverage.xml
	rm -rf *.egg-info
	rm -f taskforge.db
	rm -f test.db

@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>&1 || (
    echo Python was not found on PATH.
    exit /b 1
)
python -c "import sys; sys.exit('Python 3.12 or newer is required') if sys.version_info < (3, 12) else None" || exit /b 1

if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv || exit /b 1
)

".venv\Scripts\python.exe" -m pip install -r requirements.txt || exit /b 1
".venv\Scripts\python.exe" -m pip install --no-build-isolation --no-deps -e . || exit /b 1

if not exist ".env" (
    copy /Y ".env.example" ".env" >nul || exit /b 1
)

".venv\Scripts\python.exe" -m alembic upgrade head || exit /b 1
".venv\Scripts\python.exe" -m app.seed || exit /b 1

echo TaskForge setup complete.
echo Start the API with: .venv\Scripts\python.exe -m uvicorn app.main:app --reload
echo OpenAPI documentation: http://localhost:8000/docs

@echo off
echo ========================================================
echo Starting SQL Practice Platform (Backend + Frontend)
echo ========================================================

echo Starting Backend API on http://127.0.0.1:5000 ...
start "SQL Practice Backend (Flask)" cmd /k "cd backend && ..\venv\Scripts\python.exe run.py"

timeout /t 2 /nobreak >nul

echo Starting Frontend on http://localhost:5173 ...
start "SQL Practice Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API: http://127.0.0.1:5000
echo ========================================================

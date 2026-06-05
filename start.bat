@echo off
cd /d "D:\AAAOddsAndEnds\PROGRAM\lab-assistant"

echo Starting Lab Assistant...
echo.

:: Backend — run in background, no separate window
echo [1/2] Starting backend...
start /b cmd /c "cd backend && venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 > backend.log 2>&1"
echo        Backend: http://127.0.0.1:8000 (logs: backend\backend.log)

:: Frontend — one visible terminal
echo [2/2] Starting frontend...
start "Lab Assistant" cmd /k "cd frontend && npm run dev"

echo.
echo Frontend will open at http://localhost:5173
echo Close this window and the frontend terminal to stop both servers.
echo.
echo Press Ctrl+C in the frontend window to stop.
pause

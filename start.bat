@echo off
cd /d "D:\AAAOddsAndEnds\PROGRAM\lab-assistant"

echo Starting Lab Assistant...
echo.

echo [1/2] Starting backend (minimized window)...
start /min "Backend" cmd /c "cd /d D:\AAAOddsAndEnds\PROGRAM\lab-assistant\backend && venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000"
echo        Backend: http://127.0.0.1:8000

echo [2/2] Starting frontend...
start "Lab Assistant" cmd /k "cd /d D:\AAAOddsAndEnds\PROGRAM\lab-assistant\frontend && npm run dev"

echo.
echo Frontend: http://localhost:5173
echo Close the frontend terminal to stop both servers.
pause

@echo off
cd /d "D:\Claude Program\lab-assistant"

start "Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:5173

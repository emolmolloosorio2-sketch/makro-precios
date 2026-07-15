@echo off
cd /d "%~dp0"
start "Makro App" cmd /c "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
echo.
echo Abre tu navegador en: http://localhost:8000
echo.
echo Para cerrar, solo cierra esta ventana.
pause

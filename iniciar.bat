@echo off
cd /d "%~dp0"
echo Cerrando servidor anterior si existe...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do taskkill /f /pid %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo Iniciando servidor...
start "Makro App" cmd /c "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 4 /nobreak >nul
echo.
echo Abre tu navegador en: http://localhost:8000
echo.
echo IMPORTANTE: No cierres la ventana nueva que se abrio.
pause

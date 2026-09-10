@echo off
echo ============================================
echo   SkyPredict AI - Flight Delay Prediction
echo ============================================
echo.
echo Starting Flask backend on port 5000...
start "Flask Backend" cmd /k "cd /d C:\Hackathon\Flight Delay AI && python backend\app.py"
echo.
echo Starting React frontend on port 3000...
timeout /t 3 > nul
start "React Frontend" cmd /k "cd /d C:\Hackathon\Flight Delay AI\frontend && npm start"
echo.
echo ============================================
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:3000
echo ============================================
echo.
pause

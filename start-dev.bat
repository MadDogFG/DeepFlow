@echo off
echo Starting DeepFlow...

:: Start Backend in a new window
start "DeepFlow Backend" cmd /k "cd backend-dotnet && dotnet run --project DeepFlow.Api"

:: Start Frontend in a new window
start "DeepFlow Frontend" cmd /k "cd frontend-vue && npm run dev"

echo DeepFlow is starting...
echo Backend: http://localhost:5031
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this launcher (windows will remain open)...
pause

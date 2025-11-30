# DeepFlow Launcher Logic
# This script manages the lifecycle of the backend and frontend processes.

$ErrorActionPreference = "SilentlyContinue"

# 1. Start Backend
Write-Host "Starting Backend..."
$backendProcess = Start-Process -FilePath "dotnet" -ArgumentList "run --project backend-dotnet/DeepFlow.Api" -PassThru -WindowStyle Hidden -WorkingDirectory "$PSScriptRoot"

# 2. Start Frontend
Write-Host "Starting Frontend..."
# We use cmd /c to run npm because npm is a batch file on Windows
$frontendProcess = Start-Process -FilePath "cmd" -ArgumentList "/c cd frontend-vue && npm run dev" -PassThru -WindowStyle Hidden -WorkingDirectory "$PSScriptRoot"

# 3. Wait for services to initialize
Start-Sleep -Seconds 5

# 4. Open Browser
Start-Process "http://localhost:5173"

# 5. Monitor Loop
# We wait for the backend process to exit. 
# The backend will exit automatically if it stops receiving heartbeats from the browser.
if ($backendProcess) {
    Wait-Process -Id $backendProcess.Id
}

# 6. Cleanup
# If backend exits, we kill the frontend.
if ($frontendProcess) {
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    # Also try to kill any node processes spawned by the cmd
    # This is a bit aggressive but ensures cleanup in dev environment
    taskkill /F /IM node.exe /T > $null 2>&1
}

Write-Host "DeepFlow stopped."

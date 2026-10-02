# PowerShell script to launch both Backend and Frontend
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting SQL Practice Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Start Backend in new process
Write-Host "Launching Backend API on http://127.0.0.1:5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; ..\venv\Scripts\python.exe run.py"

Start-Sleep -Seconds 2

# Start Frontend in new process
Write-Host "Launching Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`nBoth services launched!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:5000" -ForegroundColor White

# LangoSoft startup script
# Runs backend and frontend in separate windows

$backendPath  = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Write-Host "Starting LangoSoft..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend  -> http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "First run will download Divine Comedy texts (~2 MB) from Project Gutenberg." -ForegroundColor Yellow
Write-Host ""

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; dotnet run" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal

Write-Host "Both processes launched. Open http://localhost:5173 in your browser." -ForegroundColor Cyan

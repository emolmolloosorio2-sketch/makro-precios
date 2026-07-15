# Start Makro price backend server
$port = 8000
$proc = netstat -ano | findstr ":$port"
if ($proc) {
    $id = ($proc -split '\s+')[-1]
    Write-Host "Killing existing process on port $port (PID $id)..."
    Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Set-Location -LiteralPath "$PSScriptRoot\backend"
Write-Host "Starting Makro API on http://localhost:$port ..."
$env:PYTHONIOENCODING='utf-8'
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", $port
Start-Sleep -Seconds 2
Write-Host "Backend started!"

# Script per riavviare i server Web3 Contract Tester
Write-Host "=== KILLING ALL NODE SERVERS ===" -ForegroundColor Red

# Kill all node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

Write-Host "=== CLEANING UP ===" -ForegroundColor Yellow

# Kill any process using port 5173 and 5174
$connections = Get-NetTCPConnection -LocalPort 5173,5174 -ErrorAction SilentlyContinue
if ($connections) {
    $connections | ForEach-Object { 
        try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
}

# Wait a moment
Start-Sleep -Seconds 2

Write-Host "=== STARTING SERVER ===" -ForegroundColor Green

# Change to project directory and start server
Set-Location -Path "$PSScriptRoot\web3-contract-tester"
npm run dev

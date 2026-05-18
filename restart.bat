@echo off
echo ==========================================
echo KILLING ALL NODE SERVERS
echo ==========================================
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq *vite*" 2>nul

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo ==========================================
echo STARTING SERVER
echo ==========================================
cd web3-contract-tester
npm run dev

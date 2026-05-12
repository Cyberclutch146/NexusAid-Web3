# NexusAid-Web3 Quick Start Script for Windows
# This script automates the deployment of contracts and starts both backend and frontend.

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "🚀  NexusAid-Web3: Full Stack Launcher  🚀" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# 1. Start Hardhat Local Node
Write-Host "[1/4] Starting Hardhat Node in a new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run node:contracts"

# 2. Wait for Node initialization
Write-Host "⏳ Waiting 8 seconds for node to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# 3. Deploy Smart Contracts
Write-Host "[2/4] Deploying contracts to Localhost..." -ForegroundColor Yellow
npm run deploy:local

# 3.5 Sync Environment Variables
Write-Host "🔄 Syncing contract addresses..." -ForegroundColor Gray
npm run sync-env

# 4. Start Backend
Write-Host "[3/4] Starting Backend Server in a new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:backend"

# 5. Start Frontend
Write-Host "[4/4] Starting Frontend Dev Server in a new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:frontend"

Write-Host @"
  _   _                             _     _ 
 | \ | | _____  ___   _ ___    / \   (_) __| |
 |  \| |/ _ \ \/ / | | / __|  / _ \  | |/ _` |
 | |\  |  __/>  <| |_| \__ \ / ___ \ | | (_| |
 |_| \_|\___/_/\_\\__,_|___//_/   \_\|_|\__,_|
"@ -ForegroundColor Cyan

Write-Host "-----------------------------------------------"
Write-Host "• Hardhat Node: Running in separate window"
Write-Host "• Contracts: Deployed to localhost"
Write-Host "• Backend: Starting in separate window"
Write-Host "• Frontend: Starting in separate window"
Write-Host "-----------------------------------------------"

Write-Host @"
  ____  _   _  ____ ____ _____ ____ ____  
 / ___|| | | |/ ___/ ___| ____/ ___/ ___| 
 \___ \| | | | |  | |   |  _| \___ \___ \ 
  ___) | |_| | |__| |___| |___ ___) |__) |
 |____/ \___/ \____\____|_____|____/____/ 
"@ -ForegroundColor Green

Write-Host "🚀 Happy coding! Your environment is ready." -ForegroundColor Cyan

#!/usr/bin/env pwsh
# SafeVixAI Dev Setup Script — Windows PowerShell
# Usage: .\scripts\dev-setup.ps1

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host "╔════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    SafeVixAI Development Setup     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Prerequisites check
Write-Host "→ Checking prerequisites..." -ForegroundColor Yellow
$prereqs = @(
    @{ Name = "Python 3.11+"; Command = "python --version" },
    @{ Name = "Node.js 20+";  Command = "node --version" },
    @{ Name = "Docker";       Command = "docker --version" }
)

foreach ($p in $prereqs) {
    try {
        $v = Invoke-Expression $p.Command 2>$null
        Write-Host "  ✓ $($p.Name): $v" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $($p.Name): NOT FOUND" -ForegroundColor Red
        Write-Host "    Install $($p.Name) and re-run this script" -ForegroundColor Red
        exit 1
    }
}

# Backend setup
Write-Host "`n→ Setting up backend..." -ForegroundColor Yellow
Set-Location -Path "$ROOT\backend"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "  ✓ Created virtual environment" -ForegroundColor Green
}
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip -q | Out-Null
pip install -r requirements.txt -q
Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green
deactivate

# Chatbot setup
Write-Host "`n→ Setting up chatbot service..." -ForegroundColor Yellow
Set-Location -Path "$ROOT\chatbot_service"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "  ✓ Created virtual environment" -ForegroundColor Green
}
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip -q | Out-Null
pip install -r requirements.txt -q
Write-Host "  ✓ Chatbot dependencies installed" -ForegroundColor Green
deactivate

# Frontend setup
Write-Host "`n→ Setting up frontend..." -ForegroundColor Yellow
Set-Location -Path "$ROOT\frontend"
npm ci --silent
Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green

# Copy .env files
Write-Host "`n→ Setting up environment files..." -ForegroundColor Yellow
$envDirs = @(
    @{ Dir = "backend"; File = ".env" },
    @{ Dir = "chatbot_service"; File = ".env" },
    @{ Dir = "frontend"; File = ".env.local" }
)

foreach ($e in $envDirs) {
    $envPath = "$ROOT\$($e.Dir)\$($e.File)"
    $examplePath = "$ROOT\$($e.Dir)\$($e.File).example"
    if ((Test-Path $examplePath) -and -not (Test-Path $envPath)) {
        Copy-Item $examplePath $envPath
        Write-Host "  ✓ Created $($e.Dir)\$($e.File) from .env.example" -ForegroundColor Green
    } elseif (Test-Path $envPath) {
        Write-Host "  ⚡ $($e.Dir)\$($e.File) already exists, skipping" -ForegroundColor Yellow
    }
}

# Git hooks
Write-Host "`n→ Setting up git hooks..." -ForegroundColor Yellow
try {
    pip install pre-commit -q
    Set-Location -Path $ROOT
    pre-commit install 2>&1 | Out-Null
    Write-Host "  ✓ Pre-commit hooks installed" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ pre-commit install failed (non-critical)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Setup Complete!           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Start development:" -ForegroundColor White
Write-Host "  Terminal 1: cd backend && .venv\Scripts\Activate && uvicorn main:app --reload --port 8000"
Write-Host "  Terminal 2: cd chatbot_service && .venv\Scripts\Activate && uvicorn main:app --reload --port 8010"
Write-Host "  Terminal 3: cd frontend && npm run dev"
Write-Host ""
Write-Host "Run tests:" -ForegroundColor White
Write-Host "  make test"

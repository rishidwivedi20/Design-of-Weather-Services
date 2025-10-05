# Activate virtual environment for the entire project
# Usage: .\activate.ps1

$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$activateScript = Join-Path $rootDir '.venv\Scripts\Activate.ps1'

if (Test-Path $activateScript) {
    Write-Host 'Activating project virtual environment...' -ForegroundColor Green
    Write-Host 'Virtual environment location: .venv' -ForegroundColor Cyan
    Write-Host 'Run: deactivate   to exit the virtual environment' -ForegroundColor Cyan
    & $activateScript
} else {
    Write-Host 'Virtual environment not found!' -ForegroundColor Red
    Write-Host 'Please run: py -m venv .venv' -ForegroundColor Yellow
    Write-Host 'Then run: .\.venv\Scripts\python.exe -m pip install -r backend-python-nlp\requirements.txt' -ForegroundColor Yellow
    exit 1
}
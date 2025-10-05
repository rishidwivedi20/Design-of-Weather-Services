# Aviation Weather Services - Full Stack Startup Script (Windows PowerShell)
# Starts: Node.js backend, Python NLP backend, React frontend
# Improvements:
#  - Works even when script execution is restricted (can be launched with -ExecutionPolicy Bypass)
#  - Auto installs dependencies if missing (can skip with -NoInstall)
#  - Uses venv python directly (no Activate.ps1 needed)
#  - Parameterized ports
#  - Uses uvicorn for Python service (default port 8001) matching docs
#  - Optional helper launcher (-UseHelper) and health readiness waits

[CmdletBinding()]
param(
    [int]$NodePort = 5000,
    [int]$PythonPort = 8001,
    [int]$FrontendPort = 5173,
    [switch]$NoInstall,
    [switch]$SkipPython,      # allow skipping python service if heavy deps
    [switch]$SkipFrontend,
    [switch]$SkipBackend,

    [int]$HealthTimeoutSec = 25, # seconds to wait for port readiness
    [switch]$NoHealthWait     # do not wait for ports
)

Write-Host "Starting Aviation Weather Services Full Stack..." -ForegroundColor Green
Write-Host "(Node:$NodePort  Python:$PythonPort  Frontend:$FrontendPort)" -ForegroundColor DarkGray
Write-Host ""

function Start-ServiceInNewWindow {
    param(
        [Parameter(Mandatory)] [string]$Title,
        [Parameter(Mandatory)] [string]$Command,
        [Parameter(Mandatory)] [string]$WorkingDirectory
    )
    # Build a concise script block string; use single quotes for paths/titles to avoid escaping
    # Prepend & only if command starts with a path in quotes isn't already using an invocation operator
    if ($Command -notmatch '^\s*&') { $CommandForExec = $Command } else { $CommandForExec = $Command }
    $psCommand = "& { `$Host.UI.RawUI.WindowTitle = '$Title'; Write-Host '[START]' -ForegroundColor DarkGray; Set-Location '$WorkingDirectory'; $CommandForExec }"
    Start-Process powershell -ArgumentList "-NoExit","-Command", $psCommand -WorkingDirectory $WorkingDirectory -WindowStyle Normal | Out-Null
    Start-Sleep -Milliseconds 800
}

# Paths
$nodeDir      = Join-Path $PSScriptRoot "backend-node"
$pythonDir    = Join-Path $PSScriptRoot "backend-python-nlp"
$frontendDir  = Join-Path $PSScriptRoot "frontend-react"
$pythonVenv   = Join-Path $PSScriptRoot ".venv"
$pythonExe    = Join-Path $pythonVenv "Scripts\python.exe"
$pipExe       = Join-Path $pythonVenv "Scripts\pip.exe"

function Ensure-NodeDeps {
    param([string]$Dir)
    if (Test-Path (Join-Path $Dir "package.json")) {
        if (-not (Test-Path (Join-Path $Dir "node_modules"))) {
            if ($NoInstall) { Write-Host "Skipping install in $Dir (NoInstall)" -ForegroundColor DarkYellow; return }
            Write-Host "Installing npm dependencies in $Dir..." -ForegroundColor Yellow
            Push-Location $Dir
            try {
                npm.cmd install | Out-Null
            } finally { Pop-Location }
        }
    }
}

function Ensure-PythonVenv {
    if ($SkipPython) { return }
    if (-not (Test-Path $pythonDir)) { return }
    if (-not (Test-Path $pythonExe)) {
        if ($NoInstall) { Write-Host "Skipping Python venv creation (NoInstall)" -ForegroundColor DarkYellow; return }
        Write-Host "Creating Python venv..." -ForegroundColor Yellow
        Push-Location $pythonDir
        try { py -3.11 -m venv .venv } catch { py -m venv .venv }
        finally { Pop-Location }
    }
    if ((Test-Path $pipExe) -and -not $NoInstall) {
        # Heuristic: install only if FastAPI missing (robust against importlib shadowing)
        $needInstall = 1
        try {
            & $pythonExe -c "import fastapi" 2>$null
            if ($LASTEXITCODE -eq 0) { $needInstall = 0 }
        } catch { $needInstall = 1 }
        if ($needInstall -ne 0) {
            Write-Host "Installing Python requirements..." -ForegroundColor Yellow
            Push-Location $pythonDir
            try { & $pythonExe -m pip install --upgrade pip; & $pipExe install -r requirements.txt }
            finally { Pop-Location }
        }
    }
}

function Test-PortOpen {
    param([int]$Port)
    try {
        $tcp = New-Object Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect('127.0.0.1', $Port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(800)
        if ($success -and $tcp.Connected) { $tcp.Close(); return $true }
        $tcp.Close(); return $false
    } catch { return $false }
}

function Wait-For-Service {
    param(
        [string]$Name,
        [int]$Port,
        [int]$TimeoutSec
    )
    if ($NoHealthWait) { return }
    Write-Host "Waiting for $Name (port $Port) to become ready..." -ForegroundColor DarkGray
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
        if (Test-PortOpen -Port $Port) {
            $elapsed = [int]$sw.Elapsed.TotalSeconds
            Write-Host "[OK] $Name ready on port $Port ($elapsed s)" -ForegroundColor Green
            return
        }
        Start-Sleep -Milliseconds 600
    }
    Write-Host "[WARN] $Name not confirmed ready within $TimeoutSec s (continuing)" -ForegroundColor Yellow
}

if (-not $SkipBackend)  { Ensure-NodeDeps -Dir $nodeDir }
if (-not $SkipFrontend) { Ensure-NodeDeps -Dir $frontendDir }
Ensure-PythonVenv

# Start services
if (-not $SkipBackend) {
    Write-Host "Starting Node.js Backend on port $NodePort..." -ForegroundColor Yellow
    $env:PORT = $NodePort
    if (-not $SkipPython) { $env:PYTHON_NLP_URL = "http://localhost:$PythonPort" }
    Start-ServiceInNewWindow -Title "Node Backend" -Command "npm start" -WorkingDirectory $nodeDir
}

if (-not $SkipPython) {
    $env:PYTHON_NLP_URL = "http://localhost:$PythonPort"
    Write-Host "Starting Python NLP Backend via run.py launcher..." -ForegroundColor Yellow
    # Use the simplified Python launcher that handles virtual environment automatically
    $pyCmd = "py run.py"
    Start-ServiceInNewWindow -Title "Python NLP" -Command $pyCmd -WorkingDirectory $pythonDir
}

if (-not $SkipFrontend) {
    Write-Host "Starting React Frontend on port $FrontendPort..." -ForegroundColor Yellow
    # Vite uses 5173 by default; we can pass --port if user overrides
    $frontendCmd = if ($FrontendPort -ne 5173) { "npm run dev -- --port $FrontendPort" } else { "npm run dev" }
    Start-ServiceInNewWindow -Title "Frontend" -Command $frontendCmd -WorkingDirectory $frontendDir
}

try {
    if (-not $NoHealthWait) {
        if (-not $SkipBackend)  { Wait-For-Service -Name 'Node.js API' -Port $NodePort -TimeoutSec $HealthTimeoutSec }
        if (-not $SkipPython)   { Wait-For-Service -Name 'Python NLP API' -Port $PythonPort -TimeoutSec $HealthTimeoutSec }
        if (-not $SkipFrontend) { Wait-For-Service -Name 'Frontend (Vite Dev Server)' -Port $FrontendPort -TimeoutSec $HealthTimeoutSec }
    }
} catch { Write-Host "Health wait encountered an error: $_" -ForegroundColor Yellow }

Write-Host ""; Write-Host "All service launch commands issued." -ForegroundColor Green
Write-Host "Frontend:      http://localhost:$FrontendPort" -ForegroundColor Cyan
if (-not $SkipBackend) { Write-Host "Node.js API:   http://localhost:$NodePort" -ForegroundColor Cyan }
if (-not $SkipPython)  { Write-Host "Python NLP API: http://localhost:$PythonPort" -ForegroundColor Cyan }
Write-Host ""; Write-Host "Close individual windows to stop each service." -ForegroundColor White

Write-Host "Tip: If script execution is blocked, run: powershell -ExecutionPolicy Bypass -File .\start-all-services.ps1" -ForegroundColor DarkGray
Write-Host "Hint: Use -NoHealthWait to skip readiness checks, -SkipPython to skip NLP service." -ForegroundColor DarkGray

if ($Host.Name -notmatch 'Visual Studio.*') {
    # Prevent script window from closing immediately when double-clicked
    Read-Host "Press Enter to exit this launcher"
}
@echo off
setlocal
title Everdale startet
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js und npm wurden nicht gefunden.
  echo Bitte installiere Node.js und starte diese Datei danach erneut.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Everdale wird einmalig eingerichtet ...
  call npm install
  if errorlevel 1 (
    echo Die Einrichtung ist fehlgeschlagen.
    pause
    exit /b 1
  )
)

set "EVERDALE_PROJECT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$project = $env:EVERDALE_PROJECT; $url = 'http://127.0.0.1:5173';" ^
  "try { $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if ($response.StatusCode -eq 200 -and $response.Content -match 'Everdale') { Start-Process $url; exit 0 } } catch {};" ^
  "Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory $project -WindowStyle Hidden;" ^
  "$ready = $false; for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Milliseconds 250; try { $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if ($response.StatusCode -eq 200 -and $response.Content -match 'Everdale') { $ready = $true; break } } catch {} };" ^
  "if ($ready) { Start-Process $url; exit 0 }; exit 1"

if errorlevel 1 (
  echo Everdale konnte nicht gestartet werden. Port 5173 ist eventuell belegt.
  pause
  exit /b 1
)

exit /b 0

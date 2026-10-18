@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12 or newer, then open this file again.
  pause
  exit /b 1
)
if not exist "frontend\node_modules\vite" (
  echo Installing app dependencies...
  call npm run setup
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
if not exist "backend\node_modules\tsx" (
  call npm run setup
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Keep this window open while using Blueprint3D.
echo Dimension-aware analysis requires Python libraries and Tesseract. See README.md.
call npm run dev -- --open
pause

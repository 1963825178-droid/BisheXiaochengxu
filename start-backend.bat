@echo off
setlocal

cd /d "%~dp0server"

echo Starting Emotion Keyword backend...
echo Server directory: %cd%
echo.

if not exist "node_modules\express" (
  echo Dependencies are missing. Installing now...
  call npm install
  if errorlevel 1 (
    echo.
    echo Failed to install dependencies. Please check your network or npm setup.
    pause
    exit /b 1
  )
)

echo Backend will run at http://127.0.0.1:3000
echo Keep this window open while using the mini program.
echo.

call npm start

echo.
echo Backend process exited.
pause

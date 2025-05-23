@echo off
setlocal
REM Set console to UTF-8 for better character display in the new console window
REM and for this script's echo statements if they were to contain special characters.
chcp 65001 > nul

REM Change current directory to the script's directory
cd /d "%~dp0"

echo Starting pnpm dev server in a new window...
REM The 'start' command will open pnpm dev in a new console window.
REM The first "" is a title for the new window.
REM cmd /k will keep the new window open after pnpm dev finishes/is stopped.
REM We also set chcp 65001 in the new window for pnpm dev output and add a message.
start "PNPM Dev Server" cmd /k "chcp 65001 > nul && echo Running pnpm dev in this window (Press Ctrl+C here to stop it)... && pnpm dev"

echo.
echo Waiting for 2 seconds for the server to initialize...
REM timeout command waits for N seconds. /nobreak means Ctrl+C won't skip the timeout in this script.
REM Output is redirected to nul to keep this window clean.
timeout /t 2 /nobreak > nul

REM Define the local URL - adjust if your pnpm dev usually uses a different port
set "LOCAL_URL=http://localhost:3000"

echo.
echo Assuming server is ready on %LOCAL_URL%
echo Opening %LOCAL_URL% in your default browser...

echo.
echo Browser launch attempted. The dev server should be running in a separate window.
echo This script window will now close.

REM No 'pause' command here, so the script window will close after this line.
endlocal
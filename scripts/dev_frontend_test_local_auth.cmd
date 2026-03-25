@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT_DIR=%%~fI"
set "ENV_FILE=%ROOT_DIR%\.env"

if not exist "%ENV_FILE%" (
  echo [dev_frontend_test_local_auth] Missing .env file: "%ENV_FILE%"
  exit /b 1
)

set "LOCAL_DEV_AUTH_TOKEN="
for /f "usebackq tokens=1,* delims==" %%A in (`findstr /R /B /C:"LOCAL_DEV_AUTH_TOKEN=" "%ENV_FILE%"`) do (
  set "LOCAL_DEV_AUTH_TOKEN=%%B"
)

if not defined LOCAL_DEV_AUTH_TOKEN (
  echo [dev_frontend_test_local_auth] LOCAL_DEV_AUTH_TOKEN was not found in .env
  exit /b 1
)

set "VITE_LOCAL_DEV_AUTH_TOKEN=!LOCAL_DEV_AUTH_TOKEN!"

echo [dev_frontend_test_local_auth] Starting apps/web on localhost with test auth contour and LOCAL_DEV_AUTH_TOKEN
echo [dev_frontend_test_local_auth] VITE_LOCAL_DEV_AUTH_TOKEN loaded from .env

pushd "%ROOT_DIR%\apps\web" >nul
call npm run dev -- --host 127.0.0.1 %*
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

exit /b %EXIT_CODE%

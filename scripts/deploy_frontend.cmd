@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."

cd /d "%REPO_ROOT%"

echo Running frontend deploy from %REPO_ROOT%
echo Using env file: %REPO_ROOT%\.env
echo Using deploy config: %REPO_ROOT%\scripts\deploy.yaml

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%deploy_frontend.ps1" -EnvFile "%REPO_ROOT%\.env" -DeployConfigFile "%REPO_ROOT%\scripts\deploy.yaml"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Deploy failed with exit code %EXIT_CODE%.
  pause
  exit /b %EXIT_CODE%
)

echo.
echo Deploy finished successfully.
pause
exit /b 0

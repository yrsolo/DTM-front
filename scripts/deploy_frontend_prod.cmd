@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."

cd /d "%REPO_ROOT%"

set "ENV_FILE=%REPO_ROOT%\.env"
if exist "%REPO_ROOT%\.env.prod" (
  set "ENV_FILE=%REPO_ROOT%\.env.prod"
)

echo Running PRODUCTION frontend deploy from %REPO_ROOT%
echo Using env file: %ENV_FILE%
echo Using deploy config: %REPO_ROOT%\scripts\deploy.prod.yaml

set "EXTRA_ARGS="
:parse_args
if "%~1"=="" goto run_deploy
if /I "%~1"=="--dry-run" (
  set "EXTRA_ARGS=%EXTRA_ARGS% -DryRun"
  echo Dry-run mode: enabled
  shift
  goto parse_args
)
if /I "%~1"=="--release-id" (
  if "%~2"=="" (
    echo Missing value for --release-id
    pause
    exit /b 1
  )
  set "EXTRA_ARGS=%EXTRA_ARGS% -ReleaseId %~2"
  shift
  shift
  goto parse_args
)
echo Unknown argument: %~1
pause
exit /b 1

:run_deploy
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%deploy_frontend.ps1" -EnvFile "%ENV_FILE%" -DeployConfigFile "%REPO_ROOT%\scripts\deploy.prod.yaml" %EXTRA_ARGS%
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Production deploy failed with exit code %EXIT_CODE%.
  pause
  exit /b %EXIT_CODE%
)

echo.
echo Production deploy finished successfully.
pause
exit /b 0


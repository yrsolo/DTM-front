@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0deploy_auth_function.ps1" -Target test %*

@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy_stack.ps1" -Target test %*

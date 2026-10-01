@echo off
echo Starting Build Process...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\build_all.ps1"
pause

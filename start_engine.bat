@echo off
title Proxy Redirector — Go Engine Daemon
color 0b
echo ========================================================
echo   Starting Proxy Redirector Go Engine Daemon...
echo ========================================================
if not exist "engine\build\engine.exe" (
    echo Compiling engine binary...
    powershell -ExecutionPolicy Bypass -File "scripts\build_engine.ps1"
)
echo.
echo Engine is running!
echo  - Web Dashboard: http://localhost:9090
echo  - SOCKS5 Port:   1080
echo  - HTTP Port:     8080
echo  - gRPC Port:     50051
echo.
echo Press Ctrl+C to stop the engine.
echo ========================================================
engine\build\engine.exe
pause

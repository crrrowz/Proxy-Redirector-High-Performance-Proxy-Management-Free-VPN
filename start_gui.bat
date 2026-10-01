@echo off
title Proxy Redirector — Desktop GUI
color 0b
echo ========================================================
echo   Launching Proxy Redirector Wails Desktop GUI...
echo ========================================================
if not exist "client\build\bin\ProxyRedirector.exe" (
    echo Compiling Wails Desktop GUI binary...
    powershell -ExecutionPolicy Bypass -File "scripts\build_client.ps1"
)
start "" "client\build\bin\ProxyRedirector.exe"
echo Application launched!

@echo off
title Proxy Redirector — Interactive CLI Console
color 0a
if not exist "client\build\proxy-cli.exe" (
    echo Compiling proxy-cli binary...
    powershell -ExecutionPolicy Bypass -File "scripts\build_cli.ps1"
)
client\build\proxy-cli.exe
pause

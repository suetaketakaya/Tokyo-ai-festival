@echo off
echo Starting RemoteClaude Server...
echo.
if exist "remoteclaude-windows-amd64.exe" (
    remoteclaude-windows-amd64.exe
) else (
    echo ERROR: remoteclaude-windows-amd64.exe not found
    pause
)

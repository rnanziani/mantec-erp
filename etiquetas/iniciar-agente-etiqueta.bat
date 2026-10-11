@echo off
title Registrar impresion TLP 2844
cd /d "%~dp0"
echo.
echo  Registra el protocolo mantec-etiqueta (una sola vez).
echo  Cada clic Imprimir manda EPL RAW al puerto y el proceso se cierra.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0agente-etiqueta.ps1" -Registrar
echo.
pause

@echo off
title Registrar impresion TLP 2844
cd /d "%~dp0"
echo.
echo  Registra el protocolo mantec-etiqueta (una sola vez).
echo  Despues, cada clic Imprimir del ERP lanza el script, manda RAW y se cierra.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0agente-etiqueta.ps1" -Registrar
echo.
pause

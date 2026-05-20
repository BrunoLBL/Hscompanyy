@echo off
chcp 65001 >nul 2>&1
title HS Corp - Gestão Odontológica

echo.
echo ═══════════════════════════════════════════════════
echo   🦷  HS Corp — Iniciando Sistema...
echo ═══════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo   📦 Preparando frontend...
call npm run build
if errorlevel 1 (
    echo.
    echo   ❌ Erro ao buildar o frontend!
    echo   Verifique se o Node.js está instalado e rode "npm install" primeiro.
    echo.
    pause
    exit /b 1
)

echo.
echo   🚀 Iniciando servidor...
echo   ⚠️  NÃO FECHE ESTA JANELA enquanto usar o sistema.
echo.

node server.js

pause

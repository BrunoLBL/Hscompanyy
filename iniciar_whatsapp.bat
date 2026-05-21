@echo off
chcp 65001 >nul 2>&1
title Servidor do WhatsApp - HS Corp

echo.
echo =======================================================
echo   🦷  HS Corp — Módulo WhatsApp (Servidor Local)
echo =======================================================
echo.
echo   Este terminal mantém a comunicação com o WhatsApp ativa.
echo   ATENÇÃO: Mantenha esta janela aberta enquanto quiser
echo            que os disparos do sistema funcionem.
echo.

cd /d "%~dp0"

IF NOT EXIST "node_modules\" (
    echo   [!] Primeira vez rodando nesta máquina.
    echo   [!] Instalando as dependências necesarias...
    call npm install
    if errorlevel 1 (
        echo.
        echo   ❌ Erro ao instalar dependências! Verifique a internet ou o Node.js.
        pause
        exit /b 1
    )
)

echo   🚀 Conectando ao robô do WhatsApp...
echo.

node server.js

pause

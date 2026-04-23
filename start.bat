@echo off
chcp 65001 >nul
title Servidor Hoomau - Interruptor do Bot
color 0B

echo =======================================================
echo         SISTEMA DE ATENDIMENTO MANUAL - HOOMAU
echo =======================================================
echo.
echo [SISTEMA] A verificar dependencias do sistema...

cd /d "%~dp0whatsapp-bot"
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERRO FATAL] A pasta 'whatsapp-bot' nao foi encontrada!
    pause
    exit
)

node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERRO FATAL] O programa Node.js nao esta instalado no computador!
    echo Aceda a https://nodejs.org e instale a versao 20 ou superior.
    pause
    exit
)

if not exist "node_modules\" (
    echo [SISTEMA] Primeira execucao detetada. A instalar o motor (isto pode demorar uns minutos, aguarde...)
    call npm install >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERRO] Falha ao instalar o motor. Verifique a ligacao a internet.
        pause
        exit
    )
)

if not exist "dist\" (
    echo [SISTEMA] A preparar o cerebro da IA (aguarde...)
    call npm run build >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERRO] Falha ao compilar o sistema. Contacte o suporte tecnico.
        pause
        exit
    )
)

if not exist ".env" (
    color 0E
    echo [AVISO] Ficheiro de configuracao (.env) nao encontrado!
    copy .env.example .env >nul
    echo Foi gerado um modelo padrao. Preencha as chaves do Gemini/Supabase no ficheiro .env e volte a abrir.
    pause
    exit
)

echo.
color 0A
echo =======================================================
echo [OK] TUDO PRONTO! A CONECTAR AO WHATSAPP...
echo.
echo - O robo vai ler as mensagens pendentes da noite.
echo - Ele esta online e a atender os clientes agora.
echo.
echo [!] Para FECHAR A LOJA e desligar o bot, feche esta janela!
echo =======================================================
echo.

call npm start

color 0C
echo.
echo =======================================================
echo [ALERTA] O sistema foi pausado, desconectado ou ocorreu um erro.
echo Se o QR Code expirou ou perdeu a sessao, feche esta janela e abra novamente.
echo =======================================================
pause
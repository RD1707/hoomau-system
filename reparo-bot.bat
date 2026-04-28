@echo off
title Hoomau - Ferramenta de Reparo
color 0E

echo =======================================================
echo       SISTEMA HOOMAU - REPARO DO WHATSAPP BOT
echo =======================================================
echo.
echo ATENCAO: Certifique-se de que o bot NAO esta rodando.
echo Feche qualquer janela do Node ou do start.bat antes de continuar.
echo.
echo Este script vai:
echo 1. Apagar a pasta de sessao (auth) para gerar um novo QR Code.
echo 2. Apagar os modulos do Node (node_modules).
echo 3. Limpar o cache global do NPM.
echo 4. Reinstalar todas as dependencias de forma limpa.
echo.
pause

echo.
echo Entrando na pasta do bot...
cd whatsapp-bot || goto erro

echo.
echo [1/4] Apagando a pasta 'auth' (Sessao do WhatsApp)...
if exist "auth" rmdir /s /q "auth"
echo [OK] Pasta auth removida!

echo.
echo [2/4] Apagando modulos e arquivos de trava...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /q "package-lock.json"
echo [OK] Dependencias antigas removidas!

echo.
echo [3/4] Limpando o cache do NPM...
call npm cache clean --force
echo [OK] Cache limpo!

echo.
echo [4/4] Baixando e reinstalando dependencias (isso pode demorar)...
call npm install
echo [OK] Dependencias instaladas!

echo.
echo =======================================================
echo       REPARO CONCLUIDO COM SUCESSO!
echo =======================================================
echo O bot foi resetado. Agora voce pode iniciar o sistema
echo normalmente e ler o NOVO QR Code no WhatsApp.
echo.
cd ..
pause
exit

:erro
echo.
echo [ERRO] Nao foi possivel encontrar a pasta 'whatsapp-bot'.
echo Certifique-se de executar este script na pasta raiz do projeto.
pause
exit
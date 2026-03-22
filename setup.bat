@echo off
title WoT MCP Server - Setup
echo.
echo  ========================================
echo   WoT MCP Server - Quick Setup
echo  ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Download it at https://nodejs.org
    pause
    exit /b 1
)

:: Ask for Application ID
echo  1. Go to https://developers.wargaming.net
echo  2. Create an app and copy your Application ID
echo.
set /p WG_APP_ID="  Paste your Application ID here: "

if "%WG_APP_ID%"=="" (
    echo  [ERROR] Application ID cannot be empty.
    pause
    exit /b 1
)

:: Ask for region
echo.
echo  Select your region:
echo    1. EU (Europe)
echo    2. NA (North America)
echo    3. ASIA
echo.
set /p REGION_CHOICE="  Enter 1, 2, or 3 [default: 1]: "

if "%REGION_CHOICE%"=="2" (set WG_REGION=na) else if "%REGION_CHOICE%"=="3" (set WG_REGION=asia) else (set WG_REGION=eu)

:: Create .env
echo.
echo  [*] Creating .env file...
(
echo WG_APPLICATION_ID=%WG_APP_ID%
echo WG_REGION=%WG_REGION%
echo WG_ACCESS_TOKEN=
echo WG_ACCOUNT_ID=
) > .env

:: Install dependencies
echo  [*] Installing dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
)

:: Build
echo  [*] Building...
call npx tsc
if %errorlevel% neq 0 (
    echo  [ERROR] Build failed.
    pause
    exit /b 1
)

:: Run auth
echo.
echo  ========================================
echo   Wargaming Authentication
echo  ========================================
echo.
echo  A browser window will open.
echo  Log in with your Wargaming account.
echo  After login, the token will be saved automatically.
echo.
call npx tsx src/auth/openid.ts

:: Verify token
if not exist token.json (
    echo.
    echo  [ERROR] token.json not found. Authentication may have failed.
    pause
    exit /b 1
)

:: Done
echo.
echo  ========================================
echo   Setup complete!
echo  ========================================
echo.
echo  Your dist/index.js path:
echo  %cd%\dist\index.js
echo.
echo  Next steps:
echo  - Claude Code:   claude mcp add wot -s user -- node "%cd%\dist\index.js"
echo  - Claude Desktop: add the path above to claude_desktop_config.json
echo  - Gemini CLI:     add the path above to ~/.gemini/settings.json
echo.
echo  See README.md for full instructions.
echo.
pause

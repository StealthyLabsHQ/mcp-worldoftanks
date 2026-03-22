# install-desktop.ps1 — Configure Claude Desktop for wot-mcp-server (Windows)
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistPath = Join-Path $ProjectRoot "dist\index.js"
$EnvFile = Join-Path $ProjectRoot ".env"

if (-not (Test-Path $DistPath)) {
    Write-Error "dist/index.js not found. Run 'npm run build' first."
    exit 1
}

# Parse .env file
$env_vars = @{}
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            $env_vars[$key] = $val
        }
    }
}

# Resolve absolute path with forward slashes for JSON
$AbsPath = (Resolve-Path $DistPath).Path -replace '\\', '/'

# Claude Desktop config path
$ConfigDir = Join-Path $env:APPDATA "Claude"
$ConfigFile = Join-Path $ConfigDir "claude_desktop_config.json"

# Create directory if needed
if (-not (Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
}

# Load existing config or create empty
if (Test-Path $ConfigFile) {
    $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
} else {
    $config = [PSCustomObject]@{}
}

# Ensure mcpServers exists
if (-not $config.PSObject.Properties['mcpServers']) {
    $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue ([PSCustomObject]@{})
}

# Build wot server config
$wotEnv = [PSCustomObject]@{
    WG_APPLICATION_ID  = if ($env_vars['WG_APPLICATION_ID']) { $env_vars['WG_APPLICATION_ID'] } else { "" }
    WG_ACCESS_TOKEN    = if ($env_vars['WG_ACCESS_TOKEN']) { $env_vars['WG_ACCESS_TOKEN'] } else { "" }
    WG_ACCOUNT_ID      = if ($env_vars['WG_ACCOUNT_ID']) { $env_vars['WG_ACCOUNT_ID'] } else { "" }
    WG_REGION          = if ($env_vars['WG_REGION']) { $env_vars['WG_REGION'] } else { "eu" }
    DISCORD_WEBHOOK_URL = if ($env_vars['DISCORD_WEBHOOK_URL']) { $env_vars['DISCORD_WEBHOOK_URL'] } else { "" }
}

$wotConfig = [PSCustomObject]@{
    command = "node"
    args    = @($AbsPath)
    env     = $wotEnv
}

# Merge into mcpServers
if ($config.mcpServers.PSObject.Properties['wot']) {
    $config.mcpServers.wot = $wotConfig
} else {
    $config.mcpServers | Add-Member -NotePropertyName "wot" -NotePropertyValue $wotConfig
}

# Write config
$config | ConvertTo-Json -Depth 10 | Set-Content $ConfigFile -Encoding UTF8

Write-Host ""
Write-Host "Config Claude Desktop mise a jour !" -ForegroundColor Green
Write-Host "  Fichier : $ConfigFile"
Write-Host "  Serveur : $AbsPath"
Write-Host ""
Write-Host "Redemarrer Claude Desktop pour appliquer." -ForegroundColor Yellow

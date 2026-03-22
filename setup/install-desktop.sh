#!/bin/bash
# install-desktop.sh — Configure Claude Desktop for wot-mcp-server (macOS/Linux)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_PATH="$PROJECT_ROOT/dist/index.js"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$DIST_PATH" ]; then
  echo "ERROR: dist/index.js not found. Run 'npm run build' first."
  exit 1
fi

# Detect OS and config path
case "$(uname -s)" in
  Darwin) CONFIG_DIR="$HOME/Library/Application Support/Claude" ;;
  Linux)  CONFIG_DIR="$HOME/.config/Claude" ;;
  *)      echo "ERROR: Unsupported OS"; exit 1 ;;
esac

CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
mkdir -p "$CONFIG_DIR"

# Parse .env
declare -A ENV_VARS
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    ENV_VARS["$key"]="$value"
  done < "$ENV_FILE"
fi

# Check for jq
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required. Install with: brew install jq (macOS) or apt install jq (Linux)"
  exit 1
fi

# Build the wot server JSON
WOT_JSON=$(jq -n \
  --arg path "$DIST_PATH" \
  --arg app_id "${ENV_VARS[WG_APPLICATION_ID]:-}" \
  --arg token "${ENV_VARS[WG_ACCESS_TOKEN]:-}" \
  --arg account "${ENV_VARS[WG_ACCOUNT_ID]:-}" \
  --arg region "${ENV_VARS[WG_REGION]:-eu}" \
  --arg discord "${ENV_VARS[DISCORD_WEBHOOK_URL]:-}" \
  '{
    command: "node",
    args: [$path],
    env: {
      WG_APPLICATION_ID: $app_id,
      WG_ACCESS_TOKEN: $token,
      WG_ACCOUNT_ID: $account,
      WG_REGION: $region,
      DISCORD_WEBHOOK_URL: $discord
    }
  }')

# Load or create config
if [ -f "$CONFIG_FILE" ]; then
  CONFIG=$(cat "$CONFIG_FILE")
else
  CONFIG='{}'
fi

# Merge wot into mcpServers
CONFIG=$(echo "$CONFIG" | jq --argjson wot "$WOT_JSON" '.mcpServers.wot = $wot')

echo "$CONFIG" | jq '.' > "$CONFIG_FILE"

echo ""
echo "Config Claude Desktop mise a jour !"
echo "  Fichier : $CONFIG_FILE"
echo "  Serveur : $DIST_PATH"
echo ""
echo "Redemarrer Claude Desktop pour appliquer."

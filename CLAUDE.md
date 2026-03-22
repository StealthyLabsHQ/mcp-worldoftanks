# wot-mcp-server

MCP Server for World of Tanks — Claude Code + Claude Desktop.

## Build

```bash
npm install
npm run build     # tsc → dist/
npm run dev       # tsx watch (dev)
```

## Auth

```bash
cp .env.example .env
# Fill in WG_APPLICATION_ID + DISCORD_WEBHOOK_URL
npm run auth      # OpenID flow → token.json
```

## Critical rule

**stdout is reserved for the MCP protocol (JSON-RPC).** Never use `console.log`.
All logs go through `src/utils/logger.ts` → `console.error` (stderr).

## MCP Tools

- `wot_get_account_overview` — credits, gold, XP, bonds, global stats
- `wot_get_garage` — vehicle list with tier filter and sorting
- `wot_get_tank_stats` — detailed stats for a tank by name or ID
- `wot_get_account_status` — premium and ban status
- `wot_send_discord_embed` — send Discord webhook embeds

## Null safety

`private.*` fields can be null (expired token). Always use `?? 0` or check `!== null`.

## Wargaming API

- Timestamps in Unix seconds (not ms)
- Rate limit: 20 req/s max
- Encyclopedia batch: max 100 tank_id per call
- Response format: `data[accountId]` (string key)
- Unified Wargaming Premium is NOT exposed by the WoT API

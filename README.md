# mcp-worldoftanks

An [MCP](https://modelcontextprotocol.io/) (Model Context Protocol) server that connects **World of Tanks** player data to AI assistants. Compatible with **Claude Code**, **Claude Desktop**, and **Gemini CLI**.

Ask your AI assistant about your WoT account in natural language:

- *"Show me my WoT garage, tier 8 and above"*
- *"What are my stats on the Skorpion G?"*
- *"What's my overall win rate?"*
- *"Is my premium still active?"*

---

## Table of Contents

- [Overview](#overview)
- [Tools](#tools)
  - [wot_get_account_overview](#wot_get_account_overview)
  - [wot_get_garage](#wot_get_garage)
  - [wot_get_tank_stats](#wot_get_tank_stats)
  - [wot_get_account_status](#wot_get_account_status)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [Quick Setup (Windows)](#quick-setup-windows)
  - [Manual Setup (all platforms)](#manual-setup-all-platforms)
- [Installation](#installation)
  - [Claude Code](#install-on-claude-code)
  - [Claude Desktop](#install-on-claude-desktop)
  - [Gemini CLI](#install-on-gemini-cli)
- [Architecture](#architecture)
- [Wargaming API](#wargaming-api)
- [Security](#security)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Overview

**wot-mcp-server** is a local MCP server written in TypeScript that acts as a bridge between AI assistants and the [Wargaming public API](https://developers.wargaming.net/reference/all/wot/account/info/). It runs as a subprocess launched by the AI client, communicating over **stdio** (stdin/stdout) using the JSON-RPC protocol defined by MCP.

Once installed, the AI assistant gains access to 4 tools that can query your World of Tanks account data in real time. The server handles authentication, API calls, caching, and data formatting — the AI simply calls the tools and receives structured results.

```
AI Client (Claude / Gemini)
        |
        |  stdin/stdout (JSON-RPC over stdio)
        v
  node dist/index.js          <-- MCP server (child process)
        |
        +-- Wargaming API (EU / NA / ASIA)
```

### Supported Clients

| Client | Transport | Status |
|--------|-----------|--------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | stdio | Supported |
| [Claude Desktop](https://claude.ai/download) | stdio | Supported |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | stdio | Supported |

### Supported Regions

| Region | API Host | Code |
|--------|----------|------|
| Europe | `api.worldoftanks.eu` | `eu` |
| North America | `api.worldoftanks.com` | `na` |
| Asia | `api.worldoftanks.asia` | `asia` |

---

## Tools

### `wot_get_account_overview`

Returns a full snapshot of the player's account: resources (credits, gold, free XP, bonds) and global statistics (battles, win rate, average damage, average XP, frags, spotted).

**Parameters:** None

**Example output:**

```
🎖️ JisooTurtleRabbit — WoT Account
════════════════════════════
💰 Credits      8,260,203
🥇 Gold         54
⭐ Free XP      14,002
🔗 Bonds        96
────────────────────────────
📊 Global Statistics
Battles: 3,981  |  Win Rate: 57.3%
Avg Dmg: 1,953  |  Avg XP: 947
Frags: 5,455  |  Spotted: 3,411
```

---

### `wot_get_garage`

Lists all vehicles in the player's garage with nation flag, tier (Roman numeral), type, mastery badge, and battle count.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `min_tier` | number (1-10) | No | Only show vehicles at or above this tier |
| `sort_by` | `"tier"` \| `"battles"` \| `"mastery"` | No | Sort criteria (default: `tier`) |

**Example prompt:** *"Show me my tier 10 tanks sorted by battles"*

**Example output:**

```
🚗 My Garage — Tier X+ (7 vehicles)
════════════════════════════
🇩🇪 X   TD       Grille 15        🥇 1st | 72 bat.
🇬🇧 X   TD       FV215b (183)     🏆 Ace | 24 bat.
🇨🇳 X   Heavy    BZT-70           🥈 2nd | 9 bat.
```

---

### `wot_get_tank_stats`

Returns detailed statistics for a single vehicle. The tank can be found by **approximate name search** or by its numeric `tank_id`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tank_name` | string (max 100) | One of the two | Tank name — approximate match (e.g., `"skorpion"`, `"bourrasque"`) |
| `tank_id` | number | One of the two | Wargaming vehicle ID |

If the name matches multiple tanks, the tool returns a disambiguation list.

**Example prompt:** *"What are my stats on the Bourrasque?"*

**Example output:**

```
📊 Bat.-Châtillon Bourrasque
Tier 8 | france | mediumTank
════════════════════════════
Battles : 424
Win Rate: 58.5%
Avg Dmg : 1,876
Frags   : 512
Spotted : 389
Avg XP  : 1,023
Max XP  : 2,341
Mastery : 🏆 Ace
```

---

### `wot_get_account_status`

Checks premium account status (active, expired, or not detected) and ban info.

**Parameters:** None

**Example output:**

```
🛡️ Account Status — JisooTurtleRabbit
════════════════════════════
⭐ Premium   ❓ Not detected via API (unified WG Premium is not exposed)
🚫 Ban       ✅ No active ban
```

> See [Known Limitations](#known-limitations) for details on why unified Wargaming Premium may not be detected.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Node.js** | Version 20 or higher — [download](https://nodejs.org) |
| **Wargaming Application ID** | Free — create one at [developers.wargaming.net](https://developers.wargaming.net) |
| **Git** | To clone the repository |

---

## Setup

> These steps are required regardless of which AI client you use. Complete them first, then follow the installation instructions for your client.

### Quick Setup (Windows)

```bash
git clone https://github.com/StealthyLabsHQ/mcp-worldoftanks.git
cd mcp-worldoftanks
setup.bat
```

Double-click `setup.bat` — it will:
1. Ask for your Wargaming Application ID
2. Ask for your region (EU / NA / ASIA)
3. Install all dependencies
4. Open the Wargaming login page in your browser
5. Save your authentication token
6. Build the project

After completion, skip to the [Installation](#installation) section for your client.

### Manual Setup (all platforms)

#### Step 1 — Clone and install

```bash
git clone https://github.com/StealthyLabsHQ/mcp-worldoftanks.git
cd mcp-worldoftanks
npm install
```

#### Step 2 — Get a Wargaming Application ID

1. Go to [developers.wargaming.net](https://developers.wargaming.net)
2. Create an account or log in with your existing Wargaming account
3. Navigate to **My Applications** → **Add Application**
4. Choose application type **Server**
5. Copy the generated `application_id`

#### Step 3 — Configure environment

```bash
cp .env.example .env
```

Open `.env` in a text editor and paste your Application ID:

```env
WG_APPLICATION_ID=your_app_id_here
WG_REGION=eu
```

Set `WG_REGION` to your server region: `eu`, `na`, or `asia`.

#### Step 4 — Authenticate with Wargaming

```bash
npm run auth
```

This starts a temporary local server and prints a URL. Open it in your browser, log in with your Wargaming account, and authorize the application. After successful login, a `token.json` file is created in the project root.

`token.json` contains two values you'll need for client configuration:
- `access_token` — your authentication token
- `account_id` — your numeric Wargaming account ID

> Tokens are valid for **14 days**. The MCP server automatically renews them on startup when they are close to expiration.

#### Step 5 — Build

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder. Take note of the **absolute path** to `dist/index.js` — you'll need it when configuring your AI client.

---

## Installation

After completing [Setup](#setup), follow the instructions for your AI client below.

### Install on Claude Code

#### Option A: Project scope (automatic)

The repository includes a `.mcp.json` file at the root. If you launch Claude Code from the project directory, the MCP server is loaded automatically. Make sure the environment variables (`WG_APPLICATION_ID`, etc.) are set in your shell.

#### Option B: Global scope (all sessions, any directory)

```bash
claude mcp add wot -s user \
  -e WG_APPLICATION_ID=your_app_id \
  -e WG_ACCESS_TOKEN=your_token \
  -e WG_ACCOUNT_ID=your_account_id \
  -e WG_REGION=eu \
  -- node /absolute/path/to/mcp-worldoftanks/dist/index.js
```

Replace the values with your actual credentials from `.env` and `token.json`.

Verify the server is connected:

```bash
claude mcp list
# wot  node /path/to/dist/index.js  [user]  ✓ Connected
```

---

### Install on Claude Desktop

1. **Open** your Claude Desktop configuration file:

   | OS | Config path |
   |----|-------------|
   | Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
   | macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
   | Linux | `~/.config/Claude/claude_desktop_config.json` |

2. **Add** (or merge) this `mcpServers` block into the JSON:

   ```json
   "mcpServers": {
     "Analyzer WoT Stats": {
       "command": "node",
       "args": ["C:/path/to/mcp-worldoftanks/dist/index.js"],
       "env": {
         "WG_APPLICATION_ID": "XXXX",
         "WG_ACCESS_TOKEN": "XXXX",
         "WG_ACCOUNT_ID": "XXXX",
         "WG_REGION": "eu"
       }
     }
   }
   ```

3. **Replace** the placeholder values:

   | Value | Where to find it |
   |-------|-----------------|
   | `args` path | Absolute path to `dist/index.js` in your cloned repo |
   | `WG_APPLICATION_ID` | Your `.env` file |
   | `WG_ACCESS_TOKEN` | Your `token.json` file (`access_token` field) |
   | `WG_ACCOUNT_ID` | Your `token.json` file (`account_id` field) |
   | `WG_REGION` | `eu`, `na`, or `asia` |

4. **Restart Claude Desktop** — there is no hot reload.

> If your config file already has other MCP servers, merge the `"wot"` entry inside the existing `"mcpServers"` object. Do not overwrite the entire file.

---

### Install on Gemini CLI

1. **Open** (or create) your Gemini CLI settings file:

   | OS | Config path |
   |----|-------------|
   | Windows | `C:\Users\<your-username>\.gemini\settings.json` |
   | macOS / Linux | `~/.gemini/settings.json` |

2. **Add** the MCP server configuration:

   ```json
   {
     "mcpServers": {
       "wot-stats": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-worldoftanks/dist/index.js"],
         "env": {
           "WG_APPLICATION_ID": "XXXX",
           "WG_ACCESS_TOKEN": "XXXX",
           "WG_ACCOUNT_ID": "XXXX",
           "WG_REGION": "eu"
         }
       }
     }
   }
   ```

3. **Replace** the placeholder values with your credentials (same values as the [Claude Desktop](#install-on-claude-desktop) table above).

---

## Architecture

```
mcp-worldoftanks/
├── src/
│   ├── index.ts                  # MCP server entry (McpServer + StdioServerTransport)
│   │
│   ├── auth/
│   │   ├── openid.ts             # Wargaming OpenID auth flow + token renewal
│   │   └── token-store.ts        # token.json read/write with Zod validation
│   │
│   ├── api/
│   │   ├── client.ts             # Axios wrapper (retry, timeout, connection limits)
│   │   ├── account.ts            # GET /wot/account/info/ — resources + stats
│   │   ├── tanks.ts              # GET /wot/account/tanks/ + /wot/tanks/stats/
│   │   └── encyclopedia.ts       # GET /wot/encyclopedia/vehicles/ — name cache
│   │
│   ├── tools/
│   │   ├── get_account_overview.ts
│   │   ├── get_garage.ts
│   │   ├── get_tank_stats.ts
│   │   └── get_account_status.ts
│   │
│   └── utils/
│       ├── logger.ts             # stderr-only logging (stdout = MCP JSON-RPC)
│       ├── format.ts             # Number/date formatting (en-US locale)
│       └── mastery.ts            # Mastery badge labels (3rd, 2nd, 1st, Ace)
│
├── setup.bat                     # One-click Windows setup script
├── setup/
│   ├── install-desktop.ps1       # Claude Desktop installer (Windows)
│   └── install-desktop.sh        # Claude Desktop installer (macOS/Linux)
│
├── .mcp.json                     # Claude Code project-scope config
├── .env.example                  # Environment template
├── package.json
└── tsconfig.json
```

### Data Flow

```
1. AI client sends tool call via stdin (JSON-RPC)
2. MCP server parses the request and validates inputs (Zod)
3. Server calls Wargaming API with the player's access token
4. API response is parsed, formatted, and returned via stdout (JSON-RPC)
5. AI client receives structured text and presents it to the user
```

### Encyclopedia Cache

The server maintains an in-memory cache of vehicle data (name, nation, tier, type) fetched from the Wargaming encyclopedia API. This cache is populated lazily:

- **Garage tool**: resolves only the tank IDs present in the player's garage (batched, max 100 per API call)
- **Tank stats tool**: on first name search, fetches the full encyclopedia (~700 vehicles) and caches it for subsequent lookups

---

## Wargaming API

This server uses the following public API endpoints:

| Endpoint | Purpose | Auth required |
|----------|---------|---------------|
| `GET /wot/account/info/` | Player resources + global statistics | Yes (for `private` fields) |
| `GET /wot/account/tanks/` | List of tanks in garage with basic stats | Yes |
| `GET /wot/tanks/stats/` | Detailed per-tank statistics | Yes |
| `GET /wot/encyclopedia/vehicles/` | Vehicle metadata (name, tier, nation, type) | No |
| `POST /wot/auth/login/` | OpenID authentication flow | No |
| `POST /wot/auth/prolongate/` | Token renewal | Yes |

### Rate Limits

Wargaming enforces a limit of **20 requests per second**. The server mitigates this by:

- Batching encyclopedia lookups (up to 100 tank IDs per call)
- Limiting parallel API calls to 3 concurrent requests
- Using exponential backoff retry on 429/5xx errors (up to 3 retries)

### Authentication

The Wargaming API uses an OpenID-based authentication flow:

1. `npm run auth` starts a temporary Express server on `127.0.0.1:3001`
2. The user opens the displayed URL and logs in via Wargaming
3. Wargaming redirects back to `localhost:3001/callback` with the access token
4. The token is saved to `token.json` (valid for 14 days)
5. On MCP server startup, the token is automatically renewed if it expires within 2 hours

---

## Security

| Measure | Details |
|---------|---------|
| **stdout isolation** | All logs go to stderr — stdout is exclusively reserved for MCP JSON-RPC. A single `console.log` would corrupt the protocol stream. |
| **File permissions** | `token.json` is created with `600` permissions (owner read/write only). Ignored on Windows. |
| **Input validation** | All tool parameters are validated with [Zod](https://zod.dev) schemas — type checking, length limits, range bounds. |
| **Environment validation** | `WG_APPLICATION_ID` and `WG_REGION` are validated at startup via Zod. The server exits with an error if they are missing or invalid. |
| **Error sanitization** | Error messages returned to AI clients are generic. Internal details (stack traces, API responses) are only logged to stderr. |
| **Auth server hardening** | Express binds to `127.0.0.1` only (no network exposure), sets security headers (`X-Content-Type-Options`, `X-Frame-Options`, `CSP`), and auto-shuts down after 5 minutes if no callback is received. |
| **Retry safety** | API retry logic only triggers on safe HTTP status codes (429, 500, 502, 503, 504). Client errors (4xx) are not retried. |
| **Connection limits** | HTTPS agent limited to 10 concurrent sockets to prevent file descriptor exhaustion. |
| **Secrets in .gitignore** | `.env` and `token.json` are gitignored and never committed. |

---

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in watch mode (auto-reload on changes via tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run auth` | Re-authenticate with Wargaming (creates new `token.json`) |
| `npm run start` | Run the compiled server (`node dist/index.js`) |

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.x (strict mode, ESM) |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Transport | `StdioServerTransport` |
| HTTP client | Axios (retry, timeout, connection pooling) |
| Validation | Zod |
| Auth server | Express (temporary, auth flow only) |
| Build | `tsc` → `dist/` |
| Dev | `tsx watch` |

---

## Troubleshooting

### "WG_APPLICATION_ID is required"

Your `.env` file is missing or the `WG_APPLICATION_ID` variable is empty. Run `cp .env.example .env` and fill in your Application ID.

### "No token found — run npm run auth"

You haven't authenticated yet, or `token.json` was deleted. Run `npm run auth` and complete the login flow.

### Token expired

Wargaming tokens are valid for 14 days. The server auto-renews on startup, but if the token is already expired, run `npm run auth` again.

### "Port 3001 already in use"

Another process is using port 3001. Close it (check for a previous `npm run auth` that didn't finish) and retry.

### MCP server not showing in Claude Desktop

- Verify the path in `claude_desktop_config.json` is **absolute** (not relative)
- Make sure the JSON is valid (no trailing commas, proper quoting)
- **Restart Claude Desktop** after editing the config

### Tools not appearing in Claude Code

Run `claude mcp list` to verify the server is connected. If it shows `✗ Failed`, check that `dist/index.js` exists (run `npm run build`).

---

## Known Limitations

- **Wargaming Premium (unified):** The WoT API only exposes the legacy WoT-specific premium (`premium_expires_at`). The newer unified Wargaming Premium (which works across WoT, WoWS, and WoWP) is **not exposed** by any public API endpoint. When the server cannot detect premium status, it will display a notice instead of false information.

- **Token lifetime:** Wargaming access tokens expire after **14 days**. The server automatically renews them on startup when they are within 2 hours of expiration. If the server has not been started in over 14 days, run `npm run auth` again.

- **Private data fields:** Account resources (credits, gold, free XP, bonds) are only returned when queried with a valid `access_token` belonging to that account. If the token is expired or invalid, these fields will return `null` and the tools will indicate that private data is unavailable.

---

## License

MIT

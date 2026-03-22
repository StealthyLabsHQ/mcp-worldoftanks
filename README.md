# mcp-worldoftanks

An MCP (Model Context Protocol) server that exposes **World of Tanks** player data as tools for **Claude Code**, **Claude Desktop**, and **Gemini CLI**.

Ask your AI assistant about your WoT account in natural language:

- *"Show me my WoT garage, tier 8 and above"*
- *"What are my stats on the Skorpion G?"*
- *"Is my premium still active?"*

## Tools

| Tool | Description |
|------|-------------|
| `wot_get_account_overview` | Credits, gold, free XP, bonds + global stats (battles, win rate, avg damage) |
| `wot_get_garage` | Vehicle list with nation, tier, type, mastery badge, battles. Filterable by tier, sortable |
| `wot_get_tank_stats` | Detailed stats for a specific tank — search by name or tank ID |
| `wot_get_account_status` | Premium account status and ban info |

## Prerequisites

- **Node.js 20+**
- A **Wargaming Application ID** — get one at [developers.wargaming.net](https://developers.wargaming.net)

## Quick Setup (Windows)

```bash
git clone https://github.com/StealthyLabsHQ/mcp-worldoftanks.git
cd mcp-worldoftanks
setup.bat
```

Double-click `setup.bat` — it will ask for your Application ID, install dependencies, open the Wargaming login page, and build everything automatically.

## Manual Setup (all platforms)

> Complete these steps first, regardless of which client you use (Claude Code, Claude Desktop, or Gemini CLI).

### 1. Clone and install

```bash
git clone https://github.com/StealthyLabsHQ/mcp-worldoftanks.git
cd mcp-worldoftanks
npm install
```

### 2. Get a Wargaming Application ID

Go to [developers.wargaming.net](https://developers.wargaming.net), create an account (or log in), then create a new application to get your `application_id`.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Application ID:

```env
WG_APPLICATION_ID=your_app_id_here
WG_REGION=eu    # eu | na | asia
```

### 4. Authenticate with Wargaming

```bash
npm run auth
```

This starts a local server and prints a link. Open it in your browser, log in with your Wargaming account, and a `token.json` file will be created automatically.

> `token.json` contains your `access_token` and `account_id` — you'll need these values when configuring your client below. Tokens are valid for 14 days and auto-renewed on server startup.

### 5. Build

```bash
npm run build
```

You should now have a `dist/` folder. Note the **absolute path** to `dist/index.js` — you'll need it next.

---

## Install on Claude Code

### Option A: Project scope (`.mcp.json` — already included)

If you run Claude Code from the project directory, it picks up `.mcp.json` automatically. Make sure the env vars are set in your shell.

### Option B: Global scope (all sessions)

```bash
claude mcp add wot -s user \
  -e WG_APPLICATION_ID=your_app_id \
  -e WG_ACCESS_TOKEN=your_token \
  -e WG_ACCOUNT_ID=your_account_id \
  -e WG_REGION=eu \
  -- node /absolute/path/to/mcp-worldoftanks/dist/index.js
```

Verify:

```bash
claude mcp list
# wot  node /path/to/dist/index.js  [user]  ✓ Connected
```

---

## Install on Claude Desktop

1. Open your Claude Desktop config file:

   | OS | Config path |
   |----|-------------|
   | Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
   | macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
   | Linux | `~/.config/Claude/claude_desktop_config.json` |

2. Add (or merge) this `mcpServers` block into the JSON:

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

3. Replace the values:
   - `args` — absolute path to `dist/index.js` in your cloned repo
   - `WG_APPLICATION_ID` — your app ID from [developers.wargaming.net](https://developers.wargaming.net)
   - `WG_ACCESS_TOKEN` — found in `token.json` after running `npm run auth`
   - `WG_ACCOUNT_ID` — found in `token.json` after running `npm run auth`
   - `WG_REGION` — `eu`, `na`, or `asia`

4. **Restart Claude Desktop** — there is no hot reload.

> **Note:** If your config file already has other content, merge the `"wot"` entry inside the existing `"mcpServers"` object. Do not replace the entire file.

---

## Install on Gemini CLI

1. Open (or create) your Gemini CLI settings file:

   | OS | Config path |
   |----|-------------|
   | Windows | `C:\Users\<your-username>\.gemini\settings.json` |
   | macOS / Linux | `~/.gemini/settings.json` |

2. Add the MCP server config:

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

3. Replace the values as described in the [Claude Desktop section](#install-on-claude-desktop).

---

## Architecture

```
src/
├── index.ts              # MCP server entry point (StdioServerTransport)
├── auth/
│   ├── openid.ts         # Wargaming OpenID auth flow + token renewal
│   └── token-store.ts    # token.json read/write with validation
├── api/
│   ├── client.ts         # Axios wrapper (retry, timeout, rate limiting)
│   ├── account.ts        # /wot/account/info/ endpoint
│   ├── tanks.ts          # /wot/account/tanks/ + /wot/tanks/stats/
│   └── encyclopedia.ts   # Vehicle name resolution with in-memory cache
├── tools/
│   ├── get_account_overview.ts
│   ├── get_garage.ts
│   ├── get_tank_stats.ts
│   └── get_account_status.ts
└── utils/
    ├── logger.ts         # stderr-only logging (stdout = MCP JSON-RPC)
    ├── format.ts         # Number/date formatting
    └── mastery.ts        # Mastery badge labels
```

## Development

```bash
npm run dev       # tsx watch — auto-reload on changes
npm run build     # TypeScript → dist/
npm run auth      # Re-authenticate with Wargaming
```

## Security

- All logs go to **stderr** — stdout is reserved for MCP JSON-RPC
- `token.json` is created with `600` permissions (owner-only)
- Input validation via [Zod](https://zod.dev) on all tool parameters
- Environment variables validated at startup
- Error messages are sanitized — no internal details leaked to clients
- Auth server binds to `127.0.0.1` only, with auto-shutdown timeout
- API retry logic limited to safe HTTP status codes
- `.env` and `token.json` are gitignored

## Known limitations

- **Wargaming Premium (unified)** is not exposed by the WoT API — only the legacy WoT-specific premium is reported. The tool will indicate when premium status cannot be detected.
- Wargaming tokens expire after **14 days**. The server auto-renews on startup if the token expires within 2 hours.

## License

MIT

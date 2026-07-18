# Federal Register MCP Server

This is a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. It lets MCP clients (Claude Desktop, Claude Code, Continue, etc.) query the upstream Federal Register API in natural language. It is one of 100+ servers in the [Bio MCP](../../README.md) monorepo.

## Connect

The server is deployed and ready at:

```
https://federal-register-mcp-server.quentincody.workers.dev/mcp
```

Add it to your MCP client (Claude Desktop → Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "federal-register": {
      "command": "npx",
      "args": ["mcp-remote", "https://federal-register-mcp-server.quentincody.workers.dev/mcp"]
    }
  }
}
```

For local development the server runs at `http://localhost:8823/mcp` (start it with `./scripts/dev-servers.sh federal-register`):

```json
{
  "mcpServers": {
    "federal-register-local": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8823/mcp"]
    }
  }
}
```

## Tools

- `fedreg_search` — discover available API operations (Code Mode catalog search, 5 endpoints)
- `fedreg_execute` — **Code Mode**: write JavaScript in a V8 isolate (`api.get()` / `api.post()` / `searchSpec()`) instead of issuing tool calls one by one
- `fedreg_query_data` — run SQL over large responses auto-staged into a per-session SQLite database
- `fedreg_get_schema` — inspect the inferred schema of a staged dataset

Large responses (>30KB) are auto-staged into a queryable SQLite database; the tools return a `data_access_id` you can query with SQL.

Every tool returns both a human-readable `content` summary and a structured `structuredContent` payload.

## Development

```bash
./scripts/dev-servers.sh federal-register            # run locally (port 8823)
pnpm --filter federal-register-mcp-server run deploy   # deploy to Cloudflare Workers
```

See [`docs/adding-mcp-servers.md`](../../docs/adding-mcp-servers.md) and the root [README](../../README.md) for the full architecture (Code Mode, staging, portals).

---

*Auto-generated baseline README — refine with server-specific detail as needed.*

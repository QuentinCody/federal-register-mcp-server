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

- `fedreg_search` — discover available API operations (Code Mode catalog search, 7 endpoints)
- `fedreg_execute` — **Code Mode**: write JavaScript in a V8 isolate (`api.get()` / `api.post()` / `searchSpec()`) instead of issuing tool calls one by one
- `fedreg_query_data` — run SQL over large responses auto-staged into a per-session SQLite database
- `fedreg_get_schema` — inspect the inferred schema of a staged dataset

Large responses (>30KB) are auto-staged into a queryable SQLite database; the tools return a `data_access_id` you can query with SQL.

Every tool returns both a human-readable `content` summary and a structured `structuredContent` payload.

All four tools also have `mcp_fedreg_` aliases. Code Mode uses an explicit
30 KiB inline/staging threshold and a 60-second execution limit.

## Published documents and public inspection

Use `fedreg_execute` with bounded publication-date windows and repeated array
parameters. Agency discovery returns a native array:

```javascript
const agencies = await api.get('/agencies.json');
const documents = await api.get('/documents.json', {
  'conditions[agencies][]': ['food-and-drug-administration'],
  'conditions[publication_date][gte]': '2026-09-01',
  'conditions[publication_date][lte]': '2026-09-29',
  per_page: 20, page: 1, order: 'newest'
});
return { agencies, documents };
```

Native reads on October 4, 2026 reached **10,000 search results**; requesting
page 11 at 1,000 records per page returned HTTP 400 with an explicit pagination
limit error. This supersedes the earlier 2,000-result guidance. Preserve native
counts and next-page links, including `search_after_cursor` when returned. Keep
the original filters, fields and sort order when advancing. Split broad searches
into narrower publication-date windows and reconcile document numbers in each
window. A reported count of 10,000, returned page or staged dataset is not proof
of complete coverage. The server marks execute coverage as unknown.
If a result is staged, use its handle with `fedreg_get_schema`/`fedreg_query_data`.

Public inspection is a separate prepublication workflow:

```javascript
const current = await api.get('/public-inspection-documents/current.json');
const historical = await api.get('/public-inspection-documents.json', {
  'conditions[available_on]': '2026-09-28'
});
return { current, historical };
```

`available_on` identifies the inspection desk date, not publication or effective
date. The dated-desk route returned all 117 records for September 28, 2026 even
with `per_page: 5`; retain its complete results and filing-update timestamps.
Fetch individual inspection records with
`/public-inspection-documents/{document_number}.json`, and published records with
`/documents/{document_number}.json`. Keep native correction relationships,
comment/effective dates, filing timestamps, editorial notes and PDF links when
present. Missing dates remain unknown. FederalRegister.gov is an informational
rendition; linked govinfo PDFs provide the official published edition. Inspection
PDFs are prepublication material. The server does not automatically download PDFs.

Reviewed September 29, 2026 against the [official API guide](https://www.federalregister.gov/reader-aids/developer-resources/rest-api)
and [provider client inspection routes](https://github.com/usnationalarchives/federal_register/blob/master/lib/federal_register/public_inspection_document.rb).
These are existing capabilities, not a verified new 2026 API release. The
[September 2024 notice-subtype announcement](https://www.federalregister.gov/reader-aids/recent-updates/2024/09/enhanced-notice-sub-type-search-now-available)
describes SORN/Sunshine search; this review does not establish an API filter contract
for those subtypes.

### Retrieve several documents

The [provider's controller](https://github.com/usnationalarchives/federalregister-api-core/blob/main/app/controllers/api_controller.rb)
confirms comma-separated numbers in the detail path:

```javascript
return await api.get('/documents/2011-17721,2011-17722.json', {
  'fields[]': ['document_number', 'title', 'correction_of', 'corrections', 'pdf_url']
});
```

A single number returns a document; comma-separated numbers return `count` and
`results`, with possible `errors.not_found` even on HTTP 200. Keep the full native
envelope. Returned order and padded document-number spelling may differ from the
request; neither HTTP success nor the count alone establishes complete retrieval.
The optional `publication_date` parameter qualifies ambiguous historical numbers.
Search the Code Mode catalog for `multi-get` to retrieve a bounded recipe that
also queries staged results within the same execution.

Reads accept bodyless GET only. Native responses are capped at 4 MiB with a
15-second body deadline; partial HTTP bodies, unexpected HTML on JSON routes,
malformed JSON and invalid UTF-8 fail explicitly. Native error bodies remain
available. Reduce batch size or selected fields when necessary. Oversized
SQL/schema/tool envelopes stage through the existing Durable Object, preserving
both success/error response fields and both tool aliases. `documents`, `agencies`
and `response_context` retain native JSON, nested relationships, identifiers as
strings, pagination, batch errors and desk timestamps; `payloads` retains the
complete source envelope. Every response carries a verifiable citation hash.

Local tests cover query encoding, native response preservation, aliases, citation
verification, complete error evidence and staging through real SQLite. Direct
native reads confirmed agency discovery, FDA date-window searches, document
detail, multi-get successes and missing IDs, projected fields, current/historical
inspection and the observed pagination boundary. Local Worker acceptance and
verification receipts are tracked in the audit progress log.

## Development

```bash
./scripts/dev-servers.sh federal-register            # run locally (port 8823)
pnpm --filter federal-register-mcp-server run deploy   # deploy to Cloudflare Workers
```

See [`docs/adding-mcp-servers.md`](../../docs/adding-mcp-servers.md) and the root [README](../../README.md) for the full architecture (Code Mode, staging, portals).

---

*Provider API behavior and local implementation verification are tracked separately.*

<!-- license-and-data-terms:start -->
## License and data terms

The code in this repository is licensed under the Apache License 2.0 (see `LICENSE`).
If you use it in your work, please cite it (see `CITATION.cff`). Citation is requested, not required.

The license covers the code only. Data that this server returns comes from Federal Register and stays under the terms of that source: US public domain.
You are responsible for your use of the data under those terms.
<!-- license-and-data-terms:end -->

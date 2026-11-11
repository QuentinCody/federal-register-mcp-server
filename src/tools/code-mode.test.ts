import { McpServer } from "@bio-mcp/shared/mcp";
import { createApiProxyTool } from "@bio-mcp/shared/tools/api-proxy";
import { afterEach, expect, it, vi } from "vitest";
import { createFederalRegisterApiFetch } from "../lib/api-adapter";
import { federalRegisterCatalog } from "../spec/catalog";
import { registerCodeMode } from "./code-mode";
import { registerGetSchema } from "./get-schema";
import { registerQueryData } from "./query-data";

afterEach(() => vi.unstubAllGlobals());

it("registers both aliases and supplies both response fields on success/errors", async () => {
  const server = new McpServer({ name: "fixture", version: "1" });
  // SAFETY: invalid execution never invokes the fixture loader.
  registerCodeMode(server, { CODE_MODE_LOADER: { get: () => ({}) } } as unknown as Parameters<typeof registerCodeMode>[1]);
  registerQueryData(server, {}); registerGetSchema(server, {});
  // SAFETY: inspect the SDK registry to exercise actual callbacks.
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: (args: unknown, extra: unknown) => Promise<unknown> }> })._registeredTools;
  expect(Object.keys(tools).sort()).toEqual(["fedreg_search", "fedreg_execute", "fedreg_query_data", "fedreg_get_schema", "mcp_fedreg_search", "mcp_fedreg_execute", "mcp_fedreg_query_data", "mcp_fedreg_get_schema"].sort());
  for (const prefix of ["", "mcp_"]) {
    expect(await tools[`${prefix}fedreg_search`].handler({ query: "public inspection", max_results: 10 }, {})).toMatchObject({ content: expect.any(Array), structuredContent: { success: true } });
    expect(JSON.stringify(await tools[`${prefix}fedreg_search`].handler({query: "multi-get", max_results: 10}, {}))).toContain("errors.not_found");
    for (const [name, args] of [["fedreg_execute", { code: "" }], ["fedreg_query_data", { data_access_id: "fixture", sql: "SELECT 1" }], ["fedreg_get_schema", { data_access_id: "fixture" }]] as const) {
      expect(await tools[prefix + name].handler(args, {})).toMatchObject({ content: expect.any(Array), structuredContent: expect.any(Object), isError: true });
    }
  }
});

it("stages the complete native wrapper and correction metadata above 30 KiB", async () => {
  const native = { count: 1, next_page_url: null, results: [{ document_number: "2026-00001", title: "α".repeat(20000), correction_of: "2026-00000", effective_on: null }], errors: {not_found: ["2026-99999"]}, provider_metadata: { retained: true } };
  vi.stubGlobal("fetch", async () => Response.json(native));
  const stored: unknown[] = [];
  const namespace = { idFromName: (name: string) => name, get: () => ({ fetch: async (request: Request) => {
    if (new URL(request.url).pathname === "/process") {
      // SAFETY: shared staging sends a data envelope to this route.
      const payload = await request.json() as { data: unknown }; stored.push(payload.data);
      return Response.json({ success: true, tables_created: ["documents"], total_rows: 1 });
    }
    return Response.json({ success: true, schema: { tables: { documents: { columns: [{ name: "document_number" }] } } } });
  } }) };
  const proxy = createApiProxyTool({ apiFetch: createFederalRegisterApiFetch(), catalog: federalRegisterCatalog, doNamespace: namespace, stagingPrefix: "fedreg", maxInlineBytes: 30 * 1024 });
  const result = await proxy.handler({ method: "GET", path: "/documents.json" }, { sql: () => [] });
  expect(result).toMatchObject({ __staged: true, data_access_id: expect.any(String), _staging: expect.any(Object) });
  expect(result).toMatchObject({errors: native.errors});
  expect(stored.map(value => typeof value === "string" ? JSON.parse(value) : value)).toContainEqual(native);
  expect(new TextEncoder().encode(JSON.stringify(result)).byteLength).toBeLessThan(100000);
});

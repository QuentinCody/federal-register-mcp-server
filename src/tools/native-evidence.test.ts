import { verifyCitationEnvelope } from "@bio-mcp/shared";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ RpcTarget: class {}, DurableObject: class { constructor(public ctx: unknown, public env: unknown) {} } }));

import { fixture, recover } from "./staging-fixture";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function invoke(f: ReturnType<typeof fixture>, name: string, args: Record<string, unknown>, failed = false) {
  const result = await f.tools[name].handler(args, {});
  expect(result.isError === true, JSON.stringify(result).slice(0, 500)).toBe(failed);
  expect(result.content.length).toBeGreaterThan(0);
  const sc = result.structuredContent;
  const id = sc.staged ? sc.data_access_id : sc.data?.__staged ? sc.data.data_access_id : undefined;
  const staged = id ? await recover(f, id, "") : undefined;
  const proof = await verifyCitationEnvelope({ citation: sc._meta?.citation, structuredContent: sc, toolArguments: args,
    ...(staged ? { materialized: { value: staged } } : {}) });
  expect(proof.verification).toMatchObject({ query: "verified", result: "verified" });
  expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(30720);
  return { sc, id, data: sc.staged ? staged.structuredContent.data : sc.data?.__staged ? staged : sc.data };
}

it.each(["", "mcp_"])("verifies every %s alias including canonical SQL arguments and errors", async prefix => {
  const f = fixture();
  try {
    await invoke(f, `${prefix}fedreg_search`, { query: "inspection" });
    await invoke(f, `${prefix}fedreg_execute`, { code: "return {value:'001'};" });
    await invoke(f, `${prefix}fedreg_execute`, { code: "" }, true);
    await invoke(f, `${prefix}fedreg_query_data`, { data_access_id: "missing", sql: "SELECT * FROM missing" }, true);
    await invoke(f, `${prefix}fedreg_get_schema`, { data_access_id: "missing" });
  } finally { f.close(); }
});

it("recovers partial batch errors, correction links and string identifiers through SQL", async () => {
  const f = fixture();
  const document = { document_number: "00123", publication_date: "2026-09-28", effective_on: null,
    corrections: [{ document_number: "00456", html_url: "https://example.test/correction" }], correction_of: null,
    agencies: [{ id: 1, parent_id: 2 }], abstract: "α😀".repeat(7000) };
  const raw = { count: 1, results: [document], errors: { not_found: ["9999-99999"] } };
  vi.stubGlobal("fetch", async () => Response.json(raw));
  try {
    const result = await invoke(f, "fedreg_execute", { code: 'return await api.get("/documents/00123,9999-99999.json");' });
    expect(result.id).toBeTruthy(); expect(result.data).toEqual(raw);
    expect(result.sc._meta.citation.record_count).toBe(1);
    const rows = await invoke(f, "mcp_fedreg_query_data", { data_access_id: result.id, sql: "SELECT document_number,typeof(document_number) AS kind,corrections,agencies,effective_on FROM documents" });
    expect(rows.data.rows[0]).toEqual({ document_number: "00123", kind: "text", corrections: JSON.stringify(document.corrections), agencies: JSON.stringify(document.agencies), effective_on: null });
    const context = await invoke(f, "fedreg_query_data", { data_access_id: result.id, sql: "SELECT native_json FROM response_context" });
    expect(JSON.parse(context.data.rows[0].native_json)).toEqual({ count: 1, errors: raw.errors });
    expect(result.sc._meta.completeness.complete).toBe(false);
  } finally { f.close(); }
});

it("preserves inspection timestamps and nested data in composed envelope staging", async () => {
  const f = fixture();
  const raw = { count: 1, special_filings_updated_at: "2026-09-28T11:15:00-04:00", regular_filings_updated_at: "2026-09-28T08:45:00-04:00",
    results: [{ document_number: "2026-19882", filed_at: "2026-09-28T08:45:00-04:00", pdf_url: "https://public-inspection.federalregister.gov/2026-19882.pdf", notes: "α😀".repeat(7000) }] };
  try {
    const result = await invoke(f, "mcp_fedreg_execute", { code: `return ${JSON.stringify(raw)};` });
    expect(result.sc.staged).toBe(true); expect(result.data).toEqual(raw);
    const context = await invoke(f, "fedreg_query_data", { data_access_id: result.id, sql: "SELECT native_json FROM response_context" });
    const { results: _results, ...metadata } = raw;
    expect(JSON.parse(context.data.rows[0].native_json)).toEqual(metadata);
  } finally { f.close(); }
});

it("retains the complete native HTTP error through failure and SQL staging", async () => {
  const f = fixture(); const text = "unavailable α".repeat(7000);
  vi.stubGlobal("fetch", async () => new Response(text, { status: 404 }));
  try {
    const result = await invoke(f, "fedreg_execute", { code: 'return await api.get("/documents/9999-99999.json");' }, true);
    expect(result.data).toMatchObject({ __api_error: true, status: 404 });
    const evidence = result.data.data.__staged ? await recover(f, result.data.data.data_access_id, "") : result.data.data;
    expect(evidence).toBe(text);
  } finally { f.close(); }
});

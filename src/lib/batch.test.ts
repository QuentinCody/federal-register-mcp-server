import {afterEach, expect, it, vi} from "vitest";
import {createFederalRegisterApiFetch} from "./api-adapter";

afterEach(() => vi.unstubAllGlobals());
it("uses the native comma-separated path with repeated fields and an optional publication date", async () => {
  const native = {count: 2, results: [{document_number: "2011-17722"}, {document_number: "2011-17721"}]};
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json(native)); vi.stubGlobal("fetch", fetcher);
  const result = await createFederalRegisterApiFetch()({method: "GET", path: "/documents/2011-17721,2011-17722.json", params: {"fields[]": ["document_number", "corrections"], publication_date: "2011-07-14"}});
  expect(result).toEqual({status: 200, data: native});
  const url = new URL(fetcher.mock.calls[0][0]);
  expect(url.pathname).toBe("/api/v1/documents/2011-17721,2011-17722.json");
  expect(url.searchParams.getAll("fields[]")).toEqual(["document_number", "corrections"]);
  expect(url.searchParams.get("publication_date")).toBe("2011-07-14");
  expect(url.searchParams.has("document_numbers")).toBe(false);
  expect(fetcher.mock.calls[0][1].body).toBeUndefined();
});
it.each([
  {count: 1, results: [{document_number: "2012-7333", corrections: [], effective_on: null}], errors: {not_found: ["2012-99999"]}},
  {count: 0, results: [], errors: {not_found: ["2012-00000", "2012-99999"]}},
])("preserves partial/all-missing HTTP 200 envelopes without interpreting padding or dates", async native => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(native)));
  expect(await createFederalRegisterApiFetch()({method: "GET", path: "/documents/2012-07333,2012-99999.json"})).toEqual({status: 200, data: native});
});
it("preserves native field-selection errors separately from partial successful batches", async () => {
  const error = {status: 400, message: "Unknown field"};
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(error, {status: 400})));
  await expect(createFederalRegisterApiFetch()({method: "GET", path: "/documents/2011-17721,2011-17722.json", params: {"fields[]": ["unknown"]}})).rejects.toMatchObject({status: 400, data: JSON.stringify(error)});
});
it.each([{method: "POST"}, {method: "GET", body: {document_numbers: ["2011-17721"]}}])("rejects unsupported writes or JSON bodies before network access", async input => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(createFederalRegisterApiFetch()({...input, path: "/documents.json"})).rejects.toMatchObject({status: 405});
  expect(fetcher).not.toHaveBeenCalled();
});
it("rejects an oversized native stream and cancels it without partial output", async () => {
  const cancel = vi.fn();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(new ReadableStream({start(controller) {controller.enqueue(new Uint8Array(4 * 1024 * 1024 + 1));}, cancel}), {headers: {"content-type": "application/json"}})));
  await expect(createFederalRegisterApiFetch()({method: "GET", path: "/documents/2011-17721,2011-17722.json"})).rejects.toMatchObject({status: 502});
  expect(cancel).toHaveBeenCalled();
});
it("decodes multibyte native text split across stream chunks without replacement", async () => {
  const bytes = new TextEncoder().encode("citation,description\n1,α🙂\n");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(new ReadableStream({start(controller) {
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close();
  }}), {headers: {"content-type": "text/csv"}})));
  expect((await createFederalRegisterApiFetch()({method: "GET", path: "/documents.csv"})).data).toBe("citation,description\n1,α🙂\n");
});

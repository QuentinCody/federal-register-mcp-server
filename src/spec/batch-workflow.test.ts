import {expect, it, vi} from "vitest";
import {batchWorkflow} from "./batch-workflow";

const run = (get: ReturnType<typeof vi.fn>, query = vi.fn()) => new Function("api", `return (async () => {${batchWorkflow.code}})()`)({get, query});
it.each([
  {count: 2, results: [{document_number: "2011-17722"}, {document_number: "2011-17721"}]},
  {count: 1, results: [{document_number: "2011-17721"}], errors: {not_found: ["2011-17722"]}},
  {count: 0, results: [], errors: {not_found: ["2011-17721", "2011-17722"]}},
])("keeps batch context and native results/errors together without claiming completeness", async batch => {
  const get = vi.fn().mockResolvedValueOnce(batch);
  expect(await run(get)).toEqual({requested_document_numbers: ["2011-17721", "2011-17722"], batch, completeness: "not_established"});
  expect(get).toHaveBeenCalledExactlyOnceWith("/documents/2011-17721,2011-17722.json", {"fields[]": expect.arrayContaining(["document_number", "correction_of", "corrections", "effective_on", "comments_close_on", "pdf_url"])});
});
it("uses in-band staged SQL and retains the canonical payload handle", async () => {
  const batch = {__staged: true, data_access_id: "fixture", errors: {not_found: ["2011-17722"]}};
  const query = vi.fn().mockResolvedValue({rows: [{document_number: "2011-17721"}]});
  expect(await run(vi.fn().mockResolvedValue(batch), query)).toMatchObject({batch, completeness: "not_established", preview: {rows: [{document_number: "2011-17721"}]}});
  expect(query).toHaveBeenCalledWith("fixture", "SELECT document_number, title FROM documents LIMIT 25");
});
it("stops on API errors rather than running SQL or retrying", async () => {
  const batch = {__api_error: true, status: 400}; const query = vi.fn();
  expect(await run(vi.fn().mockResolvedValue(batch), query)).toMatchObject({batch, retrieval_failed: true});
  expect(query).not.toHaveBeenCalled();
});

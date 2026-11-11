import {DatabaseSync, type SQLInputValue} from "node:sqlite";
import {detectArrays, inferSchema, materializeSchema, type SchemaHints} from "@bio-mcp/shared/staging/schema-inference";
import {expect, it, vi} from "vitest";

vi.mock("@bio-mcp/shared/staging/rest-staging-do", () => ({RestStagingDO: class {}}));

import {FederalRegisterDataDO} from "./do";

it("materializes a field-selected document batch without requiring omitted columns", () => {
  const payload = {count: 1, results: [{document_number: "2011-17721", title: "α".repeat(20000)}], errors: {not_found: ["2011-17722"]}};
  const prototype = FederalRegisterDataDO.prototype as unknown as {getSchemaHints: (data: unknown) => SchemaHints; getTabularData: (data: unknown) => {documents: unknown[]}};
  const hints = prototype.getSchemaHints(payload);
  const projected = prototype.getTabularData(payload);
  const schema = inferSchema(detectArrays(projected), hints);
  const database = new DatabaseSync(":memory:");
  try {
    const result = materializeSchema(schema, new Map(Object.entries(projected)), {
      exec: (query, ...bindings) => database.prepare(query).run(...bindings as SQLInputValue[]),
    }, hints);
    expect(result.failedRows).toBe(0);
    expect(database.prepare("SELECT document_number, title FROM documents").all()).toEqual(payload.results);
  } finally {database.close();}
});

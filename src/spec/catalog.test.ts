import { expect, it } from "vitest";
import { federalRegisterCatalog as catalog } from "./catalog";

it("exposes current, historical desk and detail discovery with completeness guidance", () => {
  expect(catalog.endpointCount).toBe(catalog.endpoints.length);
  expect(catalog.endpoints.map(endpoint => endpoint.path)).toEqual(expect.arrayContaining([
    "/agencies.json", "/documents.json", "/documents/{document_number}.json",
    "/public-inspection-documents/current.json", "/public-inspection-documents/{document_number}.json",
  ]));
  const inspection = catalog.endpoints.find(endpoint => endpoint.path === "/public-inspection-documents.json");
  expect(inspection?.queryParams).toEqual(expect.arrayContaining([expect.objectContaining({ name: "conditions[available_on]" })]));
  expect(catalog.endpoints.find(endpoint => endpoint.path === "/documents.json")?.queryParams).toEqual(expect.arrayContaining([expect.objectContaining({ name: "search_after_cursor" })]));
  expect(catalog.notes).toContain("neither that count nor total_pages proves exhaustive coverage");
  expect(catalog.notes).toContain("govinfo");
  expect(catalog.endpoints.find(endpoint => endpoint.path === "/agencies.json")?.queryParams).toBeUndefined();
});

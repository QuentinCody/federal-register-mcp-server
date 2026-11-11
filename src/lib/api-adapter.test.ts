import { afterEach, expect, it, vi } from "vitest";
import { createFederalRegisterApiFetch } from "./api-adapter";

afterEach(() => vi.unstubAllGlobals());

it("preserves agency discovery, repeated filters and publication-date windows", async () => {
  const agencies = [{ id: 1, slug: "health-and-human-services", name: "Health and Human Services" }];
  const page = { count: 3000, total_pages: 150, next_page_url: "https://www.federalregister.gov/api/v1/documents.json?page=2", results: [{ document_number: "2026-00001", title: "Synthetic fixture" }] };
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json(agencies)).mockResolvedValueOnce(Response.json(page));
  vi.stubGlobal("fetch", fetcher);
  const api = createFederalRegisterApiFetch();
  expect((await api({ method: "GET", path: "/agencies.json" })).data).toEqual(agencies);
  const result = await api({ method: "GET", path: "/documents.json", params: {
    "conditions[agencies][]": [agencies[0].slug, "food-and-drug-administration"],
    "conditions[publication_date][gte]": "2026-09-01",
    "conditions[publication_date][lte]": "2026-09-29",
    "fields[]": ["document_number", "title"], per_page: 20, page: 1,
  } });
  expect(result.data).toEqual(page);
  const url = new URL(fetcher.mock.calls[1][0]);
  expect(url.origin).toBe("https://www.federalregister.gov");
  expect(url.pathname).toBe("/api/v1/documents.json");
  expect(url.searchParams.getAll("conditions[agencies][]")).toEqual([agencies[0].slug, "food-and-drug-administration"]);
  expect(url.searchParams.getAll("fields[]")).toEqual(["document_number", "title"]);
  expect(url.searchParams.get("conditions[publication_date][gte]")).toBe("2026-09-01");
  expect(url.searchParams.get("conditions[publication_date][lte]")).toBe("2026-09-29");
});

it("preserves correction relationships and unknown effective/comment dates", async () => {
  const document = { document_number: "2026-00001", publication_date: "2026-09-29", effective_on: null, comments_close_on: null, correction_of: "2026-00000", corrections: [], pdf_url: "https://www.govinfo.gov/content/pkg/FR-2026-09-29/pdf/2026-00001.pdf", subtype: "fixture", future_field: { untouched: true } };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(document)));
  expect(await createFederalRegisterApiFetch()({ method: "GET", path: "/documents/2026-00001.json" })).toEqual({ status: 200, data: document });
});

it.each([
  ["/public-inspection-documents/current.json", {}],
  ["/public-inspection-documents.json", { "conditions[available_on]": "2026-09-28" }],
  ["/public-inspection-documents/2026-00001.json", {}],
])("preserves public inspection payloads at %s", async (path, params) => {
  const payload = { document_number: "2026-00001", filed_at: "2026-09-28T08:45:00-04:00", publication_date: "2026-09-29", editorial_note: "Synthetic fixture", pdf_updated_at: null };
  const native = path.includes("2026-00001") ? payload : { count: 1, results: [payload], future_desk_metadata: "retained" };
  const fetcher = vi.fn().mockResolvedValue(Response.json(native)); vi.stubGlobal("fetch", fetcher);
  expect((await createFederalRegisterApiFetch()({ method: "GET", path, params })).data).toEqual(native);
  const url = new URL(fetcher.mock.calls[0][0]);
  expect(url.pathname).toBe(`/api/v1${path}`);
  expect(url.searchParams.get("conditions[available_on]")).toBe("conditions[available_on]" in params ? params["conditions[available_on]"] : null);
  expect(url.searchParams.has("conditions[publication_date]")).toBe(false);
});

it("reports provider errors without turning them into successful data", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unknown document", { status: 404 })));
  await expect(createFederalRegisterApiFetch()({ method: "GET", path: "/documents/missing.json" })).rejects.toMatchObject({ status: 404, message: "HTTP 404: Unknown document" });
});

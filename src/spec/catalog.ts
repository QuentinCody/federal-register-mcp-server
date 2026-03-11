import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const federalRegisterCatalog: ApiCatalog = {
	name: "Federal Register",
	baseUrl: "https://www.federalregister.gov/api/v1",
	version: "0.1",
	auth: "public_read_api",
	endpointCount: 5,
	notes:
		"- Catalog-only v1 scaffold over the Federal Register public API.\n" +
		"- Search endpoints use query-string filters such as per_page, order, conditions[publication_date][gte], and conditions[agencies][].\n" +
		"- agencies.json returns a top-level array, while documents and public-inspection responses return { count, results, total_pages } wrappers.\n" +
		"- Use document_number as the most stable primary identifier for document lookups.",
	endpoints: [
		{
			method: "GET",
			path: "/documents.json",
			summary: "Search Federal Register documents",
			category: "documents",
			queryParams: [
				{ name: "per_page", type: "number", required: false, description: "Results per page" },
				{ name: "order", type: "string", required: false, description: "Sort order, such as newest or relevance" },
			],
		},
		{
			method: "GET",
			path: "/documents/{document_number}.json",
			summary: "Get a Federal Register document by document number",
			category: "documents",
			pathParams: [{ name: "document_number", type: "string", required: true, description: "Federal Register document number" }],
		},
		{
			method: "GET",
			path: "/agencies.json",
			summary: "List Federal Register agencies",
			category: "agencies",
			queryParams: [{ name: "per_page", type: "number", required: false, description: "Results per page" }],
		},
		{
			method: "GET",
			path: "/agencies/{slug}.json",
			summary: "Get a Federal Register agency by slug",
			category: "agencies",
			pathParams: [{ name: "slug", type: "string", required: true, description: "Agency slug" }],
		},
		{
			method: "GET",
			path: "/public-inspection-documents.json",
			summary: "Search Federal Register public inspection documents",
			category: "public-inspection",
			queryParams: [{ name: "per_page", type: "number", required: false, description: "Results per page" }],
		},
	],
};

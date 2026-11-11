import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";
import {batchWorkflow} from "./batch-workflow";

export const federalRegisterCatalog: ApiCatalog = {
	name: "Federal Register",
	baseUrl: "https://www.federalregister.gov/api/v1",
	version: "0.2",
	auth: "public_read_api",
	endpointCount: 7,
	workflows: [batchWorkflow],
	notes:
		"- Federal Register public JSON API; no API key. Native response fields and pagination links are preserved.\n" +
		"- Search endpoints use query-string filters such as per_page, order, conditions[publication_date][gte], and conditions[agencies][].\n" +
		"- Pass array parameters using their bracketed names, e.g. 'conditions[agencies][]': ['health-and-human-services'] or 'fields[]': ['document_number', 'title'].\n" +
		"- Preserve next_page_url and its search_after_cursor when returned. Native reads on 2026-10-04 reached 10000 results and rejected the next page; neither that count nor total_pages proves exhaustive coverage. Use bounded publication-date windows and reconcile document numbers.\n" +
		"- agencies.json returns an array. Preserve native result wrappers and counts; do not conflate current inspection with published documents.\n" +
		"- Use document_number for lookups. Retain corrections, correction_of, effective_on, comments_close_on and source PDF links when returned; absent dates are unknown.\n" +
		"- Multi-get uses comma-separated numbers in /documents/{document_number}.json, not a JSON body or a document_numbers query parameter. Its native envelope contains count/results and may include errors.not_found with HTTP 200. Returned order and padded identifier spelling need not match input. Keep batches small and inspect both results and errors; count alone does not establish coverage.\n" +
		"- Reads are bodyless GET. Responses are bounded to 4 MiB; reduce batch size or select fewer fields if a response is too large.\n" +
		"- FederalRegister.gov is an informational rendition; use linked govinfo PDFs for the official published edition. Public-inspection PDFs are prepublication documents.",
	endpoints: [
		{
			method: "GET",
			path: "/documents.json",
			summary: "Search Federal Register documents",
			category: "documents",
			queryParams: [
				{ name: "per_page", type: "number", required: false, description: "Results per page" },
				{ name: "page", type: "number", required: false, description: "Page number from native pagination metadata; broad-search totals may be bounded" },
				{ name: "search_after_cursor", type: "string", required: false, description: "Opaque token from next_page_url; retain the original filters, fields and sort order" },
				{ name: "order", type: "string", required: false, description: "Sort order, such as newest or relevance" },
				{ name: "conditions[term]", type: "string", required: false, description: "Full-text query" },
				{ name: "conditions[agencies][]", type: "array", required: false, description: "Agency slugs from /agencies.json" },
				{ name: "conditions[publication_date][gte]", type: "string", required: false, description: "Inclusive publication-date lower bound (YYYY-MM-DD)" },
				{ name: "conditions[publication_date][lte]", type: "string", required: false, description: "Inclusive publication-date upper bound (YYYY-MM-DD)" },
				{ name: "fields[]", type: "array", required: false, description: "Requested native fields; include identifiers and source links needed for follow-up" },
			],
		},
		{
			method: "GET",
			path: "/documents/{document_number}.json",
			summary: "Get one or multiple Federal Register documents by document number (comma-separated multi-get)",
			category: "documents",
			pathParams: [{ name: "document_number", type: "string", required: true, description: "One document number, or a comma-separated list such as 2011-17721,2011-17722. One ID returns a record; multiple IDs return count/results with possible errors.not_found." }],
			queryParams: [
				{ name: "fields[]", type: "array", required: false, description: "Optional native field selection; include document_number to reconcile results, plus corrections and effective/comment dates as needed" },
				{ name: "publication_date", type: "string", required: false, description: "Optional YYYY-MM-DD qualifier for document-number lookups, useful for ambiguous historical numbers" },
			],
		},
		{
			method: "GET",
			path: "/agencies.json",
			summary: "List Federal Register agencies",
			category: "agencies",
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
			summary: "Search current public inspection documents, or retrieve the desk on a historical date",
			category: "public-inspection",
			queryParams: [
				{ name: "per_page", type: "number", required: false, description: "Search results per page" },
				{ name: "page", type: "number", required: false, description: "Search page number" },
				{ name: "conditions[term]", type: "string", required: false, description: "Search term" },
				{ name: "conditions[agencies][]", type: "array", required: false, description: "Agency slugs" },
				{ name: "conditions[available_on]", type: "string", required: false, description: "Desk date YYYY-MM-DD, available since November 2011; not the publication date. This dated-desk branch returns the whole desk and may ignore search page/per_page parameters." },
			],
		},
		{
			method: "GET",
			path: "/public-inspection-documents/current.json",
			summary: "Get all documents currently on public inspection, preserving desk metadata",
			category: "public-inspection",
		},
		{
			method: "GET",
			path: "/public-inspection-documents/{document_number}.json",
			summary: "Get public inspection metadata and prepublication PDF link by document number",
			category: "public-inspection",
			pathParams: [{ name: "document_number", type: "string", required: true, description: "Document number; inspection coverage since November 2011" }],
		},
	],
};

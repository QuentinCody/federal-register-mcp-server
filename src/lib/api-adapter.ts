import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { federalRegisterFetch } from "./http";
import {fail, readFederalResponse} from "./read-response";

export function createFederalRegisterApiFetch(): ApiFetchFn {
	return async (request) => {
		if (request.method !== "GET" || request.body !== undefined) throw Object.assign(new Error("Federal Register supports bodyless GET reads only"), {status: 405});
		const response = await federalRegisterFetch(request);
		const text = await readFederalResponse(response);

		if (!response.ok) {
			const errorBody = text || response.statusText;
			const error = new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`) as Error & {
				status: number;
				data: unknown;
			};
			error.status = response.status;
			error.data = errorBody;
			throw error;
		}

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("json")) {
			if (request.path.split("?")[0].endsWith(".json")) fail("Expected JSON from Federal Register", 502, {response: text, content_type: contentType, path: request.path});
			return { status: response.status, data: text };
		}

		let data: unknown;
		try {data = JSON.parse(text);}
		catch {fail("Invalid JSON from Federal Register", 502, {response: text, path: request.path});}
		return { status: response.status, data };
	};
}

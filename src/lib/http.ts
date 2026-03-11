import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { restFetch, type RestFetchOptions } from "@bio-mcp/shared/http/rest-fetch";

const FEDERAL_REGISTER_BASE = "https://www.federalregister.gov/api/v1";

interface FederalRegisterFetchOptions extends Omit<RestFetchOptions, "retryOn"> {
	accept?: string;
}

type ApiRequest = Parameters<ApiFetchFn>[0];

export function federalRegisterFetch(
	request: ApiRequest,
	opts?: FederalRegisterFetchOptions,
): Promise<Response> {
	const headers: Record<string, string> = {
		Accept: opts?.accept ?? "application/json",
		...(opts?.headers ?? {}),
	};

	return restFetch(FEDERAL_REGISTER_BASE, request.path, request.params, {
		method: request.method,
		body: request.body as Record<string, unknown> | string | undefined,
		headers,
		retryOn: [429, 500, 502, 503],
		retries: opts?.retries ?? 3,
		timeout: opts?.timeout ?? 30_000,
		userAgent: "federal-register-mcp-server/1.0 (bio-mcp)",
	});
}

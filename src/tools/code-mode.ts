/**
 * Federal Register Code Mode — registers search + execute tools for public API access.
 *
 * search: In-process catalog query.
 * execute: V8 isolate with api.get/api.post + searchSpec/listCategories.
 */

import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import type { McpServer } from "@bio-mcp/shared/mcp";
import { createFederalRegisterApiFetch } from "../lib/api-adapter";
import {fedregResponse} from "../lib/tool-result";
import { federalRegisterCatalog } from "../spec/catalog";

interface CodeModeEnv {
	FEDERAL_REGISTER_DATA_DO: DurableObjectNamespace;
	CODE_MODE_LOADER: WorkerLoader;
}

export function registerCodeMode(
	server: McpServer,
	env: CodeModeEnv,
): void {
	const apiFetch = createFederalRegisterApiFetch();
	const registrar = { tool: (...args: unknown[]) => {
		const [name, ...rest] = args;
		const handler = rest.pop() as (args: unknown, extra: unknown) => ReturnType<Parameters<typeof fedregResponse>[0]>;
		const respond = (args: unknown, extra: unknown) => fedregResponse(() => handler(args, extra), env, String(name), extra, args);
		// SAFETY: shared factories supply SDK arguments; only the alias changes.
		const register = server.tool.bind(server) as (...values: unknown[]) => void;
		register(name, ...rest, respond); register(`mcp_${String(name)}`, ...rest, respond);
	} };

	const searchTool = createSearchTool({
		prefix: "fedreg",
		catalog: federalRegisterCatalog,
	});
	searchTool.register(registrar);

	const executeTool = createExecuteTool({
		prefix: "fedreg",
		// Verifiable provenance: fedreg_execute results carry a _meta.citation.
		source: { id: "fedreg", name: "Federal Register", url: "https://www.federalregister.gov", license: "U.S. Public Domain" },
		catalog: federalRegisterCatalog,
		apiFetch,
		preserveApiErrors: true,
		doNamespace: env.FEDERAL_REGISTER_DATA_DO,
		loader: env.CODE_MODE_LOADER,
		maxInlineBytes: 30 * 1024,
		stagingThreshold: 30 * 1024,
		timeout: 60000,
	});
	executeTool.register(registrar);
}

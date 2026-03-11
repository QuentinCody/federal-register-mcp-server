/**
 * Scholarly Graph Code Mode — registers search + execute tools for full API access.
 *
 * search: In-process catalog query.
 * execute: V8 isolate with api.get/api.post + searchSpec/listCategories.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { federalRegisterCatalog } from "../spec/catalog";
import { createFederalRegisterApiFetch } from "../lib/api-adapter";

interface CodeModeEnv {
	FEDERAL_REGISTER_DATA_DO: DurableObjectNamespace;
	CODE_MODE_LOADER: WorkerLoader;
}

export function registerCodeMode(
	server: McpServer,
	env: CodeModeEnv,
) {
	const apiFetch = createFederalRegisterApiFetch();

	const searchTool = createSearchTool({
		prefix: "fedreg",
		catalog: federalRegisterCatalog,
	});
	searchTool.register(server as unknown as { tool: (...args: unknown[]) => void });

	const executeTool = createExecuteTool({
		prefix: "fedreg",
		catalog: federalRegisterCatalog,
		apiFetch,
		doNamespace: env.FEDERAL_REGISTER_DATA_DO,
		loader: env.CODE_MODE_LOADER,
	});
	executeTool.register(server as unknown as { tool: (...args: unknown[]) => void });
}

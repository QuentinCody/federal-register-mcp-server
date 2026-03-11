import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createGetSchemaHandler } from "@bio-mcp/shared/staging/utils";

interface SchemaEnv {
	FEDERAL_REGISTER_DATA_DO?: unknown;
}

export function registerGetSchema(server: McpServer, env?: SchemaEnv) {
	const handler = createGetSchemaHandler("FEDERAL_REGISTER_DATA_DO", "fedreg");

	server.registerTool(
		"fedreg_get_schema",
		{
			title: "Get Staged Federal Register Data Schema",
			description:
				"Get schema information for staged Federal Register data. Shows table structures and row counts.",
			inputSchema: {
				data_access_id: z
					.string()
					.min(1)
					.describe("Data access ID for the staged dataset"),
			},
		},
		async (args, extra) => {
			const runtimeEnv = env || (extra as { env?: SchemaEnv })?.env || {};
			return handler(args as Record<string, unknown>, runtimeEnv as Record<string, unknown>);
		},
	);
}

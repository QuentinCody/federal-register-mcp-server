import type { McpServer } from "@bio-mcp/shared/mcp";
import { createGetSchemaHandler } from "@bio-mcp/shared/staging/utils";
import { z } from "zod";
import {type FedregDataEnv, fedregResponse } from "../lib/tool-result";

interface SchemaEnv {
	FEDERAL_REGISTER_DATA_DO?: unknown;
}

export function registerGetSchema(server: McpServer, env?: SchemaEnv): void {
	const handler = createGetSchemaHandler("FEDERAL_REGISTER_DATA_DO", "fedreg");

	for (const name of ["fedreg_get_schema", "mcp_fedreg_get_schema"]) server.registerTool(
		name,
		{
			title: "Get Staged Federal Register Data Schema",
			description:
				"Get schema information for staged Federal Register data. Shows table structures and row counts. " +
				"If called without a data_access_id, lists all staged datasets available in this session.",
			inputSchema: {
				data_access_id: z
					.string()
					.min(1)
					.optional()
					.describe("Data access ID for the staged dataset. If omitted, lists all staged datasets in this session."),
			},
		},
		async (args, extra) => {
			const runtimeEnv = env || (extra as { env?: SchemaEnv })?.env || {};
			return fedregResponse(() => handler(
				args as Record<string, unknown>,
				runtimeEnv as Record<string, unknown>,
				(extra as Record<string, unknown>),
			), runtimeEnv as FedregDataEnv, name, extra, args);
		},
	);
}

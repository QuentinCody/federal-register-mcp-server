/**
 * FederalRegisterDataDO — Durable Object for staging Federal Register responses.
 */

import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

export class FederalRegisterDataDO extends RestStagingDO {
	protected getSchemaHints(data: unknown): SchemaHints | undefined {
		if (!data || typeof data !== "object") return undefined;

		const obj = data as Record<string, unknown>;

		if (Array.isArray(obj.results)) {
			return {
				tableName: "documents",
				indexes: ["document_number", "publication_date", "type", "title"],
			};
		}

		if (Array.isArray(data)) {
			const sample = data[0];
			if (sample && typeof sample === "object") {
				return {
					tableName: "agencies",
					indexes: ["id", "slug", "name"],
				};
			}
		}

		if ("document_number" in obj) {
			return {
				tableName: "document",
				indexes: ["document_number", "publication_date", "type"],
			};
		}

		return undefined;
	}
}

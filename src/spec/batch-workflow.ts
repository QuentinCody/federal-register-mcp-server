import type {WorkflowRecipe} from "@bio-mcp/shared/codemode/catalog";

export const batchWorkflow: WorkflowRecipe = {
  title: "Retrieve several Federal Register documents in one request",
  description: "Use comma-separated document numbers in the native detail path. Preserve native count, results and errors.not_found; HTTP 200 can mean partial retrieval. Keep identifiers and corrections together. Staged results remain queryable in the same execution.",
  keywords: ["batch", "multi-get", "documents", "corrections", "not_found"],
  code: `const requested_document_numbers = ['2011-17721', '2011-17722'];
const batch = await api.get('/documents/' + requested_document_numbers.join(',') + '.json', {
  'fields[]': ['document_number', 'title', 'publication_date', 'correction_of', 'corrections', 'effective_on', 'comments_close_on', 'pdf_url']
});
if (batch.__api_error) return {requested_document_numbers, batch, retrieval_failed: true};
if (batch.__staged) {
  const preview = await api.query(batch.data_access_id, 'SELECT document_number, title FROM documents LIMIT 25');
  return {requested_document_numbers, batch, preview, completeness: 'not_established'};
}
return {requested_document_numbers, batch, completeness: 'not_established'};`,
};

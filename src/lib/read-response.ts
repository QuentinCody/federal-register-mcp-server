export function fail(message: string, status = 400, data?: unknown): never {
  const error = new Error(message) as Error & { status: number; data: unknown };
  error.status = status;
  error.data = data ?? { source: "fedreg", status, message };
  throw error;
}
export async function readFederalResponse(response: Response): Promise<string> {
  if (!response.body) fail("Provider returned no body", 502);
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let bytes = 0;
  let text = "";
  const deadline = Date.now() + 15_000;
  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const next = reader.read();
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          try { fail("Provider body exceeded its 15-second deadline", 504); } catch (error) { reject(error); }
        }, Math.max(0, deadline - Date.now()));
      });
      const { done, value } = await Promise.race([next, timeout]).finally(() => clearTimeout(timer));
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4 * 1024 * 1024) fail("Provider response exceeds 4 MiB; narrow the query or select fewer fields", 502);
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    if (response.status === 206 || response.headers.has("content-range")) fail("Unexpected partial Federal Register response", 502, { response: text, http_status: response.status, content_range: response.headers.get("content-range") });
    return text;
  } finally { void reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

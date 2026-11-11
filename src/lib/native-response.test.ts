import { afterEach, expect, it, vi } from "vitest";
import { createFederalRegisterApiFetch } from "./api-adapter";
import { readFederalResponse } from "./read-response";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("rejects successful HTML and malformed JSON while retaining native evidence", async () => {
  const api = createFederalRegisterApiFetch();
  vi.stubGlobal("fetch", async () => new Response("<html>challenge</html>", { headers: { "content-type": "text/html" } }));
  await expect(api({ method: "GET", path: "/documents.json" })).rejects.toMatchObject({ status: 502, data: { response: "<html>challenge</html>" } });
  vi.stubGlobal("fetch", async () => new Response('{"results":', { headers: { "content-type": "application/json" } }));
  await expect(api({ method: "GET", path: "/documents.json" })).rejects.toMatchObject({ status: 502, data: { response: '{"results":' } });
});
it.each([200, 206])("rejects a partial native response even when the JSON is valid (HTTP %s)", async status => {
  await expect(readFederalResponse(new Response('{"results":[]}', { status, headers: { "content-range": "bytes 0-13/99" } }))).rejects.toMatchObject({ status: 502, data: { response: '{"results":[]}' } });
});
it("bounds a stalled body even when cancellation never settles", async () => {
  vi.useFakeTimers();
  const cancel = vi.fn(() => new Promise<void>(() => {}));
  const response = new Response(new ReadableStream({ pull: () => new Promise<void>(() => {}), cancel }));
  const pending = expect(readFederalResponse(response)).rejects.toMatchObject({ status: 504 });
  await vi.advanceTimersByTimeAsync(15001); await pending;
  expect(cancel).toHaveBeenCalledOnce(); expect(response.body?.locked).toBe(false);
});
it("keeps a complete long native error and rejects invalid UTF-8", async () => {
  const text = "native failure α".repeat(6000);
  vi.stubGlobal("fetch", async () => new Response(text, { status: 404 }));
  await expect(createFederalRegisterApiFetch()({ method: "GET", path: "/documents/missing.json" })).rejects.toMatchObject({ status: 404, data: text });
  await expect(readFederalResponse(new Response(new Uint8Array([0xff])))).rejects.toThrow();
});

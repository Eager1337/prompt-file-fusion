// Server-only Lovable AI Gateway helper (Responses API, streamed).
export const AI_MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

export const GEN_SYSTEM = `You are ONEAGER, an expert web app builder. Produce a starter implementation for the user's app idea as a small set of project files.
Output format — each file starts with a header line exactly like:
=== FILE: index.html ===
followed by the full file contents. No other commentary. Write index.html FIRST.
Required files:
- index.html: a complete, self-contained, runnable document (<!doctype html>…</html>) with inline <style> and <script>; you may load Tailwind via <script src="https://cdn.tailwindcss.com"></script>. Polished, responsive and fully functional with vanilla JS; persist data in localStorage when useful.
- README.md: what the app does, its features, and how to extend it.
- app.config.json: {"name": ..., "description": ..., "features": [...]}
If current files are provided, apply the requested change and return ALL files in full.`;

/** Streams Responses API output text, calling onDelta for each chunk. Returns the full text. */
export async function streamResponseText(
  instructions: string,
  input: { role: "user" | "assistant"; content: string }[],
  onDelta?: (d: string) => void,
) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured for this app.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: AI_MODEL, instructions, input, stream: true, store: false, reasoning: { effort: "low" } }),
  });
  if (!res.ok || !res.body) {
    let msg = "";
    try {
      const j = (await res.json()) as { error?: { message?: string }; message?: string };
      msg = j.error?.message ?? j.message ?? "";
    } catch { /* ignore */ }
    if (res.status === 429) throw new AiError("Too many requests right now — please try again in a moment.", 429);
    if (res.status === 402) throw new AiError(msg || "AI credits are used up for this workspace.", 402);
    if (res.status === 403) throw new AiError(msg || "AI access is blocked for this workspace.", 403);
    throw new AiError(msg || `AI generation failed (${res.status}).`, res.status);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let ev: { type?: string; delta?: string; error?: { message?: string }; response?: { error?: { message?: string } } };
      try { ev = JSON.parse(payload); } catch { continue; }
      if (ev.type === "response.output_text.delta" && ev.delta) {
        text += ev.delta;
        onDelta?.(ev.delta);
      }
      if (ev.type === "error" || ev.type === "response.failed") {
        throw new AiError(ev.error?.message ?? ev.response?.error?.message ?? "AI generation failed.");
      }
    }
  }
  return text;
}

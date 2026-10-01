// Server-only Lovable AI Gateway helper (Responses API, streamed).
export const AI_MODEL = "openai/gpt-6-astra";

export class AiError extends Error {}

export async function streamResponseText(instructions: string, input: { role: "user" | "assistant"; content: string }[]) {
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
    body: JSON.stringify({
      model: AI_MODEL,
      instructions,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
    }),
  });
  if (!res.ok || !res.body) {
    let msg = "";
    try {
      const j = (await res.json()) as { error?: { message?: string }; message?: string };
      msg = j.error?.message ?? j.message ?? "";
    } catch { /* ignore */ }
    if (res.status === 429) throw new AiError("Too many requests right now — please try again in a moment.");
    if (res.status === 402) throw new AiError(msg || "AI credits are used up for this workspace.");
    if (res.status === 403) throw new AiError(msg || "AI access is blocked for this workspace.");
    throw new AiError(msg || `AI generation failed (${res.status}).`);
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
      try {
        const ev = JSON.parse(payload) as { type?: string; delta?: string; error?: { message?: string }; response?: { error?: { message?: string } } };
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        if (ev.type === "error" || ev.type === "response.failed") {
          throw new AiError(ev.error?.message ?? ev.response?.error?.message ?? "AI generation failed.");
        }
      } catch (e) {
        if (e instanceof AiError) throw e;
      }
    }
  }
  return text;
}

/** Parses `=== FILE: path ===` blocks. */
export function parseFiles(text: string) {
  const files: { path: string; content: string }[] = [];
  const re = /^=== FILE: (.+?) ===\s*$/gm;
  const marks = [...text.matchAll(re)];
  marks.forEach((m, idx) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = marks[idx + 1]?.index ?? text.length;
    let content = text.slice(start, end).replace(/^\s*\n/, "").trimEnd();
    content = content.replace(/^```[a-z]*\n/i, "").replace(/\n```$/, "");
    const path = (m[1] ?? "").trim().replace(/^\/+/, "");
    if (path && !path.includes("..")) files.push({ path, content });
  });
  return files;
}

export function languageFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ({ html: "html", css: "css", js: "javascript", ts: "typescript", json: "json", md: "markdown" } as Record<string, string>)[ext] ?? "text";
}

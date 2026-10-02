// Browser-safe helpers for the `=== FILE: path ===` generation format.
export type GenFile = { path: string; content: string; complete: boolean };

export function parseFiles(text: string): GenFile[] {
  const files: GenFile[] = [];
  const marks = [...text.matchAll(/^=== FILE: (.+?) ===[ \t]*$/gm)];
  marks.forEach((m, idx) => {
    const start = (m.index ?? 0) + m[0].length;
    const next = marks[idx + 1]?.index;
    let content = text.slice(start, next ?? text.length).replace(/^\s*\n/, "").trimEnd();
    content = content.replace(/^```[a-z]*\n/i, "").replace(/\n```$/, "");
    const path = (m[1] ?? "").trim().replace(/^\/+/, "");
    if (path && !path.includes("..")) files.push({ path, content, complete: next !== undefined });
  });
  return files;
}

export function languageFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ({ html: "html", css: "css", js: "javascript", ts: "typescript", json: "json", md: "markdown" } as Record<string, string>)[ext] ?? "text";
}

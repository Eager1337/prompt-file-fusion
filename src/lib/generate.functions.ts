import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `You are ONEAGER, an expert web app builder. Produce a starter implementation for the user's app idea as a small set of project files.
Output format — each file starts with a header line exactly like:
=== FILE: index.html ===
followed by the full file contents. No other commentary.
Required files:
- index.html: a complete, self-contained, runnable document (<!doctype html>…</html>) with inline <style> and <script>; you may load Tailwind via <script src="https://cdn.tailwindcss.com"></script>. Polished, responsive and fully functional with vanilla JS; persist data in localStorage when useful.
- README.md: what the app does, its features, and how to extend it.
- app.config.json: {"name": ..., "description": ..., "features": [...]}
If current files are provided, apply the requested change and return ALL files in full.`;

export const generateApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid(), prompt: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { streamResponseText, parseFiles, languageFor, AI_MODEL, AiError } = await import("./ai.server");
    const { supabase, userId } = context;
    const { projectId, prompt } = data;

    const { data: project, error: pErr } = await supabase.from("projects").select("id, workspace_id").eq("id", projectId).single();
    if (pErr || !project) throw new Error("Project not found");

    let { data: convo } = await supabase.from("ai_conversations").select("id").eq("project_id", projectId).order("created_at").limit(1).maybeSingle();
    if (!convo) {
      const r = await supabase.from("ai_conversations").insert({ project_id: projectId, title: prompt.slice(0, 60), created_by: userId }).select("id").single();
      if (r.error) throw new Error(r.error.message);
      convo = r.data;
    }
    await supabase.from("ai_messages").insert({ conversation_id: convo.id, project_id: projectId, role: "user", content: prompt });
    await supabase.from("projects").update({ status: "BUILDING" }).eq("id", projectId);

    const { data: current } = await supabase.from("project_files").select("path, content").eq("project_id", projectId);
    const currentText = (current ?? []).map((f) => `=== FILE: ${f.path} ===\n${f.content}`).join("\n\n");

    let files;
    try {
      const text = await streamResponseText(SYSTEM, [
        ...(currentText ? [{ role: "user" as const, content: `Current files:\n${currentText}` }] : []),
        { role: "user" as const, content: prompt },
      ]);
      files = parseFiles(text);
      if (!files.length && text.toLowerCase().includes("<html")) files = [{ path: "index.html", content: text.trim() }];
      if (!files.some((f) => f.path === "index.html")) throw new AiError("The AI didn't return a runnable app. Try describing it differently.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI generation failed";
      await supabase.from("ai_messages").insert({ conversation_id: convo.id, project_id: projectId, role: "assistant", content: `Couldn't build: ${msg}` });
      await supabase.from("projects").update({ status: "ERROR" }).eq("id", projectId);
      throw new Error(msg);
    }

    const up = await supabase.from("project_files").upsert(
      files.map((f) => ({ project_id: projectId, path: f.path, content: f.content, language: languageFor(f.path), size: f.content.length })),
      { onConflict: "project_id,path" },
    );
    if (up.error) throw new Error(up.error.message);

    const { data: last } = await supabase.from("project_versions").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1).maybeSingle();
    const version = (last?.version ?? 0) + 1;
    await supabase.from("project_versions").insert({
      project_id: projectId, version, label: `v${version}`, summary: prompt.slice(0, 200),
      snapshot: Object.fromEntries(files.map((f) => [f.path, f.content])), created_by: userId,
    });
    await supabase.from("ai_messages").insert({
      conversation_id: convo.id, project_id: projectId, role: "assistant",
      content: `Built version ${version} with ${files.length} files: ${files.map((f) => f.path).join(", ")}.`,
    });
    await supabase.from("projects").update({ status: "READY" }).eq("id", projectId);
    await supabase.from("usage_records").insert({ workspace_id: project.workspace_id, project_id: projectId, user_id: userId, kind: "generation", model: AI_MODEL });

    return { version, files: files.map((f) => f.path) };
  });

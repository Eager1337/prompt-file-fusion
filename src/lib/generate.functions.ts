import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `You are ONEAGER, an expert web app builder. Output ONE complete, self-contained HTML document (<!doctype html> ... </html>) implementing the user's request.
Rules: use inline <style> and <script> only (you may load Tailwind via <script src="https://cdn.tailwindcss.com"></script>). Make it polished, responsive and fully functional with vanilla JS. Persist data in localStorage when useful.
If a current version is provided, modify it according to the request and return the full updated document.
Return ONLY the HTML, no markdown fences, no commentary.`;

export const generateApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid(), prompt: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
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

    const { data: current } = await supabase.from("project_files").select("content").eq("project_id", projectId).eq("path", "index.html").maybeSingle();

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          ...(current?.content ? [{ role: "user", content: `Current version:\n${current.content}` }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Too many requests right now — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are used up. Add credits in workspace settings.");
    if (!res.ok) throw new Error("AI generation failed");
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    let html = json.choices?.[0]?.message?.content ?? "";
    html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
    if (!html.toLowerCase().includes("<html")) throw new Error("The AI returned an unexpected result. Try rephrasing.");

    const up = await supabase
      .from("project_files")
      .upsert({ project_id: projectId, path: "index.html", content: html, language: "html", size: html.length }, { onConflict: "project_id,path" });
    if (up.error) throw new Error(up.error.message);

    const { data: last } = await supabase.from("project_versions").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1).maybeSingle();
    const version = (last?.version ?? 0) + 1;
    await supabase.from("project_versions").insert({
      project_id: projectId, version, label: `v${version}`, summary: prompt.slice(0, 200),
      snapshot: { "index.html": html }, created_by: userId,
    });
    await supabase.from("ai_messages").insert({ conversation_id: convo.id, project_id: projectId, role: "assistant", content: `Built version ${version}.` });
    await supabase.from("projects").update({ status: "READY" }).eq("id", projectId);
    await supabase.from("usage_records").insert({ workspace_id: project.workspace_id, project_id: projectId, user_id: userId, kind: "generation", model: "google/gemini-3-flash-preview" });

    return { version };
  });

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseFiles, languageFor } from "./files";
import { AI_MODEL, AiError } from "./ai.server";

type Db = SupabaseClient<Database>;

export async function startGeneration(supabase: Db, userId: string, projectId: string, prompt: string) {
  const { data: project, error } = await supabase.from("projects").select("id, workspace_id").eq("id", projectId).single();
  if (error || !project) throw new AiError("Project not found", 404);
  let { data: convo } = await supabase.from("ai_conversations").select("id").eq("project_id", projectId).order("created_at").limit(1).maybeSingle();
  if (!convo) {
    const r = await supabase.from("ai_conversations").insert({ project_id: projectId, title: prompt.slice(0, 60), created_by: userId }).select("id").single();
    if (r.error) throw new AiError(r.error.message);
    convo = r.data;
  }
  await supabase.from("ai_messages").insert({ conversation_id: convo.id, project_id: projectId, role: "user", content: prompt });
  await supabase.from("projects").update({ status: "BUILDING" }).eq("id", projectId);
  const { data: current } = await supabase.from("project_files").select("path, content").eq("project_id", projectId);
  const currentText = (current ?? []).map((f) => `=== FILE: ${f.path} ===\n${f.content}`).join("\n\n");
  return { workspaceId: project.workspace_id, conversationId: convo.id, currentText };
}

export async function finishGeneration(
  supabase: Db, userId: string, projectId: string, prompt: string,
  ctx: { workspaceId: string; conversationId: string }, text: string,
) {
  let files = parseFiles(text);
  if (!files.length && text.toLowerCase().includes("<html")) files = [{ path: "index.html", content: text.trim(), complete: true }];
  if (!files.some((f) => f.path === "index.html")) throw new AiError("The AI didn't return a runnable app. Try describing it differently.");

  const up = await supabase.from("project_files").upsert(
    files.map((f) => ({ project_id: projectId, path: f.path, content: f.content, language: languageFor(f.path), size: f.content.length })),
    { onConflict: "project_id,path" },
  );
  if (up.error) throw new AiError(up.error.message);
  const { data: last } = await supabase.from("project_versions").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  await supabase.from("project_versions").insert({
    project_id: projectId, version, label: `v${version}`, summary: prompt.slice(0, 200),
    snapshot: Object.fromEntries(files.map((f) => [f.path, f.content])), created_by: userId,
  });
  await supabase.from("ai_messages").insert({
    conversation_id: ctx.conversationId, project_id: projectId, role: "assistant",
    content: `Built version ${version} with ${files.length} files: ${files.map((f) => f.path).join(", ")}.`,
  });
  await supabase.from("projects").update({ status: "READY" }).eq("id", projectId);
  await supabase.from("usage_records").insert({ workspace_id: ctx.workspaceId, project_id: projectId, user_id: userId, kind: "generation", model: AI_MODEL });
  return { version, files: files.map((f) => f.path) };
}

export async function failGeneration(supabase: Db, projectId: string, conversationId: string, msg: string) {
  await supabase.from("ai_messages").insert({ conversation_id: conversationId, project_id: projectId, role: "assistant", content: `Couldn't build: ${msg}` });
  await supabase.from("projects").update({ status: "ERROR" }).eq("id", projectId);
}

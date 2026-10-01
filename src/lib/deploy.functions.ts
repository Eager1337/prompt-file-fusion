import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Runs a build: validates the project's files and records logs. */
export const runBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: build, error } = await supabase.from("builds")
      .insert({ project_id: data.projectId, status: "RUNNING", created_by: userId, logs: "" }).select("id").single();
    if (error) throw new Error(error.message);

    const logs: string[] = [`[${new Date().toISOString()}] Build started`];
    const { data: files } = await supabase.from("project_files").select("path, content, size").eq("project_id", data.projectId);
    let failure: string | null = null;
    logs.push(`Found ${files?.length ?? 0} files`);
    for (const f of files ?? []) logs.push(`  ✓ ${f.path} (${f.size} bytes)`);
    const index = files?.find((f) => f.path === "index.html");
    if (!index) failure = "index.html is missing — generate the app first.";
    else if (!/<html[\s>]/i.test(index.content) || !/<\/html>/i.test(index.content)) failure = "index.html is not a complete HTML document.";
    const cfg = files?.find((f) => f.path === "app.config.json");
    if (cfg) {
      try { JSON.parse(cfg.content); logs.push("app.config.json is valid"); }
      catch { failure = failure ?? "app.config.json is not valid JSON."; }
    }
    logs.push(failure ? `✗ Build failed: ${failure}` : "✓ Build succeeded");

    await supabase.from("builds").update({
      status: failure ? "FAILED" : "SUCCESS", logs: logs.join("\n"), error: failure, finished_at: new Date().toISOString(),
    }).eq("id", build.id);
    return { ok: !failure, error: failure };
  });

/** Publishes the latest successful build to a public URL. */
export const publishProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    projectId: z.string().uuid(),
    environment: z.enum(["production", "preview"]),
    origin: z.string().url(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: build } = await supabase.from("builds").select("status").eq("project_id", data.projectId)
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (build?.status !== "SUCCESS") throw new Error("Run a successful build before publishing.");

    const { data: file } = await supabase.from("project_files").select("content").eq("project_id", data.projectId).eq("path", "index.html").single();
    const { data: ver } = await supabase.from("project_versions").select("version").eq("project_id", data.projectId)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const { data: env } = await supabase.from("environment_variables").select("key, value, is_secret").eq("project_id", data.projectId);

    // Public (non-secret) variables are injected into the published page.
    const publicVars = Object.fromEntries((env ?? []).filter((v) => !v.is_secret).map((v) => [v.key, v.value]));
    const inject = `<script>window.__ENV__=${JSON.stringify(publicVars).replace(/</g, "\\u003c")};</script>`;
    const html = file!.content.replace(/<head([^>]*)>/i, `<head$1>${inject}`);

    const { data: dep, error } = await supabase.from("deployments").insert({
      project_id: data.projectId, environment: data.environment, status: "SUCCESS", created_by: userId,
      html, version: ver?.version ?? null, settings: { publicVars: Object.keys(publicVars) },
    }).select("id").single();
    if (error) throw new Error(error.message);
    const url = `${data.origin.replace(/\/$/, "")}/api/public/apps/${dep.id}`;
    await supabase.from("deployments").update({ url }).eq("id", dep.id);
    if (data.environment === "production") await supabase.from("projects").update({ status: "DEPLOYED" }).eq("id", data.projectId);
    return { url };
  });

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Hammer, Rocket, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { publishProject, runBuild } from "@/lib/deploy.functions";

export const Route = createFileRoute("/_authenticated/deploy/$projectId")({
  head: () => ({ meta: [{ title: "Deploy — ONEAGER" }, { name: "description", content: "Build and publish your app." }] }),
  component: Deploy,
});

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: "bg-success/15 text-success",
  FAILED: "bg-destructive/15 text-destructive",
  RUNNING: "bg-warning/15 text-warning",
  QUEUED: "bg-muted text-foreground-secondary",
};

function Badge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? "bg-muted"}`}>{status}</span>;
}

function Deploy() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const build = useServerFn(runBuild);
  const publish = useServerFn(publishProject);
  const [env, setEnv] = useState<"production" | "preview">("production");
  const [busy, setBusy] = useState<"build" | "publish" | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(false);

  const project = useQuery({ queryKey: ["project", projectId], queryFn: async () => (await supabase.from("projects").select("id, name, status").eq("id", projectId).single()).data });
  const builds = useQuery({ queryKey: ["builds", projectId], queryFn: async () => (await supabase.from("builds").select("id, status, logs, error, started_at").eq("project_id", projectId).order("started_at", { ascending: false }).limit(10)).data ?? [] });
  const deployments = useQuery({ queryKey: ["deployments", projectId], queryFn: async () => (await supabase.from("deployments").select("id, environment, status, url, version, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(10)).data ?? [] });
  const vars = useQuery({ queryKey: ["env", projectId], queryFn: async () => (await supabase.from("environment_variables").select("id, key, value, is_secret").eq("project_id", projectId).order("key")).data ?? [] });

  const latest = builds.data?.[0];

  async function doBuild() {
    setBusy("build");
    try {
      const r = await build({ data: { projectId } });
      if (r.ok) toast.success("Build succeeded"); else toast.error(r.error ?? "Build failed");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Build failed"); }
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["builds", projectId] });
  }

  async function doPublish() {
    setBusy("publish");
    try {
      const r = await publish({ data: { projectId, environment: env, origin: window.location.origin } });
      toast.success("Published!", { action: { label: "Open", onClick: () => window.open(r.url, "_blank") } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Publish failed"); }
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["deployments", projectId] });
    qc.invalidateQueries({ queryKey: ["project", projectId] });
  }

  async function addVar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) { toast.error("Use UPPER_SNAKE_CASE names"); return; }
    const { error } = await supabase.from("environment_variables").upsert({ project_id: projectId, key, value, is_secret: secret }, { onConflict: "project_id,key" });
    if (error) { toast.error(error.message); return; }
    setKey(""); setValue(""); setSecret(false);
    qc.invalidateQueries({ queryKey: ["env", projectId] });
  }

  async function removeVar(id: string) {
    const { error } = await supabase.from("environment_variables").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["env", projectId] });
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon"><Link to="/projects/$projectId" params={{ projectId }} aria-label="Back to builder"><ArrowLeft /></Link></Button>
          <div>
            <h1 className="font-display text-3xl">Deploy {project.data?.name}</h1>
            <p className="text-sm text-foreground-secondary">Status: {project.data?.status}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">1. Build</h2>
            <Button variant="outline" onClick={doBuild} disabled={!!busy}><Hammer /> {busy === "build" ? "Building…" : "Run build"}</Button>
          </div>
          {latest ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm"><Badge status={latest.status} /> <span className="text-foreground-secondary">{new Date(latest.started_at).toLocaleString()}</span></div>
              <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-code p-3 font-mono text-xs text-code-foreground">{latest.logs || "No logs"}</pre>
            </div>
          ) : <p className="mt-4 text-sm text-foreground-secondary">No builds yet.</p>}
          {builds.data && builds.data.length > 1 && (
            <ul className="mt-4 space-y-1 text-xs text-foreground-secondary">
              {builds.data.slice(1).map((b) => <li key={b.id} className="flex gap-2"><Badge status={b.status} />{new Date(b.started_at).toLocaleString()}</li>)}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-semibold">2. Settings</h2>
          <p className="mt-1 text-xs text-foreground-secondary">Public variables are available to your app as <code>window.__ENV__</code>. Secret ones are never published.</p>
          <ul className="mt-4 divide-y divide-border text-sm">
            {vars.data?.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2">
                <span className="font-mono">{v.key}</span>
                <span className="flex items-center gap-2 text-foreground-secondary">
                  {v.is_secret ? "•••••• (secret)" : v.value}
                  <Button size="icon" variant="ghost" onClick={() => removeVar(v.id)} aria-label={`Remove ${v.key}`}><Trash2 /></Button>
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={addVar} className="mt-3 flex flex-wrap items-center gap-2">
            <Input placeholder="KEY" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} className="w-32 font-mono" required />
            <Input placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} className="flex-1" required />
            <label className="flex items-center gap-1 text-xs"><Switch checked={secret} onCheckedChange={setSecret} /> Secret</label>
            <Button type="submit" variant="outline">Add</Button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-background p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">3. Publish</h2>
            <div className="flex items-center gap-2">
              <select value={env} onChange={(e) => setEnv(e.target.value as "production" | "preview")} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="production">Production</option>
                <option value="preview">Preview</option>
              </select>
              <Button variant="ink" onClick={doPublish} disabled={!!busy || latest?.status !== "SUCCESS"}><Rocket /> {busy === "publish" ? "Publishing…" : "Publish"}</Button>
            </div>
          </div>
          {latest?.status !== "SUCCESS" && <p className="mt-2 text-xs text-foreground-secondary">A successful build is required before publishing.</p>}
          <ul className="mt-4 divide-y divide-border text-sm">
            {deployments.data?.length ? deployments.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2"><Badge status={d.status} /> {d.environment} {d.version ? `· v${d.version}` : ""} <span className="text-foreground-secondary">{new Date(d.created_at).toLocaleString()}</span></span>
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">Open <ExternalLink className="h-3 w-3" /></a>}
              </li>
            )) : <li className="py-2 text-foreground-secondary">Not published yet.</li>}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

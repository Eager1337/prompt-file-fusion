import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, History, Loader2, Rocket, RotateCcw } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generateApp } from "@/lib/generate.functions";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  validateSearch: z.object({ prompt: z.string().optional() }),
  head: () => ({ meta: [{ title: "Builder — ONEAGER" }, { name: "description", content: "Build your app with AI." }] }),
  component: Builder,
});

function Builder() {
  const { projectId } = Route.useParams();
  const { prompt: initialPrompt } = Route.useSearch();
  const qc = useQueryClient();
  const generate = useServerFn(generateApp);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const started = useRef(false);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await supabase.from("projects").select("id, name").eq("id", projectId).single()).data,
  });
  const file = useQuery({
    queryKey: ["file", projectId],
    queryFn: async () => (await supabase.from("project_files").select("content").eq("project_id", projectId).eq("path", "index.html").maybeSingle()).data,
  });
  const messages = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => (await supabase.from("ai_messages").select("id, role, content").eq("project_id", projectId).order("created_at")).data ?? [],
  });
  const versions = useQuery({
    queryKey: ["versions", projectId],
    queryFn: async () => (await supabase.from("project_versions").select("id, version, summary, snapshot, created_at").eq("project_id", projectId).order("version", { ascending: false })).data ?? [],
  });

  function refresh() {
    ["file", "messages", "versions"].forEach((k) => qc.invalidateQueries({ queryKey: [k, projectId] }));
  }

  async function send(text: string) {
    const p = text.trim();
    if (!p || busy) return;
    setBusy(true);
    setInput("");
    try {
      await generate({ data: { projectId, prompt: p } });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialPrompt && !started.current && messages.data && messages.data.length === 0) {
      started.current = true;
      send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, messages.data]);

  async function restore(snapshot: unknown, version: number) {
    const files = Object.entries(snapshot as Record<string, string>);
    if (!files.length) return;
    const { error } = await supabase.from("project_files").upsert(files.map(([path, content]) => ({ project_id: projectId, path, content, size: content.length })), { onConflict: "project_id,path" });
    if (error) { toast.error(error.message); return; }
    toast.success(`Restored version ${version}`);
    refresh();
  }

  return (
    <div className="flex h-screen flex-col bg-surface">
      <header className="flex h-12 items-center justify-between border-b border-border bg-background px-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon"><Link to="/dashboard" aria-label="Back to projects"><ArrowLeft /></Link></Button>
          <span className="font-medium">{project.data?.name ?? "…"}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}><History /> Versions</Button>
          <Button asChild variant="ink" size="sm"><Link to="/deploy/$projectId" params={{ projectId }}><Rocket /> Deploy</Link></Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-sm flex-col border-r border-border bg-background">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.data?.length === 0 && !busy && <p className="text-sm text-foreground-secondary">Describe what you want to build.</p>}
            {messages.data?.map((m) => (
              <div key={m.id} className={`rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "ml-8 bg-ink text-ink-foreground" : "mr-8 bg-muted"}`}>{m.content}</div>
            ))}
            {busy && <div className="mr-8 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Building…</div>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                rows={2}
                placeholder="Ask for a change…"
                className="flex-1 resize-none bg-transparent text-sm outline-none"
              />
              <Button type="submit" size="icon" variant="ink" className="rounded-full" disabled={busy} aria-label="Send"><ArrowUp /></Button>
            </div>
          </form>
        </aside>
        <section className="relative min-w-0 flex-1 p-3">
          {file.data?.content ? (
            <iframe title="Live preview" srcDoc={file.data.content} sandbox="allow-scripts allow-forms allow-modals" className="h-full w-full rounded-xl border border-border bg-background" />
          ) : (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-sm text-foreground-secondary">
              {busy ? "Your app is being built…" : "Your live preview will appear here."}
            </div>
          )}
          {showHistory && (
            <div className="absolute right-6 top-6 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-border bg-background p-3 shadow-lift">
              <h3 className="mb-2 text-sm font-semibold">Versions</h3>
              {versions.data?.length ? versions.data.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-2 border-t border-border py-2 text-xs">
                  <div><strong>v{v.version}</strong><p className="line-clamp-2 text-foreground-secondary">{v.summary}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => restore(v.snapshot, v.version)} aria-label={`Restore version ${v.version}`}><RotateCcw /></Button>
                </div>
              )) : <p className="text-xs text-foreground-secondary">No versions yet.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

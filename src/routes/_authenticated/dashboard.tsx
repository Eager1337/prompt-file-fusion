import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell, getMyWorkspace } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_PROMPT_KEY } from "@/components/site/prompt-box";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Projects — ONEAGER" }, { name: "description", content: "Your ONEAGER projects." }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const ws = useQuery({ queryKey: ["workspace"], queryFn: getMyWorkspace });
  const projects = useQuery({
    queryKey: ["projects", ws.data?.workspace.id],
    enabled: !!ws.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, status, updated_at")
        .eq("workspace_id", ws.data!.workspace.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function create(projectName: string, prompt?: string) {
    if (!ws.data) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: projectName.slice(0, 80), description: prompt ?? null, workspace_id: ws.data.workspace.id, created_by: ws.data.userId })
      .select("id")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/projects/$projectId", params: { projectId: data.id }, search: prompt ? { prompt } : {} });
  }

  useEffect(() => {
    if (!ws.data) return;
    const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (pending) {
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
      create(pending.split(/\s+/).slice(0, 6).join(" "), pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.data]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Projects</h1>
          <p className="text-sm text-foreground-secondary">{ws.data?.workspace.name}</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create(name.trim());
          }}
        >
          <Input placeholder="New project name" value={name} onChange={(e) => setName(e.target.value)} className="w-56 bg-background" />
          <Button type="submit" variant="ink" disabled={busy}><Plus /> Create</Button>
        </form>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.isLoading || ws.isLoading ? (
          <p className="text-sm text-foreground-secondary">Loading…</p>
        ) : projects.data?.length ? (
          projects.data.map((p) => (
            <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }} className="rounded-2xl border border-border bg-background p-5 shadow-soft transition hover:-translate-y-0.5">
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-foreground-secondary">{p.description ?? "No description"}</p>
              <p className="mt-4 text-xs text-foreground-secondary">{p.status} · {new Date(p.updated_at).toLocaleDateString()}</p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-foreground-secondary">No projects yet. Create your first one above.</p>
        )}
      </div>
    </AppShell>
  );
}

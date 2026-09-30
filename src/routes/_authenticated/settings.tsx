import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, getMyWorkspace } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Workspace settings — ONEAGER" }, { name: "description", content: "Manage your ONEAGER workspace." }] }),
  component: Settings,
});

function Settings() {
  const qc = useQueryClient();
  const ws = useQuery({ queryKey: ["workspace"], queryFn: getMyWorkspace });
  const members = useQuery({
    queryKey: ["members", ws.data?.workspace.id],
    enabled: !!ws.data,
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_members").select("id, role, user_id").eq("workspace_id", ws.data!.workspace.id);
      if (error) throw error;
      return data;
    },
  });
  const [name, setName] = useState("");
  useEffect(() => { if (ws.data) setName(ws.data.workspace.name); }, [ws.data]);

  async function save() {
    const { error } = await supabase.from("workspaces").update({ name }).eq("id", ws.data!.workspace.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["workspace"] });
  }

  const canEdit = ws.data && ["OWNER", "ADMIN"].includes(ws.data.role);

  return (
    <AppShell>
      <h1 className="font-display text-3xl">Workspace settings</h1>
      <div className="mt-8 max-w-xl space-y-6">
        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-semibold">Name</h2>
          <div className="mt-3 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
            <Button variant="ink" onClick={save} disabled={!canEdit || !name.trim()}>Save</Button>
          </div>
          <p className="mt-3 text-xs text-foreground-secondary">Plan: {ws.data?.workspace.plan} · Your role: {ws.data?.role}</p>
        </section>
        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-semibold">Members</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {members.data?.map((m) => (
              <li key={m.id} className="flex justify-between py-2">
                <span>{m.user_id === ws.data?.userId ? "You" : m.user_id.slice(0, 8)}</span>
                <span className="text-foreground-secondary">{m.role}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

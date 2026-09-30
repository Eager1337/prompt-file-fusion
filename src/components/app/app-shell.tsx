import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1224px] items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Logo />
            <Link to="/dashboard" className="text-sm text-foreground-secondary" activeProps={{ className: "text-sm font-medium text-foreground" }}>Projects</Link>
            <Link to="/settings" className="text-sm text-foreground-secondary" activeProps={{ className: "text-sm font-medium text-foreground" }}>Settings</Link>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-[1224px] px-4 py-10">{children}</main>
    </div>
  );
}

export async function getMyWorkspace() {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug, plan)")
    .eq("user_id", u.user!.id)
    .order("created_at")
    .limit(1)
    .single();
  if (error) throw error;
  return { role: data.role, workspace: data.workspaces!, userId: u.user!.id };
}

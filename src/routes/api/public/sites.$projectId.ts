import { createFileRoute } from "@tanstack/react-router";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Stable live URL: always serves the project's latest production deployment.
export const Route = createFileRoute("/api/public/sites/$projectId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!UUID.test(params.projectId)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("deployments").select("html")
          .eq("project_id", params.projectId).eq("environment", "production").eq("status", "SUCCESS")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!data?.html) return new Response("This app hasn't been published yet.", { status: 404 });
        return new Response(data.html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-cache",
            "content-security-policy": "sandbox allow-scripts allow-forms allow-modals allow-popups",
          },
        });
      },
    },
  },
});

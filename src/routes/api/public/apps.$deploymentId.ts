import { createFileRoute } from "@tanstack/react-router";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/apps/$deploymentId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!UUID.test(params.deploymentId)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Only explicitly published, successful deployments are served; only the page HTML is returned.
        const { data } = await supabaseAdmin.from("deployments").select("html, status").eq("id", params.deploymentId).maybeSingle();
        if (!data || data.status !== "SUCCESS" || !data.html) return new Response("Not found", { status: 404 });
        return new Response(data.html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "content-security-policy": "sandbox allow-scripts allow-forms allow-modals allow-popups",
          },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const Body = z.object({ projectId: z.string().uuid(), prompt: z.string().min(1).max(4000) });

// Streams generated file text to the builder while it's written, then saves files + a version.
export const Route = createFileRoute("/api/public/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
        if (!token || token.split(".").length !== 3) return Response.json({ error: "Please sign in." }, { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: { Authorization: `Bearer ${token}` },
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (authErr || !userId) return Response.json({ error: "Please sign in." }, { status: 401 });

        const { projectId, prompt } = parsed.data;
        const { streamResponseText, GEN_SYSTEM, AiError } = await import("@/lib/ai.server");
        const g = await import("@/lib/generation.server");

        let ctx: Awaited<ReturnType<typeof g.startGeneration>>;
        try {
          ctx = await g.startGeneration(supabase, userId, projectId, prompt);
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: e instanceof AiError ? e.status : 500 });
        }

        const enc = new TextEncoder();
        let open = true;
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (s: string) => { if (open) try { controller.enqueue(enc.encode(s)); } catch { open = false; } };
            try {
              const text = await streamResponseText(GEN_SYSTEM, [
                ...(ctx.currentText ? [{ role: "user" as const, content: `Current files:\n${ctx.currentText}` }] : []),
                { role: "user" as const, content: prompt },
              ], send);
              const result = await g.finishGeneration(supabase, userId, projectId, prompt, ctx, text);
              send(`\n\u0000DONE${JSON.stringify(result)}`);
            } catch (e) {
              const msg = e instanceof Error ? e.message : "AI generation failed";
              await g.failGeneration(supabase, projectId, ctx.conversationId, msg);
              send(`\n\u0000ERROR${JSON.stringify({ error: msg })}`);
            }
            if (open) try { controller.close(); } catch { /* closed */ }
          },
          cancel() { open = false; },
        });
        return new Response(stream, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache, no-transform" },
        });
      },
    },
  },
});

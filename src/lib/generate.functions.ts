import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Non-streaming fallback generation. The builder uses the streaming endpoint at /api/public/generate. */
export const generateApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid(), prompt: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { streamResponseText, GEN_SYSTEM } = await import("./ai.server");
    const g = await import("./generation.server");
    const { supabase, userId } = context;
    const ctx = await g.startGeneration(supabase, userId, data.projectId, data.prompt);
    try {
      const text = await streamResponseText(GEN_SYSTEM, [
        ...(ctx.currentText ? [{ role: "user" as const, content: `Current files:\n${ctx.currentText}` }] : []),
        { role: "user" as const, content: data.prompt },
      ]);
      return await g.finishGeneration(supabase, userId, data.projectId, data.prompt, ctx, text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI generation failed";
      await g.failGeneration(supabase, data.projectId, ctx.conversationId, msg);
      throw new Error(msg);
    }
  });

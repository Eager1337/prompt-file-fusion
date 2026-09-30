import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STARTER_PROMPTS } from "@/lib/oneager/content";
import { supabase } from "@/integrations/supabase/client";

export const PENDING_PROMPT_KEY = "oneager_pending_prompt";

export function PromptBox() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  async function submit(text: string) {
    const prompt = text.trim();
    if (!prompt) return;
    sessionStorage.setItem(PENDING_PROMPT_KEY, prompt);
    const { data } = await supabase.auth.getSession();
    navigate({ to: data.session ? "/dashboard" : "/auth" });
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="rounded-3xl border border-border bg-background p-3 shadow-lift"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(value);
            }
          }}
          rows={3}
          placeholder="Describe the app you want to build…"
          className="w-full resize-none bg-transparent px-2 py-1 text-base outline-none placeholder:text-foreground-secondary"
        />
        <div className="flex justify-end">
          <Button type="submit" variant="ink" size="icon" className="rounded-full" aria-label="Start building">
            <ArrowUp />
          </Button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.slice(0, 4).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setValue(p)}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground-secondary hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

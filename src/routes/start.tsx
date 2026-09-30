import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/marketing-layout";
import { PromptBox } from "@/components/site/prompt-box";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start building — ONEAGER" },
      { name: "description", content: "Describe your first app and start building with ONEAGER." },
      { property: "og:title", content: "Start building — ONEAGER" },
      { property: "og:description", content: "Describe your first app and start building." },
    ],
  }),
  component: () => (
    <MarketingLayout>
      <section className="mx-auto max-w-[1224px] px-4 py-24 text-center">
        <h1 className="font-display text-5xl">What should we build?</h1>
        <p className="mx-auto mt-4 max-w-lg text-foreground-secondary">
          Write your idea. We'll keep it while you create a free account, then start building right away.
        </p>
        <div className="mt-10"><PromptBox /></div>
      </section>
    </MarketingLayout>
  ),
});

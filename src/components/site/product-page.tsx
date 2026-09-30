import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MarketingLayout } from "./marketing-layout";
import { PromptBox } from "./prompt-box";
import { Button } from "@/components/ui/button";

export function ProductPage({ eyebrow, title, intro, features }: { eyebrow: string; title: string; intro: string; features: { title: string; body: string }[] }) {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-[1224px] px-4 pb-14 pt-20 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</span>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl leading-tight">{title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-foreground-secondary">{intro}</p>
        <div className="mt-10"><PromptBox /></div>
      </section>
      <section className="mx-auto grid max-w-[1224px] gap-4 px-4 pb-20 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-surface p-6">
            <Check className="h-5 w-5 text-success" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-foreground-secondary">{f.body}</p>
          </div>
        ))}
      </section>
      <section className="pb-24 text-center">
        <Button asChild variant="ink" size="pill"><Link to="/start">Start building free</Link></Button>
      </section>
    </MarketingLayout>
  );
}

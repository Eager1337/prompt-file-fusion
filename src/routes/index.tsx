import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/marketing-layout";
import { PromptBox } from "@/components/site/prompt-box";
import { FAQS, TECH, TESTIMONIALS } from "@/lib/oneager/content";
import hero from "@/assets/hero-builder.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ONEAGER AI — Describe it, ship it" },
      { name: "description", content: "Build apps and websites by describing them. ONEAGER plans, writes and previews your app, with every version saved." },
      { property: "og:title", content: "ONEAGER AI — Describe it, ship it" },
      { property: "og:description", content: "Build apps and websites by describing them in plain language." },
    ],
  }),
  component: Home,
});

const TINT: Record<string, string> = {
  yellow: "bg-warning/15",
  green: "bg-success/15",
  pink: "bg-destructive/10",
};

function Home() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-[1224px] px-4 pb-16 pt-20 text-center">
        <span className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground-secondary">
          Free during open beta
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl leading-tight md:text-6xl">
          Describe your app. Watch it come alive.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-foreground-secondary">
          ONEAGER plans, writes and previews your app in seconds — and keeps every version safe.
        </p>
        <div className="mt-10">
          <PromptBox />
        </div>
      </section>

      <section className="mx-auto max-w-[1224px] px-4 pb-20">
        <img src={hero} alt="ONEAGER builder workspace with chat and live preview" className="w-full rounded-3xl border border-border shadow-lift" />
        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-foreground-secondary">
          {TECH.map((t) => <span key={t}>{t}</span>)}
        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-[1224px] px-4">
          <h2 className="text-center font-display text-3xl">Makers are shipping</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className={`rounded-2xl p-5 ${TINT[t.tint]}`}>
                <blockquote className="text-sm">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-xs text-foreground-secondary">
                  <strong className="text-foreground">{t.name}</strong> · {t.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center font-display text-3xl">Questions</h2>
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border">
          {FAQS.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-medium">{f.q}</summary>
              <p className="mt-3 text-sm text-foreground-secondary">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

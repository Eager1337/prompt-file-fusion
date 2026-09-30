import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MarketingLayout } from "@/components/site/marketing-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — ONEAGER" },
      { name: "description", content: "ONEAGER is free during open beta. See what's included in each plan." },
      { property: "og:title", content: "Pricing — ONEAGER" },
      { property: "og:description", content: "ONEAGER is free during open beta." },
    ],
  }),
  component: Pricing,
});

const PLANS = [
  { name: "Free", price: "$0", note: "Open beta", features: ["Unlimited projects", "AI generation", "Live preview", "Version history"], cta: true },
  { name: "Pro", price: "Soon", note: "For power makers", features: ["Everything in Free", "Custom domains", "Priority models", "Team seats"], cta: false },
  { name: "Team", price: "Soon", note: "For companies", features: ["Everything in Pro", "Roles & permissions", "Audit logs", "SSO"], cta: false },
];

function Pricing() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-[1224px] px-4 py-20">
        <h1 className="text-center font-display text-5xl">Simple pricing</h1>
        <p className="mt-4 text-center text-foreground-secondary">Everything is free while we're in open beta.</p>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-3xl border p-8 ${p.cta ? "border-ink shadow-lift" : "border-border"}`}>
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-3 font-display text-4xl">{p.price}</p>
              <p className="text-sm text-foreground-secondary">{p.note}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
                ))}
              </ul>
              <Button asChild={p.cta} disabled={!p.cta} variant={p.cta ? "ink" : "outline"} size="pill" className="mt-8 w-full">
                {p.cta ? <Link to="/start">Start free</Link> : <span>Coming soon</span>}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/site/product-page";

export const Route = createFileRoute("/ai-website-builder")({
  head: () => ({
    meta: [
      { title: "AI Website Builder — ONEAGER" },
      { name: "description", content: "Generate landing pages and websites from a description, then refine them by chat." },
      { property: "og:title", content: "AI Website Builder — ONEAGER" },
      { property: "og:description", content: "Generate landing pages and websites from a description." },
    ],
  }),
  component: () => (
    <ProductPage
      eyebrow="AI Website Builder"
      title="Beautiful websites without the busywork"
      intro="Landing pages, portfolios and menus — written, styled and previewed in seconds."
      features={[
        { title: "Polished by default", body: "Clean layouts and typography from the first draft." },
        { title: "Works on every screen", body: "Pages look right on phones and desktops alike." },
        { title: "Edit in plain words", body: "“Make the header darker” is all it takes." },
      ]}
    />
  ),
});

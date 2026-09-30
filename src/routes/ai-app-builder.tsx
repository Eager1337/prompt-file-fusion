import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/site/product-page";

export const Route = createFileRoute("/ai-app-builder")({
  head: () => ({
    meta: [
      { title: "AI App Builder — ONEAGER" },
      { name: "description", content: "Turn a plain-language idea into a working app with live preview and version history." },
      { property: "og:title", content: "AI App Builder — ONEAGER" },
      { property: "og:description", content: "Turn a plain-language idea into a working app." },
    ],
  }),
  component: () => (
    <ProductPage
      eyebrow="AI App Builder"
      title="From idea to working app in one message"
      intro="Describe the tool you need. ONEAGER writes it, runs it and shows you the result instantly."
      features={[
        { title: "Live preview", body: "See your app running while the AI builds it." },
        { title: "Iterate by chat", body: "Ask for changes in plain words and watch them land." },
        { title: "Every version saved", body: "Restore any earlier snapshot in one click." },
      ]}
    />
  ),
});

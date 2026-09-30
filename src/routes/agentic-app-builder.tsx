import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/site/product-page";

export const Route = createFileRoute("/agentic-app-builder")({
  head: () => ({
    meta: [
      { title: "Agent Mode — ONEAGER" },
      { name: "description", content: "Let the ONEAGER agent plan, build and refine your app step by step." },
      { property: "og:title", content: "Agent Mode — ONEAGER" },
      { property: "og:description", content: "Let the ONEAGER agent plan, build and refine your app." },
    ],
  }),
  component: () => (
    <ProductPage
      eyebrow="Agent Mode"
      title="An AI teammate that plans before it builds"
      intro="The agent breaks your idea into steps, writes the files and checks the result."
      features={[
        { title: "Plans first", body: "A clear outline before any file is written." },
        { title: "Builds end to end", body: "Structure, styling and behaviour in one pass." },
        { title: "Safe to experiment", body: "Snapshots before every change mean nothing is lost." },
      ]}
    />
  ),
});

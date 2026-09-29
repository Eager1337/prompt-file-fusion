export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  tint: "yellow" | "green" | "pink";
};

export const TESTIMONIALS: Testimonial[] = [
  { quote: "Built my first app over coffee. Launched the same day.", name: "Lina S.", role: "Product Designer", tint: "yellow" },
  { quote: "Real-time edits on my phone saved our launch.", name: "Aisha M.", role: "Startup Co-founder", tint: "green" },
  { quote: "Prototyped in 45 minutes. My client thought it took a week.", name: "Stephen C.", role: "Freelancer", tint: "pink" },
  { quote: "Zero code, zero drama — now at $1.2K/month.", name: "Daniel R.", role: "Fitness Coach", tint: "yellow" },
  { quote: "Finally shipped the idea I've sat on for years.", name: "Tom B.", role: "Sales Manager", tint: "green" },
  { quote: "My students built class tools without any coding lessons.", name: "Chen W.", role: "High School Teacher", tint: "pink" },
  { quote: "Drag, drop, done. My restaurant app is live!", name: "Maria L.", role: "Restaurant Owner", tint: "yellow" },
  { quote: "No developer needed. Saved $15K on my MVP.", name: "Alex T.", role: "Tech Entrepreneur", tint: "green" },
];

export type FaqItem = { q: string; a: string };

export const FAQS: FaqItem[] = [
  {
    q: "Is ONEAGER really free?",
    a: "Yes. Every feature is free while we are in open beta — no paid plans, no credits to buy, no credit card. You can start building before you make an account, then sign up whenever you want your projects saved to every device.",
  },
  {
    q: "What can I build with ONEAGER?",
    a: "Apps, landing pages, dashboards, internal tools and web applications — described in plain language and generated for you.",
  },
  {
    q: "Do I need coding experience?",
    a: "No. Describe what you want and the AI plans it, writes the files and shows you a live preview. If you do write code, the editor is right there.",
  },
  {
    q: "How long does a full app take?",
    a: "Most first versions land in under a minute. Complex products work best broken into smaller steps, refined one instruction at a time.",
  },
  {
    q: "Can I roll back if the AI breaks something?",
    a: "Every meaningful change creates a new version with a snapshot of all files. You can view, compare and restore any earlier version instantly.",
  },
  {
    q: "Can I work with my team?",
    a: "Yes. Every account gets a workspace. Invite people as owner, admin, member, editor, viewer or billing manager, and each role only gets the permissions it needs. Workspaces are fully isolated from each other.",
  },
];

export const TECH = [
  "React", "TypeScript", "Tailwind", "Node.js", "PostgreSQL", "Vite", "Next.js", "Expo", "Stripe", "OpenAI", "Anthropic", "Gemini",
];

export const STARTER_PROMPTS = [
  "A habit tracker with streaks and a weekly chart",
  "A landing page for a coffee roastery with a menu",
  "An invoice generator with a printable preview",
  "A flashcard study app with spaced repetition",
  "A recipe box with search and favourites",
  "A budget planner with categories and totals",
];

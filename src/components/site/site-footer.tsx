import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1224px] gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-foreground-secondary">
            Describe it. ONEAGER plans, writes and previews your app — then keeps every version safe.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Build</h3>
          <ul className="space-y-2 text-sm text-foreground-secondary">
            <li><Link to="/ai-app-builder" className="hover:text-foreground">AI App Builder</Link></li>
            <li><Link to="/ai-website-builder" className="hover:text-foreground">AI Website Builder</Link></li>
            <li><Link to="/agentic-app-builder" className="hover:text-foreground">Agent Mode</Link></li>
            <li><Link to="/start" className="hover:text-foreground">Try without an account</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Platform</h3>
          <ul className="space-y-2 text-sm text-foreground-secondary">
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            <li><Link to="/settings" className="hover:text-foreground">Workspace settings</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Account</h3>
          <ul className="space-y-2 text-sm text-foreground-secondary">
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Create account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1224px] flex-col gap-2 px-4 py-6 text-xs text-foreground-secondary md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} ONEAGER AI. All rights reserved.</span>
          <span>Built for makers who ship.</span>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

const NAV = [
  { to: "/ai-app-builder", label: "AI App Builder" },
  { to: "/ai-website-builder", label: "AI Website Builder" },
  { to: "/agentic-app-builder", label: "Agent Mode" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  const { user, loading } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1224px] items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
                activeProps={{ className: "text-sm text-foreground font-medium" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {!loading && user ? (
            <Button asChild variant="ink" size="pill">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="pill">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild variant="ink" size="pill">
                <Link to="/start">Start building free</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="text-sm text-foreground-secondary">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {user ? (
              <Button asChild variant="ink" size="pill">
                <Link to="/dashboard" onClick={() => setOpen(false)}>Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="pill">
                  <Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link>
                </Button>
                <Button asChild variant="ink" size="pill">
                  <Link to="/start" onClick={() => setOpen(false)}>Start building free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

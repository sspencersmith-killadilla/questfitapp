import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border/70 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/app" className="flex items-center gap-2">
            <span className="font-display text-2xl font-semibold leading-none text-primary">Q</span>
            <span className="font-display text-xl font-semibold tracking-tight">QuestFit</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink to="/app">Dashboard</NavLink>
            <NavLink to="/log/workout">Workouts</NavLink>
            <NavLink to="/log/weight">Weight</NavLink>
            <NavLink to="/library">Library</NavLink>
            <NavLink to="/settings">Settings</NavLink>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-5xl px-6 pb-10 text-center text-xs italic text-muted-foreground">
        “Every page you turn, you earned with a step.”
      </footer>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "rounded-md px-3 py-1.5 bg-secondary text-foreground" }}
    >
      {children}
    </Link>
  );
}

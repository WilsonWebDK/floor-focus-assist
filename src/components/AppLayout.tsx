import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Bell,
  Menu,
  X,
  LogOut,
  Plus,
  Truck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/", label: "Oversigt", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/suppliers", label: "Leverandører", icon: Truck },
  { to: "/reminders", label: "Påmindelser", icon: Bell },
  { to: "/settings", label: "Indstillinger", icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 -ml-1.5 rounded-md hover:bg-accent active:scale-95 transition-transform"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/" className="font-bold text-lg tracking-tight text-foreground">
              ProfGulve
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/leads/new">
                <Plus className="h-4 w-4 mr-1" />
                Ny lead
              </Link>
            </Button>
            <Button
              asChild
              size="icon"
              variant="outline"
              className="sm:hidden h-9 w-9"
            >
              <Link to="/leads/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
            <button
              onClick={signOut}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Log ud"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex border-t px-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to || 
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="absolute left-0 top-14 w-64 bg-card border-r shadow-lg animate-fade-in">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.to ||
                (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-3 transition-colors",
                    active
                      ? "border-l-primary bg-primary/5 text-foreground"
                      : "border-l-transparent text-muted-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

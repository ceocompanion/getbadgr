import { Home, Users, Camera } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/scan", icon: Camera, label: "Scan" },
  { to: "/contacts", icon: Users, label: "Contacts" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="w-full bg-card border-t border-border z-50 pb-safe flex-shrink-0">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

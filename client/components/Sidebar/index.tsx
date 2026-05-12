import { useNavigate, useLocation } from "react-router";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type NavItem = {
  label: string;
  icon: string;
  path: string;
  roles: string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "layout-dashboard", path: "/", roles: ["technician", "ops_manager", "sr_manager", "pm"] },
  { label: "Work Orders", icon: "clipboard-list", path: "/work-orders", roles: ["technician", "ops_manager", "sr_manager", "pm"] },
  { label: "Time Tracking", icon: "clock", path: "/time-tracking", roles: ["technician", "ops_manager", "sr_manager", "pm"] },
  { label: "Expenses", icon: "receipt", path: "/expenses", roles: ["technician", "ops_manager", "sr_manager", "pm"] },
  { label: "Invoices", icon: "file-text", path: "/invoices", roles: ["technician", "ops_manager", "sr_manager", "pm"] },
  { label: "Approvals", icon: "check-circle", path: "/approvals", roles: ["ops_manager", "sr_manager"] },
];

type Props = {
  currentUser: {
    name: string;
    role: string;
    email: string;
  } | null;
  loading?: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  technician: "Technician",
  ops_manager: "Ops Manager",
  sr_manager: "Sr. Manager",
  pm: "Program Manager",
};

export default function Sidebar({ currentUser, loading }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = currentUser?.role ?? "technician";
  // When loading, show all nav items; once loaded, filter by role
  const visibleItems = loading
    ? NAV_ITEMS.filter((item) => item.roles.includes("technician"))
    : NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground w-[240px] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Icon icon="shopping-cart" className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">OTG Field Cost</h1>
          <p className="text-[10px] text-sidebar-foreground/60">Cart Tech Operations</p>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-2 py-3 flex-1">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon icon={item.icon} className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User info */}
      {loading ? (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <Skeleton className="h-3 w-24 mb-1.5" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ) : currentUser ? (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <p className="text-xs font-medium truncate">{currentUser.name}</p>
          <p className="text-[10px] text-sidebar-foreground/60">{ROLE_LABELS[currentUser.role] ?? currentUser.role}</p>
        </div>
      ) : null}
    </div>
  );
}

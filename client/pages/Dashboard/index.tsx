import { useApiData } from "@/hooks/useApiData.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type UserData = {
  id: number;
  name: string;
  role: string;
  worker_type: string | null;
  hourly_rate: string | null;
};

type Props = {
  currentUser: UserData | null;
};

function StatCard({ icon, label, value, subtitle }: { icon: string; label: string; value: string | number; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <Icon icon={icon} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityRow({ item }: { item: { type: string; description: string; timestamp: string } }) {
  const iconMap: Record<string, string> = {
    clock_in: "clock",
    expense: "receipt",
  };
  return (
    <div className="flex items-start gap-3 py-2.5 px-1 border-b border-border last:border-0">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted mt-0.5 shrink-0">
        <Icon icon={iconMap[item.type] ?? "activity"} className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{item.description}</p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(item.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage({ currentUser }: Props) {
  const userId = currentUser?.id ?? null;
  const role = currentUser?.role ?? "technician";

  const { data, loading, fetching, isError, error } = useApiData("GetDashboardStats", {
    userId: role === "technician" ? userId : null,
    role,
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 w-full">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Icon icon="alert-triangle" className="w-8 h-8 text-destructive" />
        <p className="text-sm text-destructive">{error?.message ?? "Failed to load dashboard"}</p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="flex flex-col gap-6 p-6 w-full overflow-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">
          {role === "technician" ? `Welcome, ${currentUser?.name?.split(" ")[0] ?? "Tech"}` : "Dashboard"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {role === "technician" ? "Your field activity overview" : "Team field activity overview"}
        </p>
      </div>

      {fetching && <div className="text-xs text-muted-foreground">Updating...</div>}
      <div className={fetching ? "opacity-70" : ""}>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="users" label="Active Techs" value={s.total_techs} />
          <StatCard icon="clipboard-list" label="Active Work Orders" value={s.active_work_orders} />
          <StatCard icon="clock" label="Hours This Week" value={parseFloat(s.total_hours_this_week).toFixed(1)} />
          <StatCard
            icon="receipt"
            label="Expenses This Week"
            value={`$${parseFloat(s.total_expenses_this_week).toFixed(2)}`}
            subtitle={`${s.pending_invoices} pending invoices`}
          />
        </div>

        {/* Recent Activity */}
        {data.recentActivity.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {data.recentActivity.map((item, idx) => (
                <ActivityRow key={idx} item={item} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

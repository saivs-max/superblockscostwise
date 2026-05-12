import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  currentUser: { id: number; role: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const TYPE_ICONS: Record<string, string> = {
  deployment: "rocket",
  retrofit: "wrench",
  service: "settings",
  repair: "tool",
};

function WOCard({ wo, onClockIn, clockingIn }: {
  wo: any;
  onClockIn: (woId: number) => void;
  clockingIn: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon icon={TYPE_ICONS[wo.work_type] ?? "clipboard"} className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold truncate">{wo.title}</p>
          </div>
          <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[wo.status] ?? ""}`}>
            {wo.status.replace("_", " ")}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <Icon icon="map-pin" className="w-3 h-3" />
            <span>{wo.store_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Icon icon="shopping-cart" className="w-3 h-3" />{wo.cart_count} carts</span>
            <span className="flex items-center gap-1"><Icon icon="tag" className="w-3 h-3" />{wo.work_type}</span>
            {wo.scheduled_date && (
              <span className="flex items-center gap-1"><Icon icon="calendar" className="w-3 h-3" />{wo.scheduled_date}</span>
            )}
          </div>
          {wo.external_id && <span className="font-mono text-[10px]">{wo.external_id}</span>}
        </div>
        {wo.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{wo.description}</p>}
        <div className="flex items-center gap-2">
          {wo.active_clock > 0 ? (
            <Badge variant="default" className="bg-green-600 text-white text-[10px]">
              <Icon icon="clock" className="w-3 h-3 mr-1" /> Clocked In
            </Badge>
          ) : wo.status !== "completed" && wo.status !== "cancelled" ? (
            <Button size="sm" variant="default" onClick={() => onClockIn(wo.id)} disabled={clockingIn}>
              <Icon icon="play" className="w-3 h-3 mr-1" /> Clock In
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkOrdersPage({ currentUser }: Props) {
  const role = currentUser?.role ?? "technician";
  const userId = role === "technician" ? currentUser?.id ?? null : null;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(e.target.value), 300);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const { data, loading, fetching, refetch, isError, error } = useApiData("GetWorkOrders", {
    userId,
    status: statusFilter === "all" ? null : statusFilter,
  });

  const { run: clockIn, loading: clockingIn } = useApi("ClockIn");

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const filteredWOs = useMemo(() => {
    if (!data?.workOrders) return [];
    if (!debouncedSearch) return data.workOrders;
    const q = debouncedSearch.toLowerCase();
    return data.workOrders.filter(
      (wo: any) =>
        wo.title?.toLowerCase().includes(q) ||
        wo.store_name?.toLowerCase().includes(q) ||
        wo.external_id?.toLowerCase().includes(q)
    );
  }, [data?.workOrders, debouncedSearch]);

  const totalPages = Math.ceil(filteredWOs.length / PAGE_SIZE);
  const pageData = useMemo(() => filteredWOs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredWOs, page]);

  useEffect(() => { setPage(0); }, [statusFilter, debouncedSearch]);

  const handleClockIn = useCallback(async (woId: number) => {
    if (!currentUser) return;
    try {
      await clockIn({ userId: currentUser.id, workOrderId: woId, mode: "work", notes: null });
      toast.success("Clocked in!");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to clock in");
    }
  }, [currentUser, clockIn, refetch]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 w-full">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Icon icon="alert-triangle" className="w-8 h-8 text-destructive" />
        <p className="text-sm text-destructive">{error?.message ?? "Failed to load"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 w-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Work Orders</h2>
          <p className="text-sm text-muted-foreground">{filteredWOs.length} work order{filteredWOs.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input value={search} onChange={handleSearchChange} placeholder="Search WOs..." className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {fetching && <div className="text-xs text-muted-foreground">Updating...</div>}
      <div className={fetching ? "opacity-70" : ""}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageData.map((wo: any) => (
            <WOCard key={wo.id} wo={wo} onClockIn={handleClockIn} clockingIn={clockingIn} />
          ))}
        </div>

        {filteredWOs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Icon icon="inbox" className="w-10 h-10 mb-2" />
            <p className="text-sm">No work orders found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

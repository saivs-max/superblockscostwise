import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Props = {
  currentUser: { id: number; role: string; name: string } | null;
};

function formatDuration(hours: string | null): string {
  if (hours == null) return "—";
  const num = parseFloat(hours);
  if (isNaN(num)) return "—";
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return `${h}h ${m}m`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function TimeTrackingPage({ currentUser }: Props) {
  const role = currentUser?.role ?? "technician";
  const userId = role === "technician" ? currentUser?.id ?? null : null;

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data, loading, fetching, refetch, isError, error } = useApiData("GetTimeEntries", {
    userId,
    startDate: startDate || null,
    endDate: endDate || null,
  });

  const { run: clockOut, loading: clockingOut } = useApi("ClockOut");
  const [clockOutDialog, setClockOutDialog] = useState<{ id: number; woTitle: string } | null>(null);
  const [breakMin, setBreakMin] = useState("0");
  const [clockOutNotes, setClockOutNotes] = useState("");

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const entries = data?.timeEntries ?? [];
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const pageData = useMemo(() => entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [entries, page]);

  useEffect(() => { setPage(0); }, [startDate, endDate]);

  const handleClockOut = useCallback(async () => {
    if (!clockOutDialog) return;
    try {
      await clockOut({
        timeEntryId: clockOutDialog.id,
        breakMinutes: parseInt(breakMin) || 0,
        notes: clockOutNotes || null,
      });
      toast.success("Clocked out!");
      setClockOutDialog(null);
      setBreakMin("0");
      setClockOutNotes("");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to clock out");
    }
  }, [clockOutDialog, breakMin, clockOutNotes, clockOut, refetch]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
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
      <div>
        <h2 className="text-2xl font-bold">Time Tracking</h2>
        <p className="text-sm text-muted-foreground">{entries.length} entries</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" />
        </div>
      </div>

      {fetching && <div className="text-xs text-muted-foreground">Updating...</div>}
      <div className={fetching ? "opacity-70" : ""}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {role !== "technician" && <TableHead>Technician</TableHead>}
                  <TableHead>Work Order</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((te: any) => (
                  <TableRow key={te.id}>
                    {role !== "technician" && <TableCell className="text-sm">{te.user_name}</TableCell>}
                    <TableCell className="text-sm max-w-[200px] truncate">{te.wo_title}</TableCell>
                    <TableCell className="text-sm">{te.wo_store_name}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(te.clock_in)}</TableCell>
                    <TableCell className="text-xs">{te.clock_out ? formatDateTime(te.clock_out) : <Badge className="bg-green-600 text-white text-[10px]">Active</Badge>}</TableCell>
                    <TableCell className="text-xs">{te.break_minutes}m</TableCell>
                    <TableCell className="text-sm font-medium">{formatDuration(te.hours)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{te.mode}</Badge></TableCell>
                    <TableCell>
                      {!te.clock_out && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setClockOutDialog({ id: te.id, woTitle: te.wo_title ?? "" })}
                          disabled={clockingOut}
                        >
                          <Icon icon="square" className="w-3 h-3 mr-1" /> Stop
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={role !== "technician" ? 9 : 8} className="text-center py-8 text-muted-foreground">
                      No time entries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
          </div>
        )}
      </div>

      {/* Clock Out Dialog */}
      <Dialog open={!!clockOutDialog} onOpenChange={() => setClockOutDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock Out</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{clockOutDialog?.woTitle}</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium">Break (minutes)</label>
              <Input type="number" value={breakMin} onChange={e => setBreakMin(e.target.value)} min={0} />
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <Textarea value={clockOutNotes} onChange={e => setClockOutNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockOutDialog(null)}>Cancel</Button>
            <Button onClick={handleClockOut} disabled={clockingOut}>
              {clockingOut ? "Clocking out..." : "Clock Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

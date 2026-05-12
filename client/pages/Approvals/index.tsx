import { useState, useCallback, useMemo, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Props = {
  currentUser: { id: number; role: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  approved_ops: "bg-teal-100 text-teal-800",
};

export default function ApprovalsPage({ currentUser }: Props) {
  const role = currentUser?.role ?? "ops_manager";

  const { data, loading, fetching, refetch, isError, error } = useApiData("GetInvoices", {
    userId: null,
    status: null,
    forApproval: true,
    approverRole: role,
  });

  const { run: approveInvoice, loading: approving } = useApi("ApproveInvoice");
  const { run: rejectInvoice, loading: rejecting } = useApi("RejectInvoice");

  const [rejectDialog, setRejectDialog] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const invoices = data?.invoices ?? [];

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const pageData = useMemo(() => invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [invoices, page]);

  const handleApprove = useCallback(async (invoiceId: number) => {
    try {
      await approveInvoice({ invoiceId, approverId: currentUser!.id, approverRole: role });
      toast.success("Invoice approved!");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to approve");
    }
  }, [approveInvoice, currentUser, role, refetch]);

  const handleReject = useCallback(async () => {
    if (rejectDialog == null || !rejectReason.trim()) return;
    try {
      await rejectInvoice({ invoiceId: rejectDialog, rejectorId: currentUser!.id, reason: rejectReason.trim() });
      toast.success("Invoice rejected");
      setRejectDialog(null);
      setRejectReason("");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reject");
    }
  }, [rejectDialog, rejectReason, currentUser, rejectInvoice, refetch]);

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

  const levelLabel = role === "ops_manager" ? "Ops Manager" : "Sr. Manager";

  return (
    <div className="flex flex-col gap-4 p-6 w-full overflow-auto">
      <div>
        <h2 className="text-2xl font-bold">Approvals</h2>
        <p className="text-sm text-muted-foreground">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} pending {levelLabel} approval
        </p>
      </div>

      {fetching && <div className="text-xs text-muted-foreground">Updating...</div>}
      <div className={fetching ? "opacity-70" : ""}>
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Icon icon="check-circle" className="w-12 h-12 text-primary/30 mb-3" />
              <p className="text-muted-foreground">All caught up — no invoices pending your approval.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm font-mono">{inv.invoice_number}</TableCell>
                      <TableCell className="text-sm">{inv.user_name}</TableCell>
                      <TableCell className="text-xs">{inv.period_start} — {inv.period_end}</TableCell>
                      <TableCell className="text-sm">{inv.total_hours != null ? `${inv.total_hours}h` : "—"}</TableCell>
                      <TableCell className="text-sm">{inv.total_expenses != null ? `$${parseFloat(inv.total_expenses).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-sm font-semibold text-right">${parseFloat(inv.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_COLORS[inv.status] ?? ""}`}>
                          {inv.status === "submitted" ? "Awaiting Ops" : "Awaiting Sr"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(inv.id)}
                            disabled={approving}
                          >
                            <Icon icon="check" className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectDialog(inv.id)}
                            disabled={rejecting}
                          >
                            <Icon icon="x" className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog != null} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium">Reason *</label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
              {rejecting ? "Rejecting..." : "Reject Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

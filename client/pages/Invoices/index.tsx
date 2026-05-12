import { useState, useCallback, useMemo, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Props = {
  currentUser: { id: number; role: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-800",
  approved_ops: "bg-teal-100 text-teal-800",
  approved_sr: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  sent_ap: "bg-purple-100 text-purple-800",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  approved_ops: "Ops Approved",
  approved_sr: "Sr Approved",
  queued_ap: "Queued for AP",
  sent_ap: "Sent to AP",
  rejected: "Rejected",
};

export default function InvoicesPage({ currentUser }: Props) {
  const role = currentUser?.role ?? "technician";
  const userId = role === "technician" ? currentUser?.id ?? null : null;
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, loading, fetching, refetch, isError, error } = useApiData("GetInvoices", {
    userId,
    status: statusFilter === "all" ? null : statusFilter,
    forApproval: false,
    approverRole: null,
  });

  const { run: submitInvoice, loading: submitting } = useApi("SubmitInvoice");

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const invoices = data?.invoices ?? [];
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const pageData = useMemo(() => invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [invoices, page]);

  useEffect(() => { setPage(0); }, [statusFilter]);

  const handleSubmit = useCallback(async (invoiceId: number) => {
    try {
      await submitInvoice({ invoiceId });
      toast.success("Invoice submitted for approval!");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit");
    }
  }, [submitInvoice, refetch]);

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
        <h2 className="text-2xl font-bold">Invoices</h2>
        <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
      </div>

      {fetching && <div className="text-xs text-muted-foreground">Updating...</div>}
      <div className={fetching ? "opacity-70" : ""}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  {role !== "technician" && <TableHead>Technician</TableHead>}
                  <TableHead>Period</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm font-mono">{inv.invoice_number}</TableCell>
                    {role !== "technician" && <TableCell className="text-sm">{inv.user_name}</TableCell>}
                    <TableCell className="text-xs">{inv.period_start} — {inv.period_end}</TableCell>
                    <TableCell className="text-sm">{inv.total_hours != null ? `${inv.total_hours}h` : "—"}</TableCell>
                    <TableCell className="text-sm">{inv.total_expenses != null ? `$${parseFloat(inv.total_expenses).toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-sm font-semibold text-right">${parseFloat(inv.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_COLORS[inv.status] ?? ""}`}>
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {role === "technician" && inv.status === "draft" && (
                        <Button size="sm" onClick={() => handleSubmit(inv.id)} disabled={submitting}>
                          Submit
                        </Button>
                      )}
                      {inv.status === "rejected" && inv.rejection_reason && (
                        <span className="text-xs text-destructive" title={inv.rejection_reason}>
                          <Icon icon="info" className="w-3 h-3 inline mr-1" />{inv.rejection_reason}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={role !== "technician" ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      No invoices found
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
    </div>
  );
}

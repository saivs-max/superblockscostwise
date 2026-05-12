import { useState, useCallback, useMemo, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Props = {
  currentUser: { id: number; role: string } | null;
};

const CATEGORIES = ["mileage", "tolls", "parking", "meal", "lodging", "supplies", "travel", "other"] as const;

export default function ExpensesPage({ currentUser }: Props) {
  const role = currentUser?.role ?? "technician";
  const userId = role === "technician" ? currentUser?.id ?? null : null;

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data, loading, fetching, refetch, isError, error } = useApiData("GetExpenses", {
    userId,
    startDate: startDate || null,
    endDate: endDate || null,
  });

  const { data: woData } = useApiData("GetWorkOrders", {
    userId: currentUser?.id ?? null,
    status: null,
  });

  const { run: addExpense, loading: adding } = useApi("AddExpense");

  // Form state
  const [formWO, setFormWO] = useState("");
  const [formCategory, setFormCategory] = useState("mileage");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // Auto-calc for mileage
  useEffect(() => {
    if (formCategory === "mileage" && formQty && formRate) {
      setFormAmount((parseFloat(formQty) * parseFloat(formRate)).toFixed(2));
    }
  }, [formCategory, formQty, formRate]);

  // Default mileage rate
  useEffect(() => {
    if (formCategory === "mileage") setFormRate("0.725");
    else setFormRate("");
  }, [formCategory]);

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const expenses = data?.expenses ?? [];
  const totalPages = Math.ceil(expenses.length / PAGE_SIZE);
  const pageData = useMemo(() => expenses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [expenses, page]);

  useEffect(() => { setPage(0); }, [startDate, endDate]);

  const totalAmount = useMemo(
    () => expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0),
    [expenses]
  );

  const handleAdd = useCallback(async () => {
    if (!currentUser || !formWO || !formAmount) return;
    try {
      await addExpense({
        userId: currentUser.id,
        workOrderId: parseInt(formWO),
        category: formCategory,
        subcategory: null,
        expenseDate: formDate,
        amount: parseFloat(formAmount),
        quantity: formQty ? parseFloat(formQty) : null,
        rate: formRate ? parseFloat(formRate) : null,
        description: formDesc || null,
      });
      toast.success("Expense added!");
      setShowAdd(false);
      setFormWO("");
      setFormAmount("");
      setFormQty("");
      setFormDesc("");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add expense");
    }
  }, [currentUser, formWO, formCategory, formDate, formAmount, formQty, formRate, formDesc, addExpense, refetch]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            {expenses.length} entries · Total: ${totalAmount.toFixed(2)}
          </p>
        </div>
        {role === "technician" && (
          <Button onClick={() => setShowAdd(true)}>
            <Icon icon="plus" className="w-4 h-4 mr-1" /> Add Expense
          </Button>
        )}
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
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((e: any) => (
                  <TableRow key={e.id}>
                    {role !== "technician" && <TableCell className="text-sm">{e.user_name}</TableCell>}
                    <TableCell className="text-xs">{e.expense_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{e.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{e.wo_title ?? e.wo_store_name}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{e.description ?? "—"}</TableCell>
                    <TableCell className="text-xs">{e.quantity ?? "—"}</TableCell>
                    <TableCell className="text-xs">{e.rate ? `$${parseFloat(e.rate).toFixed(3)}` : "—"}</TableCell>
                    <TableCell className="text-sm font-medium text-right">${parseFloat(e.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={role !== "technician" ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      No expenses found
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

      {/* Add Expense Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium">Work Order *</label>
              <Select value={formWO} onValueChange={setFormWO}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {(woData?.workOrders ?? []).filter((w: any) => w.status !== "cancelled").map((w: any) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.store_name} — {w.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Category *</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Date *</label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
            </div>
            {formCategory === "mileage" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Miles</label>
                  <Input type="number" value={formQty} onChange={e => setFormQty(e.target.value)} placeholder="e.g. 32" />
                </div>
                <div>
                  <label className="text-xs font-medium">Rate $/mi</label>
                  <Input type="number" value={formRate} onChange={e => setFormRate(e.target.value)} step="0.001" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium">Amount ($) *</label>
              <Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} step="0.01" />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={adding || !formWO || !formAmount}>
              {adding ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { api, z, postgres } from "@superblocksteam/sdk-api";

const OTG_DB = "0778f8a7-010b-40fc-baa1-d4f6dff546ff";

const InvoiceRow = z.object({
  id: z.coerce.number(),
  invoice_number: z.string(),
  user_id: z.coerce.number(),
  user_name: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  status: z.string(),
  total: z.string(),
  hourly_rate: z.string(),
  submitted_at: z.string().nullable(),
  approved_ops_at: z.string().nullable(),
  approved_ops_by_name: z.string().nullable(),
  approved_sr_at: z.string().nullable(),
  approved_sr_by_name: z.string().nullable(),
  rejected_at: z.string().nullable(),
  rejection_reason: z.string().nullable(),
  notes: z.string().nullable(),
  total_hours: z.string().nullable(),
  total_expenses: z.string().nullable(),
});

export const GetInvoices = api({
  name: "GetInvoices",
  description: "Fetches invoices with computed totals",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    userId: z.number().nullable(),
    status: z.string().nullable(),
    forApproval: z.boolean().default(false),
    approverRole: z.string().nullable(),
  }),
  output: z.object({ invoices: z.array(InvoiceRow) }),
  async run(ctx, { userId, status, forApproval, approverRole }) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (userId != null) {
      conditions.push(`i.user_id = $${idx}`);
      params.push(userId);
      idx++;
    }

    if (forApproval && approverRole === "ops_manager") {
      conditions.push("i.status = 'submitted'");
    } else if (forApproval && approverRole === "sr_manager") {
      conditions.push("i.status = 'approved_ops'");
    } else if (status) {
      conditions.push(`i.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await ctx.integrations.db.query(
      `SELECT i.id, i.invoice_number, i.user_id, u.name AS user_name,
              i.period_start::text, i.period_end::text, i.status, i.total::text,
              i.hourly_rate::text, i.submitted_at::text, i.approved_ops_at::text,
              ops_u.name AS approved_ops_by_name, i.approved_sr_at::text,
              sr_u.name AS approved_sr_by_name, i.rejected_at::text,
              i.rejection_reason, i.notes,
              (SELECT COALESCE(SUM(
                CASE WHEN te.clock_out IS NOT NULL
                  THEN EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - te.break_minutes/60.0
                  ELSE 0
                END
              ), 0)::numeric(10,2)::text
               FROM time_entries te WHERE te.user_id = i.user_id
                 AND te.clock_in >= i.period_start::timestamptz
                 AND te.clock_in < (i.period_end + 1)::timestamptz
              ) AS total_hours,
              (SELECT COALESCE(SUM(e.amount), 0)::text
               FROM expenses e WHERE e.user_id = i.user_id
                 AND e.expense_date >= i.period_start
                 AND e.expense_date <= i.period_end
              ) AS total_expenses
       FROM invoices i
       JOIN users u ON u.id = i.user_id
       LEFT JOIN users ops_u ON ops_u.id = i.approved_ops_by
       LEFT JOIN users sr_u ON sr_u.id = i.approved_sr_by
       ${where}
       ORDER BY i.period_end DESC, i.id DESC
       LIMIT 100`,
      InvoiceRow,
      params,
      { label: "Fetch invoices" }
    );
    return { invoices: rows };
  },
});

export const SubmitInvoice = api({
  name: "SubmitInvoice",
  description: "Submits a draft invoice for approval",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({ invoiceId: z.number() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { invoiceId }) {
    await ctx.integrations.db.execute(
      "UPDATE invoices SET status = 'submitted', submitted_at = NOW() WHERE id = $1 AND status = 'draft'",
      [invoiceId],
      { label: "Submit invoice" }
    );
    return { success: true };
  },
});

export const ApproveInvoice = api({
  name: "ApproveInvoice",
  description: "Approves an invoice (ops or sr level)",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    invoiceId: z.number(),
    approverId: z.number(),
    approverRole: z.string(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { invoiceId, approverId, approverRole }) {
    if (approverRole === "ops_manager") {
      await ctx.integrations.db.execute(
        "UPDATE invoices SET status = 'approved_ops', approved_ops_at = NOW(), approved_ops_by = $2 WHERE id = $1 AND status = 'submitted'",
        [invoiceId, approverId],
        { label: "Ops approve invoice" }
      );
    } else if (approverRole === "sr_manager") {
      await ctx.integrations.db.execute(
        "UPDATE invoices SET status = 'approved_sr', approved_sr_at = NOW(), approved_sr_by = $2 WHERE id = $1 AND status = 'approved_ops'",
        [invoiceId, approverId],
        { label: "Sr approve invoice" }
      );
    }
    return { success: true };
  },
});

export const RejectInvoice = api({
  name: "RejectInvoice",
  description: "Rejects an invoice with reason",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    invoiceId: z.number(),
    rejectorId: z.number(),
    reason: z.string(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { invoiceId, rejectorId, reason }) {
    await ctx.integrations.db.execute(
      "UPDATE invoices SET status = 'rejected', rejected_at = NOW(), rejected_by = $2, rejection_reason = $3 WHERE id = $1 AND status IN ('submitted','approved_ops')",
      [invoiceId, rejectorId, reason],
      { label: "Reject invoice" }
    );
    return { success: true };
  },
});

import { api, z, postgres } from "@superblocksteam/sdk-api";

const OTG_DB = "0778f8a7-010b-40fc-baa1-d4f6dff546ff";

export default api({
  name: "GetDashboardStats",
  description: "Computes dashboard summary stats for all roles",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    userId: z.number().nullable(),
    role: z.string(),
  }),
  output: z.object({
    summary: z.object({
      total_techs: z.coerce.number(),
      active_work_orders: z.coerce.number(),
      pending_invoices: z.coerce.number(),
      total_hours_this_week: z.string(),
      total_expenses_this_week: z.string(),
    }),
    recentActivity: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        timestamp: z.string(),
      })
    ),
  }),
  async run(ctx, { userId, role }) {
    const isTech = role === "technician" && userId != null;

    // Summary counts
    const summaryRows = await ctx.integrations.db.query(
      `SELECT
        (SELECT COUNT(*)::int FROM users WHERE role = 'technician' AND status = 'active') AS total_techs,
        (SELECT COUNT(*)::int FROM work_orders WHERE status IN ('open','in_progress')) AS active_work_orders,
        (SELECT COUNT(*)::int FROM invoices WHERE status IN ('submitted','approved_ops')) AS pending_invoices,
        COALESCE((SELECT SUM(
          CASE WHEN te.clock_out IS NOT NULL
            THEN EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - te.break_minutes/60.0
            ELSE 0 END
        )::numeric(10,1) FROM time_entries te WHERE te.clock_in >= date_trunc('week', CURRENT_DATE)), 0)::text AS total_hours_this_week,
        COALESCE((SELECT SUM(amount) FROM expenses WHERE expense_date >= date_trunc('week', CURRENT_DATE)::date), 0)::text AS total_expenses_this_week`,
      z.object({
        total_techs: z.coerce.number(),
        active_work_orders: z.coerce.number(),
        pending_invoices: z.coerce.number(),
        total_hours_this_week: z.string(),
        total_expenses_this_week: z.string(),
      }),
      [],
      { label: "Dashboard summary counts" }
    );

    // Recent activity — latest time entries and expenses
    const recentActivity = await ctx.integrations.db.query(
      `(SELECT 'clock_in' AS type,
              u.name || ' clocked in on ' || wo.store_name AS description,
              te.clock_in::text AS timestamp
       FROM time_entries te
       JOIN users u ON u.id = te.user_id
       JOIN work_orders wo ON wo.id = te.work_order_id
       ORDER BY te.clock_in DESC LIMIT 5)
      UNION ALL
      (SELECT 'expense' AS type,
              u.name || ' logged ' || e.category || ' $' || e.amount::text AS description,
              e.created_at::text AS timestamp
       FROM expenses e
       JOIN users u ON u.id = e.user_id
       ORDER BY e.created_at DESC LIMIT 5)
      ORDER BY timestamp DESC
      LIMIT 10`,
      z.object({
        type: z.string(),
        description: z.string(),
        timestamp: z.string(),
      }),
      [],
      { label: "Recent activity" }
    );

    return {
      summary: summaryRows[0],
      recentActivity,
    };
  },
});

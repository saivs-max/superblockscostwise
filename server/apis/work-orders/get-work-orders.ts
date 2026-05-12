import { api, z, postgres } from "@superblocksteam/sdk-api";

const OTG_DB = "0778f8a7-010b-40fc-baa1-d4f6dff546ff";

const WorkOrderRow = z.object({
  id: z.coerce.number(),
  external_id: z.string().nullable(),
  source_system: z.string().nullable(),
  title: z.string().nullable(),
  work_type: z.string(),
  store_name: z.string().nullable(),
  store_address: z.string().nullable(),
  cart_count: z.coerce.number(),
  scheduled_date: z.string().nullable(),
  description: z.string().nullable(),
  status: z.string(),
  assigned_user_id: z.coerce.number().nullable(),
  assigned_user_name: z.string().nullable(),
  active_clock: z.coerce.number(),
});

export default api({
  name: "GetWorkOrders",
  description: "Fetches work orders with optional filters",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    userId: z.number().nullable(),
    status: z.string().nullable(),
  }),
  output: z.object({ workOrders: z.array(WorkOrderRow) }),
  async run(ctx, { userId, status }) {
    const workOrders = await ctx.integrations.db.query(
      `SELECT wo.id, wo.external_id, wo.source_system, wo.title, wo.work_type,
              wo.store_name, wo.store_address, wo.cart_count, wo.scheduled_date::text,
              wo.description, wo.status, wo.assigned_user_id,
              u.name AS assigned_user_name,
              (SELECT COUNT(*)::int FROM time_entries te WHERE te.work_order_id = wo.id AND te.clock_out IS NULL) AS active_clock
       FROM work_orders wo
       LEFT JOIN users u ON u.id = wo.assigned_user_id
       WHERE ($1::int IS NULL OR wo.assigned_user_id = $1)
         AND ($2::text IS NULL OR wo.status = $2)
       ORDER BY wo.scheduled_date DESC NULLS LAST, wo.id DESC
       LIMIT 100`,
      WorkOrderRow,
      [userId, status],
      { label: "Fetch work orders" }
    );
    return { workOrders };
  },
});

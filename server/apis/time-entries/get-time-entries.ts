import { api, z, postgres } from "@superblocksteam/sdk-api";

const OTG_DB = "0778f8a7-010b-40fc-baa1-d4f6dff546ff";

const TimeEntryRow = z.object({
  id: z.coerce.number(),
  user_id: z.coerce.number(),
  user_name: z.string(),
  work_order_id: z.coerce.number(),
  wo_title: z.string().nullable(),
  wo_store_name: z.string().nullable(),
  clock_in: z.string(),
  clock_out: z.string().nullable(),
  break_minutes: z.coerce.number(),
  mode: z.string(),
  notes: z.string().nullable(),
  hours: z.string().nullable(),
});

export default api({
  name: "GetTimeEntries",
  description: "Fetches time entries with user and WO info",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    userId: z.number().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  }),
  output: z.object({ timeEntries: z.array(TimeEntryRow) }),
  async run(ctx, { userId, startDate, endDate }) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (userId != null) {
      conditions.push(`te.user_id = $${idx}`);
      params.push(userId);
      idx++;
    }
    if (startDate != null) {
      conditions.push(`te.clock_in >= $${idx}::timestamptz`);
      params.push(startDate);
      idx++;
    }
    if (endDate != null) {
      conditions.push(`te.clock_in < ($${idx}::date + 1)::timestamptz`);
      params.push(endDate);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await ctx.integrations.db.query(
      `SELECT te.id, te.user_id, u.name AS user_name, te.work_order_id,
              wo.title AS wo_title, wo.store_name AS wo_store_name,
              te.clock_in::text, te.clock_out::text, te.break_minutes, te.mode, te.notes,
              CASE WHEN te.clock_out IS NOT NULL
                THEN ROUND(EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - te.break_minutes/60.0, 2)::text
                ELSE NULL
              END AS hours
       FROM time_entries te
       JOIN users u ON u.id = te.user_id
       JOIN work_orders wo ON wo.id = te.work_order_id
       ${where}
       ORDER BY te.clock_in DESC
       LIMIT 200`,
      TimeEntryRow,
      params,
      { label: "Fetch time entries" }
    );
    return { timeEntries: rows };
  },
});

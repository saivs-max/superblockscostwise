import { api, z, postgres } from "@superblocksteam/sdk-api";

const OTG_DB = "0778f8a7-010b-40fc-baa1-d4f6dff546ff";

export const ClockIn = api({
  name: "ClockIn",
  description: "Starts a time entry for a work order",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    userId: z.number(),
    workOrderId: z.number(),
    mode: z.enum(["work", "drive"]).default("work"),
    notes: z.string().nullable(),
  }),
  output: z.object({ timeEntryId: z.coerce.number() }),
  async run(ctx, { userId, workOrderId, mode, notes }) {
    // Check no open clock for this user
    const open = await ctx.integrations.db.query(
      "SELECT id FROM time_entries WHERE user_id = $1 AND clock_out IS NULL LIMIT 1",
      z.object({ id: z.coerce.number() }),
      [userId],
      { label: "Check open clocks" }
    );
    if (open.length > 0) {
      throw new Error("You already have an active clock-in. Clock out first.");
    }

    // Update work order status
    await ctx.integrations.db.execute(
      "UPDATE work_orders SET status = 'in_progress' WHERE id = $1 AND status = 'open'",
      [workOrderId],
      { label: "Set WO in_progress" }
    );

    const rows = await ctx.integrations.db.query(
      `INSERT INTO time_entries (user_id, work_order_id, clock_in, mode, notes)
       VALUES ($1, $2, NOW(), $3, $4)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [userId, workOrderId, mode, notes],
      { label: "Insert clock-in" }
    );
    return { timeEntryId: rows[0].id };
  },
});

export const ClockOut = api({
  name: "ClockOut",
  description: "Ends an active time entry",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    timeEntryId: z.number(),
    breakMinutes: z.number().default(0),
    notes: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { timeEntryId, breakMinutes, notes }) {
    await ctx.integrations.db.execute(
      `UPDATE time_entries
       SET clock_out = NOW(), break_minutes = $2, notes = COALESCE($3, notes)
       WHERE id = $1 AND clock_out IS NULL`,
      [timeEntryId, breakMinutes, notes],
      { label: "Clock out" }
    );
    return { success: true };
  },
});

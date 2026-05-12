import { api, z, postgres } from "@superblocksteam/sdk-api";

const OTG_DB = "0778f8a7-010b-40fc-baa1-d4f6dff546ff";

export const AddExpense = api({
  name: "AddExpense",
  description: "Creates a new expense entry",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    userId: z.number(),
    workOrderId: z.number(),
    category: z.string(),
    subcategory: z.string().nullable(),
    expenseDate: z.string(),
    amount: z.number(),
    quantity: z.number().nullable(),
    rate: z.number().nullable(),
    description: z.string().nullable(),
  }),
  output: z.object({ expenseId: z.coerce.number() }),
  async run(ctx, input) {
    const rows = await ctx.integrations.db.query(
      `INSERT INTO expenses (user_id, work_order_id, category, subcategory, expense_date, amount, quantity, rate, description)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [input.userId, input.workOrderId, input.category, input.subcategory, input.expenseDate, input.amount, input.quantity, input.rate, input.description],
      { label: "Insert expense" }
    );
    return { expenseId: rows[0].id };
  },
});

const ExpenseRow = z.object({
  id: z.coerce.number(),
  user_id: z.coerce.number(),
  user_name: z.string(),
  work_order_id: z.coerce.number(),
  wo_title: z.string().nullable(),
  wo_store_name: z.string().nullable(),
  category: z.string(),
  subcategory: z.string().nullable(),
  expense_date: z.string(),
  amount: z.string(),
  quantity: z.string().nullable(),
  rate: z.string().nullable(),
  description: z.string().nullable(),
});

export const GetExpenses = api({
  name: "GetExpenses",
  description: "Fetches expenses with user and WO info",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({
    userId: z.number().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  }),
  output: z.object({ expenses: z.array(ExpenseRow) }),
  async run(ctx, { userId, startDate, endDate }) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (userId != null) {
      conditions.push(`e.user_id = $${idx}`);
      params.push(userId);
      idx++;
    }
    if (startDate != null) {
      conditions.push(`e.expense_date >= $${idx}::date`);
      params.push(startDate);
      idx++;
    }
    if (endDate != null) {
      conditions.push(`e.expense_date <= $${idx}::date`);
      params.push(endDate);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await ctx.integrations.db.query(
      `SELECT e.id, e.user_id, u.name AS user_name, e.work_order_id,
              wo.title AS wo_title, wo.store_name AS wo_store_name,
              e.category, e.subcategory, e.expense_date::text, e.amount::text,
              e.quantity::text, e.rate::text, e.description
       FROM expenses e
       JOIN users u ON u.id = e.user_id
       JOIN work_orders wo ON wo.id = e.work_order_id
       ${where}
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT 200`,
      ExpenseRow,
      params,
      { label: "Fetch expenses" }
    );
    return { expenses: rows };
  },
});

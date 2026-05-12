import { api, z, postgres } from "@superblocksteam/sdk-api";

const OTG_DB = "0778f8a7-010b-40fc-baa1-d4f6dff546ff";

const UserSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  role: z.string(),
  worker_type: z.string().nullable(),
  hourly_rate: z.string().nullable(),
  status: z.string(),
});

export default api({
  name: "GetCurrentUser",
  description: "Resolves current user from Superblocks JWT email",
  integrations: { db: postgres(OTG_DB) },
  input: z.object({}),
  output: z.object({
    user: UserSchema.nullable(),
  }),
  async run(ctx) {
    const email = ctx.user.email;
    if (!email) {
      return { user: null };
    }
    const rows = await ctx.integrations.db.query(
      "SELECT id, name, email, username, role, worker_type, hourly_rate, status FROM users WHERE email = $1 AND status = 'active'",
      UserSchema,
      [email],
      { label: "Get current user by email" }
    );
    return { user: rows[0] ?? null };
  },
});

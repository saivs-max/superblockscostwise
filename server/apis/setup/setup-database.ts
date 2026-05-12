import { api, z, postgres } from "@superblocksteam/sdk-api";

const OTG_DB = "0778f8a7-010b-40fc-baa1-d4f6dff546ff";

export default api({
  name: "SetupDatabase",
  description: "Creates OTG schema tables and seeds demo data",
  integrations: {
    db: postgres(OTG_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),

  async run(ctx) {
    // Create all tables in a single transaction
    await ctx.integrations.db.execute(
      `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('technician','ops_manager','sr_manager','pm')),
        worker_type TEXT CHECK (worker_type IS NULL OR worker_type IN ('contractor','fte')),
        hourly_rate NUMERIC(10,2),
        ops_manager_id INTEGER,
        home_address TEXT,
        home_phone TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active','disabled')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS manager_team (
        id SERIAL PRIMARY KEY,
        manager_user_id INTEGER NOT NULL REFERENCES users(id),
        tech_user_id INTEGER NOT NULL REFERENCES users(id),
        UNIQUE(manager_user_id, tech_user_id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        external_id TEXT UNIQUE,
        source_system TEXT CHECK (source_system IN ('maintainx','freshdesk')),
        source_ticket_id TEXT,
        title TEXT,
        work_type TEXT NOT NULL CHECK (work_type IN ('deployment','retrofit','service','repair')),
        store_id TEXT,
        store_name TEXT,
        store_address TEXT,
        cart_count INTEGER DEFAULT 0,
        scheduled_date DATE,
        description TEXT,
        status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
        assigned_user_id INTEGER REFERENCES users(id),
        priority TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','in_review','approved_ops','approved_sr','queued_ap','sent_ap','rejected')),
        total NUMERIC(10,2) DEFAULT 0,
        hourly_rate NUMERIC(10,2) DEFAULT 40.00,
        submitted_at TIMESTAMPTZ,
        approved_ops_at TIMESTAMPTZ,
        approved_ops_by INTEGER REFERENCES users(id),
        approved_sr_at TIMESTAMPTZ,
        approved_sr_by INTEGER REFERENCES users(id),
        rejected_at TIMESTAMPTZ,
        rejected_by INTEGER REFERENCES users(id),
        rejection_reason TEXT,
        escalated_at TIMESTAMPTZ,
        escalated_by INTEGER REFERENCES users(id),
        escalation_note TEXT,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        invoice_type TEXT DEFAULT 'tech_labor',
        vendor_name TEXT,
        vendor_invoice_number TEXT,
        vendor_invoice_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS time_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
        invoice_id INTEGER REFERENCES invoices(id),
        clock_in TIMESTAMPTZ NOT NULL,
        clock_out TIMESTAMPTZ,
        break_minutes INTEGER DEFAULT 0,
        notes TEXT,
        mode TEXT DEFAULT 'work' CHECK (mode IN ('work','drive')),
        lat_in NUMERIC(9,6),
        lng_in NUMERIC(9,6),
        lat_out NUMERIC(9,6),
        lng_out NUMERIC(9,6),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
        invoice_id INTEGER REFERENCES invoices(id),
        category TEXT NOT NULL CHECK (category IN ('mileage','tolls','parking','meal','lodging','supplies','travel','other')),
        subcategory TEXT,
        expense_date DATE NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        quantity NUMERIC(10,2),
        rate NUMERIC(10,4),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS custom_rules (
        id SERIAL PRIMARY KEY,
        rule_type TEXT NOT NULL CHECK (rule_type IN ('max_hours_per_shift','max_hours_per_day','max_drive_hours_per_day','max_miles_per_day','max_expense_amount','require_receipt_above','max_hours_per_wo','max_hours_per_cart','max_hours_per_10_carts')),
        work_type_filter TEXT CHECK (work_type_filter IS NULL OR work_type_filter IN ('deployment','retrofit','service','repair')),
        category_filter TEXT,
        cart_count_min INTEGER,
        threshold NUMERIC(10,2) NOT NULL,
        description TEXT,
        severity TEXT DEFAULT 'flag' CHECK (severity IN ('warn','flag','block')),
        active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        details JSONB,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_wo_assigned ON work_orders(assigned_user_id, status);
      CREATE INDEX IF NOT EXISTS idx_te_user ON time_entries(user_id, clock_in);
      CREATE INDEX IF NOT EXISTS idx_te_wo ON time_entries(work_order_id);
      CREATE INDEX IF NOT EXISTS idx_exp_user ON expenses(user_id, expense_date);
      CREATE INDEX IF NOT EXISTS idx_exp_wo ON expenses(work_order_id);
      CREATE INDEX IF NOT EXISTS idx_inv_user ON invoices(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_inv_period ON invoices(user_id, period_start);
      CREATE INDEX IF NOT EXISTS idx_rules_active ON custom_rules(active);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
      `,
      { label: "Create all tables and indexes" }
    );

    // Check if already seeded
    const existing = await ctx.integrations.db.query(
      "SELECT COUNT(*)::int AS cnt FROM users",
      z.object({ cnt: z.number() }),
      [],
      { label: "Check existing users" }
    );

    if (existing[0].cnt > 0) {
      return { success: true, message: "Tables created. Data already seeded." };
    }

    // Seed users
    await ctx.integrations.db.execute(
      `INSERT INTO users (name, email, username, role, worker_type, hourly_rate, home_address, home_phone) VALUES
        ('Maitland Kelly', 'maitland.k@instacart.com', 'maitland', 'ops_manager', NULL, NULL, NULL, NULL),
        ('Reshmi Chowdhury', 'reshmi.c@instacart.com', 'reshmi', 'sr_manager', NULL, NULL, NULL, NULL),
        ('Sai V.', 'sai.vs@instacart.com', 'sai', 'pm', NULL, NULL, NULL, NULL)`,
      { label: "Insert managers and PM" }
    );

    await ctx.integrations.db.execute(
      `INSERT INTO users (name, email, username, role, worker_type, hourly_rate, ops_manager_id, home_address, home_phone) VALUES
        ('Aramiwale Shittu', 'aramiwale@example.com', 'aramiwale', 'technician', 'contractor', 40.00, 1, '24 Mayflower Drive, Sicklerville, NJ 08081', '856-725-2298'),
        ('Carlos Martinez', 'carlos.m@example.com', 'carlos', 'technician', 'contractor', 40.00, 1, '142 Oak St, Edgewater, NJ 07020', '201-555-0143'),
        ('Priya Patel', 'priya.p@instacart.com', 'priya', 'technician', 'fte', 45.00, 1, '89 Maple Ave, Hackensack, NJ 07601', '201-555-0188')`,
      { label: "Insert technicians" }
    );

    // Manager-tech relationships
    await ctx.integrations.db.execute(
      `INSERT INTO manager_team (manager_user_id, tech_user_id) VALUES (1, 4), (1, 5), (1, 6)`,
      { label: "Insert manager-team mappings" }
    );

    // Work orders
    await ctx.integrations.db.execute(
      `INSERT INTO work_orders (external_id, source_system, source_ticket_id, title, work_type, store_id, store_name, cart_count, scheduled_date, description, status, assigned_user_id) VALUES
        ('MX-RTR-2406-127', 'maintainx', '127', 'Whole Foods Edgewater - Shelf Bracket Replacement', 'retrofit', 'WF-EDG', 'Whole Foods Edgewater', 12, CURRENT_DATE, 'Replace shelf brackets and recalibrate scanners on 12 carts.', 'in_progress', 4),
        ('MX-DPL-2406-128', 'maintainx', '128', 'ShopRite Paramus - 20 Cart Deployment', 'deployment', 'SR-PAR', 'ShopRite Paramus', 20, CURRENT_DATE, 'Initial install of 20 new Caper Carts plus on-floor staff training.', 'open', 4),
        ('FD-RPR-2406-1051', 'freshdesk', '1051', 'Stop & Shop Hoboken - Cart #7 Calibration Error', 'repair', 'SS-HOB', 'Stop & Shop Hoboken', 1, CURRENT_DATE + 1, 'Cart #7 reporting persistent weight calibration error.', 'open', 4),
        ('MX-RTR-2406-125', 'maintainx', '125', 'ShopRite Hackensack - Software + Bracket Retrofit', 'retrofit', 'SR-HKK', 'ShopRite Hackensack', 10, CURRENT_DATE - 3, 'Software bump + rear-shelf bracket replacement on 10 carts.', 'completed', 4),
        ('MX-DPL-2406-126', 'maintainx', '126', 'Whole Foods Englewood - 20 Cart Deploy + Register Integration', 'deployment', 'WF-ENG', 'Whole Foods Englewood', 20, CURRENT_DATE - 2, 'Initial install of 20 carts + register integration.', 'completed', 4),
        ('MX-DPL-2406-130', 'maintainx', '130', 'ShopRite Clifton - 15 Cart Deployment', 'deployment', 'SR-CLF', 'ShopRite Clifton', 15, CURRENT_DATE + 2, 'Initial install of 15 carts.', 'open', 5),
        ('FD-SVC-2406-1062', 'freshdesk', '1062', 'Whole Foods Edgewater - Weekly Service Check', 'service', 'WF-EDG', 'Whole Foods Edgewater', 3, CURRENT_DATE - 1, 'Weekly service check on 3 carts.', 'completed', 5),
        ('MX-RTR-2406-131', 'maintainx', '131', 'Whole Foods Paramus - Firmware + Display Panel', 'retrofit', 'WF-PRA', 'Whole Foods Paramus', 18, CURRENT_DATE + 1, 'Firmware upgrade + display panel replacement on 18 carts.', 'open', 6),
        ('FD-RPR-2406-1075', 'freshdesk', '1075', 'Stop & Shop Weehawken - 2 Carts Unresponsive', 'repair', 'SS-WEH', 'Stop & Shop Weehawken', 2, CURRENT_DATE, 'Two carts unresponsive after overnight charge.', 'open', 6)`,
      { label: "Insert work orders" }
    );

    // Time entries
    await ctx.integrations.db.execute(
      `INSERT INTO time_entries (user_id, work_order_id, clock_in, clock_out, break_minutes, notes, mode) VALUES
        (4, 4, NOW() - INTERVAL '3 days' + INTERVAL '7 hours 30 minutes', NOW() - INTERVAL '3 days' + INTERVAL '19 hours', 30, 'ShopRite Hackensack — overran due to shelf damage.', 'work'),
        (4, 5, NOW() - INTERVAL '2 days' + INTERVAL '7 hours', NOW() - INTERVAL '2 days' + INTERVAL '21 hours', 60, 'Whole Foods Englewood — full deployment.', 'work'),
        (4, 1, NOW() - INTERVAL '30 minutes', NULL, 0, NULL, 'work'),
        (5, 7, NOW() - INTERVAL '1 day' + INTERVAL '9 hours', NOW() - INTERVAL '1 day' + INTERVAL '11 hours 30 minutes', 0, 'Quick service check.', 'work')`,
      { label: "Insert time entries" }
    );

    // Expenses
    await ctx.integrations.db.execute(
      `INSERT INTO expenses (user_id, work_order_id, category, subcategory, expense_date, amount, quantity, rate, description) VALUES
        (4, 4, 'mileage', NULL, CURRENT_DATE - 3, 20.30, 28, 0.725, 'Edgewater to Hackensack RT'),
        (4, 4, 'tolls', NULL, CURRENT_DATE - 3, 14.50, NULL, NULL, 'GWB toll'),
        (4, 5, 'mileage', NULL, CURRENT_DATE - 2, 15.95, 22, 0.725, 'Edgewater to Englewood RT'),
        (4, 5, 'other', 'Tools', CURRENT_DATE - 2, 32.00, NULL, NULL, 'Replacement bracket clips (Home Depot)'),
        (4, 1, 'mileage', NULL, CURRENT_DATE, 23.49, 32.4, 0.725, 'Edgewater on-site mileage'),
        (4, 1, 'meal', NULL, CURRENT_DATE, 18.00, NULL, NULL, 'Lunch (under cap, no receipt required)'),
        (5, 7, 'mileage', NULL, CURRENT_DATE - 1, 11.60, 16, 0.725, 'Edgewater service visit'),
        (5, 7, 'parking', NULL, CURRENT_DATE - 1, 6.00, NULL, NULL, 'Garage parking')`,
      { label: "Insert expenses" }
    );

    // Invoices
    await ctx.integrations.db.execute(
      `INSERT INTO invoices (invoice_number, user_id, period_start, period_end, status, total, hourly_rate, submitted_at, created_by) VALUES
        ('INV-2026-0511-U04', 4, CURRENT_DATE - 14, CURRENT_DATE - 8, 'submitted', 1245.74, 40.00, NOW() - INTERVAL '1 day', 4),
        ('INV-2026-0511-U05', 5, CURRENT_DATE - 14, CURRENT_DATE - 8, 'draft', 117.60, 40.00, NULL, 5)`,
      { label: "Insert invoices" }
    );

    // Settings
    await ctx.integrations.db.execute(
      `INSERT INTO settings (key, value) VALUES
        ('policy_hourly_rate_default', '40.00'),
        ('policy_mileage_rate', '0.725'),
        ('policy_meal_daily_cap', '100.00'),
        ('policy_hours_per_10_carts_deployment', '7'),
        ('policy_hours_per_10_carts_retrofit', '7'),
        ('policy_hours_per_10_carts_service', '24'),
        ('policy_hours_per_10_carts_repair', '15')
      ON CONFLICT (key) DO NOTHING`,
      { label: "Insert default settings" }
    );

    // Custom rules
    await ctx.integrations.db.execute(
      `INSERT INTO custom_rules (rule_type, work_type_filter, threshold, description, severity) VALUES
        ('max_hours_per_shift', NULL, 14, 'Flag shifts exceeding 14 hours', 'flag'),
        ('max_hours_per_day', NULL, 16, 'Block if day exceeds 16 hours total', 'block'),
        ('max_expense_amount', NULL, 500, 'Flag individual expenses over $500', 'flag'),
        ('require_receipt_above', NULL, 25, 'Require receipt for expenses over $25', 'warn'),
        ('max_hours_per_10_carts', 'deployment', 7, 'Flag deployment if > 7 hrs per 10 carts', 'flag'),
        ('max_hours_per_10_carts', 'retrofit', 7, 'Flag retrofit if > 7 hrs per 10 carts', 'flag')`,
      { label: "Insert default rules" }
    );

    return { success: true, message: "Database setup and seed complete." };
  },
});

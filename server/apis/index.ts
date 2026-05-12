/**
 * API Registry - Central export for all APIs.
 *
 * IMPORTANT: Use .js extension for imports (required for ESM compatibility)
 */

import SetupDatabase from './setup/setup-database.js';
import GetCurrentUser from './users/get-current-user.js';
import GetWorkOrders from './work-orders/get-work-orders.js';
import { ClockIn, ClockOut } from './time-entries/clock-actions.js';
import GetTimeEntries from './time-entries/get-time-entries.js';
import { AddExpense, GetExpenses } from './expenses/expense-actions.js';
import { GetInvoices, SubmitInvoice, ApproveInvoice, RejectInvoice } from './invoices/invoice-actions.js';
import GetDashboardStats from './dashboard/get-dashboard-stats.js';

const apis = {
  SetupDatabase,
  GetCurrentUser,
  GetWorkOrders,
  ClockIn,
  ClockOut,
  GetTimeEntries,
  AddExpense,
  GetExpenses,
  GetInvoices,
  SubmitInvoice,
  ApproveInvoice,
  RejectInvoice,
  GetDashboardStats,
} as const;

export default apis;

/** Type for useApi inference - exported for client type-only imports */
export type ApiRegistry = typeof apis;

import { createBrowserRouter } from "react-router";
import App from "./App";
import DashboardRoute from "./pages/Dashboard/route";
import WorkOrdersRoute from "./pages/WorkOrders/route";
import TimeTrackingRoute from "./pages/TimeTracking/route";
import ExpensesRoute from "./pages/Expenses/route";
import InvoicesRoute from "./pages/Invoices/route";
import ApprovalsRoute from "./pages/Approvals/route";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      {
        index: true,
        Component: DashboardRoute,
      },
      {
        path: "work-orders",
        Component: WorkOrdersRoute,
      },
      {
        path: "time-tracking",
        Component: TimeTrackingRoute,
      },
      {
        path: "expenses",
        Component: ExpensesRoute,
      },
      {
        path: "invoices",
        Component: InvoicesRoute,
      },
      {
        path: "approvals",
        Component: ApprovalsRoute,
      },
    ],
  },
]);

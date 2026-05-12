import { useAppContext } from "@/hooks/useAppContext";
import WorkOrdersPage from "@/pages/WorkOrders";

export default function WorkOrdersRoute() {
  const { currentUser } = useAppContext();
  return <WorkOrdersPage currentUser={currentUser} />;
}

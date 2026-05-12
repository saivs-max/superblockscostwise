import { useAppContext } from "@/hooks/useAppContext";
import DashboardPage from "@/pages/Dashboard";

export default function DashboardRoute() {
  const { currentUser } = useAppContext();
  return <DashboardPage currentUser={currentUser} />;
}

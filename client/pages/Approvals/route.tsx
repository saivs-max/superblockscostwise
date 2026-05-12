import { useAppContext } from "@/hooks/useAppContext";
import ApprovalsPage from "@/pages/Approvals";

export default function ApprovalsRoute() {
  const { currentUser } = useAppContext();
  return <ApprovalsPage currentUser={currentUser} />;
}

import { useAppContext } from "@/hooks/useAppContext";
import TimeTrackingPage from "@/pages/TimeTracking";

export default function TimeTrackingRoute() {
  const { currentUser } = useAppContext();
  return <TimeTrackingPage currentUser={currentUser} />;
}

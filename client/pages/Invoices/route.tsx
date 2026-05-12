import { useAppContext } from "@/hooks/useAppContext";
import InvoicesPage from "@/pages/Invoices";

export default function InvoicesRoute() {
  const { currentUser } = useAppContext();
  return <InvoicesPage currentUser={currentUser} />;
}

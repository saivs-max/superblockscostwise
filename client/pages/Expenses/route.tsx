import { useAppContext } from "@/hooks/useAppContext";
import ExpensesPage from "@/pages/Expenses";

export default function ExpensesRoute() {
  const { currentUser } = useAppContext();
  return <ExpensesPage currentUser={currentUser} />;
}

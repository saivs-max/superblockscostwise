import { useOutletContext } from "react-router";

export type AppContext = {
  currentUser: {
    id: number;
    name: string;
    email: string;
    role: string;
    worker_type: string | null;
    hourly_rate: string | null;
    status: string;
    username: string | null;
  } | null;
  userLoading: boolean;
};

export function useAppContext(): AppContext {
  return useOutletContext<AppContext>();
}

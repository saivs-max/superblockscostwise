import { createContext, useContext, type ReactNode } from "react";
import { useApiData } from "@/hooks/useApiData.js";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  worker_type: string | null;
  hourly_rate: string | null;
  status: string;
  username: string | null;
} | null;

type UserContextValue = {
  currentUser: CurrentUser;
  loading: boolean;
};

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { data, loading } = useApiData("GetCurrentUser", {});

  const currentUser: CurrentUser = data?.user ?? null;

  return (
    <UserContext.Provider value={{ currentUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext(): UserContextValue {
  return useContext(UserContext);
}

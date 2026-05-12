import { Outlet } from "react-router";
import { AppProvider } from "@superblocksteam/library";
import { UserProvider, useUserContext } from "@/hooks/useUserContext.js";
import Sidebar from "@/components/Sidebar";

function AppShell() {
  const { currentUser, loading } = useUserContext();

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        currentUser={
          currentUser
            ? { name: currentUser.name, role: currentUser.role, email: currentUser.email }
            : null
        }
        loading={loading}
      />
      <main className="flex-1 overflow-hidden">
        <Outlet context={{ currentUser, userLoading: loading }} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <UserProvider>
        <AppShell />
      </UserProvider>
    </AppProvider>
  );
}

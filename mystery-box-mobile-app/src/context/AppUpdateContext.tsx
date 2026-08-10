import { createContext, useContext, type ReactNode } from "react";
import { AppUpdateModal } from "../components/AppUpdateModal";
import { useAppUpdateController, type AppUpdateController } from "../hooks/useAppUpdate";

const AppUpdateContext = createContext<AppUpdateController | null>(null);

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const controller = useAppUpdateController();
  return (
    <AppUpdateContext.Provider value={controller}>
      {children}
      <AppUpdateModal controller={controller} />
    </AppUpdateContext.Provider>
  );
}

export function useAppUpdateContext(): AppUpdateController {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) {
    throw new Error("useAppUpdateContext must be used within AppUpdateProvider");
  }
  return ctx;
}

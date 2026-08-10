import { useMainTabsNav } from "../../context/MainTabsContext";
import { MainTabsSubPageRoutes } from "./MainTabsSubPageRoutes";

export type MainTabsSubPageContentProps = {
  offline: boolean;
};

export function MainTabsSubPageContent({ offline }: MainTabsSubPageContentProps) {
  const { view } = useMainTabsNav();
  return <MainTabsSubPageRoutes view={view} offline={offline} />;
}

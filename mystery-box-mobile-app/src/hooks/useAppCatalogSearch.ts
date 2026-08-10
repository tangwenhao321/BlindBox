import { useCallback, useState } from "react";
import type { AppView } from "../components/mainTabs/appViews";

export function useAppCatalogSearch(navigate: (view: AppView) => void) {
  const [catalogSearchInitialKeyword, setCatalogSearchInitialKeyword] = useState("");

  const openCatalogSearch = useCallback(
    (keyword = "") => {
      setCatalogSearchInitialKeyword(keyword);
      navigate("catalogSearch");
    },
    [navigate],
  );

  return { catalogSearchInitialKeyword, openCatalogSearch };
}

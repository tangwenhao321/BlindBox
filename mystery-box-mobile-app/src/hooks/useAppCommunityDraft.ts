import { useCallback, useState } from "react";
import type { AppView } from "../components/mainTabs/appViews";

export function useAppCommunityDraft(navigate: (view: AppView) => void) {
  const [communityDraft, setCommunityDraft] = useState("");

  const openCommunityWithDraft = useCallback(
    (draft: string) => {
      setCommunityDraft(draft);
      navigate("community");
    },
    [navigate],
  );

  const clearCommunityDraft = useCallback(() => setCommunityDraft(""), []);

  return { communityDraft, openCommunityWithDraft, clearCommunityDraft };
}

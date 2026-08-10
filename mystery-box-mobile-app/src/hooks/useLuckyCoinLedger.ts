import { useCallback, useEffect, useState } from "react";
import { fetchLuckyCoinLedger, type LuckyCoinLedgerEntry } from "../services/welfareService";
import { useListLoad } from "./useListLoad";

export function useLuckyCoinLedger(token: string) {
  const [entries, setEntries] = useState<LuckyCoinLedgerEntry[]>([]);
  const { loadError, loading, runLoad } = useListLoad();

  const reload = useCallback(async () => {
    await runLoad(async () => {
      const items = await fetchLuckyCoinLedger(token);
      setEntries(items);
    });
  }, [runLoad, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { entries, loadError, loading, reload };
}

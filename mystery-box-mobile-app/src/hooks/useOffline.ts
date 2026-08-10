import { useEffect, useState } from "react";
import { subscribeOffline } from "../utils/connectivity";

export function useOffline() {
  const [offline, setOfflineState] = useState(false);
  useEffect(() => subscribeOffline(setOfflineState), []);
  return offline;
}

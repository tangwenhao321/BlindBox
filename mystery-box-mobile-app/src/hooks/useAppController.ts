import { useMemo } from "react";
import { assembleAppControllerLoadedAssembly } from "./assembleAppControllerLoadedAssembly";
import {
  buildAppControllerLoadedResult,
  type AppControllerResult,
} from "./buildAppControllerLoadedResult";
import { useAppControllerOrchestration } from "./useAppControllerOrchestration";

export type { AppControllerResult } from "./buildAppControllerLoadedResult";

export function useAppController(): AppControllerResult {
  const { loading, loadedSlices } = useAppControllerOrchestration();
  const assembly = useMemo(() => assembleAppControllerLoadedAssembly(loadedSlices), [loadedSlices]);
  return useMemo(() => buildAppControllerLoadedResult(loading, assembly), [loading, assembly]);
}

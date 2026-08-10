import type { AppShellBuildInput } from "./buildAppShellProps";
import type { AppModalsBuildInput } from "./buildAppModalsProps";
import type { LoginGateBuildInput } from "./buildAppLoginGateProps";

export type AppShellModalsSlice = AppModalsBuildInput;
export type AppShellLoginSlice = LoginGateBuildInput;

export function assembleAppShellInput(modals: AppShellModalsSlice, login: AppShellLoginSlice): AppShellBuildInput {
  return { ...modals, ...login };
}

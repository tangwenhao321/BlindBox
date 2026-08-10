import type { ComponentProps } from "react";
import type { AppModals } from "../components/AppModals";
import type { LoginGate } from "../shell/LoginGate";
import { buildAppModalsProps, type AppModalsBuildInput } from "./buildAppModalsProps";
import { buildAppLoginGateProps, type LoginGateBuildInput } from "./buildAppLoginGateProps";

export type AppShellBuildInput = AppModalsBuildInput & LoginGateBuildInput;

export type AppShellProps = {
  modalsProps: ComponentProps<typeof AppModals>;
  loginGateProps: ComponentProps<typeof LoginGate>;
};

export function buildAppShellProps(input: AppShellBuildInput): AppShellProps {
  return {
    modalsProps: buildAppModalsProps(input),
    loginGateProps: buildAppLoginGateProps(input),
  };
}

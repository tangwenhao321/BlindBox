import type { ReactNode } from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "./ErrorBoundary";

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

export function QueryAwareErrorBoundary({ children, onReset }: Props) {
  const { reset: resetQueries } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={() => {
        resetQueries();
        onReset?.();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

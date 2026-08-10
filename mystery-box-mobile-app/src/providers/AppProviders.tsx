import type { ReactNode } from "react";
import { useEffect } from "react";
import { Text, TextInput } from "react-native";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ConfirmDialogProvider } from "../context/ConfirmDialogContext";
import { ThemeProvider } from "../context/ThemeContext";
import { AppQueryPersistProvider } from "../query/queryPersist";
import { AppConnectivityEffects } from "./AppConnectivityEffects";

const MAX_FONT_SIZE_MULTIPLIER = 1.3;

type TextWithDefaultProps = typeof Text & {
  defaultProps?: { maxFontSizeMultiplier?: number };
};

type TextInputWithDefaultProps = typeof TextInput & {
  defaultProps?: { maxFontSizeMultiplier?: number };
};

function useDefaultTextScaling() {
  useEffect(() => {
    const textComponent = Text as TextWithDefaultProps;
    const textInputComponent = TextInput as TextInputWithDefaultProps;
    textComponent.defaultProps = {
      ...textComponent.defaultProps,
      maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
    };
    textInputComponent.defaultProps = {
      ...textInputComponent.defaultProps,
      maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
    };
  }, []);
}

export function AppProviders({ children }: { children: ReactNode }) {
  useDefaultTextScaling();

  return (
    <AppQueryPersistProvider>
      <QueryErrorResetBoundary>
        <ThemeProvider>
          <ConfirmDialogProvider>
            <AppConnectivityEffects />
            {children}
          </ConfirmDialogProvider>
        </ThemeProvider>
      </QueryErrorResetBoundary>
    </AppQueryPersistProvider>
  );
}

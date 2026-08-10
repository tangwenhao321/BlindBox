import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

export type ConfirmRequest = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmRequest & { resolve: (value: boolean) => void };

type ConfirmDialogContextValue = {
  confirm: (request: ConfirmRequest) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

function buildConfirmDialogStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    title: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
    message: { fontSize: typography.body, color: colors.textSecondary, lineHeight: 22 },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    btn: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    cancelBtn: { backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border },
    confirmBtn: { backgroundColor: colors.brand },
    destructiveBtn: { backgroundColor: colors.danger },
    cancelText: { color: colors.textPrimary, fontWeight: "700" },
    confirmText: { color: colors.textOnBrand, fontWeight: "800" },
    pressed: { opacity: 0.88 },
  });
}

function ConfirmSheet({
  pending,
  onClose,
}: {
  pending: Pending | null;
  onClose: (result: boolean) => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildConfirmDialogStyles);
  if (!pending) return null;
  const confirmLabel = pending.confirmLabel ?? t("common.confirm");
  const cancelLabel = pending.cancelLabel ?? t("common.cancel");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable
        style={styles.mask}
        onPress={() => onClose(false)}
        accessibilityLabel={t("confirmDialog.closeA11y")}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
          <Text style={styles.title}>{pending.title}</Text>
          {pending.message ? <Text style={styles.message}>{pending.message}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.cancelBtn, pressed ? styles.pressed : null]}
              onPress={() => onClose(false)}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                pending.destructive ? styles.destructiveBtn : styles.confirmBtn,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => onClose(true)}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((request: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...request, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setPending((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmSheet pending={pending} onClose={close} />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return ctx;
}

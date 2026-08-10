import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { EmptyState } from "./EmptyState";
import { PrimaryButton } from "./ui/PrimaryButton";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { layout, radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { Address } from "../types";

type Props = {
  addresses: Address[];
  selectedAddressId: string;
  loading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  onBack: () => void;
  onRefresh: () => void;
  onAdd: () => void;
  onEdit: (address: Address) => void;
  onSelect: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
};

export function AddressManageView(props: Props) {
  const {
    addresses,
    selectedAddressId,
    loading = false,
    loadError = null,
    onRetryLoad,
    onBack,
    onRefresh,
    onAdd,
    onEdit,
    onSelect,
    onSetDefault,
    onDelete,
  } = props;
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildAddressManageStyles);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("addressManage.title")} onBack={onBack} />
      {loadError ? <ListErrorBanner message={loadError} onRetry={onRetryLoad ?? onRefresh} /> : null}
      <ScreenScaffold
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />}
        contentContainerStyle={styles.content}
      >
        {shouldShowListSkeleton(loading, addresses.length, loadError, refreshing) ? (
          <ListSkeleton variant="row" rows={3} />
        ) : listEmptyWhenOk(
            loadError,
            addresses.length === 0 ? (
              <EmptyState
                title={t("addressManage.emptyTitle")}
                description={t("addressManage.emptyDesc")}
                variant="plain"
                actionLabel={t("addressManage.addAddress")}
                onAction={onAdd}
              />
            ) : null,
          )}
        {!loading && !loadError
          ? addresses.map((item) => {
              const selected = selectedAddressId === item.id;
              return (
                <View key={item.id} style={[styles.card, selected ? styles.cardSelected : null]}>
                  <Pressable
                    onPress={() => onSelect(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.realName} ${item.phoneNumber}. ${item.details}`}
                  >
                    <Text style={styles.name}>
                      {item.realName} {item.phoneNumber}
                      {item.top ? t("addressManage.defaultTag") : ""}
                    </Text>
                    <Text style={styles.addr}>
                      {item.details} {item.houseNumber}
                    </Text>
                    {selected ? <Text style={styles.selectedTag}>{t("addressManage.currentOrder")}</Text> : null}
                  </Pressable>
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => onEdit(item)}
                      accessibilityRole="button"
                      accessibilityLabel={t("addressManage.edit")}
                    >
                      <Text style={styles.actionText}>{t("addressManage.edit")}</Text>
                    </Pressable>
                    {!item.top ? (
                      <Pressable
                        onPress={() => onSetDefault(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t("addressManage.setDefault")}
                      >
                        <Text style={styles.actionText}>{t("addressManage.setDefault")}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => onDelete(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t("addressManage.delete")}
                    >
                      <Text style={[styles.actionText, styles.danger]}>{t("addressManage.delete")}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          : null}
      </ScreenScaffold>
      <View style={styles.footer}>
        <PrimaryButton label={t("addressManage.addNewButton")} onPress={onAdd} />
      </View>
    </View>
  );
}

function buildAddressManageStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    content: { paddingBottom: layout.screenPaddingBottom + 72, gap: spacing.sm },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    cardSelected: { borderColor: colors.brand, backgroundColor: colors.bgBrandSoft },
    name: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.body },
    addr: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 },
    selectedTag: { marginTop: spacing.xs, color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    actionRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
    actionText: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    danger: { color: colors.danger },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: layout.screenPaddingX,
      paddingBottom: layout.screenPaddingBottom,
      backgroundColor: colors.bgPage,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
}

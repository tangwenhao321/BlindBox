import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatRegionLabel } from "../data/chinaRegions";
import { useGhnAddressCascade } from "../hooks/useGhnAddressCascade";
import { useAppTheme } from "../context/ThemeContext";
import { RegionPickerModal } from "./RegionPickerModal";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { layout, radius, spacing, typography } from "../styles/tokens";
import { getAppLocale } from "../utils/i18nLocale";

type Props = {
  editing: boolean;
  realName: string;
  phoneNumber: string;
  region: string;
  district?: string;
  ward?: string;
  details: string;
  houseNumber: string;
  isDefault: boolean;
  saving: boolean;
  onChangeRealName: (v: string) => void;
  onChangePhoneNumber: (v: string) => void;
  onChangeRegion: (v: string) => void;
  onChangeDistrict?: (v: string) => void;
  onChangeWard?: (v: string) => void;
  onChangeDetails: (v: string) => void;
  onChangeHouseNumber: (v: string) => void;
  onChangeIsDefault: (v: boolean) => void;
  onBack: () => void;
  onSave: () => void;
};

export function AddressFormView(props: Props) {
  const {
    editing,
    realName,
    phoneNumber,
    region,
    district = "",
    ward = "",
    details,
    houseNumber,
    isDefault,
    saving,
    onChangeRealName,
    onChangePhoneNumber,
    onChangeRegion,
    onChangeDistrict,
    onChangeWard,
    onChangeDetails,
    onChangeHouseNumber,
    onChangeIsDefault,
    onBack,
    onSave,
  } = props;
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const [districtPickerVisible, setDistrictPickerVisible] = useState(false);
  const [wardPickerVisible, setWardPickerVisible] = useState(false);
  const showVietnamFields = getAppLocale() === "vi-VN";
  const { provinceOptions, districtOptions, wardOptions } = useGhnAddressCascade(
    region,
    district,
    showVietnamFields,
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bgPage },
        scroll: { gap: spacing.md, paddingBottom: 100 },
        card: {
          backgroundColor: colors.bgCard,
          borderRadius: radius.md,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        rowMulti: { alignItems: "flex-start" },
        label: { width: 72, fontSize: typography.body, color: colors.textPrimary, fontWeight: "600" },
        field: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
        input: {
          flex: 1,
          fontSize: typography.body,
          color: colors.textPrimary,
          padding: 0,
          textAlign: "right",
        },
        textArea: { minHeight: 72, textAlignVertical: "top", textAlign: "left" },
        placeholder: { color: colors.textPlaceholder },
        regionText: { flex: 1, fontSize: typography.body, color: colors.textPrimary, textAlign: "right" },
        chevron: { color: colors.textMuted, fontSize: typography.h4, fontWeight: "300" },
        pressed: { opacity: 0.7 },
        switchRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        switchLabel: { fontSize: typography.body, fontWeight: "600", color: colors.textPrimary },
        saveBtn: {
          position: "absolute",
          left: layout.screenPaddingX,
          right: layout.screenPaddingX,
          bottom: spacing.lg,
          backgroundColor: colors.teal,
          borderRadius: radius.sm,
          paddingVertical: spacing.md,
          alignItems: "center",
        },
        saveBtnDisabled: { opacity: 0.6 },
        saveBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.bodyLg },
      }),
    [colors],
  );

  return (
    <View style={styles.root}>
      <SubPageHeader title={editing ? t("address.editTitle") : t("address.addTitle")} onBack={onBack} />
      <ScreenScaffold contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <FormRow label={t("address.recipient")} styles={styles}>
            <TextInput
              value={realName}
              onChangeText={onChangeRealName}
              placeholder={t("address.recipientPlaceholder")}
              placeholderTextColor={colors.textPlaceholder}
              style={styles.input}
            />
          </FormRow>
          <FormRow label={t("address.phone")} styles={styles}>
            <TextInput
              value={phoneNumber}
              onChangeText={onChangePhoneNumber}
              keyboardType="phone-pad"
              placeholder={t("address.phonePlaceholder")}
              placeholderTextColor={colors.textPlaceholder}
              style={styles.input}
            />
          </FormRow>
        </View>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("address.selectRegion")}
            onPress={() => setRegionPickerVisible(true)}
            style={({ pressed }) => [pressed ? styles.pressed : null]}
          >
            <FormRow label={t("address.region")} styles={styles}>
              <Text style={[styles.regionText, !region ? styles.placeholder : null]} numberOfLines={2}>
                {formatRegionLabel(region)}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </FormRow>
          </Pressable>
          {showVietnamFields ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("address.district")}
                onPress={() => districtOptions.length && setDistrictPickerVisible(true)}
                style={({ pressed }) => [pressed ? styles.pressed : null]}
              >
                <FormRow label={t("address.district")} styles={styles}>
                  {districtOptions.length ? (
                    <>
                      <Text style={[styles.regionText, !district ? styles.placeholder : null]} numberOfLines={2}>
                        {district || t("address.districtPlaceholder")}
                      </Text>
                      <Text style={styles.chevron}>›</Text>
                    </>
                  ) : (
                    <TextInput
                      value={district}
                      onChangeText={onChangeDistrict}
                      placeholder={t("address.districtPlaceholder")}
                      placeholderTextColor={colors.textPlaceholder}
                      style={styles.input}
                    />
                  )}
                </FormRow>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("address.ward")}
                onPress={() => wardOptions.length && setWardPickerVisible(true)}
                style={({ pressed }) => [pressed ? styles.pressed : null]}
              >
                <FormRow label={t("address.ward")} styles={styles}>
                  {wardOptions.length ? (
                    <>
                      <Text style={[styles.regionText, !ward ? styles.placeholder : null]} numberOfLines={2}>
                        {ward || t("address.wardPlaceholder")}
                      </Text>
                      <Text style={styles.chevron}>›</Text>
                    </>
                  ) : (
                    <TextInput
                      value={ward}
                      onChangeText={onChangeWard}
                      placeholder={t("address.wardPlaceholder")}
                      placeholderTextColor={colors.textPlaceholder}
                      style={styles.input}
                    />
                  )}
                </FormRow>
              </Pressable>
            </>
          ) : null}
          <FormRow label={t("address.details")} multiline styles={styles}>
            <TextInput
              value={details}
              onChangeText={onChangeDetails}
              placeholder={t("address.detailsPlaceholder")}
              placeholderTextColor={colors.textPlaceholder}
              style={[styles.input, styles.textArea]}
              multiline
            />
          </FormRow>
          <FormRow label={t("address.houseNumber")} styles={styles}>
            <TextInput
              value={houseNumber}
              onChangeText={onChangeHouseNumber}
              placeholder={t("address.houseNumberPlaceholder")}
              placeholderTextColor={colors.textPlaceholder}
              style={styles.input}
            />
          </FormRow>
        </View>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t("address.isDefault")}</Text>
            <Switch value={isDefault} onValueChange={onChangeIsDefault} trackColor={{ true: colors.teal }} />
          </View>
        </View>
      </ScreenScaffold>
      <Pressable
        style={[styles.saveBtn, saving ? styles.saveBtnDisabled : null]}
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={saving ? t("address.saving") : t("address.save")}
      >
        <Text style={styles.saveBtnText}>{saving ? t("address.saving") : t("address.save")}</Text>
      </Pressable>
      <RegionPickerModal
        visible={regionPickerVisible}
        selected={region}
        optionList={showVietnamFields && provinceOptions.length ? provinceOptions : undefined}
        onClose={() => setRegionPickerVisible(false)}
        onSelect={(value) => {
          onChangeRegion(value);
          onChangeDistrict?.("");
          onChangeWard?.("");
        }}
      />
      <RegionPickerModal
        visible={districtPickerVisible}
        selected={district}
        title={t("address.district")}
        optionList={districtOptions}
        onClose={() => setDistrictPickerVisible(false)}
        onSelect={(value) => {
          onChangeDistrict?.(value);
          onChangeWard?.("");
        }}
      />
      <RegionPickerModal
        visible={wardPickerVisible}
        selected={ward}
        title={t("address.ward")}
        optionList={wardOptions}
        onClose={() => setWardPickerVisible(false)}
        onSelect={(value) => onChangeWard?.(value)}
      />
    </View>
  );
}

function FormRow({
  label,
  children,
  multiline,
  styles,
}: {
  label: string;
  children: ReactNode;
  multiline?: boolean;
  styles: ReturnType<typeof StyleSheet.create>;
}) {
  return (
    <View style={[styles.row, multiline ? styles.rowMulti : null]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>{children}</View>
    </View>
  );
}

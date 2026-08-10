import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatRegionLabel } from "../data/chinaRegions";
import { useGhnAddressCascade } from "../hooks/useGhnAddressCascade";
import { RegionPickerModal } from "./RegionPickerModal";
import { PrimaryButton } from "./ui/PrimaryButton";
import { useScreenStyles } from "../styles/screenStyles";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

import { getAppLocale } from "../utils/i18nLocale";

type Props = {
  visible: boolean;
  editing?: boolean;
  realName: string;
  phoneNumber: string;
  region: string;
  district?: string;
  ward?: string;
  details: string;
  houseNumber: string;
  saving: boolean;
  onChangeRealName: (value: string) => void;
  onChangePhoneNumber: (value: string) => void;
  onChangeRegion: (value: string) => void;
  onChangeDistrict?: (value: string) => void;
  onChangeWard?: (value: string) => void;
  onChangeDetails: (value: string) => void;
  onChangeHouseNumber: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function AddressModal(props: Props) {
  const {
    visible,
    editing = false,
    realName,
    phoneNumber,
    region,
    district = "",
    ward = "",
    details,
    houseNumber,
    saving,
    onChangeRealName,
    onChangePhoneNumber,
    onChangeRegion,
    onChangeDistrict,
    onChangeWard,
    onChangeDetails,
    onChangeHouseNumber,
    onCancel,
    onSave,
  } = props;
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildAddressModalStyles);
  const screenStyles = useScreenStyles();
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const [districtPickerVisible, setDistrictPickerVisible] = useState(false);
  const [wardPickerVisible, setWardPickerVisible] = useState(false);
  const showVietnamFields = getAppLocale() === "vi-VN";
  const { provinceOptions, districtOptions, wardOptions } = useGhnAddressCascade(
    region,
    district,
    showVietnamFields,
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} accessibilityViewIsModal>
      <KeyboardAvoidingView style={styles.mask} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{editing ? t("address.editTitle") : t("address.addTitle")}</Text>
          <Text style={styles.subtitle}>{t("address.modalSubtitle")}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{t("address.recipient")}</Text>
            <TextInput
              value={realName}
              onChangeText={onChangeRealName}
              style={screenStyles.input}
              placeholder={t("address.recipientPlaceholder")}
              placeholderTextColor={themeColors.textPlaceholder}
              accessibilityLabel={t("address.recipient")}
            />
            <Text style={styles.label}>{t("address.phone")}</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={onChangePhoneNumber}
              style={screenStyles.input}
              keyboardType="phone-pad"
              placeholder={t("address.phonePlaceholder")}
              placeholderTextColor={themeColors.textPlaceholder}
              accessibilityLabel={t("address.phone")}
            />
            <Text style={styles.label}>{t("address.region")}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("address.selectRegion")}
              onPress={() => setRegionPickerVisible(true)}
              style={styles.regionPressable}
            >
              <Text style={[styles.regionText, !region ? styles.regionPlaceholder : null]} numberOfLines={2}>
                {formatRegionLabel(region)}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            {showVietnamFields ? (
              <>
                <Text style={styles.label}>{t("address.district")}</Text>
                {districtOptions.length ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("address.district")}
                    onPress={() => setDistrictPickerVisible(true)}
                    style={styles.regionPressable}
                  >
                    <Text style={[styles.regionText, !district ? styles.regionPlaceholder : null]} numberOfLines={2}>
                      {district || t("address.districtPlaceholder")}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ) : (
                  <TextInput
                    value={district}
                    onChangeText={onChangeDistrict}
                    style={screenStyles.input}
                    placeholder={t("address.districtPlaceholder")}
                    placeholderTextColor={themeColors.textPlaceholder}
                    accessibilityLabel={t("address.district")}
                  />
                )}
                <Text style={styles.label}>{t("address.ward")}</Text>
                {wardOptions.length ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("address.ward")}
                    onPress={() => setWardPickerVisible(true)}
                    style={styles.regionPressable}
                  >
                    <Text style={[styles.regionText, !ward ? styles.regionPlaceholder : null]} numberOfLines={2}>
                      {ward || t("address.wardPlaceholder")}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ) : (
                  <TextInput
                    value={ward}
                    onChangeText={onChangeWard}
                    style={screenStyles.input}
                    placeholder={t("address.wardPlaceholder")}
                    placeholderTextColor={themeColors.textPlaceholder}
                    accessibilityLabel={t("address.ward")}
                  />
                )}
              </>
            ) : null}
            <Text style={styles.label}>{t("address.details")}</Text>
            <TextInput
              value={details}
              onChangeText={onChangeDetails}
              style={screenStyles.input}
              placeholder={t("address.detailsPlaceholder")}
              placeholderTextColor={themeColors.textPlaceholder}
              accessibilityLabel={t("address.details")}
            />
            <Text style={styles.label}>{t("address.houseNumber")}</Text>
            <TextInput
              value={houseNumber}
              onChangeText={onChangeHouseNumber}
              style={screenStyles.input}
              placeholder={t("address.houseNumberPlaceholder")}
              placeholderTextColor={themeColors.textPlaceholder}
              accessibilityLabel={t("address.houseNumber")}
            />
          </ScrollView>
          <View style={styles.actions}>
            <PrimaryButton label={t("common.cancel")} variant="ghost" onPress={onCancel} style={styles.flexBtn} disabled={saving} />
            <PrimaryButton
              label={saving ? t("address.saving") : t("address.save")}
              loading={saving}
              onPress={onSave}
              style={styles.flexBtn}
              disabled={saving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
    </Modal>
  );
}

function buildAddressModalStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      maxHeight: "88%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.borderSoft,
      marginBottom: spacing.md,
    },
    title: { fontWeight: "800", fontSize: typography.h4, color: colors.textPrimary },
    subtitle: { marginTop: spacing.xs, marginBottom: spacing.md, color: colors.textSecondary, fontSize: typography.caption },
    label: { fontSize: typography.caption, fontWeight: "700", color: colors.textSecondary, marginBottom: spacing.xs },
    regionPressable: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    regionText: { flex: 1, fontSize: typography.body, color: colors.textPrimary },
    regionPlaceholder: { color: colors.textPlaceholder },
    chevron: { color: colors.textMuted, fontSize: typography.h4, fontWeight: "300" },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
    flexBtn: { flex: 1 },
  });
}

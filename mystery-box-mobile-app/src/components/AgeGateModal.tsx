import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { confirmAgeCompliance, fetchAgeCompliance } from "../services/complianceService";
import { parseError } from "../api";
import { toast } from "../utils/toast";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";

const STORAGE_KEY = "age_gate_confirmed_v2";
const MIN_AGE = 18;

export async function isAgeGateConfirmed(): Promise<boolean> {
  const v = await AsyncStorage.getItem(STORAGE_KEY);
  return v === "1";
}

export async function confirmAgeGate(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, "1");
}

function isAdultBirthYear(yearRaw: string): boolean {
  const year = Number.parseInt(yearRaw.trim(), 10);
  if (!Number.isFinite(year) || year < 1900) return false;
  const now = new Date();
  const age = now.getFullYear() - year;
  return age >= MIN_AGE && age < 120;
}

type Props = {
  visible: boolean;
  authToken?: string | null;
  onConfirmed: () => void;
  onDecline: () => void;
};

export function AgeGateModal({ visible, authToken, onConfirmed, onDecline }: Props) {
  const { t } = useTranslation();
  const [birthYear, setBirthYear] = useState("");
  const yearOk = useMemo(() => isAdultBirthYear(birthYear), [birthYear]);
  const styles = useThemedStyles((colors) => ({
    mask: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      padding: spacing.xl,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: { fontSize: typography.h3, fontWeight: "800", color: colors.textPrimary },
    body: { fontSize: typography.body, color: colors.textSecondary },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      fontSize: typography.body,
    },
    primary: {
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: "center" as const,
      opacity: 1,
    },
    primaryDisabled: { opacity: 0.45 },
    primaryText: { color: colors.textOnBrand, fontWeight: "600" as const },
    secondary: { padding: spacing.sm, alignItems: "center" as const },
    secondaryText: { fontSize: typography.body, color: colors.textSecondary },
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("ageGate.title")}</Text>
          <Text style={styles.body}>{t("ageGate.body")}</Text>
          <Text style={styles.body}>{t("ageGate.birthYearHint")}</Text>
          <TextInput
            testID="ageGateBirthYearInput"
            accessibilityLabel={t("ageGate.birthYearPlaceholder")}
            value={birthYear}
            onChangeText={setBirthYear}
            keyboardType="number-pad"
            maxLength={4}
            placeholder={t("ageGate.birthYearPlaceholder")}
            placeholderTextColor="#888"
            style={styles.input}
          />
          <Pressable
            testID="ageGateConfirmButton"
            accessibilityRole="button"
            accessibilityLabel={t("ageGate.confirm")}
            style={[styles.primary, !yearOk ? styles.primaryDisabled : null]}
            disabled={!yearOk}
            onPress={async () => {
              if (!isAdultBirthYear(birthYear)) {
                toast.error(t("ageGate.birthYearInvalid"));
                return;
              }
              try {
                if (authToken) {
                  await confirmAgeCompliance(authToken, Number.parseInt(birthYear.trim(), 10));
                }
                await confirmAgeGate();
                onConfirmed();
              } catch (error) {
                toast.error(parseError(error));
              }
            }}
          >
            <Text style={styles.primaryText}>{t("ageGate.confirm")}</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={onDecline}
            accessibilityRole="button"
            accessibilityLabel={t("ageGate.decline")}
          >
            <Text style={styles.secondaryText}>{t("ageGate.decline")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function useAgeGate(authToken?: string | null) {
  const [checked, setChecked] = useState(false);
  const [confirmed, setConfirmed] = useState(true);

  useEffect(() => {
    const load = async () => {
      const localOk = await isAgeGateConfirmed();
      if (authToken) {
        try {
          const serverOk = await fetchAgeCompliance(authToken);
          setConfirmed(serverOk);
          setChecked(true);
          return;
        } catch {
          // Fail closed when logged-in compliance check fails.
          setConfirmed(false);
          setChecked(true);
          return;
        }
      }
      setConfirmed(localOk);
      setChecked(true);
    };
    void load();
  }, [authToken]);

  return { ready: checked, needsGate: checked && !confirmed, setConfirmed };
}

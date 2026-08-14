import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "../ui/PrimaryButton";
import { pickAndUploadImage } from "../../utils/uploadImage";
import { toast } from "../../utils/toast";
import { useAppTheme } from "../../context/ThemeContext";
import { spacing } from "../../styles/tokens";

type Props = {
  visible: boolean;
  nicknameDraft: string;
  avatarDraft: string;
  savingNickname: boolean;
  authToken?: string | null;
  screenStyles: { input: object };
  setNicknameDraft: (v: string) => void;
  setAvatarDraft: (v: string) => void;
  setEditVisible: (v: boolean) => void;
  setSavingNickname: (v: boolean) => void;
  onUpdateNickname: (nickname: string) => Promise<void>;
  onUpdateAvatar: (avatar: string) => Promise<void>;
  styles: Record<string, object>;
};

export function ProfileEditModal({
  visible,
  nicknameDraft,
  avatarDraft,
  savingNickname,
  authToken,
  screenStyles,
  setNicknameDraft,
  setAvatarDraft,
  setEditVisible,
  setSavingNickname,
  onUpdateNickname,
  onUpdateAvatar,
  styles,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
      <View style={styles.modalMask}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t("profile.editProfile")}</Text>
          <TextInput
            value={nicknameDraft}
            onChangeText={setNicknameDraft}
            placeholder={t("profile.editNickname")}
            placeholderTextColor={colors.textMuted}
            style={screenStyles.input}
            accessibilityLabel={t("profile.nicknameLabel")}
          />
          <TextInput
            value={avatarDraft}
            onChangeText={setAvatarDraft}
            placeholder={t("profile.editAvatarUrl")}
            placeholderTextColor={colors.textMuted}
            style={[screenStyles.input, { marginTop: spacing.sm }]}
            accessibilityLabel={t("profile.avatarUrlLabel")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("profile.pickAvatar")}
            style={styles.pickAvatarBtn}
            onPress={async () => {
              const url = await pickAndUploadImage(authToken ?? "");
              if (url) {
                setAvatarDraft(url);
                toast.success(t("profile.avatarUploaded"));
              }
            }}
          >
            <Text style={styles.pickAvatarText}>{t("profile.pickAvatar")}</Text>
          </Pressable>
          <View style={styles.modalActions}>
            <PrimaryButton label={t("common.cancel")} variant="ghost" onPress={() => setEditVisible(false)} style={styles.flexBtn} />
            <PrimaryButton
              label={savingNickname ? t("address.saving") : t("common.submit")}
              loading={savingNickname}
              disabled={!nicknameDraft.trim() || savingNickname}
              onPress={async () => {
                setSavingNickname(true);
                try {
                  await onUpdateNickname(nicknameDraft.trim());
                  if (avatarDraft.trim()) {
                    await onUpdateAvatar(avatarDraft.trim());
                  }
                  setEditVisible(false);
                } finally {
                  setSavingNickname(false);
                }
              }}
              style={styles.flexBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

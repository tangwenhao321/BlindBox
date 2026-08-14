import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { parseError } from "../../api";
import { fetchLeaderboardMe } from "../../services/leaderboardService";
import { maskPhone } from "../../order-utils";
import { RemoteImage } from "../ui/RemoteImage";
import { AnimatedRevealCard } from "../AnimatedRevealCard";
import type { UserProfile } from "../../types";

type Props = {
  loggedIn: boolean;
  displayName: string;
  avatarUri: string;
  collectorLine: string;
  honorLoading: boolean;
  honorLoadError: string | null;
  storyFragmentCount: number;
  userProfile: UserProfile | null;
  authToken?: string | null;
  onOpenEdit: () => void;
  onOpenLogin?: () => void;
  setHonorLoading: (v: boolean) => void;
  setHonorLoadError: (v: string | null) => void;
  setHonorTitle: (v: string | null) => void;
  styles: Record<string, object>;
};

export function ProfileHeroSection({
  loggedIn,
  displayName,
  avatarUri,
  collectorLine,
  honorLoading,
  honorLoadError,
  storyFragmentCount,
  userProfile,
  authToken,
  onOpenEdit,
  onOpenLogin,
  setHonorLoading,
  setHonorLoadError,
  setHonorTitle,
  styles,
}: Props) {
  const { t } = useTranslation();
  return (
    <AnimatedRevealCard delay={0}>
      <View style={styles.heroBlock}>
        <Pressable
          style={styles.avatar}
          onPress={() => (loggedIn ? onOpenEdit() : onOpenLogin?.())}
          accessibilityRole="button"
          accessibilityLabel={loggedIn ? displayName : t("profile.tapLogin")}
        >
          {avatarUri ? (
            <RemoteImage uri={avatarUri} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{(displayName || "U").slice(0, 1).toUpperCase()}</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.userInfo}
          onPress={() => (loggedIn ? onOpenEdit() : onOpenLogin?.())}
          accessibilityRole="button"
          accessibilityLabel={loggedIn ? displayName : t("profile.tapLogin")}
        >
          <Text style={styles.userName}>{loggedIn ? displayName : t("profile.tapLogin")}</Text>
          <Text style={styles.collectorLine}>{collectorLine}</Text>
          {honorLoading ? <Text style={styles.honorMuted}>{t("profile.honorLoading")}</Text> : null}
          {!honorLoading && honorLoadError ? (
            <Pressable
              onPress={() => {
                if (!authToken) return;
                setHonorLoadError(null);
                setHonorLoading(true);
                void fetchLeaderboardMe(authToken)
                  .then((me) => {
                    if (me?.onBoard && me.title) setHonorTitle(me.title);
                    else setHonorTitle(null);
                  })
                  .catch((error) => setHonorLoadError(parseError(error)))
                  .finally(() => setHonorLoading(false));
              }}
              accessibilityRole="button"
              accessibilityLabel={t("profile.honorRetryA11y")}
            >
              <Text style={styles.honorError}>{t("profile.honorLoadFailed")}</Text>
            </Pressable>
          ) : null}
          {loggedIn && storyFragmentCount > 0 ? (
            <Text style={styles.storyFragmentBadge}>
              {t("profile.storyFragmentsBadge", { count: storyFragmentCount })}
            </Text>
          ) : null}
          {loggedIn ? <Text style={styles.userSub}>{maskPhone(userProfile?.phone)}</Text> : null}
        </Pressable>
        {!loggedIn ? (
          <Pressable
            style={styles.loginChip}
            onPress={() => onOpenLogin?.()}
            accessibilityRole="button"
            accessibilityLabel={t("profile.login")}
            testID="profileLoginButton"
          >
            <Text style={styles.loginChipText}>{t("profile.login")}</Text>
          </Pressable>
        ) : null}
      </View>
    </AnimatedRevealCard>
  );
}

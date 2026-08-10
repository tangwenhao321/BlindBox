import { useEffect } from "react";
import * as Linking from "expo-linking";
import { parseAppPathDeepLink } from "../utils/appPathDeepLink";
import { parseInviteCodeFromUrl } from "../utils/inviteDeepLink";
import type { NotificationDeepLink } from "../utils/notificationDeepLink";

type Options = {
  onInviteCode: (code: string) => void;
  onAppLink: (link: NotificationDeepLink) => void;
};

export function useAppUrlDeepLink({ onInviteCode, onAppLink }: Options) {
  useEffect(() => {
    const handle = (url: string | null | undefined) => {
      const invite = parseInviteCodeFromUrl(url);
      if (invite) {
        onInviteCode(invite);
        return;
      }
      const link = parseAppPathDeepLink(url);
      if (link) onAppLink(link);
    };

    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener("url", (event) => handle(event.url));
    return () => subscription.remove();
  }, [onInviteCode, onAppLink]);
}

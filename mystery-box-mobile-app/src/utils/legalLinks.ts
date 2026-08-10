import { appViewToHref } from "../navigation/appViewRoutes";
import type { AppView } from "../components/mainTabs/appViews";

type LegalView = Extract<AppView, "privacy" | "termsOfService" | "minorDeclaration">;

export type LegalLinkTarget =
  | { kind: "external"; url: string }
  | { kind: "inApp"; href: string };

export function resolveLegalLink(externalUrl: string | undefined, view: LegalView): LegalLinkTarget {
  const trimmed = externalUrl?.trim();
  if (trimmed) {
    return { kind: "external", url: trimmed };
  }
  return { kind: "inApp", href: appViewToHref(view) };
}

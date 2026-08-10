import type { ReactNode } from "react";
import { AppHeader } from "./ui/AppHeader";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightActions?: ReactNode;
};

export function PageHeader(props: Props) {
  return <AppHeader variant="default" {...props} />;
}

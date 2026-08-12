import { WelfareView } from "../WelfareView";
import { SubPageScreen } from "../ui/SubPageScreen";

export type WelfareSubPageProps = {
  pageTitle: string;
  onBack: () => void;
  onOpenCoupons: () => void;
  onRequireLogin?: () => void;
};

export function WelfareSubPage({ pageTitle, onBack, onOpenCoupons, onRequireLogin }: WelfareSubPageProps) {
  return (
    <SubPageScreen title={pageTitle} onBack={onBack}>
      <WelfareView onOpenCoupons={onOpenCoupons} onRequireLogin={onRequireLogin} />
    </SubPageScreen>
  );
}

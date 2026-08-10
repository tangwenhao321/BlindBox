import { WelfareView } from "../WelfareView";
import { SubPageScreen } from "../ui/SubPageScreen";

export type WelfareSubPageProps = {
  pageTitle: string;
  onBack: () => void;
  onOpenCoupons: () => void;
};

export function WelfareSubPage({ pageTitle, onBack, onOpenCoupons }: WelfareSubPageProps) {
  return (
    <SubPageScreen title={pageTitle} onBack={onBack}>
      <WelfareView onOpenCoupons={onOpenCoupons} />
    </SubPageScreen>
  );
}

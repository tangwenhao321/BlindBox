import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { LayoutRectangle, View } from "react-native";

export type OnboardingAnchorKey = "openBox" | "payArea" | "warehouseTab" | "profileTab";

type AnchorMap = Partial<Record<OnboardingAnchorKey, LayoutRectangle>>;

type ContextValue = {
  anchors: AnchorMap;
  setAnchor: (key: OnboardingAnchorKey, rect: LayoutRectangle | null) => void;
};

const OnboardingAnchorContext = createContext<ContextValue | null>(null);

export function OnboardingAnchorProvider({ children }: { children: ReactNode }) {
  const [anchors, setAnchors] = useState<AnchorMap>({});

  const setAnchor = useCallback((key: OnboardingAnchorKey, rect: LayoutRectangle | null) => {
    setAnchors((prev) => {
      if (!rect) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: rect };
    });
  }, []);

  const value = useMemo(() => ({ anchors, setAnchor }), [anchors, setAnchor]);

  return <OnboardingAnchorContext.Provider value={value}>{children}</OnboardingAnchorContext.Provider>;
}

export function useOnboardingAnchors() {
  const ctx = useContext(OnboardingAnchorContext);
  if (!ctx) {
    return { anchors: {}, setAnchor: () => undefined };
  }
  return ctx;
}

export function measureAnchor(
  ref: RefObject<View | null>,
  key: OnboardingAnchorKey,
  setAnchor: ContextValue["setAnchor"],
) {
  ref.current?.measureInWindow((x, y, width, height) => {
    if (width > 0 && height > 0) {
      setAnchor(key, { x, y, width, height });
    }
  });
}

import { useCallback, useEffect, useState } from "react";
import { parseError } from "../api";
import { fetchActiveActivities, type MysteryBoxActivity } from "../services/activityService";
import { queryBoxCategories } from "../services/categoryService";
import { queryDrawPackConfigs, type DrawPackConfig } from "../services/drawPackService";
import { dedupeMysteryBoxCategories } from "../utils/boxDisplay";
import { useAuthToken } from "./useAuthToken";
import { useDrawFeedSse } from "./useDrawFeedSse";
import { useDrawFeedQuery } from "../query/hooks/useDrawFeedQuery";
import { useHomeSummaryQuery } from "../query/hooks/useHomeSummaryQuery";
import { useRecommendBoxesQuery } from "../query/hooks/useRecommendBoxesQuery";
import type { MysteryBoxCategory } from "../types";

type Mode = "home" | "mall";

export type HomeCatalogSideData = ReturnType<typeof useHomeCatalogSideData>;

export function useHomeCatalogSideData(mode: Mode) {
  const token = useAuthToken();
  const [homeCategories, setHomeCategories] = useState<MysteryBoxCategory[]>([]);
  const [drawPackConfigs, setDrawPackConfigs] = useState<DrawPackConfig[]>([]);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const [apiCategories, setApiCategories] = useState<MysteryBoxCategory[]>([]);
  const [activities, setActivities] = useState<MysteryBoxActivity[]>([]);
  const [secondaryReady, setSecondaryReady] = useState(mode !== "home");

  const homeEnabled = mode === "home" && secondaryReady;
  const homeSummaryQuery = useHomeSummaryQuery(token, homeEnabled);
  const recommendQuery = useRecommendBoxesQuery(token, homeEnabled);
  const drawFeedQuery = useDrawFeedQuery(token, mode === "home");

  useDrawFeedSse(null, mode === "home", (items) => {
    if (items.length) {
      drawFeedQuery.refetch();
    }
  });

  useEffect(() => {
    if (mode !== "home") {
      setSecondaryReady(true);
      return;
    }
    const timer = setTimeout(() => setSecondaryReady(true), 16);
    return () => clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (mode !== "home" || !secondaryReady) return;
    void fetchActiveActivities().then((list) => {
      const active = list.filter((a) => new Date(a.endTime).getTime() > Date.now());
      setActivities(active);
    });
    if (token) {
      void queryDrawPackConfigs(token).then(setDrawPackConfigs);
    }
  }, [mode, secondaryReady, token]);

  useEffect(() => {
    if (!token) return;
    setCategoryLoadError(null);
    if (mode === "mall") {
      void queryBoxCategories(token)
        .then((list) => setApiCategories(dedupeMysteryBoxCategories(list)))
        .catch((error) => {
          setApiCategories([]);
          setCategoryLoadError(parseError(error));
        });
      return;
    }
    void queryBoxCategories(token)
      .then(setHomeCategories)
      .catch((error) => {
        setHomeCategories([]);
        setCategoryLoadError(parseError(error));
      });
  }, [mode, token]);

  const retryCategories = useCallback(() => {
    if (!token) return;
    setCategoryLoadError(null);
    void queryBoxCategories(token)
      .then((list) => {
        if (mode === "mall") setApiCategories(dedupeMysteryBoxCategories(list));
        else setHomeCategories(list);
      })
      .catch((error) => setCategoryLoadError(parseError(error)));
  }, [mode, token]);

  return {
    homeCategories,
    drawPackConfigs,
    categoryLoadError,
    apiCategories,
    drawFeed: drawFeedQuery.data ?? [],
    activities,
    homeSummary: homeSummaryQuery.data ?? null,
    recommendBoxes: recommendQuery.data ?? [],
    retryCategories,
  };
}

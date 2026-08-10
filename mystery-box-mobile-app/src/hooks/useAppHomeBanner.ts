import { useCallback, useState } from "react";

import { querySlideshows } from "../services/slideshowService";

import i18n from "../i18n";



export function useAppHomeBanner(token: string) {

  const [homeBanner, setHomeBanner] = useState<{ uri?: string; title?: string; subtitle?: string }>({});



  const loadHomeBanner = useCallback(

    async (usingToken = token) => {

      try {

        const slides = await querySlideshows(usingToken, 3);

        const first = slides[0];

        if (!first) return;

        setHomeBanner({

          uri: first.picture,

          title: first.content?.trim() || undefined,

          subtitle:

            slides.length > 1 ? i18n.t("homeBanner.opsRecommend", { count: slides.length }) : undefined,

        });

      } catch {

        setHomeBanner({});

      }

    },

    [token],

  );



  const clearHomeBanner = useCallback(() => setHomeBanner({}), []);



  return { homeBanner, loadHomeBanner, clearHomeBanner };

}


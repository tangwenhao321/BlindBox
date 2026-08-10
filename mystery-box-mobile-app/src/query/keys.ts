export const queryKeys = {

  boxes: {

    home: (token: string) => ["boxes", "home", token] as const,

    mall: (token: string, categoryId?: string, keyword?: string) =>

      ["boxes", "mall", token, categoryId ?? "", keyword ?? ""] as const,

  },

  home: {

    summary: (token = "") => ["home", "summary", token] as const,

    recommend: (token: string) => ["home", "recommend", token] as const,

    drawFeed: (token?: string) => ["home", "drawFeed", token ?? ""] as const,

  },

  search: {

    hotKeywords: () => ["search", "hotKeywords"] as const,

    catalog: (token: string, keyword: string) => ["search", "catalog", token, keyword] as const,

  },

  wallet: {

    profile: (token: string) => ["wallet", "profile", token] as const,

  },

  warehouse: {

    list: (token: string, pendingOnly: boolean, limit: number, offset: number) =>
      ["warehouse", "list", token, pendingOnly, limit, offset] as const,
    count: (token: string, pendingOnly: boolean) => ["warehouse", "count", token, pendingOnly] as const,
  },

  orders: {

    list: (token: string) => ["orders", "list", token] as const,

  },

  addresses: {

    list: (token: string) => ["addresses", "list", token] as const,

  },

  favorites: {

    ids: (token: string) => ["favorites", "ids", token] as const,

  },

  coupons: {

    list: (token: string) => ["coupons", "list", token] as const,

  },

  notifications: {

    list: (token: string, limit = 30) => ["notifications", "list", token, limit] as const,

  },

  community: {

    posts: (token: string) => ["community", "posts", token] as const,

  },

  marketplace: {

    listings: (
      keyword: string,
      sort: string,
      minPrice: string,
      maxPrice: string,
    ) => ["marketplace", "listings", keyword, sort, minPrice, maxPrice] as const,

    mine: (token: string) => ["marketplace", "mine", token] as const,

    purchased: (token: string) => ["marketplace", "purchased", token] as const,

  },

  boxDetails: {

    drawPackConfigs: (token: string) => ["boxDetails", "drawPackConfigs", token] as const,

    auxiliary: (token: string, boxId: string) => ["boxDetails", "auxiliary", token, boxId] as const,

    purchaseLimit: (token: string, boxId: string) => ["boxDetails", "purchaseLimit", token, boxId] as const,

  },

};


export const Platform = {
  OS: "ios" as const,
  select<T>(specifics: { ios?: T; android?: T; default?: T }): T | undefined {
    return specifics.ios ?? specifics.android ?? specifics.default;
  },
};

export default { Platform };

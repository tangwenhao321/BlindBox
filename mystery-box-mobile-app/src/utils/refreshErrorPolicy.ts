export type RefreshIssueBuckets = {
  /** Blocks the home shell — show the global error banner. */
  blocking: string[];
  /** Non-critical sync issues — toast only, no global banner. */
  advisory: string[];
};

/** Split refresh failures: only catalog/core load failure is blocking. */
export function classifyRefreshIssues(issues: string[], catalogRejected: boolean): RefreshIssueBuckets {
  if (!issues.length) {
    return { blocking: [], advisory: [] };
  }
  if (catalogRejected) {
    return {
      blocking: [issues[0]],
      advisory: issues.slice(1),
    };
  }
  return {
    blocking: [],
    advisory: issues,
  };
}

import i18n from "../i18n";

export const COMMUNITY_TOPIC_TAGS = ["晒单", "传说", "隐藏", "整盒", "回血"] as const;

export type CommunityTopicTag = (typeof COMMUNITY_TOPIC_TAGS)[number];

export function communityTopicDisplayLabel(tag: CommunityTopicTag): string {
  const key = `communityTopics.tags.${tag}`;
  return i18n.exists(key) ? i18n.t(key) : tag;
}

export function formatCommunitySharePost(params: {
  topic?: CommunityTopicTag;
  boxName: string;
  productName: string;
  orderId: string;
  productId: string;
  qualityType?: string;
}) {
  const tag = params.topic ?? "晒单";
  const tier = params.qualityType ? `【${params.qualityType}】` : "";
  return i18n.t("communityTopics.shareDraft", {
    tag: communityTopicDisplayLabel(tag),
    boxName: params.boxName,
    tier,
    productName: params.productName,
    orderId: params.orderId,
    productId: params.productId,
  });
}

export function extractTopicTag(content: string): CommunityTopicTag | null {
  const match = content.match(/#(晒单|传说|隐藏|整盒|回血)/);
  return match ? (match[1] as CommunityTopicTag) : null;
}

export function matchesTopicFilter(content: string, topic: CommunityTopicTag | null) {
  if (!topic) return true;
  return content.includes(`#${topic}`);
}

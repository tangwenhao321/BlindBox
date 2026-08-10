import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { SubPageHeader } from "./ui/SubPageHeader";
import { PrimaryButton } from "./ui/PrimaryButton";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { ListFooterLoading } from "./ui/ListFooterLoading";
import { RemoteImage } from "./ui/RemoteImage";
import {
  commentCommunityPost,
  createCommunityPost,
  likeCommunityPost,
  type CommunityPost,
  type CommunityPostPage,
} from "../services/communityService";
import { uploadImageFile } from "../services/ossService";
import { parseError } from "../api";
import { toast } from "../utils/toast";
import { queueIfOffline } from "../utils/offlineSubmitGuard";
import { trackEvent } from "../utils/analytics";
import { shareViaZalo } from "../utils/shareZalo";
import { buildInviteUrl } from "../utils/inviteUrl";
import { appendImageUrlsToContent, splitCommunityContent } from "../utils/communityContent";
import {
  COMMUNITY_TOPIC_TAGS,
  communityTopicDisplayLabel,
  extractTopicTag,
  matchesTopicFilter,
  type CommunityTopicTag,
} from "../utils/communityTopics";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAuthToken } from "../hooks/useAuthToken";
import { useReferralStats } from "../hooks/useReferralStats";
import { useCommunityPostsQuery } from "../query/hooks/useCommunityPostsQuery";
import { queryKeys } from "../query/keys";
import { spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  userId?: string;
  onBack: () => void;
  onRequireLogin?: () => void;
  onGoHome?: () => void;
  initialDraft?: string;
};

export function CommunityView({ userId, onBack, onRequireLogin, onGoHome, initialDraft }: Props) {
  const token = useAuthToken();
  const { stats: referralStats } = useReferralStats(token);
  const inviteUrl = referralStats?.inviteCode ? buildInviteUrl(referralStats.inviteCode) : undefined;
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildCommunityStyles);
  const queryClient = useQueryClient();
  const postsQuery = useCommunityPostsQuery(token);
  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [postsQuery.data],
  );
  const [draft, setDraft] = useState(initialDraft ?? "");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopicTag | null>(null);
  const [composeTopic, setComposeTopic] = useState<CommunityTopicTag>(COMMUNITY_TOPIC_TAGS[0]);
  const [loading, setLoading] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const loadError = postsQuery.error ? parseError(postsQuery.error) : null;
  const initialLoading = postsQuery.isLoading;
  const refreshing = postsQuery.isFetching && !postsQuery.isLoading;
  const hasMore = postsQuery.hasNextPage ?? false;

  useEffect(() => {
    if (initialDraft) setDraft(initialDraft);
  }, [initialDraft]);

  const refresh = useCallback(async () => {
    await postsQuery.refetch();
  }, [postsQuery]);

  const loadMore = useCallback(async () => {
    if (!hasMore || refreshing || loadError) return;
    await postsQuery.fetchNextPage();
  }, [hasMore, refreshing, loadError, postsQuery]);

  const updatePostInCache = useCallback(
    (updated: CommunityPost) => {
      queryClient.setQueryData<InfiniteData<CommunityPostPage>>(queryKeys.community.posts(token), (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((p) => (p.id === updated.id ? updated : p)),
          })),
        };
      });
    },
    [queryClient, token],
  );

  const filteredPosts = selectedTopic
    ? posts.filter((p) => matchesTopicFilter(p.content, selectedTopic))
    : posts;

  const pickImage = async () => {
    if (!token && onRequireLogin) {
      onRequireLogin();
      return;
    }
    const MAX_POST_IMAGES = 4;
    if (pendingImages.length >= MAX_POST_IMAGES) {
      toast.info(t("community.maxPhotos", { max: MAX_POST_IMAGES }));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const remaining = MAX_POST_IMAGES - pendingImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
    });
    if (result.canceled || !result.assets.length) return;
    setUploadingImage(true);
    try {
      const urls: string[] = [];
      for (const asset of result.assets) {
        if (!asset?.uri) continue;
        const name = asset.fileName || `image-${Date.now()}.jpg`;
        const url = await uploadImageFile(token, asset.uri, name);
        urls.push(url);
      }
      if (urls.length) setPendingImages((prev) => [...prev, ...urls].slice(0, MAX_POST_IMAGES));
    } catch (e) {
      toast.error(parseError(e));
    } finally {
      setUploadingImage(false);
    }
  };

  const submitPost = async () => {
    if (!token && onRequireLogin) {
      onRequireLogin();
      return;
    }
    const body = draft.trim();
    if (!body && pendingImages.length === 0) return;
    const textContent = body.startsWith("#") ? body : body ? `#${composeTopic} ${body}` : `#${composeTopic}`;
    const content = appendImageUrlsToContent(textContent, pendingImages);
    const perform = async () => {
      setLoading(true);
      try {
        await createCommunityPost(token, content);
        trackEvent("community_post_create", { topic: composeTopic, imageCount: pendingImages.length });
        setDraft("");
        setPendingImages([]);
        await refresh();
        toast.success(t("community.postSuccess"));
      } catch (e) {
        toast.error(parseError(e));
      } finally {
        setLoading(false);
      }
    };
    if (queueIfOffline("offline.actionPost", perform, { kind: "communityPost", token, payload: { content } })) return;
    await perform();
  };

  const submitComment = async (postId: string) => {
    if (!token && onRequireLogin) {
      onRequireLogin();
      return;
    }
    if (!commentDraft.trim()) return;
    const body = commentDraft.trim();
    const perform = async () => {
      setCommentLoading(true);
      try {
        const updated = await commentCommunityPost(token, postId, body);
        updatePostInCache(updated);
        trackEvent("community_comment_create", { postId });
        setCommentDraft("");
        setCommentPostId(null);
        toast.success(t("community.commentSuccess"));
      } catch (e) {
        toast.error(parseError(e));
      } finally {
        setCommentLoading(false);
      }
    };
    if (
      queueIfOffline("offline.actionComment", perform, {
        kind: "communityComment",
        token,
        payload: { postId, content: body },
      })
    )
      return;
    await perform();
  };

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("community.title")} onBack={onBack} />
      <View style={styles.compose}>
        <View style={styles.topicRow}>
          {COMMUNITY_TOPIC_TAGS.map((tag) => (
            <Pressable
              key={tag}
              style={[styles.topicChip, composeTopic === tag ? styles.topicChipOn : null]}
              onPress={() => setComposeTopic(tag)}
              accessibilityRole="button"
              accessibilityLabel={t("community.topicLabel", { tag: communityTopicDisplayLabel(tag) })}
            >
              <Text style={[styles.topicChipText, composeTopic === tag ? styles.topicChipTextOn : null]}>
                #{communityTopicDisplayLabel(tag)}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder={t("community.composePlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          accessibilityLabel={t("community.composePlaceholder")}
        />
        <View style={styles.composeActions}>
          <Pressable
            style={styles.addPhotoBtn}
            onPress={() => void pickImage()}
            disabled={uploadingImage}
            accessibilityRole="button"
            accessibilityLabel={t("community.addPhoto")}
          >
            <Text style={styles.addPhotoText}>
              {uploadingImage ? t("community.photoUploading") : t("community.addPhoto")}
            </Text>
          </Pressable>
          {pendingImages.length > 0 ? (
            <View style={styles.pendingRow}>
              {pendingImages.map((uri) => (
                <View key={uri} style={styles.pendingThumbWrap}>
                  <RemoteImage uri={uri} style={styles.pendingThumb} contentFit="cover" />
                  <Pressable
                    style={styles.removeThumbBtn}
                    onPress={() => setPendingImages((prev) => prev.filter((u) => u !== uri))}
                    accessibilityRole="button"
                    accessibilityLabel={t("community.removePhoto")}
                  >
                    <Text style={styles.removeThumbText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <PrimaryButton label={t("community.submitPost")} loading={loading} onPress={submitPost} />
      </View>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, selectedTopic == null ? styles.filterChipOn : null]}
          onPress={() => setSelectedTopic(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTopic == null }}
          accessibilityLabel={t("community.filterAll")}
        >
          <Text style={[styles.filterText, selectedTopic == null ? styles.filterTextOn : null]}>
            {t("community.filterAll")}
          </Text>
        </Pressable>
        {COMMUNITY_TOPIC_TAGS.map((tag) => (
          <Pressable
            key={tag}
            style={[styles.filterChip, selectedTopic === tag ? styles.filterChipOn : null]}
            onPress={() => setSelectedTopic((prev) => (prev === tag ? null : tag))}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedTopic === tag }}
            accessibilityLabel={t("community.filterTopic", { tag: communityTopicDisplayLabel(tag) })}
          >
            <Text style={[styles.filterText, selectedTopic === tag ? styles.filterTextOn : null]}>
              #{communityTopicDisplayLabel(tag)}
            </Text>
          </Pressable>
        ))}
      </View>
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void refresh()} /> : null}
      {shouldShowListSkeleton(initialLoading, posts.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={6} />
      ) : (
      <OptimizedFlatList
        listVariant="row"
        data={filteredPosts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          hasMore && posts.length > 0 ? (
            <ListFooterLoading />
          ) : null
        }
        ListEmptyComponent={listEmptyWhenOk(
          loadError,
          <EmptyState
            title={selectedTopic ? t("community.emptyTopicTitle") : t("community.emptyTitle")}
            description={t("community.emptyDesc")}
            variant="plain"
            actionLabel={onGoHome ? t("community.goHome") : undefined}
            onAction={onGoHome}
          />,
        )}
        renderItem={({ item }) => {
          const liked = userId ? item.likes.includes(userId) : false;
          const commenting = commentPostId === item.id;
          const topic = extractTopicTag(item.content);
          const { text, images } = splitCommunityContent(item.content);
          return (
            <View style={styles.post}>
              <View style={styles.postHead}>
                <Text style={styles.author}>{item.authorDisplayName}</Text>
                {topic ? <Text style={styles.topicBadge}>#{communityTopicDisplayLabel(topic)}</Text> : null}
              </View>
              {text ? <Text style={styles.content}>{text}</Text> : null}
              {images.length > 0 ? (
                <View style={styles.imageRow}>
                  {images.map((uri) => (
                    <RemoteImage key={uri} uri={uri} style={styles.postImage} contentFit="cover" />
                  ))}
                </View>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={liked ? t("community.unlike") : t("community.like")}
                  onPress={async () => {
                    if (!token && onRequireLogin) {
                      onRequireLogin();
                      return;
                    }
                    const perform = async () => {
                      try {
                        const updated = await likeCommunityPost(token, item.id);
                        updatePostInCache(updated);
                        trackEvent("community_like", { postId: item.id, liked: !liked });
                      } catch (e) {
                        toast.error(parseError(e));
                      }
                    };
                    if (
                      queueIfOffline("offline.actionLike", perform, {
                        kind: "communityLike",
                        token,
                        payload: { postId: item.id },
                      })
                    )
                      return;
                    await perform();
                  }}
                >
                  <Text style={[styles.action, liked ? styles.actionLiked : null]}>
                    {liked ? "❤️" : "🤍"} {item.likes.length}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("community.comment")}
                  onPress={() => {
                    setCommentPostId(commenting ? null : item.id);
                    setCommentDraft("");
                  }}
                >
                  <Text style={styles.action}>💬 {item.comments.length}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("community.shareZalo")}
                  onPress={async () => {
                    const { text } = splitCommunityContent(item.content);
                    await shareViaZalo(text || item.content, undefined, inviteUrl);
                  }}
                >
                  <Text style={styles.action}>📤 Zalo</Text>
                </Pressable>
              </View>
              {commenting ? (
                <View style={styles.commentCompose}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder={t("community.commentPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    value={commentDraft}
                    onChangeText={setCommentDraft}
                    accessibilityLabel={t("community.commentPlaceholder")}
                  />
                  <PrimaryButton
                    label={t("community.submitComment")}
                    loading={commentLoading}
                    onPress={() => void submitComment(item.id)}
                  />
                </View>
              ) : null}
              {item.comments.slice(0, 5).map((c) => (
                <Text key={c.id} style={styles.comment}>
                  · {c.content}
                </Text>
              ))}
            </View>
          );
        }}
      />
      )}
    </View>
  );
}

function buildCommunityStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPage },
  compose: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  topicRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  topicChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  topicChipOn: { borderColor: colors.brand, backgroundColor: colors.bgBrandSoft },
  topicChipText: { fontSize: typography.micro, color: colors.textSecondary, fontWeight: "700" },
  topicChipTextOn: { color: colors.brand },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
  composeActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  pendingRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  pendingThumbWrap: { position: "relative" },
  pendingThumb: { width: 56, height: 56, borderRadius: 8 },
  removeThumbBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  removeThumbText: { color: colors.textOnBrand, fontSize: 14, fontWeight: "800", lineHeight: 16 },
  addPhotoBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
  },
  addPhotoText: { fontSize: typography.caption, color: colors.brand, fontWeight: "700" },
  photoAddedHint: { fontSize: typography.micro, color: colors.textSecondary },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.bgSoft,
  },
  filterChipOn: { backgroundColor: colors.brand },
  filterText: { fontSize: typography.micro, color: colors.textSecondary, fontWeight: "700" },
  filterTextOn: { color: colors.textOnBrand },
  list: { padding: spacing.lg, gap: spacing.md, paddingTop: 0 },
  post: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  postHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  author: { fontSize: typography.caption, color: colors.textSecondary },
  topicBadge: {
    fontSize: typography.micro,
    color: colors.brand,
    fontWeight: "800",
    backgroundColor: colors.bgBrandSoft,
    paddingHorizontal: spacing.xs,
    borderRadius: 4,
  },
  content: { fontSize: typography.body, color: colors.textPrimary, marginVertical: spacing.xs },
  imageRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginVertical: spacing.xs },
  postImage: { width: 96, height: 96, borderRadius: 8 },
  actions: { flexDirection: "row", gap: spacing.lg },
  action: { fontSize: typography.caption, color: colors.brand, fontWeight: "700" },
  actionLiked: { color: colors.danger },
  commentCompose: { marginTop: spacing.sm, gap: spacing.xs },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.bgPage,
    color: colors.textPrimary,
  },
  comment: { fontSize: typography.caption, color: colors.textSecondary, marginTop: 4 },
  });
}

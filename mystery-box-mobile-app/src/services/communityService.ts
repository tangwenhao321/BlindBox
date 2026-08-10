import { api, buildAuthHeaders } from "../api";

export type CommunityComment = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  authorDisplayName: string;
  content: string;
  createdAt: string;
  status: string;
  comments: CommunityComment[];
  likes: string[];
};

export type CommunityPostPage = {
  items: CommunityPost[];
  hasMore: boolean;
};

export async function fetchCommunityPosts(
  token: string | undefined,
  pageNum = 1,
  pageSize = 20,
): Promise<CommunityPostPage> {
  const response = await api.get<CommunityPostPage>("/front/community/posts", {
    params: { pageNum, pageSize },
    headers: token ? buildAuthHeaders(token) : undefined,
  });
  const data = response.data;
  if (data.items) return data;
  const list = Array.isArray(data) ? (data as CommunityPost[]) : [];
  return { items: list, hasMore: false };
}

export async function createCommunityPost(token: string, content: string): Promise<CommunityPost> {
  const response = await api.post<CommunityPost>(
    "/front/community/posts",
    { content },
    { headers: buildAuthHeaders(token) },
  );
  return response.data;
}

export async function likeCommunityPost(token: string, postId: string): Promise<CommunityPost> {
  const response = await api.post<CommunityPost>(
    `/front/community/posts/${postId}/like`,
    {},
    { headers: buildAuthHeaders(token) },
  );
  return response.data;
}

export async function commentCommunityPost(
  token: string,
  postId: string,
  content: string,
): Promise<CommunityPost> {
  const response = await api.post<CommunityPost>(
    `/front/community/posts/${postId}/comment`,
    { content },
    { headers: buildAuthHeaders(token) },
  );
  return response.data;
}

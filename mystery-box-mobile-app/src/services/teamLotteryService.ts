import { api, buildAuthHeaders } from "../api";
import { getCurrentUserInfo } from "./authService";
import { getOrCreateDeviceId } from "../utils/deviceId";

/** Matches backend TeamView. */
export type TeamLotteryMember = {
  userId: string;
  deviceId?: string | null;
  status: string;
  joinedTime: string;
};

export type TeamLottery = {
  id: string;
  hostUserId: string;
  boxId: string;
  status: string;
  drawQuota: number;
  drawsUsed?: number;
  remainingDraws: number;
  inviteCode: string;
  expireTime: string;
  createdTime: string;
  members?: TeamLotteryMember[];
  memberCount: number;
};

export type TeamLotteryChat = {
  id: string;
  userId: string;
  msgType: string;
  body: string;
  createdTime: string;
};

export type TeamLotteryDrawRequest = {
  orderId: string;
  hitHidden?: boolean;
  resultJson?: string;
};

export type TeamLotteryDrawResult = {
  drawId: string;
  remainingQuota: number;
  grantedBoost: boolean;
};

function unwrap<T>(data: T | { result?: T }): T {
  if (data && typeof data === "object" && "result" in data && (data as { result?: T }).result !== undefined) {
    return (data as { result: T }).result;
  }
  return data as T;
}

/** Simple stable hash for phone anti-cheat (omit when phone unavailable). */
export function hashPhone(phone: string): string {
  const normalized = phone.trim();
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ph_${(h >>> 0).toString(16)}`;
}

async function resolveAntiCheatWithToken(
  authToken: string,
  options?: { phone?: string; deviceId?: string; phoneHash?: string },
): Promise<{ deviceId: string; phoneHash?: string }> {
  const deviceId =
    options?.deviceId && options.deviceId.trim()
      ? options.deviceId.trim()
      : await getOrCreateDeviceId();
  let phoneHash = options?.phoneHash?.trim() || undefined;
  if (!phoneHash) {
    let resolvedPhone = options?.phone?.trim();
    if (!resolvedPhone) {
      try {
        const profile = await getCurrentUserInfo(authToken);
        resolvedPhone = profile?.phone?.trim() || undefined;
      } catch {
        /* omit phoneHash when profile unavailable */
      }
    }
    if (resolvedPhone) {
      phoneHash = hashPhone(resolvedPhone);
    }
  }
  return phoneHash ? { deviceId, phoneHash } : { deviceId };
}

export async function createTeamLottery(
  authToken: string,
  payload: { boxId: string; deviceId?: string; phone?: string; phoneHash?: string },
): Promise<TeamLottery> {
  const antiCheat = await resolveAntiCheatWithToken(authToken, payload);
  const response = await api.post<TeamLottery | { result?: TeamLottery }>(
    "/front/team-lottery",
    {
      boxId: payload.boxId,
      deviceId: antiCheat.deviceId || undefined,
      phoneHash: antiCheat.phoneHash || undefined,
    },
    { headers: buildAuthHeaders(authToken) },
  );
  return unwrap(response.data);
}

export async function joinTeamLottery(
  authToken: string,
  payload: { inviteCode: string; deviceId?: string; phone?: string; phoneHash?: string },
): Promise<TeamLottery> {
  const antiCheat = await resolveAntiCheatWithToken(authToken, payload);
  const response = await api.post<TeamLottery | { result?: TeamLottery }>(
    "/front/team-lottery/join",
    {
      inviteCode: payload.inviteCode,
      deviceId: antiCheat.deviceId || undefined,
      phoneHash: antiCheat.phoneHash || undefined,
    },
    { headers: buildAuthHeaders(authToken) },
  );
  return unwrap(response.data);
}

export async function fetchMyTeamLotteries(authToken: string): Promise<TeamLottery[]> {
  const response = await api.get<TeamLottery[] | { result?: TeamLottery[] }>(
    "/front/team-lottery/mine",
    { headers: buildAuthHeaders(authToken) },
  );
  const data = unwrap(response.data);
  return Array.isArray(data) ? data : [];
}

export async function fetchTeamLottery(authToken: string, teamId: string): Promise<TeamLottery> {
  const response = await api.get<TeamLottery | { result?: TeamLottery }>(
    `/front/team-lottery/${teamId}`,
    { headers: buildAuthHeaders(authToken) },
  );
  return unwrap(response.data);
}

export async function lockTeamLottery(authToken: string, teamId: string): Promise<TeamLottery> {
  const response = await api.post<TeamLottery | { result?: TeamLottery }>(
    `/front/team-lottery/${teamId}/lock`,
    {},
    { headers: buildAuthHeaders(authToken) },
  );
  return unwrap(response.data);
}

export async function drawTeamLottery(
  authToken: string,
  teamId: string,
  body: TeamLotteryDrawRequest,
): Promise<TeamLotteryDrawResult> {
  const response = await api.post<TeamLotteryDrawResult | { result?: TeamLotteryDrawResult }>(
    `/front/team-lottery/${teamId}/draw`,
    {
      orderId: body.orderId,
      // hitHidden is optional/ignored by server; omit so boost comes from order prizes.
      resultJson: body.resultJson ?? null,
    },
    { headers: buildAuthHeaders(authToken) },
  );
  return unwrap(response.data);
}

export async function fetchTeamLotteryChat(authToken: string, teamId: string, limit = 50): Promise<TeamLotteryChat[]> {
  const response = await api.get<TeamLotteryChat[] | { result?: TeamLotteryChat[] }>(
    `/front/team-lottery/${teamId}/chat`,
    { params: { limit }, headers: buildAuthHeaders(authToken) },
  );
  const data = unwrap(response.data);
  return Array.isArray(data) ? data : [];
}

export async function postTeamLotteryChat(
  authToken: string,
  teamId: string,
  body: string,
  msgType = "TEXT",
): Promise<void> {
  await api.post(
    `/front/team-lottery/${teamId}/chat`,
    { body, msgType },
    { headers: buildAuthHeaders(authToken) },
  );
}

export async function fetchTeamLotteryMembers(authToken: string, teamId: string): Promise<TeamLotteryMember[]> {
  const response = await api.get<TeamLotteryMember[] | { result?: TeamLotteryMember[] }>(
    `/front/team-lottery/${teamId}/members`,
    { headers: buildAuthHeaders(authToken) },
  );
  const data = unwrap(response.data);
  return Array.isArray(data) ? data : [];
}

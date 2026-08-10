import { describe, expect, it } from "vitest";
import { countDedupedServerUnread, mergeUnreadBadge } from "./notificationUnread";
import type { UserNotification } from "../services/notificationService";

const note = (partial: Partial<UserNotification> & Pick<UserNotification, "id">): UserNotification => ({
  id: partial.id,
  category: partial.category ?? "SYSTEM",
  title: partial.title ?? "t",
  body: partial.body ?? "b",
  refId: partial.refId ?? null,
  read: partial.read ?? false,
  createdTime: partial.createdTime ?? "2026-01-01",
});

describe("notificationUnread", () => {
  it("dedupes payment reminder when order already in local unread", () => {
    const orderIds = new Set(["o1"]);
    const list = [
      note({ id: "n1", category: "PAYMENT_REMINDER", refId: "o1", read: false }),
      note({ id: "n2", category: "SYSTEM", read: false }),
    ];
    expect(countDedupedServerUnread(list, orderIds)).toBe(1);
    expect(mergeUnreadBadge(1, list, orderIds)).toBe(2);
  });
});

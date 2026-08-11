# Invite attribution (deep link → register)

Short flow for growth / referral attribution.

## Flow

1. **Share** — Mobile `shareInviteLink` builds a primary URL (`EXPO_PUBLIC_INVITE_BASE_URL/invite/{code}` when set) and **always** appends the app scheme link `mysterybox://invite?invite={code}` so cold opens still carry the code.
2. **Open** — `parseInviteCodeFromUrl` (`src/utils/inviteDeepLink.ts`) reads `invite` / `code` / `inviteCode` query params or path `invite/{code}`.
3. **Persist** — `useAppUrlDeepLink` → `applyInviteFromUrl` → `setInviteCode` on auth session (`useAppAuthSession`). The code is kept in React state **and** AsyncStorage (`inviteCodeStorage`) so killing the app before register does not drop attribution. On cold start, pending code is restored into the register form.
4. **Register** — `registerByPhone(..., inviteCode)` sends the code; backend `UserService` → `ReferralService.bindInviterOnRegister` looks up the inviter by uppercase code and sets `inviterId` (also generates the invitee’s own invite code). Successful register clears the pending store.
5. **Later bind** — Logged-in users can still call `POST front/referral/...` bind invite (`referralService.bindInviteCode`) if they missed register-time binding.

## Notes

- Pending invite survives process death via AsyncStorage until successful register (or explicit clear).
- `bindInviterOnRegister` is the source of truth for first-time attribution; share must keep the scheme link so deep-link entry works without an HTTPS H5 host.

/**
 * Backend string tokens / Chinese messages → i18n keys.
 * Token patterns (SCREAMING_SNAKE) are applied for every locale;
 * Chinese prose patterns are only used when locale is not zh-CN.
 */
export const API_ERROR_TOKEN_PATTERNS: ReadonlyArray<{ pattern: RegExp; key: string }> = [
  { pattern: /PITY_COMPENSATE_DENIED/, key: "api.errors.pityCompensateDenied" },
  { pattern: /PITY_STOCK_EXHAUSTED/, key: "api.errors.pityStockExhausted" },
  { pattern: /GENERAL_POOL_SOLD_OUT/, key: "api.errors.generalPoolSoldOut" },
  { pattern: /EV_GATE/, key: "api.errors.evGateRejected" },
  { pattern: /REFUND_IN_PROGRESS/, key: "api.errors.refundInProgress" },
  { pattern: /REFUND_DENIED/, key: "api.errors.refundDenied" },
  { pattern: /PAYMENT_AMOUNT_MISMATCH/, key: "api.errors.paymentAmountMismatch" },
  { pattern: /ORDER_OWNERSHIP_DENIED/, key: "api.errors.orderOwnershipDenied" },
  { pattern: /STOCK_CONFLICT/, key: "api.errors.stockConflict" },
  { pattern: /TEAM_LOTTERY_UNPAID/, key: "api.errors.teamLotteryUnpaid" },
  { pattern: /TEAM_LOTTERY_/, key: "api.errors.teamLotteryError" },
  { pattern: /MARKETPLACE_GATEWAY_NOT_READY/, key: "api.errors.marketplaceGatewayNotReady" },
  { pattern: /MARKETPLACE_LISTING_UNAVAILABLE/, key: "api.errors.marketplaceListingUnavailable" },
  { pattern: /MARKETPLACE_INSUFFICIENT_BALANCE/, key: "api.errors.marketplaceInsufficientBalance" },
  { pattern: /MARKETPLACE_COOLING/, key: "api.errors.marketplaceCooling" },
  { pattern: /MARKETPLACE_UNAUTHORIZED/, key: "api.errors.marketplaceUnauthorized" },
  { pattern: /MARKETPLACE_/, key: "api.errors.marketplaceError" },
  { pattern: /REVEAL_SPECTATOR_EXPIRED|观战链接已失效|观战链接已过期/, key: "spectator.expired" },
  { pattern: /REVEAL_SPECTATOR_NOT_FOUND|暂无观战链接/, key: "api.errors.notFound" },
  { pattern: /REVEAL_SPECTATOR_FORBIDDEN|观战链接已失效或无权更新/, key: "api.errors.forbidden" },
];

/** Map common backend Chinese messages to i18n keys (used when locale is not zh-CN). */
export const API_ERROR_MESSAGE_PATTERNS: ReadonlyArray<{ pattern: RegExp; key: string }> = [
  { pattern: /订单不存在/, key: "api.errors.orderNotFound" },
  { pattern: /盲盒不存在/, key: "api.errors.boxNotFound" },
  { pattern: /用户不存在/, key: "api.errors.userNotFound" },
  { pattern: /优惠券/, key: "api.errors.couponInvalid" },
  { pattern: /验证码错误/, key: "api.errors.verifyCodeInvalid" },
  { pattern: /密码/, key: "api.errors.authFailed" },
  { pattern: /未登录|未授权|登录/, key: "api.errors.unauthorized" },
  { pattern: /操作过于频繁|请勿重复/, key: "api.errors.rateLimited" },
  { pattern: /非本人/, key: "api.errors.forbidden" },
  { pattern: /退款申请处理中|已有退款/, key: "api.errors.refundInProgress" },
  { pattern: /不可申请退款/, key: "api.errors.refundDenied" },
  { pattern: /订单状态/, key: "api.errors.orderStatusInvalid" },
  { pattern: /数据不存在|不存在/, key: "api.errors.notFound" },
  { pattern: /并发冲突/, key: "api.errors.stockConflict" },
  { pattern: /库存|不足/, key: "api.errors.outOfStock" },
  { pattern: /账号已被封禁|封禁/, key: "api.errors.accountBanned" },
  { pattern: /参数错误|参数有误|参数非法/, key: "api.errors.paramInvalid" },
  ...API_ERROR_TOKEN_PATTERNS,
];

export type ApiResult<T> = {
  code: number;
  msg: string;
  result: T;
  traceId?: string;
  /** Stable SCREAMING_SNAKE code from backend (e.g. PITY_STOCK_EXHAUSTED). */
  errorCode?: string;
};
export type TokenInfo = { tokenValue: string };
export type QueryResult<T> = { content: T[] };
export type UserProfile = {
  id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
  balance?: number;
  inviteCode?: string;
  luckyCoins?: number;
  starStones?: number;
};
export type UserBalanceLog = {
  id: string;
  changeType: string;
  amount: number;
  balanceAfter: number;
  relatedOrderId: string;
  remark: string;
  createdTime?: string;
};

/** `price` is optional: warehouse and order-item payloads return prize products without a price. */
export type ProductAttribute = { name?: string; values?: string[] };
export type Product = {
  id: string;
  name: string;
  price?: number;
  qualityType?: string;
  cover?: string;
  description?: string;
  brand?: string;
  tags?: string[];
  attributes?: ProductAttribute[];
};
export type MysteryBoxCategory = {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  sortOrder?: number;
};
export type MysteryBox = {
  id: string;
  name: string;
  tips?: string;
  price: number;
  cover?: string;
  products: Product[];
  newcomerExclusive?: boolean;
  category?: MysteryBoxCategory;
  poolTotal?: number;
  poolRemaining?: number;
};
export type CouponItem = {
  id: string;
  name?: string;
  amount?: number;
  status?: string;
  mysteryBoxId?: string;
  coupon?: { name?: string; amount?: number; expirationDate?: string; mysteryBoxId?: string };
  expirationDate?: string;
};
export type FeedbackItem = { id: string; content: string; pictures?: string[]; createdTime?: string };
export type Address = {
  id: string;
  realName: string;
  phoneNumber: string;
  details: string;
  houseNumber: string;
  top?: boolean;
};
export type OrderItem = {
  id?: string;
  mysteryBoxCount?: number;
  mysteryBoxId?: string;
  mysteryBox?: { id?: string; name?: string; cover?: string };
  products?: Product[];
};

export type Order = {
  id: string;
  status: string;
  createdTime?: string;
  items?: OrderItem[];
  baseOrder?: {
    remark?: string;
    trackingNumber?: string;
    payment?: { payAmount?: number; payTime?: string; couponAmount?: number; deliveryFee?: number };
  };
};
export type PaymentPriceView = {
  productAmount: number;
  deliveryFee: number;
  couponAmount: number;
  vipAmount: number;
  payAmount: number;
  /** Claimed abandon-offer discount included in couponAmount */
  retentionDiscount?: number;
  suggestedCouponUserId?: string | null;
  savingsAmount?: number;
  currency?: string;
};
export type PrepayResult = {
  appId?: string;
  timeStamp?: string;
  nonceStr?: string;
  packageValue?: string;
  signType?: string;
  paySign?: string;
};

export type VNPayPrepayResult = {
  orderId: string;
  payAmount: number;
  paymentUrl: string;
  returnUrl?: string;
  sandbox?: boolean;
};

export type MoMoPrepayResult = {
  orderId: string;
  deeplink: string;
  stub?: boolean;
};

export type CommunityComment = {
  id: string;
  authorId: string;
  content: string;
  createdAt?: string;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  authorDisplayName?: string;
  content: string;
  status: string;
  createdAt?: string;
  comments?: CommunityComment[];
  likes?: string[];
};

export type CommunityNotification = {
  id: string;
  receiverId: string;
  content: string;
  createdAt?: string;
  read?: boolean;
};

export type CommunityReport = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  remark?: string;
};

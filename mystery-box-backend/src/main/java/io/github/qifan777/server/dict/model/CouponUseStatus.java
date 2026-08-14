package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum CouponUseStatus {
USED(1, "已使用", "USED", 1008, "优惠券使用状态", "COUPON_USE_STATUS", 0),
        EXPIRED(2, "已过期", "EXPIRED", 1008, "优惠券使用状态", "COUPON_USE_STATUS", 0),
        UNUSED(0, "未使用", "UNUSED", 1008, "优惠券使用状态", "COUPON_USE_STATUS", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum CouponType {
DISCOUNT(0, "折扣券", "DISCOUNT", 1006, "优惠券类型", "COUPON_TYPE", 0),
        REDUCE(1, "满减券", "REDUCE", 1006, "优惠券类型", "COUPON_TYPE", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

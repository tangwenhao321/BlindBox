package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum CouponScopeType {
CATEGORY(2, "品类券", "CATEGORY", 1007, "优惠券使用范围", "COUPON_SCOPE_TYPE", 0),
        PRODUCT(1, "商品券", "PRODUCT", 1007, "优惠券使用范围", "COUPON_SCOPE_TYPE", 0),
        GENERAL(0, "通用券", "GENERAL", 1007, "优惠券使用范围", "COUPON_SCOPE_TYPE", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

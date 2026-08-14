package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum OrderType {
BLIND_BOX_ORDER(1, "盲盒订单", "BLIND_BOX_ORDER", 1012, "订单类型", "ORDER_TYPE", 0),
        PRODUCT_ORDER(0, "商品订单", "PRODUCT_ORDER", 1012, "订单类型", "ORDER_TYPE", 0),
        VIP_ORDER(2, "VIP订单", "VIP_ORDER", 1012, "订单类型", "ORDER_TYPE", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

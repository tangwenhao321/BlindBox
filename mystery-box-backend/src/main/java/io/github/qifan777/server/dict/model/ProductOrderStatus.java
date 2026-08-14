package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ProductOrderStatus {
CLOSED(4, "已关闭", "CLOSED", 1003, "商品订单状态", "PRODUCT_ORDER_STATUS", 0),
        REFUNDED(5, "已退款", "REFUNDED", 1003, "商品订单状态", "PRODUCT_ORDER_STATUS", 0),
        TO_BE_RECEIVED(2, "待收货", "TO_BE_RECEIVED", 1003, "商品订单状态", "PRODUCT_ORDER_STATUS", 0),
        TO_BE_PAID(0, "待付款", "TO_BE_PAID", 1003, "商品订单状态", "PRODUCT_ORDER_STATUS", 0),
        TO_BE_EVALUATED(3, "待评价", "TO_BE_EVALUATED", 1003, "商品订单状态", "PRODUCT_ORDER_STATUS", 0),
        FINISHED(6, "已完成", "FINISHED", 1003, "商品订单状态", "PRODUCT_ORDER_STATUS", 0),
        TO_BE_DELIVERED(1, "待发货", "TO_BE_DELIVERED", 1003, "商品订单状态	", "PRODUCT_ORDER_STATUS", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

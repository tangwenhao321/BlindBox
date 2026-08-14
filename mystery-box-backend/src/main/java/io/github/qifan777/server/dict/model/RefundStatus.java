package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum RefundStatus {
REFUNDING(0, "退款中", "REFUNDING", 1010, "退款状态", "REFUND_STATUS", 0),
        SUCCESS(1, "退款成功", "SUCCESS", 1010, "退款状态", "REFUND_STATUS", 0),
        FAILED(2, "退款失败", "FAILED", 1010, "退款状态", "REFUND_STATUS", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

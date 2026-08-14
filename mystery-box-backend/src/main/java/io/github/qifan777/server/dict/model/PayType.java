package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum PayType {
WE_CHAT_PAY(0, "微信支付", "WE_CHAT_PAY", 1004, "支付类型", "PAY_TYPE", 0),
        VN_PAY(1, "VNPay", "VN_PAY", 1004, "支付类型", "PAY_TYPE", 1),
        MO_MO(2, "MoMo", "MO_MO", 1004, "支付类型", "PAY_TYPE", 2),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

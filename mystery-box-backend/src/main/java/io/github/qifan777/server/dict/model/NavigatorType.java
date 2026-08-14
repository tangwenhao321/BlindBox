package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum NavigatorType {
PRODUCT(0, "商品", "PRODUCT", 1013, "跳转类型", "NAVIGATOR_TYPE", 0),
        BLIND_BOX(1, "盲盒", "BLIND_BOX", 1013, "跳转类型", "NAVIGATOR_TYPE", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

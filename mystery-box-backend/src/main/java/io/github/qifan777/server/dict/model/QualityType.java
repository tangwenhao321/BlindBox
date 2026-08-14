package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum QualityType {
GENERAL(0, "普通款", "GENERAL", 1014, "商品品质", "QUALITY_TYPE", 0),
        HIDDEN(1, "隐藏款", "HIDDEN", 1014, "商品品质", "QUALITY_TYPE", 0),
        LEGENDARY(2, "超神款", "LEGENDARY", 1014, "商品品质", "QUALITY_TYPE", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

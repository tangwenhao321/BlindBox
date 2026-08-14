package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum UserStatus {
NORMAL(0, "正常", "NORMAL", 1005, "用户状态", "USER_STATUS", 0),
        BANNED(1, "封禁", "BANNED", 1005, "用户状态", "USER_STATUS", 0),
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;

}

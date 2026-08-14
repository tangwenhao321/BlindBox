<#-- @ftlvariable name="type" type="java.lang.String" -->
<#-- @ftlvariable name="dicts" type="java.util.List<io.github.qifan777.server.dict.entity.Dict>" -->
package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ${type} {
<#list dicts as dict>
        ${dict.keyEnName()}(${dict.keyId()?c}, "${dict.keyName()}", "${dict.keyEnName()}", ${dict.dictId()?c}, "${dict.dictName()}", "${dict.dictEnName()}", ${dict.orderNum()?c})<#if dict_has_next>,</#if>
</#list>
  ;
  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;
}

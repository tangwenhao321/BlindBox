<#-- @ftlvariable name="" type="io.github.qifan777.server.dict.model.DictGenContext" -->
package io.github.qifan777.server.dict.model;

/**
 * Dictionary constant names only. Enum types are top-level files in this package
 * (Jimmer JSpecify cannot annotate nested types — do not nest enums here).
 */
public class DictConstants {
<#list getDictTypes() as type>
  public static final String ${getDictMap()[type][0].dictEnName()} = "${getDictMap()[type][0].dictEnName()}";
</#list>
}

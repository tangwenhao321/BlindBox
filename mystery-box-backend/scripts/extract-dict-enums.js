const fs = require("fs");
const path = require("path");

const dir =
  "D:/A-WorkSpace/blindBox/mystery-box-main/mystery-box-backend/src/main/java/io/github/qifan777/server/dict/model";

let src = fs.readFileSync(path.join(dir, "DictConstants.java"), "utf8");
if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

const re =
  /@Getter\s*\r?\n\s*@AllArgsConstructor\s*\r?\n\s*public enum (\w+)\s*\{([\s\S]*?)\n\s*final int keyId;[\s\S]*?final int orderNum;\r?\n\s*\}/g;

const enums = [];
let m;
while ((m = re.exec(src))) {
  enums.push({ name: m[1], body: m[2].trim() });
}
console.log("found", enums.length);

const fields = `  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;
`;

for (const e of enums) {
  const content = `package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ${e.name} {
${e.body}
${fields}
}
`;
  fs.writeFileSync(path.join(dir, e.name + ".java"), content);
}

const constants = `package io.github.qifan777.server.dict.model;

public class DictConstants {
  public static final String COUPON_TYPE = "COUPON_TYPE";
  public static final String PAY_TYPE = "PAY_TYPE";
  public static final String MENU_TYPE = "MENU_TYPE";
  public static final String REFUND_STATUS = "REFUND_STATUS";
  public static final String PRODUCT_ORDER_STATUS = "PRODUCT_ORDER_STATUS";
  public static final String GENDER = "GENDER";
  public static final String COUPON_SCOPE_TYPE = "COUPON_SCOPE_TYPE";
  public static final String COUPON_USE_STATUS = "COUPON_USE_STATUS";
  public static final String COUPON_RECEIVE_TYPE = "COUPON_RECEIVE_TYPE";
  public static final String NAVIGATOR_TYPE = "NAVIGATOR_TYPE";
  public static final String QUALITY_TYPE = "QUALITY_TYPE";
  public static final String ORDER_TYPE = "ORDER_TYPE";
  public static final String USER_STATUS = "USER_STATUS";
}
`;
fs.writeFileSync(path.join(dir, "DictConstants.java"), constants);
console.log(
  "rewrote DictConstants +",
  enums.map((e) => e.name).join(",")
);

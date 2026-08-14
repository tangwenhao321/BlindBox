const fs = require("fs");
const path = require("path");

const backend =
  "D:/A-WorkSpace/blindBox/mystery-box-main/mystery-box-backend";
const srcRoot = path.join(backend, "src");

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function writeUtf8(file, content) {
  fs.writeFileSync(file, content, { encoding: "utf8" });
}

// ---- 1) Dict enums ----
const dictDir = path.join(
  srcRoot,
  "main/java/io/github/qifan777/server/dict/model"
);
let dictSrc = fs.readFileSync(path.join(dictDir, "DictConstants.java"), "utf8");
if (dictSrc.charCodeAt(0) === 0xfeff) dictSrc = dictSrc.slice(1);

const enumRe =
  /@Getter\s*\r?\n\s*@AllArgsConstructor\s*\r?\n\s*public enum (\w+)\s*\{([\s\S]*?)\n\s*final int keyId;[\s\S]*?final int orderNum;\r?\n\s*\}/g;
const enums = [];
let m;
while ((m = enumRe.exec(dictSrc))) {
  enums.push({ name: m[1], body: m[2].trim() });
}
console.log("enums", enums.length);

const fields = `  final int keyId;
  final String keyName;
  final String keyEnName;
  final int dictId;
  final String dictName;
  final String dictEnName;
  final int orderNum;
`;

for (const e of enums) {
  writeUtf8(
    path.join(dictDir, `${e.name}.java`),
    `package io.github.qifan777.server.dict.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ${e.name} {
${e.body}
${fields}
}
`
  );
}

writeUtf8(
  path.join(dictDir, "DictConstants.java"),
  `package io.github.qifan777.server.dict.model;

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
`
);

const enumNames = enums.map((e) => e.name);

// ---- 2) Rewrite configs ----
writeUtf8(
  path.join(
    srcRoot,
    "main/java/io/github/qifan777/server/infrastructure/config/LocalDateTimeConvert.java"
  ),
  `package io.github.qifan777.server.infrastructure.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.jackson.JacksonComponent;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.ValueSerializer;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@JacksonComponent
@Slf4j
public class LocalDateTimeConvert {

    public static class Serializer extends ValueSerializer<LocalDateTime> {

        @Override
        public void serialize(LocalDateTime localDateTime, JsonGenerator jsonGenerator,
                              SerializationContext serializers) {
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern(
                    "yyyy-MM-dd HH:mm:ss");
            jsonGenerator.writeString(dateTimeFormatter.format(localDateTime));
        }
    }

    public static class Deserializer extends ValueDeserializer<LocalDateTime> {

        @Override
        public LocalDateTime deserialize(JsonParser jsonParser,
                                         DeserializationContext deserializationContext) {
            String text = jsonParser.getString();
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern(
                    "yyyy-MM-dd HH:mm:ss");
            return LocalDateTime.parse(text, dateTimeFormatter);
        }
    }
}
`
);

writeUtf8(
  path.join(
    srcRoot,
    "main/java/io/github/qifan777/server/infrastructure/config/PageableConvert.java"
  ),
  `package io.github.qifan777.server.infrastructure.config;

import io.qifan.infrastructure.common.model.PageResult;
import org.springframework.boot.jackson.JacksonComponent;
import org.springframework.data.domain.Page;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.ValueSerializer;

import java.util.List;

@JacksonComponent
public class PageableConvert {

    public static class Serializer extends ValueSerializer<Page<?>> {

        @Override
        public void serialize(Page<?> page, JsonGenerator jsonGenerator,
                              SerializationContext serializers) {
            PageResult<?> pageResult = new PageResult<>()
                    .setNumber(page.getNumber())
                    .setSize(page.getSize())
                    .setTotalElements(page.getTotalElements())
                    .setTotalPages(page.getTotalPages())
                    .setContent((List<Object>) page.getContent());
            jsonGenerator.writePOJO(pageResult);
        }
    }

    public static class Deserializer extends ValueDeserializer<Page<?>> {

        @Override
        public Page<?> deserialize(JsonParser jsonParser,
                                   DeserializationContext deserializationContext) {
            return jsonParser.readValueAs(Page.class);
        }
    }
}
`
);

writeUtf8(
  path.join(
    srcRoot,
    "main/java/io/github/qifan777/server/infrastructure/config/RedisConfig.java"
  ),
  `package io.github.qifan777.server.infrastructure.config;

import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.data.redis.autoconfigure.DataRedisAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@AutoConfigureAfter(DataRedisAutoConfiguration.class)
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> stringObjectRedisTemplate(
            RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, Object> stringObjectRedisTemplate = new RedisTemplate<>();
        stringObjectRedisTemplate.setConnectionFactory(redisConnectionFactory);
        RedisSerializer<String> keySerializer = new StringRedisSerializer();
        RedisSerializer<Object> valueSerializer = new GenericJacksonJsonRedisSerializer();
        stringObjectRedisTemplate.setKeySerializer(keySerializer);
        stringObjectRedisTemplate.setHashKeySerializer(keySerializer);
        stringObjectRedisTemplate.setValueSerializer(valueSerializer);
        stringObjectRedisTemplate.setHashValueSerializer(valueSerializer);
        stringObjectRedisTemplate.afterPropertiesSet();
        return stringObjectRedisTemplate;
    }
}
`
);

// ---- 3) Bulk migrate java + dto ----
const javaFiles = walk(srcRoot).filter((f) => f.endsWith(".java"));
let changed = 0;
for (const file of javaFiles) {
  let c = fs.readFileSync(file, "utf8");
  if (c.charCodeAt(0) === 0xfeff) c = c.slice(1);
  const orig = c;
  let n = c;

  // case-sensitive DictConstants.EnumName → EnumName
  for (const e of enumNames) {
    n = n.split(`DictConstants.${e}`).join(e);
  }

  n = n.replace(
    /import com\.fasterxml\.jackson\.databind\.ObjectMapper;/g,
    "import tools.jackson.databind.json.JsonMapper;"
  );
  n = n.replace(
    /import com\.fasterxml\.jackson\.core\.JsonProcessingException;/g,
    "import tools.jackson.core.JacksonException;"
  );
  n = n.replace(
    /import com\.fasterxml\.jackson\.databind\.JsonNode;/g,
    "import tools.jackson.databind.JsonNode;"
  );
  n = n.replace(
    /import com\.fasterxml\.jackson\.databind\.node\.ObjectNode;/g,
    "import tools.jackson.databind.node.ObjectNode;"
  );
  n = n.replace(
    /import com\.fasterxml\.jackson\.core\.type\.TypeReference;/g,
    "import tools.jackson.core.type.TypeReference;"
  );
  n = n.replace(/JsonProcessingException/g, "JacksonException");
  n = n.replace(/(?<![\w.])ObjectMapper(?=\s+\w+)/g, "JsonMapper");
  n = n.replace(/new ObjectMapper\(\)/g, "JsonMapper.shared()");
  n = n.replace(
    /org\.springframework\.boot\.test\.mock\.mockito\.MockBean/g,
    "org.springframework.test.context.bean.override.mockito.MockitoBean"
  );
  n = n.replace(/@MockBean/g, "@MockitoBean");
  n = n.replace(
    /org\.springframework\.boot\.test\.autoconfigure\.web\.servlet\.AutoConfigureMockMvc/g,
    "org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc"
  );
  n = n.replace(
    /org\.testcontainers\.containers\.MySQLContainer/g,
    "org.testcontainers.mysql.MySQLContainer"
  );
  n = n.replace(/MySQLContainer<[^>]*>/g, "MySQLContainer");

  // add missing enum imports (same-package skip)
  if (!file.replace(/\\/g, "/").includes("/dict/model/")) {
    const needed = enumNames.filter(
      (e) =>
        new RegExp(`(?<![\\w.])${e}(?![\\w])`).test(n) &&
        !n.includes(`import io.github.qifan777.server.dict.model.${e};`)
    );
    if (needed.length) {
      const pkgMatch = n.match(/^package [^;]+;/m);
      if (pkgMatch) {
        const imports = needed
          .map((e) => `import io.github.qifan777.server.dict.model.${e};`)
          .join("\n");
        n = n.replace(pkgMatch[0], `${pkgMatch[0]}\n\n${imports}`);
      }
    }
  }

  if (n !== orig) {
    writeUtf8(file, n);
    changed++;
  }
}
console.log("java files changed", changed);

const dtoRoot = path.join(srcRoot, "main/dto");
if (fs.existsSync(dtoRoot)) {
  let dtoChanged = 0;
  for (const file of walk(dtoRoot).filter((f) => f.endsWith(".dto"))) {
    let c = fs.readFileSync(file, "utf8");
    const n = c.replace(/^(\s*)id\(/gm, "$1associatedIdEq(");
    if (n !== c) {
      writeUtf8(file, n);
      dtoChanged++;
    }
  }
  console.log("dto files changed", dtoChanged);
}

console.log("done");

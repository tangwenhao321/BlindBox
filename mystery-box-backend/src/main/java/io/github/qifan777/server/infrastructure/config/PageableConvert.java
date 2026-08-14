package io.github.qifan777.server.infrastructure.config;

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

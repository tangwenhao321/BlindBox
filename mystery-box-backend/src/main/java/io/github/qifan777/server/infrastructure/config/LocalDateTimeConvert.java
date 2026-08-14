package io.github.qifan777.server.infrastructure.config;

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
